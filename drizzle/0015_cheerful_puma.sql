CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_code" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"population" integer,
	"intro" text,
	"faq" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "states" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"is_operating" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_state_code_states_code_fk" FOREIGN KEY ("state_code") REFERENCES "public"."states"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cities_state_slug_uq" ON "cities" USING btree ("state_code","slug");--> statement-breakpoint
CREATE INDEX "cities_state_idx" ON "cities" USING btree ("state_code");--> statement-breakpoint
CREATE INDEX "cities_population_idx" ON "cities" USING btree ("population");--> statement-breakpoint
CREATE UNIQUE INDEX "states_slug_uq" ON "states" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "leads_state_city_idx" ON "leads" USING btree ("state","city");