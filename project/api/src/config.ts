import dotenv from 'dotenv';
import { resolve } from 'node:path';
dotenv.config({ path: resolve(process.cwd(), '../.env') });
dotenv.config();
const s = (k: string, d: string) => process.env[k] || d;
const n = (k: string, d: number) => Number.parseInt(process.env[k] || String(d), 10);
const abs = (v: string) => resolve(process.cwd(), '..', v.replace(/^\.\//, ''));
export const config = { api:{ host:s('BEAVER_API_HOST','127.0.0.1'), port:n('BEAVER_API_PORT',4030) }, data:{ dir:abs(s('BEAVER_DATA_DIR','./data')), dataStore:abs(s('BEAVER_STORE_DATA_FILE','./data/stores/data.json')), settingsStore:abs(s('BEAVER_STORE_SETTINGS_FILE','./data/stores/settings.json')), notesAssets:abs(s('BEAVER_NOTES_ASSETS_DIR','./data/notes-assets')), fileAssets:abs(s('BEAVER_FILE_ASSETS_DIR','./data/file-assets')) }, security:{ encryptionKey:s('BEAVER_ENCRYPTION_KEY',s('SESSION_SECRET','dev-only-key')), corsOrigin:s('CORS_ORIGIN','http://127.0.0.1:4000') } };
