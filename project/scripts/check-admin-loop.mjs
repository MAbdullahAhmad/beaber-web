
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const cookie = [];
async function req(url, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (cookie.length) headers.cookie = cookie.join('; ');
  const res = await fetch(url, { redirect: 'manual', ...opts, headers });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie.push(setCookie.split(';')[0]);
  return { status: res.status, text: await res.text(), location: res.headers.get('location') };
}

let login = await req('http://127.0.0.1:4000/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'change-me' })
});
let admin = await req('http://127.0.0.1:4000/admin');
let adminSlash = await req('http://127.0.0.1:4000/admin/');
let ipc = await req('http://127.0.0.1:4000/api/ipc', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ channel: 'storage:get', payload: { name: 'data', key: 'notes', def: [] } })
});
console.log(JSON.stringify({ login: login.status, admin: admin.status, adminLocation: admin.location, adminSlash: adminSlash.status, ipc: ipc.status, ipcBody: ipc.text.slice(0, 120) }, null, 2));
if (login.status !== 200 || admin.status !== 200 || adminSlash.status !== 200 || ipc.status !== 200) process.exit(1);
