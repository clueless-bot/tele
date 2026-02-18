import dotenv from 'dotenv';
import path from 'path';
import pkg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

dotenv.config({
  path: path.join(process.cwd(), '.env'),
});

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

// Export pool for direct queries when needed
export { pool };

export function getDbInstance() {
  return db;
}

export async function connectWithDB() {
  try {
    await pool.connect();
    // await db.execute(sql`SELECT NOW()`);
    console.log('> Database connection Successful!');

    console.log('> Running Migrations...');
    await migrate(db, { migrationsFolder: './migrations' });
    console.log('> Migrations Complete.\n');

  } catch (error) {
    console.log('[database]: failed to connect with db, ' + error);
    throw error;
  }
}

export default db;
