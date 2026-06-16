-- Data migration: move existing rows off the retired enum values BEFORE the
-- types are recreated, or the cast-back below would fail on those rows.
UPDATE "leads" SET "status" = 'open' WHERE "status" = 'filled';--> statement-breakpoint
UPDATE "projects" SET "stage" = 'new_lead' WHERE "stage" = 'contacted';--> statement-breakpoint
UPDATE "conversations" SET "type" = 'direct' WHERE "type" IN ('engagement', 'support');--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "type" SET DEFAULT 'direct'::text;--> statement-breakpoint
DROP TYPE "public"."conversation_type";--> statement-breakpoint
CREATE TYPE "public"."conversation_type" AS ENUM('direct', 'lead');--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "type" SET DEFAULT 'direct'::"public"."conversation_type";--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "type" SET DATA TYPE "public"."conversation_type" USING "type"::"public"."conversation_type";--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "status" SET DEFAULT 'open'::text;--> statement-breakpoint
DROP TYPE "public"."lead_status";--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('open', 'awarded', 'closed', 'expired');--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "status" SET DEFAULT 'open'::"public"."lead_status";--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "status" SET DATA TYPE "public"."lead_status" USING "status"::"public"."lead_status";--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "stage" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "stage" SET DEFAULT 'new_lead'::text;--> statement-breakpoint
DROP TYPE "public"."project_stage";--> statement-breakpoint
CREATE TYPE "public"."project_stage" AS ENUM('new_lead', 'estimate_sent', 'in_progress', 'completed', 'lost');--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "stage" SET DEFAULT 'new_lead'::"public"."project_stage";--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "stage" SET DATA TYPE "public"."project_stage" USING "stage"::"public"."project_stage";