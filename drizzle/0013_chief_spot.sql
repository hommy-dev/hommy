CREATE TYPE "public"."integration_status" AS ENUM('active', 'needs_reauth', 'error', 'disconnected');--> statement-breakpoint
CREATE TABLE "external_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"contractor_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"source_url" text NOT NULL,
	"caption" text,
	"width_px" integer,
	"height_px" integer,
	"attribution_html" text,
	"raw" jsonb,
	"is_visible" boolean DEFAULT true NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"contractor_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"author_name" text,
	"author_photo_url" text,
	"rating" integer,
	"comment" text,
	"source_url" text,
	"posted_at" timestamp with time zone,
	"raw" jsonb,
	"is_visible" boolean DEFAULT true NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"status" "integration_status" DEFAULT 'active' NOT NULL,
	"external_account_id" text NOT NULL,
	"external_account_label" text,
	"external_account_meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"access_token_enc" text,
	"refresh_token_enc" text,
	"token_expires_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"last_error" text,
	"connected_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "external_media" ADD CONSTRAINT "external_media_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_media" ADD CONSTRAINT "external_media_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_reviews" ADD CONSTRAINT "external_reviews_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_reviews" ADD CONSTRAINT "external_reviews_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_connected_by_users_id_fk" FOREIGN KEY ("connected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "external_media_connection_external_uq" ON "external_media" USING btree ("connection_id","external_id");--> statement-breakpoint
CREATE INDEX "external_media_contractor_idx" ON "external_media" USING btree ("contractor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "external_reviews_connection_external_uq" ON "external_reviews" USING btree ("connection_id","external_id");--> statement-breakpoint
CREATE INDEX "external_reviews_contractor_idx" ON "external_reviews" USING btree ("contractor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_connections_company_provider_account_uq" ON "integration_connections" USING btree ("contractor_id","provider","external_account_id");--> statement-breakpoint
CREATE INDEX "integration_connections_contractor_idx" ON "integration_connections" USING btree ("contractor_id");