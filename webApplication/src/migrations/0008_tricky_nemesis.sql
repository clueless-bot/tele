CREATE TABLE "uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"thumbnail" varchar(500),
	"language" varchar(50) NOT NULL,
	"input_link" varchar(500) NOT NULL,
	"output_link" varchar(500),
	"channel_data_subscription" json,
	"subscription_status" boolean DEFAULT false
);
