import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

process.env.TZ = process.env.TZ || 'Africa/Nairobi';

export const env = {
  PORT: process.env.PORT || '5000',
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/school_db',
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-jwt-key-eldoret-muslim-academy-2026',
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
 * Resolves the frontend URL dynamically from the incoming request or environment,
 * strictly guaranteeing that all system outgoing links use Cloudflare Pages (.pages.dev)
 * and never old .vercel.app links.
 */
export function resolveFrontendUrl(req?: any): string {
  if (req && req.headers) {
    const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
    if (origin) {
      const cleanOrigin = origin.replace(/\/$/, '');
      if (!cleanOrigin.includes('vercel.app')) {
        return cleanOrigin;
      }
    }
  }

  const envUrl = process.env.FRONTEND_URL?.trim().replace(/\/$/, '');
  if (envUrl && !envUrl.includes('vercel.app')) {
    return envUrl;
  }

  return env.DEFAULT_FRONTEND_URL;
}

