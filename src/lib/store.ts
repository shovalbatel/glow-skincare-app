import { createClient } from '@/lib/supabase/client';
import { AppState, Product, DailyLog, RoutineDay, SkinCondition, SkinFeeling } from './types';

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

function mapRoutineDay(row: Record<string, unknown>): RoutineDay {
  return {
    id: row.id as string,
    dayNumber: row.day_number as number,
    name: row.name as string,
    amProducts: (row.am_products as string[]) || [],
    pmProducts: (row.pm_products as string[]) || [],
  };
}

// ---------- Load full state ----------

export async function loadState(): Promise<AppState> {
  const supabase = createClient();

  const [productsRes, logsRes, routineRes, settingsRes] = await Promise.all([
    supabase.from('products').select('*').order('created_at'),
    supabase.from('daily_logs').select('*').order('date', { ascending: false }),
    supabase.from('routine_days').select('*').order('day_number'),
    supabase.from('user_settings').select('*').limit(1).single(),
  ]);

  return {
    products: (productsRes.data || []).map(mapProduct),
    dailyLogs: (logsRes.data || []).map(mapDailyLog),
    routineDays: (routineRes.data || []).map(mapRoutineDay),
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
  row.updated_at = new Date().toISOString();
  await supabase.from('products').update(row).eq('id', id);
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
  cycleLength: number
): Promise<void> {
  const supabase = createClient();

  // Delete existing routine days and re-insert
  await supabase.from('routine_days').delete().eq('user_id', userId);
  if (days.length > 0) {
    await supabase.from('routine_days').insert(
      days.map((d) => ({
        id: d.id,
        user_id: userId,
        day_number: d.dayNumber,
        name: d.name,
        am_products: d.amProducts,
        pm_products: d.pmProducts,
      }))
    );
  }

  // Upsert user settings
  await supabase.from('user_settings').upsert({
    user_id: userId,
    cycle_length: cycleLength,
  });
}

// ---------- Helpers (operate on in-memory state) ----------

export function getTodayRoutineDay(state: AppState): RoutineDay | null {
  if (state.routineDays.length === 0) return null;
  const startDate = new Date('2026-04-01');
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const dayIndex = ((diffDays % state.cycleLength) + state.cycleLength) % state.cycleLength;
  return state.routineDays[dayIndex] || state.routineDays[0];
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
    .single();
  return data?.onboarding_completed === true;
}

export async function saveDisclaimerAgreement(userId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('user_settings').upsert({
    user_id: userId,
    disclaimer_agreed_at: new Date().toISOString(),
  });
}

export async function saveSkinProfile(
  userId: string,
  goals: string[],
  concerns: string[]
): Promise<void> {
  const supabase = createClient();
  await supabase.from('user_settings').upsert({
    user_id: userId,
    skin_goals: goals,
    skin_concerns: concerns,
  });
}

export async function completeOnboarding(userId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('user_settings').upsert({
    user_id: userId,
    onboarding_completed: true,
  });
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
  await supabase.from('face_photos').insert({
    user_id: userId,
    storage_path: storagePath,
    public_url: publicUrl,
  });
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
