export type ProductCategory =
  | 'cleanser'
  | 'toner'
  | 'serum'
  | 'moisturizer'
  | 'eye_cream'
  | 'sunscreen'
  | 'oil'
  | 'exfoliant_gentle'
  | 'exfoliant_strong'
  | 'treatment'
  | 'mask'
  | 'night_cream';

export type ProductStatus =
  | 'have'
  | 'need_to_buy'
  | 'almost_empty'
  | 'repurchase'
  | 'do_not_repurchase';

export type RoutineTime = 'am' | 'pm' | 'both';

export type SkinCondition =
  | 'irritation'
  | 'dryness'
  | 'redness'
  | 'breakout'
  | 'glow'
  | 'smoothness'
  | 'oily'
  | 'tight';

export type SkinFeeling = 1 | 2 | 3 | 4 | 5;

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  description: string;
  routineTime: RoutineTime;
  frequency: string;
  status: ProductStatus;
  isActive: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyLog {
  id: string;
  date: string; // YYYY-MM-DD
  amCompleted: boolean;
  pmCompleted: boolean;
  amProducts: string[]; // product ids
  pmProducts: string[]; // product ids
  skinFeeling: SkinFeeling;
  skinConditions: SkinCondition[];
  notes: string;
  createdAt: string;
}

export interface RoutineDay {
  id: string;
  dayNumber: number; // 1-based position in cycle
  name: string; // e.g. "Retinol Night"
  amProducts: string[];
  pmProducts: string[];
}

export interface AppState {
  products: Product[];
  dailyLogs: DailyLog[];
  routineDays: RoutineDay[];
  cycleLength: number; // how many days in the rotation
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  cleanser: 'Cleanser',
  toner: 'Toner',
  serum: 'Serum',
  moisturizer: 'Moisturizer',
  eye_cream: 'Eye Cream',
  sunscreen: 'Sunscreen',
  oil: 'Oil',
  exfoliant_gentle: 'Gentle Exfoliant',
  exfoliant_strong: 'Strong Exfoliant',
  treatment: 'Treatment',
  mask: 'Mask',
  night_cream: 'Night Cream',
};

export const STATUS_LABELS: Record<ProductStatus, string> = {
  have: 'Have',
  need_to_buy: 'Need to Buy',
  almost_empty: 'Almost Empty',
  repurchase: 'Repurchase',
  do_not_repurchase: 'Do Not Repurchase',
};

export const STATUS_COLORS: Record<ProductStatus, string> = {
  have: 'bg-emerald-100 text-emerald-700',
  need_to_buy: 'bg-amber-100 text-amber-700',
  almost_empty: 'bg-orange-100 text-orange-700',
  repurchase: 'bg-sky-100 text-sky-700',
  do_not_repurchase: 'bg-rose-100 text-rose-700',
};

export const SKIN_CONDITION_LABELS: Record<SkinCondition, string> = {
  irritation: 'Irritation',
  dryness: 'Dryness',
  redness: 'Redness',
  breakout: 'Breakout',
  glow: 'Glow',
  smoothness: 'Smoothness',
  oily: 'Oily',
  tight: 'Tight',
};

export const SKIN_CONDITION_ICONS: Record<SkinCondition, string> = {
  irritation: '🔴',
  dryness: '🏜️',
  redness: '😳',
  breakout: '😤',
  glow: '✨',
  smoothness: '🧈',
  oily: '💧',
  tight: '😬',
};

export const ROUTINE_TIME_LABELS: Record<RoutineTime, string> = {
  am: 'Morning',
  pm: 'Evening',
  both: 'AM & PM',
};

export interface FacePhoto {
  id: string;
  storagePath: string;
  publicUrl: string;
  uploadedAt: string;
}
