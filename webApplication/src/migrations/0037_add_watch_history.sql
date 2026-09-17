CREATE TABLE IF NOT EXISTS "watch_history" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "upload_id" integer REFERENCES "uploads"("id") ON DELETE SET NULL,
  "content_key" text NOT NULL,
  "title" varchar(255) NOT NULL,
  "thumbnail" text,
  "input_link" text,
  "output_link" text,
  "description" text,
  "language" varchar(50),
  "watched_at" timestamp DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "watch_history_user_content_key_idx"
  ON "watch_history" ("user_id", "content_key");
