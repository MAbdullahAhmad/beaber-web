import './style.css';
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `<section class="card"><h1>Beaver Notes</h1><p class="hint">Private web login</p><form id="login-form"><label>Username <input name="username" autocomplete="username" required /></label><label>Password <input name="password" type="password" autocomplete="current-password" required /></label><button type="submit">Log in</button><p id="error" class="error" hidden></p></form></section>`;
const form = document.querySelector<HTMLFormElement>('#login-form')!;
const errorEl = document.querySelector<HTMLParagraphElement>('#error')!;
form.addEventListener('submit', async (event) => { event.preventDefault(); errorEl.hidden = true; const data = new FormData(form); const res = await fetch('/login', { method:'POST', headers:{ 'Content-Type':'application/json' }, credentials:'include', body:JSON.stringify({ username:data.get('username'), password:data.get('password') }) }); const json = await res.json().catch(() => ({})); if (!res.ok || !json.ok) { errorEl.textContent = json.error || 'Login failed'; errorEl.hidden = false; return; } window.location.href = json.redirectTo || '/'; });
