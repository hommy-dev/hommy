ALTER TABLE "contractors" ADD COLUMN "slug" text;--> statement-breakpoint
CREATE UNIQUE INDEX "contractors_slug_uq" ON "contractors" USING btree ("slug");