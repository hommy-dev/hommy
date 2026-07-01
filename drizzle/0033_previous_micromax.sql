CREATE TABLE "outreach_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prospect_id" uuid NOT NULL,
	"stream" text NOT NULL,
	"resend_id" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_opt_outs" ADD COLUMN "stream" text;--> statement-breakpoint
ALTER TABLE "outreach_sends" ADD CONSTRAINT "outreach_sends_prospect_id_contractor_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."contractor_prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "outreach_sends_stream_sent_idx" ON "outreach_sends" USING btree ("stream","sent_at");--> statement-breakpoint
CREATE INDEX "outreach_sends_resend_idx" ON "outreach_sends" USING btree ("resend_id");--> statement-breakpoint
CREATE INDEX "outreach_sends_prospect_idx" ON "outreach_sends" USING btree ("prospect_id");