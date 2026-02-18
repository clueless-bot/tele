ALTER TABLE "short_links" ADD COLUMN "fileUrl" text NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" DROP COLUMN IF EXISTS "verified";