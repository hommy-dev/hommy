CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"requester_id" uuid NOT NULL,
	"requester_role" text NOT NULL,
	"ref" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"assigned_admin_id" uuid,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_admin_id_users_id_fk" FOREIGN KEY ("assigned_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "support_tickets_conversation_uq" ON "support_tickets" USING btree ("conversation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "support_tickets_requester_uq" ON "support_tickets" USING btree ("requester_id");--> statement-breakpoint
CREATE UNIQUE INDEX "support_tickets_ref_uq" ON "support_tickets" USING btree ("ref");--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status");--> statement-breakpoint
-- Let admins (and the future admin-side AI) receive live messages on any chat
-- channel — needed for the Hommy Support console. Additive: admins already read
-- every conversation via the table RLS policies; this only extends the realtime
-- RECEIVE policy. User/contractor chat is unchanged.
DROP POLICY IF EXISTS "realtime_receive_conversation_channel" ON realtime.messages;--> statement-breakpoint
CREATE POLICY "realtime_receive_conversation_channel" ON realtime.messages FOR SELECT TO authenticated
  USING (realtime.topic() LIKE 'chat:%' AND (public.is_admin() OR public.is_conversation_participant(realtime.topic())));