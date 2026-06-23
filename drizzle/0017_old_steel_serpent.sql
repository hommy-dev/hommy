ALTER TYPE "public"."credit_txn_kind" ADD VALUE 'referral';--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "referral_code" text;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "referred_by_contractor_id" uuid;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "referral_rewarded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_referred_by_contractor_id_contractors_id_fk" FOREIGN KEY ("referred_by_contractor_id") REFERENCES "public"."contractors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contractors_referral_code_uq" ON "contractors" USING btree ("referral_code");