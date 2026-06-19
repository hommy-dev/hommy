CREATE TYPE "public"."purchase_intent_status" AS ENUM('requested', 'fulfilled', 'declined');--> statement-breakpoint
CREATE TABLE "purchase_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_id" uuid NOT NULL,
	"requested_by" uuid,
	"credits" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"balance_at_request" integer NOT NULL,
	"status" "purchase_intent_status" DEFAULT 'requested' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "purchase_intents" ADD CONSTRAINT "purchase_intents_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_intents" ADD CONSTRAINT "purchase_intents_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "purchase_intents_contractor_idx" ON "purchase_intents" USING btree ("contractor_id");--> statement-breakpoint
CREATE INDEX "purchase_intents_status_idx" ON "purchase_intents" USING btree ("status");