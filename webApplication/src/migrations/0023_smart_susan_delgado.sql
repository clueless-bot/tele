ALTER TABLE "feedback" DROP CONSTRAINT "feedback_channel_id_channels_id_fk";
--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;