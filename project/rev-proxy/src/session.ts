import crypto from 'node:crypto';
import { parse, serialize } from 'cookie';
import type { Request, Response } from 'express';
import { config } from './config.js';
type Payload = { u: string; exp: number };
const sign = (payload: string) => crypto.createHmac('sha256', config.session.secret).update(payload).digest('base64url');
const eq = (a: string, b: string) => Buffer.byteLength(a) === Buffer.byteLength(b) && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
export function createSessionCookie(username: string): string { const payload = Buffer.from(JSON.stringify({ u: username, exp: Math.floor(Date.now()/1000)+config.session.ttlSeconds } satisfies Payload)).toString('base64url'); return `${payload}.${sign(payload)}`; }
export function readSession(req: Request): Payload | null { const token = parse(req.headers.cookie || '')[config.session.cookieName]; if (!token) return null; const [payload, sig] = token.split('.'); if (!payload || !sig || !eq(sig, sign(payload))) return null; try { const p = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Payload; if (p.u !== config.login.username || p.exp < Math.floor(Date.now()/1000)) return null; return p; } catch { return null; } }
export function setSession(res: Response, username: string): void { res.setHeader('Set-Cookie', serialize(config.session.cookieName, createSessionCookie(username), { httpOnly:true, secure:config.session.secure, sameSite:config.session.sameSite, path:'/', maxAge:config.session.ttlSeconds })); }
export function clearSession(res: Response): void { res.setHeader('Set-Cookie', serialize(config.session.cookieName, '', { httpOnly:true, secure:config.session.secure, sameSite:config.session.sameSite, path:'/', maxAge:0 })); }
export const wantsJson = (req: Request) => req.originalUrl.startsWith('/api') || String(req.headers.accept || '').includes('application/json');
