import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

process.env.TZ = process.env.TZ || 'Africa/Nairobi';

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === 'super-secret-jwt-key-eldoret-muslim-academy-2026')) {
  throw new Error('Production requires a JWT_SECRET of at least 32 characters');
}

export const env = {
  PORT: process.env.PORT || '5000',
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/school_db',
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-jwt-key-eldoret-muslim-academy-2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '90d',
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || 'noreply@school.co.ke',
  SMTP_HOST: process.env.SMTP_HOST || 'localhost',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '1025', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  AFRICAS_TALKING_USERNAME: process.env.AFRICAS_TALKING_USERNAME || 'sandbox',
  AFRICAS_TALKING_API_KEY: process.env.AFRICAS_TALKING_API_KEY || '',
  DEFAULT_FRONTEND_URL: 'https://sms-eldoret.pages.dev',
};

/**
 * Restricts security-email link destinations to configured/trusted frontends.
 * Untrusted Origin/Referer values cannot redirect recovery links to another site.
 */
export function resolveFrontendUrl(req?: any): string {
  const configured = process.env.FRONTEND_URL?.trim().replace(/\/$/, '') || env.DEFAULT_FRONTEND_URL;
  const trusted = new Set([configured, env.DEFAULT_FRONTEND_URL]);
  if (process.env.NODE_ENV !== 'production') {
    for (const host of ['localhost', '127.0.0.1']) for (const port of [3000, 5173, 5174]) trusted.add(`http://${host}:${port}`);
  }
  const candidate = req?.headers?.origin || req?.headers?.referer;
  if (typeof candidate === 'string') {
    try {
      const origin = new URL(candidate).origin;
      if (trusted.has(origin)) return origin;
    } catch { /* Invalid client headers cannot select an email-link destination. */ }
  }
  return configured;
}
