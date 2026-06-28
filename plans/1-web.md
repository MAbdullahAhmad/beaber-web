# Plan 1: Beaver Notes Web Deployment Behind Login Reverse Proxy

## Goal

Create a new deployable web project at `./project/` that serves Beaver Notes through a single reverse-proxy head.

The final public flow is:

1. User opens the reverse-proxy public URL.
2. Unauthenticated users are redirected to `/login`.
3. `/login` serves a small login app using fixed credentials from `.env`.
4. After login, the proxy session cookie allows access to Beaver Notes at `/`.
5. Beaver frontend talks to Beaver API through configured URLs, not hardcoded local assumptions, because apparently hardcoding is how software grows mold.

---

## Current Findings

### Reverse proxy source: `./local/rev-proxy`

The existing reverse proxy is a Node 20, TypeScript, Express 5 project using:

- `express`
- `http-proxy-middleware`
- `cors`
- `dotenv`
- `tsx`
- `typescript`

It supports configurable upstream services through either:

- `.env` numbered services, with `CONFIG_SOURCE=env`
- `src/head.json`, with `CONFIG_SOURCE=src`

For this project, use `CONFIG_SOURCE=env` so deployment can be controlled from `.env` files.

Useful existing concepts:

- `HEAD_HOST`
- `HEAD_PORT`
- `SERVICE_N_LABEL`
- `SERVICE_N_PATH`
- `SERVICE_N_URL`
- `SERVICE_N_MATCH`
- `SERVICE_N_REWRITE_FROM`
- `SERVICE_N_REWRITE_TO`

### Beaver Notes source: `./local/Beaver-Notes`

Beaver Notes is an Electron app with a real Vue/Vite renderer:

- frontend root: `packages/renderer`
- renderer entry: `packages/renderer/index.html`
- renderer Vite config: `packages/renderer/vite.config.js`
- current renderer build output: `packages/renderer/dist`

The renderer can be adapted into a browser frontend, but it cannot run as a normal web app without changes because it depends heavily on Electron preload APIs exposed through `window.electron`.

Important Electron-dependent APIs found:

- `window.electron.ipcRenderer.callMain(...)`
- `window.electron.path`
- `window.electron.clipboard`
- `window.electron.notification`
- `window.electron.access`
- `window.electron.onFileOpened`
- `window.electron.addCloseFn`

Important IPC families used by the renderer:

- `storage:*`
- `fs:*`
- `dialog:*`
- `safeStorage:*`
- `app:*`
- `theme:*`
- `helper:*`
- `print-pdf`
- `get-system-fonts`
- `open-file-external`
- `download-file`
- updater calls such as `check-for-updates`, `download-update`, `install-update`

Conclusion: reverse-proxy alone is not enough. We need a web adapter plus API service that replaces Electron IPC with HTTP-backed behavior.

---

## Target Project Layout

Create this new project structure:

```txt
./project/
  .env
  .env.example
  package.json
  README.md

  rev-proxy/
    package.json
    tsconfig.json
    src/
      main.ts
      config.ts
      auth.ts
      session.ts
      proxy.ts
      routes/
        health.ts

  login/
    package.json
    vite.config.ts
    index.html
    src/
      main.ts
      style.css
      LoginApp.ts

  frontend/
    package.json
    vite.config.js
    index.html
    src/
      electron-web-adapter.js
      config.js
      copied-or-patched-beaver-renderer/

  api/
    package.json
    tsconfig.json
    src/
      main.ts
      config.ts
      auth-middleware.ts
      ipc-router.ts
      storage-store.ts
      file-store.ts
      safe-storage.ts
      routes/
        health.ts
        storage.ts
        filesystem.ts
        assets.ts
        app.ts
        dialog.ts
        safe-storage.ts
        compatibility.ts

  data/
    .gitkeep
    stores/
      data.json
      settings.json
    notes-assets/
    file-assets/
```

Notes:

