CREATE TYPE "public"."activity_actor" AS ENUM('system', 'contractor', 'homeowner');--> statement-breakpoint
CREATE TYPE "public"."contractor_plan" AS ENUM('starter', 'growth', 'pro');--> statement-breakpoint
CREATE TYPE "public"."estimate_status" AS ENUM('draft', 'sent', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('pending', 'assigned', 'expired');--> statement-breakpoint
CREATE TYPE "public"."lead_urgency" AS ENUM('emergency', 'within_week', 'within_month', 'planning');--> statement-breakpoint
CREATE TYPE "public"."message_channel" AS ENUM('sms', 'email', 'platform');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('outbound', 'inbound');--> statement-breakpoint
CREATE TYPE "public"."project_stage" AS ENUM('new_lead', 'contacted', 'estimate_sent', 'in_progress', 'completed', 'lost');--> statement-breakpoint
CREATE TYPE "public"."storm_event_type" AS ENUM('hail', 'high_wind', 'storm');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('contractor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"actor" "activity_actor" NOT NULL,
	"action" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_id" uuid NOT NULL,
	"homeowner_id" uuid NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contractor_services" (
	"contractor_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"subtypes" text[] DEFAULT '{}'::text[] NOT NULL,
	CONSTRAINT "contractor_services_contractor_id_service_id_pk" PRIMARY KEY("contractor_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "contractors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_name" text,
	"bio" text,
	"logo_url" text,
	"license_number" text,
	"license_doc_url" text,
	"insurance_provider" text,
	"insurance_policy" text,
	"insurance_doc_url" text,
	"years_in_business" integer,
	"verification_status" "verification_status" DEFAULT 'pending' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"plan" "contractor_plan",
	"leads_used_this_month" integer DEFAULT 0 NOT NULL,
	"avg_response_time_minutes" integer,
	"avg_rating" numeric(3, 2),
	"total_reviews" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estimates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"service_details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"labor_cost" numeric(12, 2),
	"materials_cost" numeric(12, 2),
	"line_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tax_rate" numeric(6, 4),
	"subtotal" numeric(12, 2),
	"tax_amount" numeric(12, 2),
	"total" numeric(12, 2),
	"scope_notes" text,
	"valid_until" timestamp with time zone,
	"pdf_url" text,
	"status" "estimate_status" DEFAULT 'draft' NOT NULL,
	"accept_token" text,
	"accepted_at" timestamp with time zone,
	"accepted_ip" text,
	"accepted_user_agent" text,
	"accepted_snapshot" jsonb,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homeowners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text,
	"email" text,
	"phone" text,
	"address" text,
	"zip_code" text,
	"city" text,
	"state" text,
	"lat" double precision,
	"lng" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"homeowner_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"service_details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"urgency" "lead_urgency" DEFAULT 'planning' NOT NULL,
	"photo_url" text,
	"notes" text,
	"storm_event_id" uuid,
	"status" "lead_status" DEFAULT 'pending' NOT NULL,
	"assigned_to" uuid,
	"assigned_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"contact_id" uuid NOT NULL,
	"contractor_id" uuid NOT NULL,
	"direction" "message_direction" NOT NULL,
	"channel" "message_channel" NOT NULL,
	"body" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"external_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"action_url" text,
	"entity_type" text,
	"entity_id" text,
	"metadata" jsonb,
	"dedup_key" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"sent_in_app" boolean DEFAULT false NOT NULL,
	"sent_email" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"lead_id" uuid,
	"service_id" uuid NOT NULL,
	"stage" "project_stage" DEFAULT 'new_lead' NOT NULL,
	"estimate_value" numeric(12, 2),
	"notes" text,
	"follow_up_at" timestamp with time zone,
	"stage_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"contractor_id" uuid NOT NULL,
	"homeowner_id" uuid NOT NULL,
	"rating" integer,
	"comment" text,
	"token" text NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_id" uuid NOT NULL,
	"zip_code" text NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"subtypes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storm_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" "storm_event_type" NOT NULL,
	"severity" text,
	"affected_zip_codes" text[] DEFAULT '{}'::text[] NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"alerts_sent" integer DEFAULT 0 NOT NULL,
	"leads_generated" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"phone" text,
	"role" "user_role" DEFAULT 'contractor' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_homeowner_id_homeowners_id_fk" FOREIGN KEY ("homeowner_id") REFERENCES "public"."homeowners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractor_services" ADD CONSTRAINT "contractor_services_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractor_services" ADD CONSTRAINT "contractor_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_homeowner_id_homeowners_id_fk" FOREIGN KEY ("homeowner_id") REFERENCES "public"."homeowners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_storm_event_id_storm_events_id_fk" FOREIGN KEY ("storm_event_id") REFERENCES "public"."storm_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_contractors_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."contractors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_homeowner_id_homeowners_id_fk" FOREIGN KEY ("homeowner_id") REFERENCES "public"."homeowners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_areas" ADD CONSTRAINT "service_areas_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_project_idx" ON "activity_log" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_contractor_homeowner_uq" ON "contacts" USING btree ("contractor_id","homeowner_id");--> statement-breakpoint
CREATE INDEX "contacts_contractor_idx" ON "contacts" USING btree ("contractor_id");--> statement-breakpoint
CREATE INDEX "contacts_homeowner_idx" ON "contacts" USING btree ("homeowner_id");--> statement-breakpoint
CREATE INDEX "contractor_services_service_idx" ON "contractor_services" USING btree ("service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contractors_user_uq" ON "contractors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contractors_verification_idx" ON "contractors" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "contractors_plan_idx" ON "contractors" USING btree ("plan");--> statement-breakpoint
CREATE INDEX "estimates_project_idx" ON "estimates" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "estimates_status_idx" ON "estimates" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "estimates_accept_token_uq" ON "estimates" USING btree ("accept_token") WHERE "estimates"."accept_token" is not null;--> statement-breakpoint
CREATE INDEX "homeowners_phone_idx" ON "homeowners" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "homeowners_email_idx" ON "homeowners" USING btree ("email");--> statement-breakpoint
CREATE INDEX "homeowners_zip_idx" ON "homeowners" USING btree ("zip_code");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_assigned_to_idx" ON "leads" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "leads_service_idx" ON "leads" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "leads_homeowner_idx" ON "leads" USING btree ("homeowner_id");--> statement-breakpoint
CREATE INDEX "leads_storm_event_idx" ON "leads" USING btree ("storm_event_id");--> statement-breakpoint
CREATE INDEX "messages_contact_idx" ON "messages" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "messages_project_idx" ON "messages" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "messages_contractor_created_idx" ON "messages" USING btree ("contractor_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_user_dedup_uq" ON "notifications" USING btree ("user_id","dedup_key") WHERE "notifications"."dedup_key" is not null;--> statement-breakpoint
CREATE INDEX "projects_contractor_idx" ON "projects" USING btree ("contractor_id");--> statement-breakpoint
CREATE INDEX "projects_contact_idx" ON "projects" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "projects_stage_idx" ON "projects" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "projects_follow_up_idx" ON "projects" USING btree ("follow_up_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_token_uq" ON "reviews" USING btree ("token");--> statement-breakpoint
CREATE INDEX "reviews_contractor_idx" ON "reviews" USING btree ("contractor_id");--> statement-breakpoint
CREATE INDEX "reviews_project_idx" ON "reviews" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "service_areas_contractor_idx" ON "service_areas" USING btree ("contractor_id");--> statement-breakpoint
CREATE INDEX "service_areas_zip_idx" ON "service_areas" USING btree ("zip_code");--> statement-breakpoint
CREATE UNIQUE INDEX "service_areas_contractor_zip_uq" ON "service_areas" USING btree ("contractor_id","zip_code");--> statement-breakpoint
CREATE UNIQUE INDEX "services_slug_uq" ON "services" USING btree ("slug");