import 'dotenv/config';
import process from 'process';

export default {
  schema: './src/database/schema.js',
  out: './migrations',
  // driver: 'pg',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};