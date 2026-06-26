CREATE TABLE "guest_signup_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "guest_signup_attempts_ip_idx" ON "guest_signup_attempts" USING btree ("ip","created_at");--> statement-breakpoint
-- Server-only table (service role bypasses RLS); deny the public anon/authenticated API. See 0024.
ALTER TABLE "guest_signup_attempts" ENABLE ROW LEVEL SECURITY;