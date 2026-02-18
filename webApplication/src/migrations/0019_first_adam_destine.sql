ALTER TABLE "uploads" DROP CONSTRAINT "uploads_admin_id_channels_id_fk";
--> statement-breakpoint
ALTER TABLE "uploads" DROP CONSTRAINT "uploads_customer_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "uploads" ALTER COLUMN "customer_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_admin_id_channels_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."channels"("id") ON DELETE CASCADE ON UPDATE no action; --> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE no action;