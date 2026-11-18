import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicErrorMessage } from '../src/utils/publicError.js';
test('HTTP messages retain domain errors but redact database internals', () => {
  assert.equal(publicErrorMessage(new Error('Marksheet must be unlocked'), 'Failed'), 'Marksheet must be unlocked');
  assert.equal(publicErrorMessage({ message: 'Failed query: select password_hash from users' }, 'Failed'), 'Failed');
  assert.equal(publicErrorMessage({ code: '23505', message: 'secret constraint detail' }, 'Failed'), 'Failed');
  assert.equal(publicErrorMessage({ cause: new Error('private'), message: 'Database failed' }, 'Failed'), 'Failed');
});

test('server errors do not dump sensitive SQL arguments', async () => {
  const { logServerError } = await import('../src/utils/publicError.js');
  const original = console.error;
  const lines: string[] = [];
  try {
    console.error = (...values) => lines.push(JSON.stringify(values));
    logServerError('Saving staff failed', { name: 'DrizzleQueryError', query: 'private SQL', params: ['SECRET_PASSWORD_HASH'], cause: { code: '23505' } });
    assert(!lines.join('').includes('SECRET_PASSWORD_HASH'));
    assert(!lines.join('').includes('private SQL'));
    assert(lines.join('').includes('23505'));
  } finally { console.error = original; }
});
