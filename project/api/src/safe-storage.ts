import crypto from 'node:crypto';
import { config } from './config.js';
const key = () => crypto.createHash('sha256').update(config.security.encryptionKey).digest();
export function encryptString(plainText: string): string { const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv); const enc = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]); return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64'); }
export function decryptString(encryptedBase64: string): string { const raw = Buffer.from(String(encryptedBase64), 'base64'); const decipher = crypto.createDecipheriv('aes-256-gcm', key(), raw.subarray(0,12)); decipher.setAuthTag(raw.subarray(12,28)); return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8'); }
