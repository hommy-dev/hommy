CREATE TABLE "contractor_prospects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid,
	"company_name" text,
	"email" text,
	"email_confidence" integer,
	"phone" text,
	"website" text,
	"domain" text,
	"city" text,
	"state" text,
	"lat" double precision,
	"lng" double precision,
	"source" text DEFAULT 'google_places' NOT NULL,
	"source_ref" text,
	"rating" numeric(3, 2),
	"review_count" integer,
	"enrichment_status" text DEFAULT 'discovered' NOT NULL,
	"outreach_status" text DEFAULT 'pending' NOT NULL,
	"last_outreach_at" timestamp with time zone,
	"invite_token" text,
	"converted_to_contractor_id" uuid,
	"converted_at" timestamp with time zone,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_opt_outs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "awaiting_coverage" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contractor_prospects" ADD CONSTRAINT "contractor_prospects_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractor_prospects" ADD CONSTRAINT "contractor_prospects_converted_to_contractor_id_contractors_id_fk" FOREIGN KEY ("converted_to_contractor_id") REFERENCES "public"."contractors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contractor_prospects_email_uq" ON "contractor_prospects" USING btree ("email") WHERE email is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "contractor_prospects_source_ref_uq" ON "contractor_prospects" USING btree ("service_id","source_ref") WHERE source_ref is not null;--> statement-breakpoint
CREATE INDEX "contractor_prospects_domain_idx" ON "contractor_prospects" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "contractor_prospects_enrichment_idx" ON "contractor_prospects" USING btree ("enrichment_status");--> statement-breakpoint
CREATE INDEX "contractor_prospects_outreach_idx" ON "contractor_prospects" USING btree ("outreach_status");--> statement-breakpoint
CREATE UNIQUE INDEX "email_opt_outs_email_uq" ON "email_opt_outs" USING btree ("email");--> statement-breakpoint
CREATE INDEX "leads_awaiting_idx" ON "leads" USING btree ("awaiting_coverage") WHERE awaiting_coverage = true;