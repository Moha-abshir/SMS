import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { authenticate, invalidateUserSessionCache } from '../src/middleware/auth.js';
import { db } from '../src/config/db.js';
import { env } from '../src/config/env.js';

test('session middleware rejects revoked/malformed claims and fails closed on database outage', async () => {
  const original = db.select;
  let failure = false;
  (db as any).select = () => ({ from: () => ({ where: async () => {
    if (failure) throw new Error('database unavailable');
    return [{ tokenVersion: 2, isActive: true }];
  } }) });
  const run = async (claims: object) => {
    invalidateUserSessionCache('test-user');
    let status = 200;
    let admitted = false;
    const res = { status(code: number) { status = code; return this; }, json() { return this; } };
    const token = jwt.sign(claims, env.JWT_SECRET);
    await authenticate({ headers: { authorization: `Bearer ${token}` } } as any, res as any, () => { admitted = true; });
    return { status, admitted };
  };
  try {
    assert.deepEqual(await run({ id: 'test-user', tokenVersion: 2 }), { status: 200, admitted: true });
    assert.deepEqual(await run({ id: 'test-user', tokenVersion: 0 }), { status: 401, admitted: false });
    assert.deepEqual(await run({ id: 'test-user' }), { status: 401, admitted: false });
    failure = true;
    assert.deepEqual(await run({ id: 'test-user', tokenVersion: 2 }), { status: 503, admitted: false });
  } finally { db.select = original; invalidateUserSessionCache('test-user'); }
});
