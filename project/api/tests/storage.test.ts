import test from 'node:test';
import assert from 'node:assert/strict';
import { storageCall } from '../src/storage-store.js';
test('storage set/get works', async () => { await storageCall('set', { name:'data', key:'test-key', value:{ ok:true } }); assert.deepEqual(await storageCall('get', { name:'data', key:'test-key', def:null }), { ok:true }); });
