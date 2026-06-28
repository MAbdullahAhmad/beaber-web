# Beaver Notes Web Suite

Private Beaver Notes web app behind a login-protected reverse proxy.

## Services

- `rev-proxy`: public head at `HEAD_PUBLIC_URL`, handles login/session and proxies the app.
- `login`: login UI at `/login`.
- `frontend`: browser notes UI at `/`.
- `api`: HTTP compatibility backend replacing Electron IPC.
- `data`: server-side stores and assets.

## Local run

```bash
cd project
cp .env.example .env
npm install
npm run install:all
npm run dev
```

Open `http://127.0.0.1:4000` and log in with credentials from `.env`.

## Production notes

Set strong values for `LOGIN_PASSWORD`, `SESSION_SECRET`, and `BEAVER_ENCRYPTION_KEY`. Use HTTPS and set `SESSION_COOKIE_SECURE=true`. Back up `project/data` regularly.