- `project/rev-proxy` should be derived from `./local/rev-proxy`, then extended with login/session protection.
- `project/frontend` should be derived from `./local/Beaver-Notes/packages/renderer`, not from the Electron `main` or `preload` packages.
- `project/api` replaces Electron main-process IPC handlers with HTTP endpoints.
- `project/login` is a small standalone web app for login only.
- `project/data` stores Beaver data server-side.

---

## Port and URL Model

All services must read host, port, and upstream URLs from `./project/.env`.

Use these defaults locally:

```env
HEAD_HOST=127.0.0.1
HEAD_PORT=4000
HEAD_PUBLIC_URL=http://127.0.0.1:4000

LOGIN_HOST=127.0.0.1
LOGIN_PORT=4010
LOGIN_PUBLIC_PATH=/login
LOGIN_INTERNAL_URL=http://127.0.0.1:4010

BEAVER_FRONTEND_HOST=127.0.0.1
BEAVER_FRONTEND_PORT=4020
BEAVER_FRONTEND_PUBLIC_PATH=/
BEAVER_FRONTEND_INTERNAL_URL=http://127.0.0.1:4020

BEAVER_API_HOST=127.0.0.1
BEAVER_API_PORT=4030
BEAVER_API_PUBLIC_PATH=/api
BEAVER_API_INTERNAL_URL=http://127.0.0.1:4030
BEAVER_API_PUBLIC_URL=http://127.0.0.1:4000/api
```

Routing through reverse proxy:

| Public path | Upstream | Purpose |
| --- | --- | --- |
| `/login` | `LOGIN_INTERNAL_URL` | Login UI |
| `/login/*` | `LOGIN_INTERNAL_URL` | Login assets |
| `/api/*` | `BEAVER_API_INTERNAL_URL` | Beaver API |
| `/assets/*` | `BEAVER_API_INTERNAL_URL` | Notes image assets |
| `/file-assets/*` | `BEAVER_API_INTERNAL_URL` | Attached file assets |
| `/` | `BEAVER_FRONTEND_INTERNAL_URL` | Beaver frontend |
| `/*` | `BEAVER_FRONTEND_INTERNAL_URL` | Beaver frontend SPA fallback/assets |

Authentication must be enforced at the proxy layer for:

- `/`
- all Beaver frontend assets
- `/api/*`
- `/assets/*`
- `/file-assets/*`

Authentication must not be required for:

- `/login`
- `/login/*`
- `/health`

---

## Root `.env.example`

Create `./project/.env.example` with comments:

```env
# Runtime mode: development or production.
NODE_ENV=development

# Reverse proxy public head.
HEAD_HOST=127.0.0.1
HEAD_PORT=4000
HEAD_PUBLIC_URL=http://127.0.0.1:4000

# Reverse proxy config source. Use env for deployable config.
CONFIG_SOURCE=env

# Login service.
LOGIN_HOST=127.0.0.1
LOGIN_PORT=4010
LOGIN_PUBLIC_PATH=/login
LOGIN_INTERNAL_URL=http://127.0.0.1:4010

# Fixed login credentials for the private Beaver web app.
# Change these before deploying, unless you enjoy inviting chaos to tea.
LOGIN_USERNAME=admin
LOGIN_PASSWORD=change-me

# Session settings used by the reverse proxy.
SESSION_COOKIE_NAME=beaver_session
SESSION_SECRET=replace-with-long-random-secret
SESSION_TTL_SECONDS=86400
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_SAMESITE=lax

# Beaver frontend service.
BEAVER_FRONTEND_HOST=127.0.0.1
BEAVER_FRONTEND_PORT=4020
BEAVER_FRONTEND_PUBLIC_PATH=/
BEAVER_FRONTEND_INTERNAL_URL=http://127.0.0.1:4020

# Beaver API service.
BEAVER_API_HOST=127.0.0.1
BEAVER_API_PORT=4030
BEAVER_API_PUBLIC_PATH=/api
BEAVER_API_INTERNAL_URL=http://127.0.0.1:4030
BEAVER_API_PUBLIC_URL=http://127.0.0.1:4000/api

# Server-side Beaver data directory.
BEAVER_DATA_DIR=./data
BEAVER_STORE_DATA_FILE=./data/stores/data.json
BEAVER_STORE_SETTINGS_FILE=./data/stores/settings.json
BEAVER_NOTES_ASSETS_DIR=./data/notes-assets
BEAVER_FILE_ASSETS_DIR=./data/file-assets

# Frontend build-time URL. Browser code calls this path through the proxy.
VITE_BEAVER_API_URL=/api
VITE_BEAVER_ASSETS_URL=/assets
VITE_BEAVER_FILE_ASSETS_URL=/file-assets

# Optional CORS origin for local direct service testing.
CORS_ORIGIN=http://127.0.0.1:4000
```

