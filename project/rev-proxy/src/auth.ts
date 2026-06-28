import type { NextFunction, Request, Response } from 'express';
import { readSession, wantsJson } from './session.js';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (readSession(req)) return next();
  if (wantsJson(req)) {
    res.status(401).json({ ok: false, error: 'Login required' });
    return;
  }
  res.redirect('/login/');
}
