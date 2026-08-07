import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: process.env.PORT || '5000',
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/school_db',
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-jwt-key-eldoret-muslim-academy-2026',
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || 'noreply@school.co.ke',
  AFRICAS_TALKING_USERNAME: process.env.AFRICAS_TALKING_USERNAME || 'sandbox',
  AFRICAS_TALKING_API_KEY: process.env.AFRICAS_TALKING_API_KEY || '',
};
