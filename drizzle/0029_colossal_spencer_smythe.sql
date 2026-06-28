CREATE TABLE "prospect_enrichment_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prospect_id" uuid NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"claimed_at" timestamp with time zone,
	"locked_by" text,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prospect_enrichment_jobs" ADD CONSTRAINT "prospect_enrichment_jobs_prospect_id_contractor_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."contractor_prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "prospect_enrichment_jobs_prospect_uq" ON "prospect_enrichment_jobs" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "prospect_enrichment_jobs_status_idx" ON "prospect_enrichment_jobs" USING btree ("status");