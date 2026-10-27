import { Database } from "bun:sqlite";

const LEGACY_ANALYSES_DDL = `
CREATE TABLE analyses (
	id text PRIMARY KEY NOT NULL,
	vinted_id text NOT NULL,
	url text NOT NULL,
	title text NOT NULL,
	description text,
	price real NOT NULL,
	brand text,
	size text,
	condition text,
	seller_username text NOT NULL,
	seller_rating real,
	seller_sales_count integer,
	photos text NOT NULL,
	photo_quality_score integer NOT NULL,
	photo_analysis text NOT NULL,
	authenticity_score integer NOT NULL,
	authenticity_flags text NOT NULL,
	authenticity_confidence text NOT NULL,
	market_price_low real,
	market_price_high real,
	market_price_avg real,
	market_price_sources text,
	market_price_confidence text,
	opportunity_score integer NOT NULL,
	margin real,
	margin_percent real,
	signals text NOT NULL,
	suggested_offer real,
	negotiation_script text,
	negotiation_arguments text,
	negotiation_tone text,
	resale_price real,
	resale_estimated_days integer,
	resale_tips text,
	resale_platforms text,
	status text DEFAULT 'ANALYZED' NOT NULL,
	analyzed_at integer DEFAULT (unixepoch()) NOT NULL,
	updated_at integer DEFAULT (unixepoch()) NOT NULL,
	detected_model text,
	market_price_reasoning text,
	total_price real
);
CREATE UNIQUE INDEX analyses_vinted_id_unique ON analyses (vinted_id);
CREATE TABLE studio_presets (
	id text PRIMARY KEY NOT NULL,
	name text NOT NULL,
	description text,
	prompt_template text NOT NULL,
	type text DEFAULT 'custom' NOT NULL,
	preview_image text,
	sort_order integer DEFAULT 0 NOT NULL,
	created_at integer DEFAULT (unixepoch()) NOT NULL,
	updated_at integer DEFAULT (unixepoch()) NOT NULL
);
`;

export type LegacyRow = Record<string, string | number | null>;

export const LEGACY_ANALYZED_AT_SECONDS = 1_735_689_600;

export function legacyRow(overrides: LegacyRow = {}): LegacyRow {
  return {
    id: crypto.randomUUID(),
    vinted_id: "4815162342",
    url: "https://www.vinted.fr/items/4815162342-veste-en-jean",
    title: "Veste en jean Levi's",
    description: "Portée deux fois, très bon état.",
    price: 19.99,
    total_price: 21.49,
    brand: "Levi's",
    size: "M",
    condition: "Très bon état",
    seller_username: "marie_vintage",
    seller_rating: 4.8,
    seller_sales_count: 132,
    photos: JSON.stringify(["https://images1.vinted.net/t/01_abc/f800/1.jpeg"]),
    photo_quality_score: 6,
    photo_analysis: JSON.stringify({
      hasModel: false,
      lighting: "average",
      background: "neutral",
      issues: ["blurry"],
    }),
    authenticity_score: 8,
    authenticity_flags: JSON.stringify([]),
    authenticity_confidence: "high",
    detected_model: "Trucker",
    market_price_low: 20,
    market_price_high: 45.5,
    market_price_avg: 30.25,
    market_price_sources: JSON.stringify([
      { name: "Vinted", price: 30, url: "https://www.vinted.fr/catalog" },
    ]),
    market_price_confidence: "medium",
    market_price_reasoning: "Similar jackets sell between 20 and 45 euros.",
    opportunity_score: 7,
    margin: 8.76,
    margin_percent: 40.8,
    signals: JSON.stringify([
      { type: "positive", label: "Prix bas", detail: "Sous le marché" },
    ]),
    suggested_offer: 17,
    negotiation_script: "Bonjour, seriez-vous ouvert à une offre ?",
    negotiation_arguments: JSON.stringify(["Prix du marché plus bas"]),
    negotiation_tone: "direct",
    resale_price: 35,
    resale_estimated_days: 10,
    resale_tips: JSON.stringify([]),
    resale_platforms: JSON.stringify([]),
    status: "ANALYZED",
    analyzed_at: LEGACY_ANALYZED_AT_SECONDS,
    updated_at: LEGACY_ANALYZED_AT_SECONDS,
    ...overrides,
  };
}

export function createLegacyDatabase(
  rows: LegacyRow[],
  path = ":memory:",
): Database {
  const database = new Database(path, { create: true });
  database.run(LEGACY_ANALYSES_DDL);

  for (const row of rows) {
    const columns = Object.keys(row);
    database
      .query(
        `INSERT INTO analyses (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
      )
      .run(...Object.values(row));
  }

  return database;
}

export function writeLegacyWalFile(path: string, rows: LegacyRow[]): void {
  const database = createLegacyDatabase(rows, path);
  database.run("PRAGMA journal_mode = WAL");
  database.close();
}
