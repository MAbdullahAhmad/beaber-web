import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import fse from 'fs-extra';
import { config } from './config.js';
const queues = new Map<string, Promise<unknown>>();
const storePath = (name: string) => name === 'settings' ? config.data.settingsStore : config.data.dataStore;
async function withQueue<T>(file: string, fn: () => Promise<T>): Promise<T> { const prev = queues.get(file) || Promise.resolve(); const next = prev.then(fn, fn); queues.set(file, next.catch(() => undefined)); return next; }
async function readStore(file: string): Promise<Record<string, unknown>> { await fse.ensureDir(dirname(file)); if (!(await fse.pathExists(file))) await fs.writeFile(file, '{}\n', 'utf8'); const raw = await fs.readFile(file, 'utf8'); return raw.trim() ? JSON.parse(raw) : {}; }
async function writeStore(file: string, data: Record<string, unknown>) { await fse.ensureDir(dirname(file)); const tmp = `${file}.tmp-${process.pid}-${Date.now()}`; await fs.writeFile(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8'); await fs.rename(tmp, file); }
export async function storageCall(action: string, param: any): Promise<unknown> { const name = typeof param === 'string' ? param : (param?.name || 'data'); const file = storePath(name); return withQueue(file, async () => { const store = await readStore(file); switch (action) { case 'store': return store; case 'replace': await writeStore(file, param?.data && typeof param.data === 'object' ? param.data : {}); return true; case 'get': return Object.prototype.hasOwnProperty.call(store, param.key) ? store[param.key] : param.def; case 'set': store[param.key] = param.value; await writeStore(file, store); return true; case 'delete': delete store[param.key]; await writeStore(file, store); return true; case 'has': return Object.prototype.hasOwnProperty.call(store, param.key); case 'clear': await writeStore(file, {}); return true; default: throw new Error(`Unsupported storage action: ${action}`); } }); }