Also copy this to `./project/.env` for local development, but never commit real production credentials.

---

## Service `.env.example` Files

Each subproject should include a minimal local `.env.example` pointing back to the root `.env` values or documenting its own direct variables.

### `project/rev-proxy/.env.example`

```env
# Usually loaded from ../.env in development.
HEAD_HOST=127.0.0.1
HEAD_PORT=4000
HEAD_PUBLIC_URL=http://127.0.0.1:4000

LOGIN_INTERNAL_URL=http://127.0.0.1:4010
BEAVER_FRONTEND_INTERNAL_URL=http://127.0.0.1:4020
BEAVER_API_INTERNAL_URL=http://127.0.0.1:4030

LOGIN_USERNAME=admin
LOGIN_PASSWORD=change-me
SESSION_COOKIE_NAME=beaver_session
SESSION_SECRET=replace-with-long-random-secret
SESSION_TTL_SECONDS=86400
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_SAMESITE=lax
```

### `project/login/.env.example`

```env
# Login app public path behind the reverse proxy.
VITE_LOGIN_PUBLIC_PATH=/login

# Login API endpoint handled by the reverse proxy.
VITE_LOGIN_POST_URL=/login
```

### `project/frontend/.env.example`

```env
# Browser-visible API URLs through the reverse proxy.
VITE_BEAVER_API_URL=/api
VITE_BEAVER_ASSETS_URL=/assets
VITE_BEAVER_FILE_ASSETS_URL=/file-assets
```

### `project/api/.env.example`

```env
BEAVER_API_HOST=127.0.0.1
BEAVER_API_PORT=4030
BEAVER_DATA_DIR=../data
BEAVER_STORE_DATA_FILE=../data/stores/data.json
BEAVER_STORE_SETTINGS_FILE=../data/stores/settings.json
BEAVER_NOTES_ASSETS_DIR=../data/notes-assets
BEAVER_FILE_ASSETS_DIR=../data/file-assets
CORS_ORIGIN=http://127.0.0.1:4000
```

---

## Reverse Proxy Design

### Responsibilities

`project/rev-proxy` must:

1. Serve `/health` locally.
2. Serve login routes:
   - `GET /login` -> proxy to login frontend.
   - `GET /login/*` -> proxy to login frontend assets.
   - `POST /login` -> validate credentials from `.env`, set session cookie, redirect to `/` or return JSON.
   - `POST /logout` -> clear session cookie.
3. Protect Beaver routes:
   - If no valid session, redirect browser requests to `/login`.
   - Return `401` JSON for unauthenticated API requests.
4. Proxy authenticated requests to Beaver frontend/API.
5. Preserve HTTP headers required for future WebSocket or streaming support, even if not needed initially.

### Session approach

Use signed or HMAC-protected cookies rather than server memory as the first implementation.

Cookie contents:

```json
{
  "u": "admin",
  "exp": 1710000000
}
```

Cookie signature:

```txt
base64url(payload).base64url(hmacSha256(payload, SESSION_SECRET))
```

Validation:

- cookie exists
- signature matches
- `exp` is not expired
- username matches `LOGIN_USERNAME`

Security settings:

- `HttpOnly=true`
- `SameSite=lax`
- `Secure` from `SESSION_COOKIE_SECURE`
- `Path=/`

---

## Login App Design

`project/login` is a small Vite app.

Routes:

- `/login` displays username/password form.

Form behavior:

- POST credentials to `/login`.
- On success, browser navigates to `/`.
- On failure, show a simple error.

