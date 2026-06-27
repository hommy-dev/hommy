CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"email" text,
	"kind" text NOT NULL,
	"granted" boolean DEFAULT true NOT NULL,
	"policy_version" text,
	"source" text,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consent_records_user_idx" ON "consent_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "consent_records_email_idx" ON "consent_records" USING btree ("email");--> statement-breakpoint
-- Server-only table (service role bypasses RLS); deny the public anon/authenticated API. See 0024.
ALTER TABLE "consent_records" ENABLE ROW LEVEL SECURITY;