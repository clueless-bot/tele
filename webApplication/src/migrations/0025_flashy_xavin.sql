ALTER TABLE "uploads" DROP CONSTRAINT "uploads_customer_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "uploads"
ALTER COLUMN customer_id TYPE INTEGER[] 
USING ARRAY[customer_id]::INTEGER[];
ALTER TABLE "uploads" ALTER COLUMN "customer_id" DROP NOT NULL;