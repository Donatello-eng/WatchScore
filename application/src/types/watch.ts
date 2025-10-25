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

export type WatchAI = {
  name?: string;
  subtitle?: string;
  overall?: { conclusion?: string; score?: WatchScore };
  brand_reputation?: unknown;
  movement_quality?: MovementQuality;
  materials_build?: unknown;
  maintenance_risks?: unknown;
  value_for_money?: { list_price?: Money } & Record<string, any>;
  alternatives?: unknown[];
  meta?: { release_year?: number };
};

export type ServerWatch = {
  id: number;
  name?: string | null;
  subtitle?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  overallLetter?: string | null;
  overallNumeric?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  photos: PhotoItem[];
  ai?: WatchAI;
  analysis?: { id: number; aiJsonStr?: string } | null;
};
