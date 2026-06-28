import { dirname, isAbsolute, normalize, resolve, relative } from 'node:path';
import { promises as fs } from 'node:fs';
import fse from 'fs-extra';
import { config } from './config.js';
export function assertInsideBase(pathValue: string, base = config.data.dir): string { const candidate = isAbsolute(pathValue) ? normalize(pathValue) : resolve(base, pathValue); const rel = relative(base, candidate); if (rel.startsWith('..') || rel === '..' || isAbsolute(rel)) throw new Error('Path escapes Beaver data directory'); return candidate; }
export async function ensureDataDirs(): Promise<void> { await Promise.all([fse.ensureDir(config.data.dir), fse.ensureDir(dirname(config.data.dataStore)), fse.ensureDir(dirname(config.data.settingsStore)), fse.ensureDir(config.data.notesAssets), fse.ensureDir(config.data.fileAssets)]); for (const file of [config.data.dataStore, config.data.settingsStore]) if (!(await fse.pathExists(file))) await fs.writeFile(file, '{}\n', 'utf8'); }
export async function readDataAsBase64(filePath: string): Promise<string> { return (await fs.readFile(assertInsideBase(filePath))).toString('base64'); }
export async function statSafe(filePath: string) { const st = await fs.stat(assertInsideBase(filePath)); return { isFile:st.isFile(), isDirectory:st.isDirectory(), size:st.size, mtimeMs:st.mtimeMs, ctimeMs:st.ctimeMs }; }
