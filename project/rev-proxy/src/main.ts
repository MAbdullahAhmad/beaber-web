import express from 'express';
import { config } from './config.js';
import { requireAuth } from './auth.js';
import { clearSession, setSession } from './session.js';
import { proxyTo } from './proxy.js';

const app = express();
app.disable('x-powered-by');
app.enable('strict routing');
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, service: 'rev-proxy' }));

app.post(['/login', '/login/'], (req, res) => {
  const { username, password } = req.body || {};
  if (username !== config.login.username || password !== config.login.password) {
    res.status(401).json({ ok: false, error: 'Invalid username or password' });
    return;
  }
  setSession(res, config.login.username);
  res.json({ ok: true, redirectTo: '/' });
});

app.post(['/logout', '/logout/'], (_req, res) => {
  clearSession(res);
  res.json({ ok: true, redirectTo: '/login/' });
});

app.get('/login', (_req, res) => res.redirect(308, '/login/'));
app.head('/login', (_req, res) => res.redirect(308, '/login/'));
app.get(/^\/login\/.*$/, proxyTo(config.login.internalUrl));
app.head(/^\/login\/.*$/, proxyTo(config.login.internalUrl));

app.use('/api', requireAuth, proxyTo(config.upstreams.api, (path) => path.replace(/^\/api(?=\/|$)/, '') || '/'));
app.use('/assets', requireAuth, proxyTo(config.upstreams.api));
app.use('/file-assets', requireAuth, proxyTo(config.upstreams.api));
app.use('/', requireAuth, proxyTo(config.upstreams.frontend));

app.listen(config.head.port, config.head.host, () => {
  console.log('rev-proxy listening on http://' + config.head.host + ':' + config.head.port);
});
