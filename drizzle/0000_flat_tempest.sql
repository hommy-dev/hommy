CREATE TYPE "public"."activity_actor" AS ENUM('system', 'contractor', 'homeowner');--> statement-breakpoint
CREATE TYPE "public"."billing_interval" AS ENUM('month', 'year');--> statement-breakpoint
CREATE TYPE "public"."conversation_type" AS ENUM('direct', 'lead', 'engagement', 'support');--> statement-breakpoint
CREATE TYPE "public"."credit_txn_kind" AS ENUM('signup_bonus', 'purchase', 'plan_grant', 'lead_engagement', 'lead_won', 'ai_agent', 'marketing', 'refund', 'promo', 'expiry', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."estimate_status" AS ENUM('draft', 'sent', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."lead_recipient_status" AS ENUM('offered', 'viewed', 'engaged', 'declined', 'expired', 'lost', 'won');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('open', 'filled', 'awarded', 'closed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."lead_urgency" AS ENUM('emergency', 'within_week', 'within_month', 'planning');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('invited', 'active', 'removed');--> statement-breakpoint
CREATE TYPE "public"."message_channel" AS ENUM('platform', 'sms', 'email');--> statement-breakpoint
CREATE TYPE "public"."message_sender_type" AS ENUM('user', 'contractor', 'system');--> statement-breakpoint
CREATE TYPE "public"."participant_type" AS ENUM('user', 'contractor');--> statement-breakpoint
CREATE TYPE "public"."project_stage" AS ENUM('new_lead', 'contacted', 'estimate_sent', 'in_progress', 'completed', 'lost');--> statement-breakpoint
CREATE TYPE "public"."reviewer_type" AS ENUM('homeowner', 'contractor');--> statement-breakpoint
CREATE TYPE "public"."score_event_kind" AS ENUM('lead_ignored_no_reason', 'lead_ignored_with_reason', 'slow_response', 'fast_engagement', 'quote_accepted', 'review_received', 'off_platform_flag', 'pattern_no_quotes');--> statement-breakpoint
CREATE TYPE "public"."storm_event_type" AS ENUM('hail', 'high_wind', 'storm');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'past_due', 'canceled', 'trialing');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('contractor', 'homeowner', 'admin');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"actor" "activity_actor" NOT NULL,
	"actor_user_id" uuid,
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
CREATE TABLE "contractor_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	"token" text NOT NULL,
	"invited_by" uuid,
	"expires_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contractor_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	"status" "member_status" DEFAULT 'active' NOT NULL,
	"invited_by" uuid,
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
	"credit_balance" integer DEFAULT 0 NOT NULL,
	"profile_score" integer DEFAULT 0 NOT NULL,
	"avg_response_time_minutes" integer,
	"avg_rating" numeric(3, 2),
	"total_reviews" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"participant_type" "participant_type" NOT NULL,
	"participant_id" uuid NOT NULL,
	"last_read_at" timestamp with time zone,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "conversation_type" DEFAULT 'direct' NOT NULL,
	"context_type" text,
	"context_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_id" uuid NOT NULL,
	"kind" "credit_txn_kind" NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"expires_at" timestamp with time zone,
	"source_type" text,
	"source_id" text,
	"created_by" uuid,
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
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"contractor_id" uuid NOT NULL,
	"status" "lead_recipient_status" DEFAULT 'offered' NOT NULL,
	"offered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"viewed_at" timestamp with time zone,
	"engaged_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"decline_reason" text,
	"sla_deadline" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"homeowner_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"service_details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"urgency" "lead_urgency" DEFAULT 'planning' NOT NULL,
	"address" text,
	"zip_code" text,
	"city" text,
	"state" text,
	"lat" double precision,
	"lng" double precision,
	"photo_url" text,
	"notes" text,
	"storm_event_id" uuid,
	"status" "lead_status" DEFAULT 'open' NOT NULL,
	"engage_slots" integer DEFAULT 3 NOT NULL,
	"engagement_credit_cost" integer DEFAULT 0 NOT NULL,
	"award_credit_cost" integer DEFAULT 0 NOT NULL,
	"awarded_to" uuid,
	"awarded_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_type" "message_sender_type" NOT NULL,
	"sender_id" uuid,
	"body" text NOT NULL,
	"channel" "message_channel" DEFAULT 'platform' NOT NULL,
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
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"billing_interval" "billing_interval" DEFAULT 'month' NOT NULL,
	"stripe_price_id" text,
	"monthly_credits" integer DEFAULT 0 NOT NULL,
	"max_members" integer DEFAULT 1 NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
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
	"reviewer_type" "reviewer_type" DEFAULT 'homeowner' NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"rating" integer,
	"comment" text,
	"token" text NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "score_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_id" uuid NOT NULL,
	"kind" "score_event_kind" NOT NULL,
	"delta" integer NOT NULL,
	"source_type" text,
	"source_id" text,
	"note" text,
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
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"stripe_subscription_id" text,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"phone" text,
	"role" "user_role" NOT NULL,
	"password_set" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_homeowner_id_homeowners_id_fk" FOREIGN KEY ("homeowner_id") REFERENCES "public"."homeowners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractor_invitations" ADD CONSTRAINT "contractor_invitations_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractor_invitations" ADD CONSTRAINT "contractor_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractor_members" ADD CONSTRAINT "contractor_members_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractor_members" ADD CONSTRAINT "contractor_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractor_members" ADD CONSTRAINT "contractor_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractor_services" ADD CONSTRAINT "contractor_services_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractor_services" ADD CONSTRAINT "contractor_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homeowners" ADD CONSTRAINT "homeowners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_recipients" ADD CONSTRAINT "lead_recipients_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_recipients" ADD CONSTRAINT "lead_recipients_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_homeowner_id_homeowners_id_fk" FOREIGN KEY ("homeowner_id") REFERENCES "public"."homeowners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_storm_event_id_storm_events_id_fk" FOREIGN KEY ("storm_event_id") REFERENCES "public"."storm_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_awarded_to_contractors_id_fk" FOREIGN KEY ("awarded_to") REFERENCES "public"."contractors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_areas" ADD CONSTRAINT "service_areas_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_project_idx" ON "activity_log" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_contractor_homeowner_uq" ON "contacts" USING btree ("contractor_id","homeowner_id");--> statement-breakpoint
CREATE INDEX "contacts_contractor_idx" ON "contacts" USING btree ("contractor_id");--> statement-breakpoint
CREATE INDEX "contacts_homeowner_idx" ON "contacts" USING btree ("homeowner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contractor_invitations_token_uq" ON "contractor_invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "contractor_invitations_company_idx" ON "contractor_invitations" USING btree ("contractor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contractor_members_company_user_uq" ON "contractor_members" USING btree ("contractor_id","user_id");--> statement-breakpoint
CREATE INDEX "contractor_members_user_idx" ON "contractor_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contractor_members_company_idx" ON "contractor_members" USING btree ("contractor_id");--> statement-breakpoint
CREATE INDEX "contractor_services_service_idx" ON "contractor_services" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "contractors_verification_idx" ON "contractors" USING btree ("verification_status");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_participants_uq" ON "conversation_participants" USING btree ("conversation_id","participant_type","participant_id");--> statement-breakpoint
CREATE INDEX "conversation_participants_lookup_idx" ON "conversation_participants" USING btree ("participant_type","participant_id");--> statement-breakpoint
CREATE INDEX "conversations_context_idx" ON "conversations" USING btree ("context_type","context_id");--> statement-breakpoint
CREATE INDEX "credit_transactions_contractor_idx" ON "credit_transactions" USING btree ("contractor_id");--> statement-breakpoint
CREATE INDEX "credit_transactions_contractor_expiry_idx" ON "credit_transactions" USING btree ("contractor_id","expires_at");--> statement-breakpoint
CREATE INDEX "estimates_project_idx" ON "estimates" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "estimates_status_idx" ON "estimates" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "estimates_accept_token_uq" ON "estimates" USING btree ("accept_token") WHERE "estimates"."accept_token" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "homeowners_user_uq" ON "homeowners" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_recipients_lead_contractor_uq" ON "lead_recipients" USING btree ("lead_id","contractor_id");--> statement-breakpoint
CREATE INDEX "lead_recipients_contractor_status_idx" ON "lead_recipients" USING btree ("contractor_id","status");--> statement-breakpoint
CREATE INDEX "lead_recipients_lead_idx" ON "lead_recipients" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_recipients_sla_idx" ON "lead_recipients" USING btree ("sla_deadline");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_service_idx" ON "leads" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "leads_homeowner_idx" ON "leads" USING btree ("homeowner_id");--> statement-breakpoint
CREATE INDEX "leads_awarded_to_idx" ON "leads" USING btree ("awarded_to");--> statement-breakpoint
CREATE INDEX "leads_storm_event_idx" ON "leads" USING btree ("storm_event_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_created_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_user_dedup_uq" ON "notifications" USING btree ("user_id","dedup_key") WHERE "notifications"."dedup_key" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "plans_slug_uq" ON "plans" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "projects_contractor_idx" ON "projects" USING btree ("contractor_id");--> statement-breakpoint
CREATE INDEX "projects_contact_idx" ON "projects" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "projects_lead_idx" ON "projects" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "projects_stage_idx" ON "projects" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "projects_follow_up_idx" ON "projects" USING btree ("follow_up_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_token_uq" ON "reviews" USING btree ("token");--> statement-breakpoint
CREATE INDEX "reviews_contractor_idx" ON "reviews" USING btree ("contractor_id");--> statement-breakpoint
CREATE INDEX "reviews_project_idx" ON "reviews" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "score_events_contractor_idx" ON "score_events" USING btree ("contractor_id");--> statement-breakpoint
CREATE INDEX "service_areas_contractor_idx" ON "service_areas" USING btree ("contractor_id");--> statement-breakpoint
CREATE INDEX "service_areas_zip_idx" ON "service_areas" USING btree ("zip_code");--> statement-breakpoint
CREATE UNIQUE INDEX "service_areas_contractor_zip_uq" ON "service_areas" USING btree ("contractor_id","zip_code");--> statement-breakpoint
CREATE UNIQUE INDEX "services_slug_uq" ON "services" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "subscriptions_contractor_idx" ON "subscriptions" USING btree ("contractor_id");--> statement-breakpoint
CREATE INDEX "subscriptions_plan_idx" ON "subscriptions" USING btree ("plan_id");