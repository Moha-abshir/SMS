import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from the apps/api directory
dotenv.config({ path: path.resolve(__dirname, '../../apps/api/.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is missing. Create apps/api/.env with your Neon DATABASE_URL.');
}

export default defineConfig({
  schema: './src/db/schema/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
