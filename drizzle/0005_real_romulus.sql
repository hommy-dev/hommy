CREATE TYPE "public"."portfolio_image_kind" AS ENUM('single', 'before_after');--> statement-breakpoint
CREATE TABLE "portfolio_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"kind" "portfolio_image_kind" DEFAULT 'single' NOT NULL,
	"image_url" text NOT NULL,
	"before_url" text,
	"caption" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"service_subtype" text,
	"location" text,
	"cover_image_url" text,
	"is_published" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portfolio_images" ADD CONSTRAINT "portfolio_images_project_id_portfolio_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."portfolio_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "portfolio_images_project_idx" ON "portfolio_images" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "portfolio_projects_contractor_idx" ON "portfolio_projects" USING btree ("contractor_id");