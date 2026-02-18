// src/database/bytea.js
import { customType } from 'drizzle-orm/pg-core';

export const bytea = customType({
  dataType: () => 'bytea',
  fromDriver: (value) => {
    if (value instanceof Uint8Array) {
      return Buffer.from(value);
    }
    if (Buffer.isBuffer(value)) {
      return value;
    }
    throw new Error('Expected Uint8Array or Buffer from database');
  },
  toDriver: (value) => {
    // node-postgres accepts Buffer directly for bytea, which is more reliable
    if (Buffer.isBuffer(value)) {
      return value; // Return Buffer directly for node-postgres
    }
    if (value instanceof Uint8Array) {
      return Buffer.from(value);
    }
    throw new Error('Expected Buffer or Uint8Array for bytea column');
  }
});
