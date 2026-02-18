// Quick script to fix thumbnail column type
// Run with: node fix-thumbnail-column.js

import dotenv from 'dotenv';
import path from 'path';
import pkg from 'pg';

dotenv.config({
  path: path.join(process.cwd(), '.env'),
});

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixThumbnailColumn() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('Changing thumbnail column from VARCHAR(500) to TEXT...');
    await client.query(`
      ALTER TABLE uploads 
      ALTER COLUMN thumbnail TYPE TEXT;
    `);
    
    console.log('✅ Successfully changed thumbnail column to TEXT!');
    
    // Verify the change
    const result = await client.query(`
      SELECT data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'uploads' 
      AND column_name = 'thumbnail';
    `);
    
    console.log('Column info:', result.rows[0]);
    
    client.release();
    await pool.end();
    console.log('Done! You can now restart your server.');
  } catch (error) {
    console.error('Error fixing column:', error);
    process.exit(1);
  }
}

fixThumbnailColumn();

