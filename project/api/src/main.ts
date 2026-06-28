import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { config } from './config.js';
import { ensureDataDirs, assertInsideBase } from './file-store.js';
import { dispatchIpc } from './ipc-router.js';
const app = express();
app.disable('x-powered-by');
app.use(cors({ origin:config.security.corsOrigin, credentials:true }));
app.use(express.json({ limit:'50mb' }));
app.get('/health', (_req, res) => res.json({ ok:true, service:'beaver-api' }));
app.post('/ipc', async (req, res) => { try { const { channel, payload } = req.body || {}; if (!channel || typeof channel !== 'string') throw new Error('Missing channel'); res.json({ ok:true, data:await dispatchIpc(channel, payload) }); } catch (e:any) { res.status(400).json({ ok:false, error:e?.message || 'IPC failed' }); } });
function asset(base: string, req: express.Request, res: express.Response) { try { res.sendFile(assertInsideBase(path.join(base, req.params[0] || ''), base)); } catch (e:any) { res.status(404).json({ ok:false, error:e?.message || 'Asset not found' }); } }
app.get('/assets/*', (req, res) => asset(config.data.notesAssets, req, res));
app.get('/file-assets/*', (req, res) => asset(config.data.fileAssets, req, res));
await ensureDataDirs();
app.listen(config.api.port, config.api.host, () => console.log(`beaver-api listening on http://${config.api.host}:${config.api.port}`));
