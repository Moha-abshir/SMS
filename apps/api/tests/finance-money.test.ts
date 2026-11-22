import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cents, money } from '../src/modules/finance/financeRules.js';
test('financial amounts use exact minor units and reject malformed or unsupported values', () => {
  assert.equal(money(cents('0.10') + cents('0.20')), '0.30');
  assert.equal(cents('99999999.99'), 9999999999);
  assert.equal(cents('0', true), 0);
  assert.equal(money(-125), '-1.25');
  for (const amount of [
    '',
    '-1',
    '1.001',
    '1e3',
    'Infinity',
    '100000000.00',
    '2cats',
    NaN,
    Infinity,
    null,
    undefined,
  ])
    assert.throws(() => cents(amount));
  assert.throws(() => cents('0'));
});
