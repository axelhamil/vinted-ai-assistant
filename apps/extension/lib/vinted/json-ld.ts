type JsonRecord = Record<string, unknown>;

export interface JsonLdProduct {
  description: string | null;
  images: string[];
  brand: string | null;
  condition: string | null;
  datePosted: string | null;
  price: string | null;
}

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isProduct = (value: unknown): value is JsonRecord =>
  isRecord(value) && value["@type"] === "Product";

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const stringOf = (value: unknown): string | null => {
  if (typeof value === "number") return String(value);

  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const stringsOf = (value: unknown): string[] => {
  const values = Array.isArray(value) ? value : [value];

  return values.flatMap((item) => stringOf(item) ?? []);
};

const findProduct = (doc: Document): JsonRecord | null => {
  for (const script of doc.querySelectorAll(
    'script[type="application/ld+json"]',
  )) {
    const data = parseJson(script.textContent ?? "");
    const product = Array.isArray(data) ? data.find(isProduct) : data;

    if (isProduct(product)) return product;
  }

  return null;
};

export const readJsonLdProduct = (doc: Document): JsonLdProduct | null => {
  const product = findProduct(doc);

  if (!product) return null;

  const { brand, offers } = product;

  return {
    description: stringOf(product.description),
    images: stringsOf(product.image),
    brand: isRecord(brand) ? stringOf(brand.name) : stringOf(brand),
    condition: stringOf(product.itemCondition),
    datePosted: stringOf(product.datePosted),
    price: isRecord(offers) ? stringOf(offers.price) : null,
  };
};
