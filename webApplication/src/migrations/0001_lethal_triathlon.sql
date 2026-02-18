ALTER TABLE "channels" RENAME COLUMN "owner" TO "email";--> statement-breakpoint
ALTER TABLE "channels" DROP CONSTRAINT "channels_owner_users_id_fk";
--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "email" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "password" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "otp" varchar;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_email_unique" UNIQUE("email");