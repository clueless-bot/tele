CREATE TABLE IF NOT EXISTS "channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"owner" integer,
	"phone_number" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "short_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"channel" integer,
	"magnet" text NOT NULL,
	"clicks" integer DEFAULT 0,
	"created_at" timestamp DEFAULT NOW(),
	CONSTRAINT "short_links_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100),
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT NOW(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "channels" ADD CONSTRAINT "channels_owner_users_id_fk" FOREIGN KEY ("owner") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "short_links" ADD CONSTRAINT "short_links_channel_channels_id_fk" FOREIGN KEY ("channel") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
