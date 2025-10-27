export type PhotoItem = {
  id: number;
  key: string;
  url?: string | null;   // signed GET (preferred)
  path?: string | null;  // legacy
  mime?: string | null;
  index?: number | null;
  createdAt?: string | null;
};

export type Money = { amount?: number; currency?: string; raw?: string };
export type WatchScore = { letter?: string; numeric?: number };

// movement quality
export type MovementQuality = {
  type?: string;
  accuracy?: { value?: number; unit?: string; raw?: string };
  reliability?: { label?: string };
  score?: WatchScore;
};
export type MovementType = "automatic" | "manual" | "quartz" | "spring-drive" | "—";

export type QuickFacts = {
  name?: string;                 // e.g., "Rolex Submariner"
  subtitle?: string;             // e.g., "Luxury Diver Watch"
  movement_type?: MovementType;  // ONE word per spec
  release_year?: number | null;
  list_price?: Money;            // { amount, currency }
};

export type WatchAI = {
  quick_facts?: QuickFacts;
  overall?: { conclusion?: string; score?: WatchScore };
  brand_reputation?: unknown;
  movement_quality?: MovementQuality;
  materials_build?: unknown;
  maintenance_risks?: unknown;
  value_for_money?: { list_price?: Money } & Record<string, any>;
  alternatives?: unknown[];
};

//no longer needed
export type ServerWatch = {
  id: number;
  createdAt?: string | null;   // optional (remove if you don’t show it)
  photos: PhotoItem[];
};