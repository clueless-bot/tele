CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_id" integer,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT NOW()
);
--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE CASCADE ON UPDATE no action;