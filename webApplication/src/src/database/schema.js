import { pgTable, serial, text, integer, timestamp, varchar, bigint } from 'drizzle-orm/pg-core';
import { boolean, json } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
// Removed bytea import as we're now using text for base64 storage

export const shortLinks = pgTable('short_links', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  title: text("title").notNull(),
  channel: integer('channel').references(() => channels.id, { onDelete: 'CASCADE' }),
  magnet: text('magnet').notNull(),
  language: text('language').notNull(),
  fileUrl: text('fileUrl'),
  clicks: integer('clicks').default(0),
  createdAt: timestamp('created_at', { mode: 'string' }).default(sql`NOW()`)
});

export const channels = pgTable('channels', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  username: varchar('username', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phoneNumber: varchar('phone_number', { length: 12 }).notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  otp: varchar("otp"),
  createdAt: timestamp('created_at', { mode: 'string' }).default(sql`NOW()`),
  profile_image: varchar("profile_image", { length: 255 }), 
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  otp: varchar("otp"),
  password: varchar('password', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).default(sql`NOW()`),
});

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  channelId: integer('channel_id').notNull().references(() => channels.id),
  createdAt: timestamp('created_at', { mode: 'string' }).default(sql`NOW()`),
});

export const uploads = pgTable('uploads', {
  id: serial('id').primaryKey(),
  admin_id: integer('admin_id' , { mode: 'int' }).notNull().references(() => channels.id),
  customer_ids: integer(('customer_ids'), { mode: 'number' }).array(),
  thumbnail: text('thumbnail').notNull(), // Changed from bytea to text for base64 storage
  title: varchar('title', { length: 255 }).notNull(),
  input_link: text('input_link').notNull(),
  language: varchar('language', { length: 50 }).notNull(),
  description: text('description').notNull(),
  tags: varchar('tags', { length: 500 }),
  output_link: varchar('output_link', { length: 500 }),
  createdAt: timestamp('created_at', { mode: 'string' }).default(sql`NOW()`), // Add this line
  subscription_status: boolean('subscription_status').default(false)
});

// export const uploads = pgTable('uploads', {
//   id: serial('id').primaryKey(),
//   admin_id: bigint('admin_id', { mode: 'bigint' }).notNull().references(() => channels.id, { onDelete: 'CASCADE' }),
//   customer_id: bigint('customer_id', { mode: 'bigint' }).references(() => users.id, { onDelete: 'CASCADE' }),
//   thumbnail: bytea('thumbnail').notNull(),
//   title: varchar('title', { length: 255 }).notNull(),
//   input_link: varchar('input_link', { length: 500 }).notNull(),
//   language: varchar('language', { length: 50 }).notNull(),
//   description: text('description').notNull(),
//   tags: varchar('tags', { length: 500 }),
//   output_link: varchar('output_link', { length: 500 }),
//   subscription_status: boolean('subscription_status').default(false),
// });

// export const files = pgTable('files', {

//   id: serial('id').primaryKey(),
//   thumbnail: bytea('thumbnail').notNull(),
//   filename: text('filename').notNull()
// });

export const feedback = pgTable('feedback', {
  id: serial('id').primaryKey(),
  channelId: integer('channel_id').references(() => channels.id),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').default(sql`NOW()`),
});
