import { createClient } from '@/lib/supabase/client';
import {
  AppState,
  Product,
  DailyLog,
  RoutineDay,
  RoutineStep,
  ProductCategory,
  SkinCondition,
  SkinFeeling,
} from './types';

// ---------- Row ↔ Type mappers ----------

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    name: row.name as string,
    brand: row.brand as string,
    category: row.category as Product['category'],
    description: row.description as string,
    routineTime: row.routine_time as Product['routineTime'],
    frequency: row.frequency as string,
    status: row.status as Product['status'],
    isActive: row.is_active as boolean,
    notes: row.notes as string,
    purchaseUrl: (row.purchase_url as string) || '',
    imageUrl: (row.image_url as string) || '',
    imagePath: (row.image_path as string) || '',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapDailyLog(row: Record<string, unknown>): DailyLog {
  return {
    id: row.id as string,
    date: (row.date as string).slice(0, 10),
    amCompleted: row.am_completed as boolean,
    pmCompleted: row.pm_completed as boolean,
    amProducts: (row.am_products as string[]) || [],
    pmProducts: (row.pm_products as string[]) || [],
    skinFeeling: row.skin_feeling as SkinFeeling,
    skinConditions: (row.skin_conditions as SkinCondition[]) || [],
    notes: row.notes as string,
    createdAt: row.created_at as string,
  };
}

function isStepArray(v: unknown): v is RoutineStep[] {
  return Array.isArray(v) && v.every((s) => s && typeof s === 'object' && 'category' in s);
}

/** Build a single step list out of a flat product array, grouping by the
 *  product's category. Used for legacy rows that only have am_products /
 *  pm_products. */
function legacyFlatToSteps(
  productIds: string[],
  productById: Map<string, Product> | null
): RoutineStep[] {
  if (!productById) {
    return productIds.length > 0
      ? [{ id: 'legacy_serum', category: 'serum', productIds }]
      : [];
  }
  const groups = new Map<ProductCategory, string[]>();
  for (const id of productIds) {
    const p = productById.get(id);
    const cat = (p?.category || 'serum') as ProductCategory;
    const list = groups.get(cat) || [];
    list.push(id);
    groups.set(cat, list);
  }
  return Array.from(groups.entries()).map(([category, ids]) => ({
    id: `legacy_${category}`,
    category,
    productIds: ids,
  }));
}

function mapRoutineDay(
  row: Record<string, unknown>,
  productById: Map<string, Product> | null
): RoutineDay {
  const amProducts = (row.am_products as string[]) || [];
  const pmProducts = (row.pm_products as string[]) || [];

  const rawAmSteps = row.am_steps;
  const rawPmSteps = row.pm_steps;

  const amSteps: RoutineStep[] = isStepArray(rawAmSteps)
    ? (rawAmSteps as RoutineStep[])
    : legacyFlatToSteps(amProducts, productById);
  const pmSteps: RoutineStep[] = isStepArray(rawPmSteps)
    ? (rawPmSteps as RoutineStep[])
    : legacyFlatToSteps(pmProducts, productById);

  return {
    id: row.id as string,
    dayNumber: row.day_number as number,
    name: row.name as string,
    amSteps,
    pmSteps,
    amProducts: amSteps.flatMap((s) => s.productIds),
    pmProducts: pmSteps.flatMap((s) => s.productIds),
  };
}

export function flattenStepProducts(steps: RoutineStep[]): string[] {
  return steps.flatMap((s) => s.productIds);
}

// ---------- Load full state ----------

export async function loadState(): Promise<AppState> {
  const supabase = createClient();

  const [productsRes, logsRes, routineRes, settingsRes] = await Promise.all([
    supabase.from('products').select('*').order('created_at'),
    supabase.from('daily_logs').select('*').order('date', { ascending: false }),
    supabase.from('routine_days').select('*').order('day_number'),
    supabase.from('user_settings').select('*').limit(1).maybeSingle(),
  ]);

  const products = (productsRes.data || []).map(mapProduct);
  const productById = new Map(products.map((p) => [p.id, p]));

  return {
    products,
    dailyLogs: (logsRes.data || []).map(mapDailyLog),
    routineDays: (routineRes.data || []).map((r) => mapRoutineDay(r, productById)),
    cycleLength: settingsRes.data?.cycle_length ?? 4,
  };
}

// ---------- Product operations ----------

