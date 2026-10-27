import type { Option } from "@packages/ddd-kit";
import type { Language } from "./value-objects/language.vo";
import type { Price } from "./value-objects/price.vo";
import type { VintedId } from "./value-objects/vinted-id.vo";

export interface Seller {
  username: string;
  rating: Option<number>;
  salesCount: Option<number>;
}

export interface Listing {
  vintedId: VintedId;
  url: string;
  title: string;
  description: string;
  brand: Option<string>;
  size: Option<string>;
  condition: string;
  priceCents: Price;
  totalPriceCents: Option<Price>;
  shippingCostCents: Option<Price>;
  listedAt: Option<Date>;
  photos: string[];
  seller: Seller;
  language: Language;
}
