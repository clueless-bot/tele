ALTER TABLE "files" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "files" CASCADE;--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "phone_number" SET DATA TYPE varchar(12);--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "description" text NOT NULL;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "tags" varchar(500);--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_admin_id_channels_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;