export async function addProduct(
  userId: string,
  product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string | undefined> {
  const supabase = createClient();
  const { data } = await supabase.from('products').insert({
    user_id: userId,
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
    routine_time: product.routineTime,
    frequency: product.frequency,
    status: product.status,
    is_active: product.isActive,
    notes: product.notes,
    purchase_url: product.purchaseUrl || '',
    image_url: product.imageUrl || '',
    image_path: product.imagePath || '',
  }).select('id').single();
  return data?.id;
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>
): Promise<void> {
  const supabase = createClient();
  const row: Record<string, unknown> = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.brand !== undefined) row.brand = updates.brand;
  if (updates.category !== undefined) row.category = updates.category;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.routineTime !== undefined) row.routine_time = updates.routineTime;
  if (updates.frequency !== undefined) row.frequency = updates.frequency;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.isActive !== undefined) row.is_active = updates.isActive;
  if (updates.notes !== undefined) row.notes = updates.notes;
  if (updates.purchaseUrl !== undefined) row.purchase_url = updates.purchaseUrl;
  if (updates.imageUrl !== undefined) row.image_url = updates.imageUrl;
  if (updates.imagePath !== undefined) row.image_path = updates.imagePath;
  row.updated_at = new Date().toISOString();
  await supabase.from('products').update(row).eq('id', id);
}

export async function uploadProductPhoto(
  userId: string,
  file: File
): Promise<{ storagePath: string; publicUrl: string }> {
  const supabase = createClient();
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;

  const { error } = await supabase.storage.from('product-photos').upload(path, file);
  if (error) throw error;

  const { data } = supabase.storage.from('product-photos').getPublicUrl(path);
  return { storagePath: path, publicUrl: data.publicUrl };
}

export async function deleteProductPhoto(storagePath: string): Promise<void> {
  if (!storagePath) return;
  const supabase = createClient();
  await supabase.storage.from('product-photos').remove([storagePath]);
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('products').delete().eq('id', id);
}

// ---------- Daily log operations ----------

export async function addOrUpdateLog(
  userId: string,
  log: {
    date: string;
    amCompleted: boolean;
    pmCompleted: boolean;
    amProducts: string[];
    pmProducts: string[];
    skinFeeling: SkinFeeling;
    skinConditions: SkinCondition[];
    notes: string;
  }
): Promise<void> {
  const supabase = createClient();
  await supabase.from('daily_logs').upsert(
    {
      user_id: userId,
      date: log.date,
      am_completed: log.amCompleted,
      pm_completed: log.pmCompleted,
      am_products: log.amProducts,
      pm_products: log.pmProducts,
      skin_feeling: log.skinFeeling,
      skin_conditions: log.skinConditions,
      notes: log.notes,
    },
    { onConflict: 'user_id,date' }
  );
}

// ---------- Routine operations ----------

export async function updateRoutineDays(
  userId: string,
  days: RoutineDay[],
  cycleLength: number = Math.max(days.length, 1)
): Promise<void> {
  const supabase = createClient();

  // Delete existing routine days and re-insert
  await supabase.from('routine_days').delete().eq('user_id', userId);
  if (days.length > 0) {
    await supabase.from('routine_days').insert(
      days.map((d) => {
        const amSteps = d.amSteps ?? [];
        const pmSteps = d.pmSteps ?? [];
        return {
          id: d.id,
          user_id: userId,
          day_number: d.dayNumber,
          name: d.name,
          // Write both representations so legacy code paths still work
          // until everything is migrated.
          am_products: flattenStepProducts(amSteps),
          pm_products: flattenStepProducts(pmSteps),
          am_steps: amSteps,
          pm_steps: pmSteps,
        };
      })
    );
  }

  // Upsert user settings
  await supabase.from('user_settings').upsert(
    {
      user_id: userId,
      cycle_length: cycleLength,
    },
    { onConflict: 'user_id' }
  );
}

// ---------- Helpers (operate on in-memory state) ----------

export function getRoutinesForTime(
  state: AppState,
  time: 'am' | 'pm'
): RoutineDay[] {
  return state.routineDays.filter((d) =>
    time === 'am' ? (d.amSteps?.length ?? 0) > 0 : (d.pmSteps?.length ?? 0) > 0
  );
}

const LAST_USED_KEY = (time: 'am' | 'pm') => `dailyRoutine.lastUsed.${time}`;

export function readLastUsedRoutineId(time: 'am' | 'pm'): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(LAST_USED_KEY(time));
  } catch {
    return null;
  }
}

export function writeLastUsedRoutineId(time: 'am' | 'pm', id: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAST_USED_KEY(time), id);
  } catch {
    /* ignore quota / privacy mode */
  }
}

/**
 * Pick the routine to suggest for a given time slot. Prefers the most
 * recently used (per device, via localStorage); falls back to the first
 * routine that has steps for that slot.
 */
