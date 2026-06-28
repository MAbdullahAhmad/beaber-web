import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionCookie } from '../src/session.js';
test('session cookie is signed', () => assert.match(createSessionCookie('admin'), /^[^.]+\.[^.]+$/));
