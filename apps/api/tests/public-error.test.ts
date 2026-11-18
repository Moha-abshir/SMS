import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicErrorMessage } from '../src/utils/publicError.js';
test('HTTP messages retain domain errors but redact database internals', () => {
  assert.equal(publicErrorMessage(new Error('Marksheet must be unlocked'), 'Failed'), 'Marksheet must be unlocked');
  assert.equal(publicErrorMessage({ message: 'Failed query: select password_hash from users' }, 'Failed'), 'Failed');
  assert.equal(publicErrorMessage({ code: '23505', message: 'secret constraint detail' }, 'Failed'), 'Failed');
  assert.equal(publicErrorMessage({ cause: new Error('private'), message: 'Database failed' }, 'Failed'), 'Failed');
});
