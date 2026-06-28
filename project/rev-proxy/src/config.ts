import dotenv from 'dotenv';
import { resolve } from 'node:path';
dotenv.config({ path: resolve(process.cwd(), '../.env') });
dotenv.config();
const s = (k: string, d: string) => process.env[k] || d;
const n = (k: string, d: number) => Number.parseInt(process.env[k] || String(d), 10);
const b = (k: string, d: boolean) => process.env[k] == null ? d : ['1','true','yes','on'].includes(String(process.env[k]).toLowerCase());
export const config = {
  head: { host: s('HEAD_HOST','127.0.0.1'), port: n('HEAD_PORT',4000), publicUrl: s('HEAD_PUBLIC_URL','http://127.0.0.1:4000') },
  login: { internalUrl: s('LOGIN_INTERNAL_URL','http://127.0.0.1:4010'), username: s('LOGIN_USERNAME','admin'), password: s('LOGIN_PASSWORD','change-me') },
  session: { cookieName: s('SESSION_COOKIE_NAME','beaver_session'), secret: s('SESSION_SECRET','dev-secret'), ttlSeconds: n('SESSION_TTL_SECONDS',86400), secure: b('SESSION_COOKIE_SECURE',false), sameSite: s('SESSION_COOKIE_SAMESITE','lax') as 'lax'|'strict'|'none' },
  upstreams: { frontend: s('BEAVER_FRONTEND_INTERNAL_URL','http://127.0.0.1:4020'), api: s('BEAVER_API_INTERNAL_URL','http://127.0.0.1:4030') }
};
