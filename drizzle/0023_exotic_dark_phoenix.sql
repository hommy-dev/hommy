ALTER TABLE "leads" ADD COLUMN "target_contractor_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_target_contractor_id_contractors_id_fk" FOREIGN KEY ("target_contractor_id") REFERENCES "public"."contractors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_target_contractor_idx" ON "leads" USING btree ("target_contractor_id");