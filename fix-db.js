import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

async function fix() {
  try {
    console.log('Fixing DB...');
    await sql.unsafe(`
      ALTER TABLE roles ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
      ALTER TABLE permissions ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
      
      -- Add new columns to users safely
      ALTER TABLE users ADD COLUMN IF NOT EXISTS national_id VARCHAR(50);
      UPDATE users SET national_id = 'TEST-' || substr(id::text, 1, 8) WHERE national_id IS NULL;
      ALTER TABLE users ALTER COLUMN national_id SET NOT NULL;
      
      -- Drop constraint if exists to avoid error on multiple runs, then add it
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_national_id_unique;
      ALTER TABLE users ADD CONSTRAINT users_national_id_unique UNIQUE (national_id);
      
      ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS tsc_number VARCHAR(50);
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tsc_number_unique;
      ALTER TABLE users ADD CONSTRAINT users_tsc_number_unique UNIQUE (tsc_number);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS salary_payment_day INTEGER;
    `);
    
    await sql.unsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;`);
    
    // Also, drop the old percentage column if it exists in cat_scores so Drizzle stops asking if we renamed it
    await sql`ALTER TABLE cat_scores DROP COLUMN IF EXISTS percentage;`;
    
    console.log('Done fixing DB.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

fix();