No credentials are embedded in frontend code. The fixed username/password live only in `project/.env` and are checked by the reverse proxy.

Test cases:

- `GET /login` returns HTML.
- wrong credentials show failure.
- correct credentials set cookie and redirect to `/`.
- `/logout` clears cookie.

---

## Beaver API Design

`project/api` replaces Electron main IPC handlers with HTTP.

### API base

All endpoints are under `/api` publicly, but internally the API service can expose them without `/api` if the proxy rewrites paths.

Recommended public endpoints:

```txt
GET  /api/health
POST /api/ipc
GET  /api/assets/notes/:noteId/:fileName
GET  /api/assets/files/:noteId/:fileName
POST /api/upload/note-asset
POST /api/upload/file-asset
```

For fastest compatibility, implement `POST /api/ipc` first.

Request:

```json
{
  "channel": "storage:get",
  "payload": { "name": "data", "key": "notes", "def": [] }
}
```

Response:

```json
{
  "ok": true,
  "data": []
}
```

Error:

```json
{
  "ok": false,
  "error": "Unsupported channel"
}
```

This lets the frontend adapter preserve the current renderer call style:

```js
window.electron.ipcRenderer.callMain(channel, payload)
```

### IPC compatibility map

#### `storage:*`

Backed by JSON files under `project/data/stores`.

Required channels:

- `storage:store`
- `storage:replace`
- `storage:get`
- `storage:set`
- `storage:delete`
- `storage:has`
- `storage:clear`

Storage files:

- `data` -> `BEAVER_STORE_DATA_FILE`
- `settings` -> `BEAVER_STORE_SETTINGS_FILE`

Implementation detail:

- Use atomic writes: write temp file, then rename.
- Initialize missing store files as `{}`.
- Serialize writes through a per-file queue to avoid corrupting JSON when users click things with the furious optimism of humanity.

#### `fs:*`

Implement safe filesystem access inside `BEAVER_DATA_DIR` only.

Required channels:

- `fs:copy`
- `fs:output-json`
- `fs:read-json`
- `fs:ensureDir`
- `fs:pathExists`
- `fs:remove`
- `fs:writeFile`
- `fs:mkdir`
- `fs:readFile`
- `fs:readdir`
- `fs:stat`
- `fs:unlink`
- `fs:readData`
- `fs:isFile`

Safety rules:

- Normalize every path.
- Reject paths outside `BEAVER_DATA_DIR`.
- Reject absolute paths unless explicitly mapped to data dir aliases.
- Return browser-safe metadata for `stat` instead of raw Node objects if needed.

#### `safeStorage:*`

Electron safeStorage does not exist in the browser/server pairing.

Implement:

- `safeStorage:isEncryptionAvailable` -> `true`
- `safeStorage:encryptString` -> AES-GCM or libsodium-compatible encryption using `SESSION_SECRET` or a separate `BEAVER_ENCRYPTION_KEY`
- `safeStorage:decryptString` -> reverse encryption
- `safeStorage:getSelectedStorageBackend` -> `'server'`

Add optional env:

```env
BEAVER_ENCRYPTION_KEY=replace-with-32-byte-base64-key
```

#### `dialog:*`

Desktop dialogs do not exist in the browser.

Plan:

- Replace import/export flows with browser file picker and download APIs where possible.
- For unsupported direct filesystem folder selection, return `{ canceled: true, filePaths: [] }` initially.
- Later implement explicit upload/download UI.

Channels:

- `dialog:open`
- `dialog:message`
- `dialog:save`

Initial behavior:

- `dialog:message` returns success and logs message server-side.
- `dialog:open` returns canceled unless a frontend-specific browser file picker path is implemented.
- `dialog:save` returns canceled unless replaced with browser download.

#### `app:*`, `theme:*`, update, fonts, PDF

Implement safe no-op or browser-compatible responses:

