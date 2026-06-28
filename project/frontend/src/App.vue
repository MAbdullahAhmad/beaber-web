<script setup>
import { computed, onMounted, ref, watch } from 'vue';

function apiBase() {
  const configured = import.meta.env.VITE_BEAVER_API_URL || '/api';
  try {
    return new URL(configured, window.location.origin).pathname.replace(/\/$/, '') || '/api';
  } catch {
    return '/api';
  }
}

const apiUrl = apiBase();
const notes = ref([]);
const selectedId = ref(null);
const query = ref('');
const status = ref('Loading...');
const loadError = ref('');
let saveTimer = null;

const filtered = computed(() => notes.value.filter((n) => `${n.title || ''} ${n.body || ''}`.toLowerCase().includes(query.value.toLowerCase())));
const selected = computed(() => notes.value.find((n) => n.id === selectedId.value) || notes.value[0] || null);

async function ipc(channel, payload) {
  const res = await fetch(`${apiUrl}/ipc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ channel, payload }),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) throw new Error((json && json.error) || `API ${res.status}: ${text.slice(0, 160)}`);
  if (!json || !json.ok) throw new Error((json && json.error) || 'API returned invalid JSON');
  return json.data;
}

async function load() {
  try {
    loadError.value = '';
    const loaded = await ipc('storage:get', { name: 'data', key: 'notes', def: [] });
    notes.value = Array.isArray(loaded) ? loaded : [];
    selectedId.value = notes.value[0]?.id || null;
    status.value = 'Ready';
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : String(err);
    status.value = 'API error';
  }
}

async function save() {
  try {
    await ipc('storage:set', { name: 'data', key: 'notes', value: notes.value });
    status.value = 'Saved';
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : String(err);
    status.value = 'Save failed';
  }
}

function queueSave() {
  status.value = 'Editing';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 250);
}

function addNote() {
  const n = { id: crypto.randomUUID(), title: 'Untitled note', body: '', createdAt: Date.now(), updatedAt: Date.now() };
  notes.value.unshift(n);
  selectedId.value = n.id;
  save();
}

function delNote() {
  if (!selected.value) return;
  notes.value = notes.value.filter((n) => n.id !== selected.value.id);
  selectedId.value = notes.value[0]?.id || null;
  save();
}

function touch() {
  if (selected.value) selected.value.updatedAt = Date.now();
  queueSave();
}

async function logout() {
  await fetch('/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
  window.location.href = window.location.origin === 'http://127.0.0.1:4020' ? 'http://127.0.0.1:4010/login/' : '/login/';
}

onMounted(load);
watch(notes, () => { if (status.value === 'Ready' || status.value === 'Saved') status.value = 'Editing'; }, { deep: true });
</script>

<template>
  <div class="shell">
    <aside>
      <header>
        <h1>Beaver Notes Web</h1>
        <button @click="logout">Logout</button>
      </header>
      <input class="search" v-model="query" placeholder="Search notes" />
      <button class="new" @click="addNote">+ New note</button>
      <p v-if="loadError" class="error">{{ loadError }}</p>
      <nav>
        <button v-for="n in filtered" :key="n.id" :class="{ active: n.id === selectedId }" @click="selectedId = n.id">
          <strong>{{ n.title || 'Untitled' }}</strong>
          <span>{{ new Date(n.updatedAt).toLocaleString() }}</span>
        </button>
      </nav>
    </aside>

    <main v-if="selected">
      <input class="title" v-model="selected.title" @input="touch" />
      <textarea v-model="selected.body" @input="touch" placeholder="Write your note..." />
      <footer>
        <span>{{ status }}</span>
        <button class="danger" @click="delNote">Delete</button>
      </footer>
    </main>

    <main v-else class="empty">
      <h2>No notes yet</h2>
      <p v-if="loadError" class="error">{{ loadError }}</p>
      <button @click="addNote">Create your first note</button>
    </main>
  </div>
</template>
