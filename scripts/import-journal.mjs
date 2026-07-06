#!/usr/bin/env node
/**
 * One-time importer: loads Batel's Skin Journal (the 6 exported markdown files)
 * into her Glow account as structured data — products, routines (morning + the
 * 5-night rotation + conditional protocols), the night-rotation pointer, the
 * Current-State snapshot, and journal/decision/insight entries.
 *
 * Usage (from skincare-app/):
 *   node scripts/import-journal.mjs           # insert (skips if data already present)
 *   node scripts/import-journal.mjs --wipe    # clear this user's products/routines/journal first
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (bypasses row-level security
 * so the script can write another user's rows). NEXT_PUBLIC_SUPABASE_URL is
 * reused for the project URL.
 *
 * Category/essence mappings are best-effort — the app has no "essence" category
 * (mapped to serum/toner) and BHA is mapped to exfoliant_gentle. Adjust in-app
 * or via Luna after import.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, '..', '.env.local') });

const EMAIL = 'batel.az.shoval@gmail.com';
const WIPE = process.argv.includes('--wipe');

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_KEY) {
  console.error(
    '\n✖ Missing env. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in skincare-app/.env.local.\n' +
      '  Get the service_role key from Supabase → Settings → API.\n'
  );
  process.exit(1);
}

const supabase = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });

// ---------------------------------------------------------------------------
// Transcribed data
// ---------------------------------------------------------------------------

// key → product. `key` is used only to wire up routine steps below.
const PRODUCTS = [
  // Core
  { key: 'boj_oil', name: 'Ginseng Cleansing Oil', brand: 'Beauty of Joseon', category: 'cleanser', routineTime: 'pm', status: 'have', tags: ['core'], notes: 'First cleanser (PM). Massage 60–90s on dry skin, emulsify before rinsing.' },
  { key: 'eucerin', name: 'Hydrating Cleansing Gel', brand: 'Eucerin', category: 'cleanser', routineTime: 'both', status: 'have', tags: ['core'], notes: 'Morning cleanser + second cleanse every evening.' },
  { key: 'numbuzin9', name: 'No.9 Essence', brand: 'numbuzin', category: 'serum', routineTime: 'both', status: 'have', rating: 5, tags: ['core', 'replace_when_empty'], notes: 'AM + PM. Core essence.' },
  { key: 'tn_serum', name: 'TN Serum', brand: 'Cos De BAHA', category: 'serum', routineTime: 'am', status: 'have', rating: 5, tags: ['core', 'replace_when_empty'], notes: 'AM. Core product.' },
  { key: 'rice_serum', name: 'Rice 7+ Ceramide Serum', brand: 'Anua', category: 'serum', routineTime: 'both', status: 'have', rating: 5, tags: ['core', 'replace_when_empty'], notes: 'AM + recovery nights.' },
  { key: 'aestura', name: 'Atobarrier 365 Cream', brand: 'AESTURA', category: 'night_cream', routineTime: 'pm', status: 'have', rating: 5, inventoryLevel: 'new', tags: ['core', 'replace_when_empty'], notes: 'Primary night moisturizer.' },
  { key: 'paulas', name: 'Skin Perfecting 2% BHA Liquid', brand: "Paula's Choice", category: 'exfoliant_gentle', routineTime: 'pm', status: 'have', rating: 4, inventoryLevel: 'new', tags: ['core', 'replace_when_empty'], notes: 'Paula Night only. Early evaluation — mild tingling, monitor 6–8 weeks.' },
  { key: 'azelaic', name: 'Azelaic Acid 10%', brand: 'Cos De BAHA', category: 'treatment', routineTime: 'pm', status: 'have', tags: ['core'], notes: 'Azelaic Night.' },
  { key: 'purito', name: 'Daily Go-To Sunscreen', brand: 'Purito', category: 'sunscreen', routineTime: 'am', status: 'have', rating: 5, tags: ['core', 'replace_when_empty'], notes: 'Every morning.' },
  { key: 'laneige', name: 'Lip Sleeping Mask', brand: 'Laneige', category: 'treatment', routineTime: 'pm', status: 'have', rating: 5, inventoryLevel: 'new', tags: ['core', 'replace_when_empty'], notes: 'Every evening.' },
  // Occasional
  { key: 'ksecret', name: 'Retinal Eye Cream', brand: 'K-SECRET', category: 'eye_cream', routineTime: 'pm', status: 'have', tags: ['occasional'], notes: 'Once per rotation (Recovery + K-SECRET Night). Daily use caused irritation.' },
  { key: 'teatree', name: 'Tea Tree Serum', brand: '', category: 'treatment', routineTime: 'pm', status: 'have', tags: ['occasional'], notes: 'Only during hormonal flare-ups, on breakout-prone areas.' },
  { key: 'medicube', name: 'Night Wrapping Mask', brand: 'Medicube', category: 'mask', routineTime: 'pm', status: 'have', tags: ['occasional'], notes: 'Mask Night, used with Boben.' },
  // Finish first
  { key: 'boben', name: 'Ectoin Repair Cream', brand: 'Boben', category: 'night_cream', routineTime: 'pm', status: 'have', inventoryLevel: 'medium', tags: ['finish_first'], notes: 'Reserved for Mask Night until finished.' },
  { key: 'benefit', name: 'Hydro Pop Essence', brand: 'Benefit', category: 'toner', routineTime: 'am', status: 'have', inventoryLevel: 'low', tags: ['finish_first'], notes: 'Morning, until finished.' },
  { key: 'boj_glow', name: 'Glow Serum', brand: 'Beauty of Joseon', category: 'serum', routineTime: 'both', status: 'have', inventoryLevel: 'medium', tags: ['finish_first'], notes: 'Finish first.' },
  { key: 'pdrn', name: 'PDRN Cream', brand: 'Anua', category: 'moisturizer', routineTime: 'am', status: 'have', inventoryLevel: 'medium', tags: ['finish_first'], notes: 'Morning routine, until finished.' },
  // Next purchase basket
  { key: 'agame5', name: 'A-Game 5 (Retinal)', brand: 'Geek & Gorgeous', category: 'treatment', routineTime: 'pm', status: 'need_to_buy', tags: ['buy_next'], notes: 'Buy next — planned facial retinal.' },
  { key: 'haruharu', name: 'Black Rice Eye Cream', brand: 'Haruharu Wonder', category: 'eye_cream', routineTime: 'both', status: 'need_to_buy', tags: ['buy_next'], notes: 'Buy next — candidate morning eye cream.' },
  { key: 'melano', name: 'Melano CC Vitamin C Essence', brand: 'Melano CC', category: 'serum', routineTime: 'am', status: 'need_to_buy', tags: ['monitor'], notes: 'Monitoring.' },
  { key: 'celimax', name: 'Vita-A Retinal Shot', brand: 'Celimax', category: 'treatment', routineTime: 'pm', status: 'need_to_buy', tags: ['monitor'], notes: 'Monitoring.' },
];

// Routine definitions. Steps are [category, [productKeys]] tuples.
const CLEANSE_PM = ['cleanser', ['boj_oil', 'eucerin']]; // double cleanse

const ROUTINES = [
  {
    name: 'Morning Routine',
    kind: 'daily',
    am: [
      ['cleanser', ['eucerin']],
      ['toner', ['benefit']],
      ['serum', ['numbuzin9']],
      ['serum', ['tn_serum']],
      ['serum', ['rice_serum']],
      ['moisturizer', ['pdrn']],
      ['sunscreen', ['purito']],
    ],
    pm: [],
  },
  {
    name: 'Paula Night',
    kind: 'rotation',
    am: [],
    pm: [CLEANSE_PM, ['serum', ['numbuzin9']], ['exfoliant_gentle', ['paulas']], ['night_cream', ['aestura']], ['treatment', ['laneige']]],
  },
  {
    name: 'Recovery Night',
    kind: 'rotation',
    am: [],
    pm: [CLEANSE_PM, ['serum', ['numbuzin9']], ['serum', ['rice_serum']], ['night_cream', ['aestura']], ['treatment', ['laneige']]],
  },
  {
    name: 'Azelaic Night',
    kind: 'rotation',
    am: [],
    pm: [CLEANSE_PM, ['serum', ['numbuzin9']], ['treatment', ['azelaic']], ['night_cream', ['aestura']], ['treatment', ['laneige']]],
  },
  {
    name: 'Recovery + K-SECRET Night',
    kind: 'rotation',
    am: [],
    pm: [CLEANSE_PM, ['serum', ['numbuzin9']], ['serum', ['rice_serum']], ['eye_cream', ['ksecret']], ['night_cream', ['aestura']], ['treatment', ['laneige']]],
  },
  {
    name: 'Mask Night',
    kind: 'rotation',
    am: [],
    pm: [CLEANSE_PM, ['serum', ['numbuzin9']], ['serum', ['rice_serum']], ['night_cream', ['boben']], ['mask', ['medicube']], ['treatment', ['laneige']]],
  },
  // Conditional protocols
  {
    name: 'After Sea / Pool',
    kind: 'conditional',
    trigger: 'after sea/pool',
    am: [],
    pm: [CLEANSE_PM, ['serum', ['numbuzin9']], ['serum', ['rice_serum']], ['night_cream', ['aestura']], ['treatment', ['laneige']]],
  },
  {
    name: 'Travel Day',
    kind: 'conditional',
    trigger: 'travel',
    am: [['cleanser', ['eucerin']], ['sunscreen', ['purito']]],
    pm: [CLEANSE_PM, ['serum', ['numbuzin9']], ['serum', ['rice_serum']], ['night_cream', ['aestura']], ['treatment', ['laneige']]],
  },
  {
    name: 'Before Menstrual Period',
    kind: 'conditional',
    trigger: 'pre-period',
    am: [],
    pm: [CLEANSE_PM, ['serum', ['numbuzin9']], ['treatment', ['azelaic']], ['treatment', ['teatree']], ['night_cream', ['aestura']], ['treatment', ['laneige']]],
  },
  {
    name: 'Irritated Skin',
    kind: 'conditional',
    trigger: 'irritated skin',
    am: [],
    pm: [CLEANSE_PM, ['serum', ['numbuzin9']], ['night_cream', ['aestura']], ['treatment', ['laneige']]],
  },
];

// Rotation order (index 0 = next night). File 05: "Next Night: Paula Night".
const ROTATION_ORDER = ['Paula Night', 'Recovery Night', 'Azelaic Night', 'Recovery + K-SECRET Night', 'Mask Night'];

const CURRENT_STATE = {
  skinScore: 9.2,
  barrier: 'Stable',
  hydration: 'Excellent',
  redness: 'Only with heat/exercise',
  breakouts: 'Small closed comedones on forehead (under observation)',
  eyes: 'Stable with weekly K-SECRET',
  lips: 'Healthy with nightly Laneige',
  cyclePhase: 'Period finished',
  currentPriorities: [
    'Maintain consistency',
    'Protect barrier',
    'Improve texture and pores',
    'Finish older products intelligently',
  ],
  openFollowups: [
    'Monitor forehead closed comedones',
    'Weekly comparison photos',
    'Evaluate second Paula cycle',
    'Decide on morning eye cream',
    'Facial retinal when routine stays stable',
  ],
  updatedAt: '2026-07-14T00:00:00.000Z',
};

const DECISION_DATE = '2026-07-01';
const JOURNAL = [
  // Decisions (file 06)
  { kind: 'decision', title: 'Tea Tree Serum is no longer used daily', body: 'Only beneficial during hormonal flare-ups.', status: 'active', entryDate: DECISION_DATE },
  { kind: 'decision', title: 'K-SECRET Retinal Eye Cream reduced to once per rotation', body: 'Daily use caused irritation; weekly use is well tolerated.', status: 'active', entryDate: DECISION_DATE },
  { kind: 'decision', title: 'AESTURA becomes the primary night moisturizer', body: 'Better overnight hydration and skin comfort than Boben.', status: 'active', entryDate: DECISION_DATE },
  { kind: 'decision', title: 'Boben reserved for Mask Night until finished', body: 'Avoid waste while keeping AESTURA as the main night cream.', status: 'active', entryDate: DECISION_DATE },
  { kind: 'decision', title: 'Medicube Night Wrapping Mask used with Boben', body: 'Creates a dedicated hydration night without layering two rich creams.', status: 'active', entryDate: DECISION_DATE },
  { kind: 'decision', title: 'New products are introduced one at a time', body: 'Allows accurate evaluation of skin response.', status: 'permanent', entryDate: DECISION_DATE },
  { kind: 'decision', title: 'Barrier health takes priority over increasing actives', body: 'Healthy barrier produced the greatest long-term improvements.', status: 'permanent', entryDate: DECISION_DATE },
  // Insights (file 04)
  { kind: 'insight', title: 'Skin profile', body: 'Barrier healthy and stable. Mild tendency to sensitivity and to heat-induced redness. Hormonal breakouts mainly before menstruation.', tags: ['profile'] },
  { kind: 'insight', title: 'What works for the barrier', body: 'AESTURA Atobarrier 365, Anua Rice 7+ Ceramide Serum, and recovery nights. Rules: barrier before actives; one new product at a time; increase active frequency gradually.', tags: ['barrier'] },
  { kind: 'insight', title: 'Heat & weather', body: 'Heat, exercise and strong sun trigger temporary facial redness that fades within ~30–60 minutes. Not caused by skincare products.', tags: ['redness'] },
  { kind: 'insight', title: 'Hormonal cycle', body: 'Closed bumps mainly on the forehead; lower face/jaw may develop hormonal blemishes. Best response: continue Azelaic Night, Tea Tree only where needed, avoid over-treating.', tags: ['hormonal'] },
  { kind: 'insight', title: 'Highest performing products', body: '5★: AESTURA, numbuzin No.9, Anua Rice 7+, Cos De BAHA TN Serum, Purito SPF, Laneige Lip Sleeping Mask. Excellent early results: Paula\'s Choice 2% BHA.', tags: ['ratings'] },
  { kind: 'insight', title: 'Photo insights', body: 'Weekly comparison is more reliable than day-to-day observation. Use natural light and similar angles.', tags: ['photos'] },
  { kind: 'insight', title: 'Project principles', body: 'Skin barrier first. Consistency beats intensity. Every product must justify its place. Finish products intelligently. Decisions based on results, not trends.', tags: ['principles'] },
  // Journal milestones (file 03)
  { kind: 'journal', title: 'Project start', body: 'Goals: build a consistent routine, improve the skin barrier, reduce hormonal breakouts, and improve texture and pores over time.', entryDate: '2026-04-01' },
  { kind: 'journal', title: 'Consistency achieved', body: 'Morning and evening routines became consistent; daily tracking established.', entryDate: '2026-05-01' },
  { kind: 'journal', title: 'K-SECRET eye area', body: 'Initial irritation under the eyes → paused → reintroduced once per rotation → currently well tolerated.', entryDate: '2026-05-15' },
  { kind: 'journal', title: 'Athens trip', body: 'Sun, sea, pool, makeup and flights — skin remained stable. Purchased AESTURA, Paula\'s Choice 2% BHA and Laneige Lip Sleeping Mask.', entryDate: '2026-06-10' },
  { kind: 'journal', title: "Paula's Choice introduced", body: 'First application: mild tingling only, no redness or dryness. Successful introduction.', entryDate: '2026-06-20' },
  { kind: 'journal', title: 'AESTURA introduced', body: 'Rich texture, excellent overnight hydration, skin more supple the next morning. Became the primary night moisturizer.', entryDate: '2026-06-21' },
  { kind: 'journal', title: 'Laneige Lip Sleeping Mask', body: 'Noticeable improvement in lip dryness. Added as a permanent nightly step.', entryDate: '2026-06-22' },
  { kind: 'journal', title: 'Current rotation introduced', body: 'Five-night rotation: Paula, Recovery, Azelaic, Recovery + K-SECRET, Mask.', entryDate: '2026-06-25' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let stepCounter = 0;
const newStepId = () => `step_${Date.now()}_${stepCounter++}`;

function buildSteps(defs, idByKey) {
  return (defs || []).map(([category, keys]) => ({
    id: newStepId(),
    category,
    productIds: keys.map((k) => idByKey[k]).filter(Boolean),
  }));
}

async function findUserId(email) {
  // Paginate through auth users (service-role only).
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (data.users.length < 200) break;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n▶ Importing Skin Journal for ${EMAIL}${WIPE ? ' (--wipe)' : ''}\n`);

  const userId = await findUserId(EMAIL);
  if (!userId) {
    console.error(`✖ No user found with email ${EMAIL}. Sign in to the app once to create the account, then re-run.`);
    process.exit(1);
  }
  console.log(`✓ Resolved user id: ${userId}`);

  if (WIPE) {
    await supabase.from('journal_entries').delete().eq('user_id', userId);
    await supabase.from('routine_days').delete().eq('user_id', userId);
    await supabase.from('products').delete().eq('user_id', userId);
    console.log('✓ Wiped existing products / routines / journal entries');
  } else {
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if ((count ?? 0) > 0) {
      console.error(
        `✖ User already has ${count} products. Re-run with --wipe to replace, or clear data first.`
      );
      process.exit(1);
    }
  }

  // 1. Products — insert sequentially, capturing id per key.
  const idByKey = {};
  for (const p of PRODUCTS) {
    const { data, error } = await supabase
      .from('products')
      .insert({
        user_id: userId,
        name: p.name,
        brand: p.brand ?? '',
        category: p.category,
        description: '',
        routine_time: p.routineTime ?? 'both',
        frequency: 'Daily',
        status: p.status ?? 'have',
        is_active: p.status !== 'need_to_buy',
        notes: p.notes ?? '',
        rating: p.rating ?? null,
        inventory_level: p.inventoryLevel ?? 'unknown',
        tags: p.tags ?? [],
      })
      .select('id')
      .single();
    if (error) throw error;
    idByKey[p.key] = data.id;
  }
  console.log(`✓ Inserted ${PRODUCTS.length} products`);

  // 2. Routines — reference the product ids.
  const nameToRoutineId = {};
  const routineRows = ROUTINES.map((r, i) => {
    const id = `rd_${userId.slice(0, 8)}_${i}`;
    nameToRoutineId[r.name] = id;
    const amSteps = buildSteps(r.am, idByKey);
    const pmSteps = buildSteps(r.pm, idByKey);
    return {
      id,
      user_id: userId,
      day_number: i + 1,
      name: r.name,
      kind: r.kind,
      trigger: r.trigger ?? '',
      am_products: amSteps.flatMap((s) => s.productIds),
      pm_products: pmSteps.flatMap((s) => s.productIds),
      am_steps: amSteps,
      pm_steps: pmSteps,
    };
  });
  {
    const { error } = await supabase.from('routine_days').insert(routineRows);
    if (error) throw error;
  }
  console.log(`✓ Inserted ${routineRows.length} routines (1 daily, 5 rotation, ${ROUTINES.filter((r) => r.kind === 'conditional').length} conditional)`);

  // 3. user_settings — night rotation pointer + current state.
  const rotationOrder = ROTATION_ORDER.map((n) => nameToRoutineId[n]).filter(Boolean);
  {
    const { error } = await supabase.from('user_settings').upsert(
      {
        user_id: userId,
        night_rotation: { order: rotationOrder, index: 0 },
        current_state: CURRENT_STATE,
      },
      { onConflict: 'user_id' }
    );
    if (error) throw error;
  }
  console.log(`✓ Set night rotation (next: ${ROTATION_ORDER[0]}) + current state`);

  // 4. Journal entries.
  {
    const rows = JOURNAL.map((e) => ({
      user_id: userId,
      kind: e.kind,
      title: e.title ?? '',
      body: e.body ?? '',
      status: e.status ?? '',
      tags: e.tags ?? [],
      entry_date: e.entryDate ?? null,
    }));
    const { error } = await supabase.from('journal_entries').insert(rows);
    if (error) throw error;
    console.log(
      `✓ Inserted ${rows.length} journal entries (` +
        `${JOURNAL.filter((e) => e.kind === 'journal').length} journal, ` +
        `${JOURNAL.filter((e) => e.kind === 'decision').length} decisions, ` +
        `${JOURNAL.filter((e) => e.kind === 'insight').length} insights)`
    );
  }

  console.log('\n✅ Import complete.\n');
}

main().catch((err) => {
  console.error('\n✖ Import failed:', err.message || err);
  process.exit(1);
});