- `app:info` -> return app name/version/platform-ish values.
- `app:notification` -> no-op or return `{ success: true }`.
- `app:spellcheck` -> no-op.
- `app:set-zoom` -> store setting or no-op.
- `app:get-zoom` -> return stored/default `1`.
- `app:change-menu-visibility` -> no-op.
- `theme:set` -> no-op.
- `helper:get-path` -> return mapped server data paths only.
- `helper:is-dark-theme` -> return false or use stored setting.
- `get-system-fonts` -> return safe default font list.
- `print-pdf` -> browser print fallback in frontend, API no-op initially.
- updater calls -> disabled responses.

---

## Beaver Frontend Design

`project/frontend` must be a browser-first copy/adaptation of `packages/renderer`.

### Required changes

1. Copy renderer app from `./local/Beaver-Notes/packages/renderer`.
2. Add `src/electron-web-adapter.js` loaded before the app starts.
3. Ensure `window.electron` exists in browser.
4. Replace Electron IPC calls with `fetch(VITE_BEAVER_API_URL + '/ipc')`.
5. Replace custom protocols:
   - `assets://...` -> `/assets/...` or `/api/assets/notes/...`
   - `file-assets://...` -> `/file-assets/...` or `/api/assets/files/...`
6. Remove or guard update/desktop-only UI where possible.
7. Keep Vite `base: ''` or set it from env if serving under `/`.

### Browser adapter shape

`electron-web-adapter.js` should provide:

```js
window.electron = {
  path: browserPathShim,
  clipboard: browserClipboardShim,
  notification: browserNotificationShim,
  access: async () => true,
  versions: { chrome: navigator.userAgent, web: true },
  addCloseFn: () => {},
  onFileOpened: () => {},
  ipcRenderer: {
    callMain: async (channel, payload) => {
      const res = await fetch(`${apiUrl}/ipc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ channel, payload }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'IPC call failed');
      return json.data;
    },
    answerMain: () => {},
    on: () => {},
  },
};
```

### Path shim

Implement browser equivalents for the subset used:

- `join(...parts)`
- `parse(fileName)`
- `basename(path)`
- `dirname(path)`
- `extname(path)`

These should operate on POSIX-style `/` paths.

---

## Data Model

Initial server-side storage should mimic Electron Store behavior.

Files:

```txt
project/data/stores/data.json
project/data/stores/settings.json
project/data/notes-assets/
project/data/file-assets/
```

Initialize:

```json
{}
```

Asset URLs:

| Original Electron protocol | Web replacement |
| --- | --- |
| `assets://noteId/image.png` | `/assets/noteId/image.png` |
| `file-assets://noteId/file.pdf` | `/file-assets/noteId/file.pdf` |

API must enforce that assets only resolve within configured asset directories.

---

## Build and Run Commands

Root `project/package.json` should provide:

```json
{
  "scripts": {
    "install:all": "npm --prefix rev-proxy install && npm --prefix login install && npm --prefix frontend install && npm --prefix api install",
    "dev": "concurrently \"npm --prefix api run dev\" \"npm --prefix login run dev\" \"npm --prefix frontend run dev\" \"npm --prefix rev-proxy run dev\"",
    "build": "npm --prefix api run build && npm --prefix login run build && npm --prefix frontend run build && npm --prefix rev-proxy run build",
    "start": "concurrently \"npm --prefix api start\" \"npm --prefix login start\" \"npm --prefix frontend start\" \"npm --prefix rev-proxy start\"",
    "test": "npm --prefix api test && npm --prefix rev-proxy test"
  },
  "devDependencies": {
    "concurrently": "^9.0.0"
  }
}
```

For production, prefer process manager units instead of `concurrently`:

- `beaver-api.service`
- `beaver-login.service`
- `beaver-frontend.service`
- `beaver-rev-proxy.service`

---

# Phases and Milestones

## Phase 0: Project Skeleton

### Objective

Create `./project/` with the four services and shared env/data layout.

### Tasks

- Create directory tree.
- Copy `./local/rev-proxy` into `./project/rev-proxy`.
- Create `./project/api` Node/TypeScript service.
- Create `./project/login` Vite app.
- Create `./project/frontend` from Beaver renderer.
- Create root `.env.example` and local `.env`.
- Add all service-level `.env.example` files.
- Add root README with local startup instructions.

