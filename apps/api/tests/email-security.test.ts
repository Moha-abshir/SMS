import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFrontendUrl, env } from '../src/config/env.js';
import { EmailService } from '../src/services/email.service.js';

test('recovery links ignore attacker-controlled origins and malformed referrers', () => {
  const fallback = process.env.FRONTEND_URL?.trim().replace(/\/$/, '') || env.DEFAULT_FRONTEND_URL;
  assert.equal(resolveFrontendUrl({ headers: { referer: 'https://attacker.example/reset' } }), fallback);
  assert.equal(resolveFrontendUrl({ headers: { origin: 'https://attacker.example' } }), fallback);
  assert.equal(resolveFrontendUrl({ headers: { referer: 'not a URL' } }), fallback);
});

test('failed email delivery returns failure and never logs the OTP', async () => {
  const originalKey = env.BREVO_API_KEY;
  const transporter = (EmailService as any).smtpTransporter;
  const originalSend = transporter.sendMail;
  const log = console.log;
  const logs: string[] = [];
  try {
    env.BREVO_API_KEY = '';
    transporter.sendMail = async () => { throw new Error('test SMTP outage'); };
    console.log = (...args) => { logs.push(args.join(' ')); };
    assert.equal(await EmailService.sendOtpEmail('fixture@example.test', 'Fixture', 'SECRET_TEST_CODE'), false);
    assert(!logs.some(line => line.includes('SECRET_TEST_CODE')));
  } finally { env.BREVO_API_KEY = originalKey; transporter.sendMail = originalSend; console.log = log; }
});
