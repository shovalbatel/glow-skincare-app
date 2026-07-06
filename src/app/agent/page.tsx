'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { useAppState } from '@/hooks/use-app-state';
import { useAuth } from '@/components/auth-provider';
import { useLocale } from '@/components/locale-provider';
import {
  loadState,
  getSuggestedRoutine,
  getLogByDate,
  getNextNight,
  flattenStepProducts,
  fetchSkinProfile,
} from '@/lib/store';
import {
  Product,
  ProductCategory,
  ProductStatus,
  ProductTag,
  InventoryLevel,
  RoutineTime,
  RoutineDay,
  RoutineStep,
  SkinCondition,
  SkinFeeling,
  CurrentState,
} from '@/lib/types';
import { format } from 'date-fns';
import { Moon, Send, Loader2, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const VALID_CATEGORIES: ProductCategory[] = [
  'cleanser', 'toner', 'serum', 'moisturizer', 'eye_cream', 'sunscreen',
  'oil', 'exfoliant_gentle', 'exfoliant_strong', 'treatment', 'mask', 'night_cream',
];
const VALID_STATUS: ProductStatus[] = [
  'have', 'need_to_buy', 'almost_empty', 'repurchase', 'do_not_repurchase',
];
const VALID_TAGS: ProductTag[] = [
  'core', 'occasional', 'finish_first', 'buy_next', 'monitor', 'replace_when_empty',
];

function newStepId() {
  return `step_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function newRoutineId() {
  return `rd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/** A message in OpenAI chat format, plus an optional client-only display field. */
interface ToolCall {
  id: string;
  type: string;
  function: { name: string; arguments: string };
}
interface ChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  _action?: string; // client-only: friendly label for an executed action
}

const MAX_TOOL_ROUNDS = 5;

export default function AgentPage() {
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const {
    state,
    refresh,
    addProduct,
    updateProduct,
    saveLog,
    updateRoutine,
    addJournalEntry,
    saveCurrentState,
    advanceRotation,
  } = useAppState();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ goals: string[]; concerns: string[] }>({ goals: [], concerns: [] });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (user) fetchSkinProfile(user.id).then(setProfile).catch(() => {});
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // ---- Build the compact context snapshot sent to Luna ----
  const buildContext = useCallback(
    (s: NonNullable<typeof state>) => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const nameOf = (id: string) => s.products.find((p) => p.id === id)?.name ?? null;
      const describeSteps = (steps: RoutineStep[]) =>
        (steps ?? []).map((st) => ({
          category: st.category,
          products: st.productIds.map(nameOf).filter(Boolean),
        }));
      const nextNight = getNextNight(s);
      return {
        today,
        language: locale,
        goals: profile.goals,
        concerns: profile.concerns,
        currentState: s.currentState,
        nextNight: nextNight ? nextNight.name : null,
        products: s.products.map((p) => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          category: p.category,
          status: p.status,
          routineTime: p.routineTime,
          isActive: p.isActive,
          rating: p.rating ?? undefined,
          inventoryLevel: p.inventoryLevel !== 'unknown' ? p.inventoryLevel : undefined,
          tags: p.tags?.length ? p.tags : undefined,
        })),
        routines: s.routineDays.map((d) => ({
          name: d.name,
          kind: d.kind,
          trigger: d.trigger || undefined,
          morning: describeSteps(d.amSteps),
          evening: describeSteps(d.pmSteps),
        })),
        recentLogs: s.dailyLogs.slice(0, 5).map((l) => ({
          date: l.date,
          morningDone: l.amCompleted,
          eveningDone: l.pmCompleted,
          skinFeeling: l.skinFeeling,
          skinConditions: l.skinConditions,
        })),
        recentJournal: s.journalEntries.slice(0, 8).map((e) => ({
          kind: e.kind,
          title: e.title || undefined,
          body: e.body,
          status: e.status || undefined,
          date: e.entryDate || undefined,
        })),
      };
    },
    [locale, profile]
  );

  // ---- Fuzzy match a product by name against the current library ----
  const matchProduct = (products: Product[], query?: string): Product | undefined => {
    if (!query) return undefined;
    const q = query.trim().toLowerCase();
    if (!q) return undefined;
    return (
      products.find((p) => p.name.toLowerCase() === q) ||
      products.find((p) => p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase())) ||
      products.find((p) => `${p.brand} ${p.name}`.toLowerCase().includes(q))
    );
  };

  // ---- Execute a single tool call locally; returns a result for the model ----
  const executeTool = async (
    name: string,
    args: Record<string, unknown>
  ): Promise<{ ok: boolean; summary: string; detail?: string }> => {
    const today = format(new Date(), 'yyyy-MM-dd');

    if (name === 'add_product') {
      const category = (VALID_CATEGORIES.includes(args.category as ProductCategory)
        ? args.category
        : 'serum') as ProductCategory;
      const status = (VALID_STATUS.includes(args.status as ProductStatus)
        ? args.status
        : 'have') as ProductStatus;
      const routineTime = (['am', 'pm', 'both'].includes(args.routineTime as string)
        ? args.routineTime
        : 'both') as RoutineTime;
      const pName = String(args.name ?? '').trim();
      if (!pName) return { ok: false, summary: 'No product name given' };
      const inventoryLevel = (['new', 'medium', 'low', 'empty'].includes(args.inventoryLevel as string)
        ? args.inventoryLevel
        : 'unknown') as InventoryLevel;
      const rating = [1, 2, 3, 4, 5].includes(args.rating as number) ? (args.rating as number) : null;
      const tags = (Array.isArray(args.tags)
        ? (args.tags as string[]).filter((tg) => VALID_TAGS.includes(tg as ProductTag))
        : []) as ProductTag[];
      await addProduct({
        name: pName,
        brand: String(args.brand ?? '').trim(),
        category,
        description: '',
        routineTime,
        frequency: 'Daily',
        status,
        isActive: true,
        notes: String(args.notes ?? ''),
        purchaseUrl: '',
        imageUrl: '',
        imagePath: '',
        rating,
        inventoryLevel,
        tags,
      });
      return { ok: true, summary: `${t('agent.act.added')} ${pName}` };
    }

    if (name === 'update_product') {
      const fresh = await loadState();
      const target =
        fresh.products.find((p) => p.id === args.productId) ||
        matchProduct(fresh.products, args.productName as string | undefined);
      if (!target) return { ok: false, summary: t('agent.act.productNotFound') };
      const updates: Partial<Product> = {};
      if (VALID_STATUS.includes(args.status as ProductStatus)) updates.status = args.status as ProductStatus;
      if (['am', 'pm', 'both'].includes(args.routineTime as string)) updates.routineTime = args.routineTime as RoutineTime;
      if (typeof args.isActive === 'boolean') updates.isActive = args.isActive;
      if (typeof args.notes === 'string') updates.notes = args.notes;
      if ([1, 2, 3, 4, 5].includes(args.rating as number)) updates.rating = args.rating as number;
      if (['new', 'medium', 'low', 'empty'].includes(args.inventoryLevel as string))
        updates.inventoryLevel = args.inventoryLevel as InventoryLevel;
      if (Array.isArray(args.tags))
        updates.tags = (args.tags as string[]).filter((tg) => VALID_TAGS.includes(tg as ProductTag)) as ProductTag[];
      if (Object.keys(updates).length === 0) return { ok: false, summary: 'Nothing to update' };
      await updateProduct(target.id, updates);
      return { ok: true, summary: `${t('agent.act.updated')} ${target.name}` };
    }

    if (name === 'log_routine') {
      const fresh = await loadState();
      const date = (typeof args.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args.date))
        ? args.date
        : today;
      const time = (['am', 'pm', 'both'].includes(args.time as string) ? args.time : 'both') as
        | 'am' | 'pm' | 'both';
      const existing = getLogByDate(fresh, date);
      const amR = getSuggestedRoutine(fresh, 'am');
      const pmR = getSuggestedRoutine(fresh, 'pm');
      const doAm = time === 'am' || time === 'both';
      const doPm = time === 'pm' || time === 'both';
      const amCompleted = doAm ? true : existing?.amCompleted ?? false;
      const pmCompleted = doPm ? true : existing?.pmCompleted ?? false;
      const amProducts = doAm
        ? (existing?.amProducts?.length ? existing.amProducts : flattenStepProducts(amR?.amSteps ?? []))
        : existing?.amProducts ?? [];
      const pmProducts = doPm
        ? (existing?.pmProducts?.length ? existing.pmProducts : flattenStepProducts(pmR?.pmSteps ?? []))
        : existing?.pmProducts ?? [];
      const skinFeeling = ([1, 2, 3, 4, 5].includes(args.skinFeeling as number)
        ? args.skinFeeling
        : existing?.skinFeeling ?? 3) as SkinFeeling;
      const skinConditions = (Array.isArray(args.skinConditions)
        ? (args.skinConditions as SkinCondition[])
        : existing?.skinConditions ?? []) as SkinCondition[];
      await saveLog({
        date,
        amCompleted,
        pmCompleted,
        amProducts,
        pmProducts,
        skinFeeling,
        skinConditions,
        notes: typeof args.notes === 'string' ? args.notes : existing?.notes ?? '',
      });
      const label =
        time === 'both' ? t('agent.act.loggedBoth') : time === 'am' ? t('agent.act.loggedAm') : t('agent.act.loggedPm');
      return { ok: true, summary: label };
    }

    if (name === 'add_routine_step') {
      const time = (args.time === 'pm' ? 'pm' : 'am') as 'am' | 'pm';
      const category = (VALID_CATEGORIES.includes(args.category as ProductCategory)
        ? args.category
        : 'serum') as ProductCategory;
      const fresh = await loadState();
      const matched = matchProduct(fresh.products, args.productName as string | undefined);
      const step: RoutineStep = {
        id: newStepId(),
        category,
        productIds: matched ? [matched.id] : [],
      };

      let days = fresh.routineDays;
      let target: RoutineDay | undefined = getSuggestedRoutine(fresh, time) ?? days[0];
      if (!target) {
        target = {
          id: newRoutineId(),
          dayNumber: 1,
          name: t('agent.act.myRoutine'),
          kind: time === 'am' ? 'daily' : 'rotation',
          trigger: '',
          amSteps: [],
          pmSteps: [],
          amProducts: [],
          pmProducts: [],
        };
        days = [target];
      }
      const updated = days.map((d) => {
        if (d.id !== target!.id) return d;
        const amSteps = time === 'am' ? [...(d.amSteps ?? []), step] : d.amSteps ?? [];
        const pmSteps = time === 'pm' ? [...(d.pmSteps ?? []), step] : d.pmSteps ?? [];
        return {
          ...d,
          amSteps,
          pmSteps,
          amProducts: flattenStepProducts(amSteps),
          pmProducts: flattenStepProducts(pmSteps),
        };
      });
      await updateRoutine(updated);
      const catLabel = t('cat.' + category);
      const summary =
        (time === 'am' ? t('agent.act.stepAmAdded') : t('agent.act.stepPmAdded')) + ` ${catLabel}`;
      return {
        ok: true,
        summary,
        detail: matched
          ? `Attached product "${matched.name}".`
          : 'No matching product in library; step added with no product attached.',
      };
    }

    if (name === 'advance_rotation') {
      await advanceRotation();
      const fresh = await loadState();
      const next = getNextNight(fresh);
      return {
        ok: true,
        summary: t('agent.act.rotationAdvanced'),
        detail: next ? `Next night is now "${next.name}".` : 'No rotation configured.',
      };
    }

    if (name === 'add_journal_entry') {
      const body = String(args.body ?? '').trim();
      if (!body) return { ok: false, summary: 'Nothing to record' };
      await addJournalEntry({
        kind: 'journal',
        title: String(args.title ?? '').trim(),
        body,
        tags: Array.isArray(args.tags) ? (args.tags as string[]) : [],
        entryDate:
          typeof args.entryDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args.entryDate)
            ? args.entryDate
            : today,
      });
      return { ok: true, summary: t('agent.act.journalAdded') };
    }

    if (name === 'log_decision') {
      const title = String(args.title ?? '').trim();
      if (!title) return { ok: false, summary: 'Nothing to record' };
      const status = ['active', 'permanent', 'superseded'].includes(args.status as string)
        ? (args.status as string)
        : 'active';
      await addJournalEntry({
        kind: 'decision',
        title,
        body: String(args.body ?? '').trim(),
        status,
        entryDate:
          typeof args.entryDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args.entryDate)
            ? args.entryDate
            : today,
      });
      return { ok: true, summary: t('agent.act.decisionLogged') };
    }

    if (name === 'record_insight') {
      const body = String(args.body ?? '').trim();
      if (!body) return { ok: false, summary: 'Nothing to record' };
      await addJournalEntry({
        kind: 'insight',
        title: String(args.title ?? '').trim(),
        body,
        tags: Array.isArray(args.tags) ? (args.tags as string[]) : [],
        entryDate: today,
      });
      return { ok: true, summary: t('agent.act.insightRecorded') };
    }

    if (name === 'update_current_state') {
      const fresh = await loadState();
      const merged: CurrentState = { ...fresh.currentState };
      const strFields: (keyof CurrentState)[] = [
        'barrier', 'hydration', 'redness', 'breakouts', 'eyes', 'lips', 'cyclePhase',
      ];
      for (const f of strFields) {
        if (typeof args[f] === 'string' && (args[f] as string).trim()) {
          (merged[f] as string) = (args[f] as string).trim();
        }
      }
      if (typeof args.skinScore === 'number') merged.skinScore = args.skinScore;
      if (Array.isArray(args.currentPriorities))
        merged.currentPriorities = (args.currentPriorities as string[]).map(String);
      if (Array.isArray(args.openFollowups))
        merged.openFollowups = (args.openFollowups as string[]).map(String);
      await saveCurrentState(merged);
      return { ok: true, summary: t('agent.act.currentStateUpdated') };
    }

    return { ok: false, summary: `Unknown tool: ${name}` };
  };

  // ---- Send a user message and run the tool loop until Luna replies with text ----
  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading || !state) return;
    setError(null);
    setInput('');

    let working: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(working);
    setLoading(true);

    try {
      // Snapshot context from the freshest state we have.
      let snapshot = await loadState();

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const res = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: working, context: buildContext(snapshot) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');

        const msg = data.message as ChatMessage;
        working = [...working, msg];

        const calls = msg.tool_calls ?? [];
        if (calls.length === 0) {
          setMessages(working);
          break;
        }

        // Show the assistant's turn (may include a content preamble) immediately.
        setMessages(working);

        for (const call of calls) {
          let parsed: Record<string, unknown> = {};
          try {
            parsed = JSON.parse(call.function.arguments || '{}');
          } catch {
            parsed = {};
          }
          const result = await executeTool(call.function.name, parsed);
          working = [
            ...working,
            {
              role: 'tool',
              tool_call_id: call.id,
              content: JSON.stringify(result),
              _action: result.ok ? result.summary : undefined,
            },
          ];
          setMessages(working);
        }

        // Actions may have changed the data — refresh app state + snapshot.
        await refresh();
        snapshot = await loadState();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const quickPrompts = [
    t('agent.quick.morning'),
    t('agent.quick.evening'),
    t('agent.quick.didMorning'),
    t('agent.quick.recommend'),
    t('agent.quick.addProduct'),
  ];

  const visible = messages.filter(
    (m) => (m.role === 'assistant' && m.content) || m.role === 'user' || (m.role === 'tool' && m._action)
  );

  return (
    <AppShell>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-b from-rose-50 to-rose-50/80 backdrop-blur-md px-5 pt-12 pb-3 border-b border-rose-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-sm">
            <Moon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-stone-900 leading-tight">{t('agent.name')}</h1>
            <p className="text-xs text-stone-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              {t('agent.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="px-4 py-4 space-y-3 min-h-[50vh]">
        {visible.length === 0 && (
          <div className="text-center px-4 py-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-md">
              <Moon className="w-8 h-8 text-white" />
            </div>
            <p className="text-stone-700 font-medium mb-1">{t('agent.greetingTitle')}</p>
            <p className="text-sm text-stone-500 max-w-xs mx-auto">{t('agent.greetingBody')}</p>
          </div>
        )}

        {visible.map((m, i) => {
          if (m.role === 'tool') {
            return (
              <div key={i} className="flex justify-center">
                <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-full border border-emerald-100">
                  <Check className="w-3.5 h-3.5" />
                  {m._action}
                </div>
              </div>
            );
          }
          const isUser = m.role === 'user';
          return (
            <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-rose-500 text-white rounded-br-md'
                    : 'bg-white text-stone-700 border border-rose-100 rounded-bl-md shadow-sm'
                }`}
              >
                {m.content}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-rose-100 rounded-2xl rounded-bl-md shadow-sm px-4 py-3 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-rose-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 bg-rose-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 bg-rose-300 rounded-full animate-bounce" />
            </div>
          </div>
        )}

        {error && (
          <div className="text-center text-xs text-rose-500 bg-rose-50 rounded-lg py-2 px-3">{error}</div>
        )}
      </div>

      {/* Quick prompts (only before the conversation starts) */}
      {visible.length === 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {quickPrompts.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              disabled={loading || !state}
              className="text-xs bg-white border border-rose-200 text-rose-600 px-3 py-1.5 rounded-full hover:bg-rose-50 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-rose-100 pb-safe">
        <div className="max-w-lg mx-auto px-3 py-3 pb-20">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder={t('agent.inputPlaceholder')}
              className="flex-1 resize-none rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-300 max-h-32"
            />
            <Button
              onClick={() => send(input)}
              disabled={loading || !input.trim() || !state}
              className="rounded-full w-11 h-11 p-0 bg-rose-500 hover:bg-rose-600 shrink-0"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5 rtl:-scale-x-100" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