### Completion tests

- `find ./project -maxdepth 3 -type f` shows all expected files.
- `npm --prefix ./project/rev-proxy run typecheck` passes.
- `npm --prefix ./project/api run typecheck` passes.
- `.env.example` documents every host, port, and URL.

### Milestone

`./project` exists and can be installed locally without Beaver-specific code running yet.

---

## Phase 1: Reverse Proxy with Auth Gate

### Objective

Make the reverse proxy the only public entrypoint and enforce login.

### Tasks

- Load root `.env` from `../.env` or `./project/.env`.
- Implement cookie session helpers.
- Add `GET /health`.
- Add `POST /login` credential validation.
- Add `POST /logout` cookie clearing.
- Proxy `/login/*` to login app without auth.
- Proxy `/api/*`, `/assets/*`, `/file-assets/*`, and `/` only after auth.
- Return redirect for browser HTML requests and JSON `401` for API requests.

### Completion tests

- `curl http://127.0.0.1:4000/health` returns `{ ok: true }`.
- `curl http://127.0.0.1:4000/` redirects to `/login` without cookie.
- wrong login does not set session.
- correct login sets `beaver_session` cookie.
- authenticated `/` proxies to frontend service.
- unauthenticated `/api/health` returns `401` JSON.

### Milestone

The head server protects all non-login Beaver routes.

---

## Phase 2: Login App

### Objective

Provide a simple browser login screen.

### Tasks

- Create Vite login app.
- Add username/password form.
- POST credentials to `/login`.
- Redirect to `/` on success.
- Show inline error on failed login.
- Add minimal styling.
- Add logout helper link or route documentation.

### Completion tests

- `GET /login` renders login UI through proxy.
- invalid credentials show error.
- valid credentials redirect to `/`.
- browser devtools confirms cookie is HttpOnly and path `/`.

### Milestone

A user can log in from the web and receive a proxy session.

---

## Phase 3: Beaver API Compatibility Layer

### Objective

Implement enough Electron IPC replacement for core note storage to work.

### Tasks

- Create Express API service.
- Add `/health`.
- Add `POST /ipc` dispatch endpoint.
- Implement `storage:*` channels.
- Implement basic `fs:*` channels scoped to `BEAVER_DATA_DIR`.
- Implement asset serving for notes and file assets.
- Implement safe no-ops for desktop-only channels.
- Add JSON file locking or serialized write queue.
- Add path traversal protection.

### Completion tests

- `curl http://127.0.0.1:4030/health` returns OK.
- `storage:set` followed by `storage:get` returns same value.
- `storage:replace` replaces entire store.
- `fs:writeFile` cannot write outside `BEAVER_DATA_DIR`.
- `fs:read-json` reads created JSON.
- `/assets/test/file.png` cannot escape asset dir with `../`.
- unsupported IPC returns structured error.

### Milestone

API can mimic the core Electron backend behavior needed by Beaver renderer.

---

## Phase 4: Beaver Frontend Browser Adapter

### Objective

Make Beaver renderer run in a normal browser by replacing `window.electron`.

### Tasks

- Copy `packages/renderer` into `project/frontend`.
- Add `electron-web-adapter.js` before app initialization.
- Configure `VITE_BEAVER_API_URL`.
- Implement `ipcRenderer.callMain` using `/api/ipc`.
- Implement minimal path shim.
- Implement clipboard shim using browser Clipboard API.
- Implement notification shim using browser Notification API or no-op.
- Guard updater UI and desktop-only operations.
- Convert asset protocols to web URLs.

### Completion tests

- `npm --prefix ./project/frontend run dev` starts.
- Browser console has no fatal `window.electron is undefined` error.
- frontend calls `/api/ipc` for storage operations.
- creating a note writes data to `project/data/stores/data.json`.
- reloading the page keeps notes.
- deleting a note removes related asset directories if applicable.

### Milestone

Beaver Notes opens in browser and basic create/edit/delete note operations persist.

---

## Phase 5: File, Image, Import, Export, and Asset Support

### Objective

Make note attachments and imports work reasonably in a browser environment.

