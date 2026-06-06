DROP INDEX "service_areas_zip_idx";--> statement-breakpoint
DROP INDEX "service_areas_contractor_zip_uq";--> statement-breakpoint
ALTER TABLE "service_areas" ALTER COLUMN "zip_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "service_areas" ADD COLUMN "label" text;--> statement-breakpoint
ALTER TABLE "service_areas" ADD COLUMN "radius_miles" integer DEFAULT 25 NOT NULL;