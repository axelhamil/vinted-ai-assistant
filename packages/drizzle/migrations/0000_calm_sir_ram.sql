CREATE SCHEMA "analysis";
--> statement-breakpoint
CREATE TABLE "analysis"."analyses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"vinted_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"brand" text,
	"size" text,
	"condition" text NOT NULL,
	"language" text NOT NULL,
	"price_cents" integer NOT NULL,
	"total_price_cents" integer,
	"shipping_cost_cents" integer,
	"listed_at" timestamp with time zone,
	"photos" jsonb NOT NULL,
	"seller" jsonb NOT NULL,
	"facts" jsonb NOT NULL,
	"grounding_sources" jsonb NOT NULL,
	"negotiation" jsonb NOT NULL,
	"opportunity_score" numeric(3, 1) NOT NULL,
	"margin_cents" integer NOT NULL,
	"margin_percent" numeric(7, 1) NOT NULL,
	"suggested_offer_cents" integer NOT NULL,
	"resale" jsonb NOT NULL,
	"status" text NOT NULL,
	"analyzed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analyses_vinted_id_unique" UNIQUE("vinted_id"),
	CONSTRAINT "analyses_status_check" CHECK ("analysis"."analyses"."status" in ('ANALYZED', 'WATCHING', 'BOUGHT', 'SOLD', 'ARCHIVED'))
);
--> statement-breakpoint
CREATE INDEX "analyses_status_idx" ON "analysis"."analyses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "analyses_opportunity_score_idx" ON "analysis"."analyses" USING btree ("opportunity_score");--> statement-breakpoint
CREATE INDEX "analyses_analyzed_at_idx" ON "analysis"."analyses" USING btree ("analyzed_at" DESC NULLS LAST);