import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

async function fix() {
  try {
    console.log('Fixing DB...');
    await sql`ALTER TABLE roles ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;`;
    await sql`ALTER TABLE permissions ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;`;
    
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
