ALTER TABLE "storm_events" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "storm_events" ADD COLUMN "lng" double precision;--> statement-breakpoint
ALTER TABLE "storm_events" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "storm_events" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "storm_events" ADD COLUMN "discovery_sent" boolean DEFAULT false NOT NULL;