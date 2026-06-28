import { createApp, ref, computed, onMounted, watch } from 'vue';
import './style.css';
const apiUrl = import.meta.env.VITE_BEAVER_API_URL || '/api';
async function ipc(channel, payload) { const res = await fetch(`${apiUrl}/ipc`, { method:'POST', headers:{ 'Content-Type':'application/json' }, credentials:'include', body:JSON.stringify({ channel, payload }) }); const json = await res.json(); if (!json.ok) throw new Error(json.error || 'API failed'); return json.data; }
const App = {
  setup() {
    const notes = ref([]); const selectedId = ref(null); const query = ref(''); const status = ref('Loading...');
    const filtered = computed(() => notes.value.filter(n => (n.title + ' ' + n.body).toLowerCase().includes(query.value.toLowerCase())));
    const selected = computed(() => notes.value.find(n => n.id === selectedId.value) || notes.value[0] || null);
    async function load() { notes.value = await ipc('storage:get', { name:'data', key:'notes', def:[] }); selectedId.value = notes.value[0]?.id || null; status.value = 'Ready'; }
    async function save() { await ipc('storage:set', { name:'data', key:'notes', value:notes.value }); status.value = 'Saved'; }
    function addNote() { const n = { id: crypto.randomUUID(), title:'Untitled note', body:'', createdAt:Date.now(), updatedAt:Date.now() }; notes.value.unshift(n); selectedId.value = n.id; save(); }
    function delNote() { if (!selected.value) return; notes.value = notes.value.filter(n => n.id !== selected.value.id); selectedId.value = notes.value[0]?.id || null; save(); }
    function touch() { if (selected.value) selected.value.updatedAt = Date.now(); save(); }
    async function logout() { await fetch('/logout', { method:'POST', credentials:'include' }); location.href = '/login'; }
    onMounted(load); watch(notes, () => { status.value = 'Editing'; }, { deep:true });
    return { notes, selectedId, query, filtered, selected, status, addNote, delNote, touch, logout };
  },
  template: `<div class="shell"><aside><header><h1>Beaver Notes Web</h1><button @click="logout">Logout</button></header><input class="search" v-model="query" placeholder="Search notes"><button class="new" @click="addNote">+ New note</button><nav><button v-for="n in filtered" :key="n.id" :class="{active:n.id===selectedId}" @click="selectedId=n.id"><strong>{{n.title || 'Untitled'}}</strong><span>{{new Date(n.updatedAt).toLocaleString()}}</span></button></nav></aside><main v-if="selected"><input class="title" v-model="selected.title" @input="touch"><textarea v-model="selected.body" @input="touch" placeholder="Write your note..."></textarea><footer><span>{{status}}</span><button class="danger" @click="delNote">Delete</button></footer></main><main v-else class="empty"><h2>No notes yet</h2><button @click="addNote">Create your first note</button></main></div>`
};
createApp(App).mount('#app');
