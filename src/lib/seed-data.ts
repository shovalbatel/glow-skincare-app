import { createClient } from '@/lib/supabase/client';

const SEED_PRODUCTS = [
  { id: 'p1', name: 'Caffeine Solution', brand: 'The Ordinary', category: 'eye_cream', description: 'Reduces dark circles and puffiness around the eyes', routine_time: 'am', frequency: 'Daily', status: 'have', is_active: true, notes: '' },
  { id: 'p2', name: 'Glow Serum', brand: 'Beauty of Joseon', category: 'serum', description: 'Hydration and glow with rice bran and arbutin', routine_time: 'am', frequency: 'Daily', status: 'have', is_active: true, notes: '' },
  { id: 'p3', name: 'Heartleaf Pad', brand: 'Anua', category: 'exfoliant_gentle', description: 'Improves skin texture with gentle daily exfoliation', routine_time: 'pm', frequency: '2-3x per week', status: 'have', is_active: true, notes: '' },
  { id: 'p4', name: 'AHA 30% + BHA 2% Peeling Solution', brand: 'The Ordinary', category: 'exfoliant_strong', description: 'Deep skin renewal and resurfacing peel', routine_time: 'pm', frequency: 'Once every 10 days', status: 'have', is_active: true, notes: 'Use max 10 minutes, rinse thoroughly' },
  { id: 'p5', name: 'Rosehip Oil', brand: 'Generic', category: 'oil', description: 'Deep nourishment and skin repair overnight', routine_time: 'pm', frequency: 'Daily', status: 'have', is_active: true, notes: '' },
  { id: 'p6', name: 'Dewy Skin Cream', brand: 'Tatcha', category: 'moisturizer', description: 'Rich hydration and glow for daytime use', routine_time: 'am', frequency: 'Daily', status: 'have', is_active: true, notes: '' },
  { id: 'p7', name: 'Q10 Anti-Wrinkle Night Cream', brand: 'Eucerin', category: 'night_cream', description: 'Anti-aging night repair with coenzyme Q10', routine_time: 'pm', frequency: 'Daily', status: 'have', is_active: true, notes: '' },
  { id: 'p8', name: 'UV Defense SPF 50', brand: 'TBD', category: 'sunscreen', description: 'Broad spectrum sun protection to prevent aging and damage', routine_time: 'am', frequency: 'Daily', status: 'need_to_buy', is_active: false, notes: 'Research best lightweight SPF for daily wear' },
  { id: 'p9', name: 'Retinol Serum', brand: 'TBD', category: 'treatment', description: 'Targets fine lines, wrinkles, and improves skin texture', routine_time: 'pm', frequency: '2-3x per week', status: 'need_to_buy', is_active: false, notes: 'Start with low concentration, build up tolerance' },
  { id: 'p10', name: 'BHA Exfoliant', brand: 'TBD', category: 'treatment', description: 'Deep pore cleansing with salicylic acid', routine_time: 'pm', frequency: '2-3x per week', status: 'need_to_buy', is_active: false, notes: 'Do not combine with retinol on same night' },
];

const SEED_ROUTINE_DAYS = [
  { id: 'r1', day_number: 1, name: 'Retinol Night', am_products: ['p1', 'p2', 'p6', 'p8'], pm_products: ['p9', 'p5', 'p7'] },
  { id: 'r2', day_number: 2, name: 'Recovery Night', am_products: ['p1', 'p2', 'p6', 'p8'], pm_products: ['p5', 'p7'] },
  { id: 'r3', day_number: 3, name: 'BHA Night', am_products: ['p1', 'p2', 'p6', 'p8'], pm_products: ['p3', 'p10', 'p7'] },
  { id: 'r4', day_number: 4, name: 'Recovery Night', am_products: ['p1', 'p2', 'p6', 'p8'], pm_products: ['p5', 'p7'] },
];

/**
 * Seeds default data for a new user. Idempotent — skips if user already has products.
 */
export async function seedUserData(userId: string): Promise<void> {
  const supabase = createClient();

  // Check if user already has data
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (count && count > 0) return;

  // Seed products
  await supabase.from('products').insert(
    SEED_PRODUCTS.map((p) => ({ ...p, user_id: userId }))
  );

  // Seed routine days
  await supabase.from('routine_days').insert(
    SEED_ROUTINE_DAYS.map((r) => ({ ...r, user_id: userId }))
  );

  // Seed user settings
  await supabase.from('user_settings').upsert({
    user_id: userId,
    cycle_length: 4,
  });
}