export function getSuggestedRoutine(
  state: AppState,
  time: 'am' | 'pm'
): RoutineDay | null {
  const candidates = getRoutinesForTime(state, time);
  if (candidates.length === 0) return null;
  const lastId = readLastUsedRoutineId(time);
  if (lastId) {
    const match = candidates.find((d) => d.id === lastId);
    if (match) return match;
  }
  return candidates[0];
}

/** @deprecated Use getSuggestedRoutine. Kept temporarily for any caller still
 *  reaching for "today's" routine; returns the suggested AM routine. */
export function getTodayRoutineDay(state: AppState): RoutineDay | null {
  return getSuggestedRoutine(state, 'am') ?? getSuggestedRoutine(state, 'pm');
}

export function getProductById(state: AppState, id: string): Product | undefined {
  return state.products.find((p) => p.id === id);
}

export function getLogByDate(state: AppState, date: string): DailyLog | undefined {
  return state.dailyLogs.find((l) => l.date === date);
}

// ---------- Onboarding operations ----------

export async function checkOnboardingStatus(userId: string): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from('user_settings')
    .select('onboarding_completed')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.onboarding_completed === true;
}

export async function saveDisclaimerAgreement(userId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('user_settings').upsert(
    {
      user_id: userId,
      disclaimer_agreed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
}

export async function saveSkinProfile(
  userId: string,
  goals: string[],
  concerns: string[]
): Promise<void> {
  const supabase = createClient();
  await supabase.from('user_settings').upsert(
    {
      user_id: userId,
      skin_goals: goals,
      skin_concerns: concerns,
    },
    { onConflict: 'user_id' }
  );
}

export async function completeOnboarding(userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('user_settings').upsert(
    {
      user_id: userId,
      onboarding_completed: true,
    },
    { onConflict: 'user_id' }
  );
  if (error) {
    console.error('[completeOnboarding] failed:', error);
    throw error;
  }
}

export async function uploadFacePhoto(
  userId: string,
  file: File
): Promise<{ storagePath: string; publicUrl: string }> {
  const supabase = createClient();
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('face-photos').upload(path, file);
  if (error) throw error;

  const { data } = supabase.storage.from('face-photos').getPublicUrl(path);
  return { storagePath: path, publicUrl: data.publicUrl };
}

export async function saveFacePhotoRecord(
  userId: string,
  storagePath: string,
  publicUrl: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('face_photos').insert({
    user_id: userId,
    storage_path: storagePath,
    public_url: publicUrl,
  });
  if (error) {
    console.error('[saveFacePhotoRecord] failed:', error);
    throw new Error(`Could not save photo record: ${error.message}`);
  }
}

export async function fetchProducts(userId: string): Promise<Product[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .order('created_at');
  return (data || []).map(mapProduct);
}

export async function fetchFacePhotos(userId: string): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('face_photos')
    .select('public_url')
    .eq('user_id', userId)
    .order('uploaded_at');
  return (data || []).map((r: { public_url: string }) => r.public_url);
}

export async function fetchFacePhotosWithDates(userId: string): Promise<Array<{ url: string; date: string }>> {
  const supabase = createClient();
  const { data } = await supabase
    .from('face_photos')
    .select('public_url, uploaded_at')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false });
  return (data || []).map((r: { public_url: string; uploaded_at: string }) => ({
    url: r.public_url,
    date: r.uploaded_at,
  }));
}

export async function fetchSkinProfile(userId: string): Promise<{ goals: string[]; concerns: string[] }> {
  const supabase = createClient();
  const { data } = await supabase
    .from('user_settings')
    .select('skin_goals, skin_concerns')
    .eq('user_id', userId)
    .single();
  return {
    goals: (data?.skin_goals as string[]) || [],
    concerns: (data?.skin_concerns as string[]) || [],
  };
}

export async function saveRecommendation(
  userId: string,
  rec: { skinAnalysis: unknown; routineSuggestions: unknown; productPicks: unknown }
): Promise<void> {
  const supabase = createClient();
  // Delete old recommendations for this user, keep only latest
  await supabase.from('recommendations').delete().eq('user_id', userId);
  await supabase.from('recommendations').insert({
    user_id: userId,
    skin_analysis: rec.skinAnalysis,
    routine_suggestions: rec.routineSuggestions,
    product_picks: rec.productPicks,
  });
}

export async function fetchRecommendation(userId: string): Promise<{
  skinAnalysis: unknown;
  routineSuggestions: unknown;
  productPicks: unknown;
  createdAt: string;
} | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('recommendations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (!data) return null;
  return {
    skinAnalysis: data.skin_analysis,
    routineSuggestions: data.routine_suggestions,
    productPicks: data.product_picks,
    createdAt: data.created_at as string,
  };
}