### Tasks

- Replace desktop file dialog flows with browser file inputs where needed.
- Upload note images through API.
- Upload file attachments through API.
- Serve attached files through `/file-assets`.
- Export Markdown/HTML/BEA using browser downloads rather than server folder dialogs.
- Import Markdown/BEA using browser upload.
- Disable or defer direct external file opening if browser security blocks it.

### Completion tests

- Add image to note, reload, image still renders.
- Add file to note, reload, file link still exists.
- Export note as Markdown downloads a file.
- Import Markdown creates a note.
- Import/export cannot read arbitrary server files.

### Milestone

The app is usable as a personal browser notes app, not merely a pretty static corpse.

---

## Phase 6: Production Deployment Preparation

### Objective

Make the project deployable to a server.

### Tasks

- Add production build commands.
- Add systemd unit examples.
- Add Nginx/Caddy optional outer TLS reverse-proxy notes.
- Set `SESSION_COOKIE_SECURE=true` for HTTPS deployment.
- Document backup strategy for `project/data`.
- Add log locations and rotation recommendations.
- Add health checks for all services.

### Completion tests

- `npm run build` succeeds at root.
- production services start independently.
- head URL serves `/login` unauthenticated.
- login grants access to `/`.
- data persists across service restart.
- backup and restore of `project/data` works.

### Milestone

Ready to deploy on a real server without doing interpretive dance over SSH.

---

# Whole-Plan Checklist

## Structure

- [ ] `./project/rev-proxy` exists.
- [ ] `./project/login` exists.
- [ ] `./project/frontend` exists.
- [ ] `./project/api` exists.
- [ ] `./project/data` exists.
- [ ] root `./project/.env.example` exists with comments.
- [ ] every service has a `.env.example`.

## Configuration

- [ ] Reverse proxy host and port are env-driven.
- [ ] Login host and port are env-driven.
- [ ] Beaver frontend host and port are env-driven.
- [ ] Beaver API host and port are env-driven.
- [ ] Frontend API URL is env-driven.
- [ ] Login credentials are env-driven.
- [ ] Session secret and cookie settings are env-driven.
- [ ] Data paths are env-driven.

## Authentication

- [ ] `/login` is public.
- [ ] `/health` is public.
- [ ] `/` requires login.
- [ ] `/api/*` requires login.
- [ ] `/assets/*` requires login.
- [ ] `/file-assets/*` requires login.
- [ ] successful login sets HttpOnly cookie.
- [ ] logout clears cookie.

## Beaver Compatibility

- [ ] `window.electron` browser adapter exists.
- [ ] `storage:*` channels work.
- [ ] `fs:*` channels are implemented safely.
- [ ] `safeStorage:*` channels work or return safe compatibility values.
- [ ] desktop-only APIs are no-op or browser alternatives.
- [ ] asset protocols are converted to web URLs.
- [ ] notes persist after reload.

## Security

- [ ] No credentials bundled into frontend.
- [ ] API rejects path traversal.
- [ ] API restricts filesystem operations to `BEAVER_DATA_DIR`.
- [ ] cookies are HttpOnly.
- [ ] production uses HTTPS and secure cookies.
- [ ] `.env` is ignored by git.
- [ ] `project/data` backup process is documented.

## Testing

- [ ] reverse proxy auth tests pass.
- [ ] login tests pass.
- [ ] API storage tests pass.
- [ ] API filesystem safety tests pass.
- [ ] frontend adapter smoke test passes.
- [ ] end-to-end login -> create note -> reload -> note persists passes.
- [ ] server restart persistence test passes.

---

## Recommended Implementation Order

1. Phase 0: skeleton and env files.
2. Phase 1: auth reverse proxy.
3. Phase 2: login app.
4. Phase 3: API compatibility for `storage:*` only.
5. Phase 4: frontend adapter, prove note persistence.
6. Extend API `fs:*` and asset handling.
7. Implement file import/export behavior.
8. Production deployment polish.

Do not start by porting every Electron feature. Start with storage and basic note editing first. This app has enough Electron tentacles to cosplay as infrastructure debt.
