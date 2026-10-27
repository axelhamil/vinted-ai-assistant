CREATE TABLE "analysis"."outbox_event" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"metadata" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"dispatched_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"next_attempt_at" timestamp with time zone,
	"dead_at" timestamp with time zone,
	"deliveries" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "outbox_event_deliveries_object" CHECK (jsonb_typeof("analysis"."outbox_event"."deliveries") = 'object')
);
--> statement-breakpoint
CREATE INDEX "outbox_event_pending_idx" ON "analysis"."outbox_event" USING btree ("occurred_at","id") WHERE "analysis"."outbox_event"."dispatched_at" is null and "analysis"."outbox_event"."dead_at" is null;--> statement-breakpoint
CREATE INDEX "outbox_event_dead_retry_idx" ON "analysis"."outbox_event" USING btree ("next_attempt_at") WHERE "analysis"."outbox_event"."dispatched_at" is null and "analysis"."outbox_event"."dead_at" is not null;--> statement-breakpoint
CREATE INDEX "outbox_event_dispatched_idx" ON "analysis"."outbox_event" USING btree ("dispatched_at") WHERE "analysis"."outbox_event"."dispatched_at" is not null;--> statement-breakpoint
CREATE INDEX "outbox_event_dead_idx" ON "analysis"."outbox_event" USING btree ("dead_at") WHERE "analysis"."outbox_event"."dead_at" is not null;--> statement-breakpoint
CREATE INDEX "outbox_event_aggregate_idx" ON "analysis"."outbox_event" USING btree ("aggregate_type","aggregate_id");