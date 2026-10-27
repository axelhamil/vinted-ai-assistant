import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { ANALYSIS_STATUSES } from "../src/domain/value-objects/analysis-status.vo";
import { analysisSchema } from "./shared";

const STATUS_LIST = sql.raw(
  ANALYSIS_STATUSES.map((status) => `'${status}'`).join(", "),
);

export const analyses = analysisSchema.table(
  "analyses",
  {
    id: uuid("id").primaryKey(),
    vintedId: text("vinted_id").notNull().unique(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    brand: text("brand"),
    size: text("size"),
    condition: text("condition").notNull(),
    language: text("language").notNull(),
    priceCents: integer("price_cents").notNull(),
    totalPriceCents: integer("total_price_cents"),
    shippingCostCents: integer("shipping_cost_cents"),
    listedAt: timestamp("listed_at", { withTimezone: true }),
    photos: jsonb("photos").notNull(),
    seller: jsonb("seller").notNull(),
    facts: jsonb("facts").notNull(),
    groundingSources: jsonb("grounding_sources").notNull(),
    negotiation: jsonb("negotiation").notNull(),
    opportunityScore: numeric("opportunity_score", {
      precision: 3,
      scale: 1,
      mode: "number",
    }).notNull(),
    marginCents: integer("margin_cents").notNull(),
    marginPercent: numeric("margin_percent", { mode: "number" }).notNull(),
    suggestedOfferCents: integer("suggested_offer_cents").notNull(),
    resale: jsonb("resale").notNull(),
    status: text("status").notNull(),
    analyzedAt: timestamp("analyzed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("analyses_status_check", sql`${table.status} in (${STATUS_LIST})`),
    index("analyses_status_idx").on(table.status),
    index("analyses_opportunity_score_idx").on(table.opportunityScore),
    index("analyses_analyzed_at_id_idx").on(
      table.analyzedAt.desc().nullsFirst(),
      table.id.desc().nullsFirst(),
    ),
  ],
);
