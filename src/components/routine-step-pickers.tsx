'use client';

import { useMemo, useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Sparkles, Loader2, Sun, Moon, SunMoon, CheckCircle2, ImageIcon } from 'lucide-react';
import { Product, ProductCategory } from '@/lib/types';
import { useLocale } from '@/components/locale-provider';

// ---------- Multi-select picker (existing products) ----------

export function StepProductPicker({
  open,
  onOpenChange,
  category,
  time,
  allProducts,
  initialSelected,
  onConfirm,
  onAddNew,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  category: ProductCategory;
  time: 'am' | 'pm';
  allProducts: Product[];
  initialSelected: string[];
  onConfirm: (ids: string[]) => void;
  onAddNew: () => void;
}) {
  const { t } = useLocale();
  // The picker is always mounted fresh per step (parent only renders it
  // when pickerStep is non-null and unmounts it on close), so plain useState
  // initializers are sufficient — no syncing effect needed.
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>(initialSelected);

  const stepLabel = t('cat.' + category);

  const sections = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = (p: Product) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      t('cat.' + p.category).toLowerCase().includes(q);

    const filtered = allProducts.filter(matches);

    // Search mode: flat list, recommended-first
    if (q) {
      const recommended = filtered.filter((p) => p.category === category);
      const others = filtered.filter((p) => p.category !== category);
      return [{ key: 'search', label: '', items: [...recommended, ...others] }];
    }

    const recommended = filtered.filter((p) => p.category === category);
    const remaining = filtered.filter((p) => p.category !== category);

    // Group remaining by routineTime (am / pm / both). Order so the section
    // matching the current step's time of day comes first.
    const morning = remaining.filter((p) => p.routineTime === 'am');
    const evening = remaining.filter((p) => p.routineTime === 'pm');
    const anytime = remaining.filter((p) => p.routineTime === 'both');

    const groups = [
      {
        key: 'recommended',
        label: t('routine.pickerRecommended').replace('{step}', stepLabel),
        items: recommended,
      },
      time === 'am'
        ? { key: 'morning', label: t('routine.pickerMorning'), items: morning }
        : { key: 'evening', label: t('routine.pickerEvening'), items: evening },
      { key: 'anytime', label: t('routine.pickerAnytime'), items: anytime },
      time === 'am'
        ? { key: 'evening', label: t('routine.pickerEvening'), items: evening }
        : { key: 'morning', label: t('routine.pickerMorning'), items: morning },
    ];
    return groups.filter((g) => g.items.length > 0);
  }, [allProducts, category, time, search, t, stepLabel]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const confirm = () => {
    onConfirm(selected);
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onConfirm(selected);
        onOpenChange(next);
      }}
    >
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[90vh] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="text-stone-700">
            {t('routine.pickerTitle').replace('{step}', stepLabel)}
          </SheetTitle>
        </SheetHeader>

        {/* Search */}
        <div className="relative mt-3 mb-3">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('routine.pickerSearch')}
            className="ps-9 bg-white border-rose-100"
          />
        </div>

        {allProducts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-stone-400 mb-3">{t('routine.pickerEmpty')}</p>
            <Button
              onClick={onAddNew}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              {t('routine.addNewProduct')}
            </Button>
          </div>
        ) : sections.every((s) => s.items.length === 0) ? (
          <p className="py-8 text-center text-sm text-stone-400">
            {t('routine.pickerNoResults')}
          </p>
        ) : (
          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.key}>
                {section.label && (
                  <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                    {section.label}
                  </p>
                )}
                <div className="space-y-1.5">
                  {section.items.map((p) => (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selected.includes(p.id)
                          ? 'border-rose-300 bg-rose-50/60'
                          : 'border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <Checkbox
                        checked={selected.includes(p.id)}
                        onCheckedChange={() => toggle(p.id)}
                      />
                      <ProductThumb product={p} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-700 truncate">{p.name}</p>
                        <p className="text-[11px] text-stone-400 truncate">
                          {p.brand} · {t('cat.' + p.category)}
                        </p>
                      </div>
                      <RoutineTimeIcon time={p.routineTime} />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="sticky bottom-0 bg-white pt-3 mt-4 border-t border-stone-100 flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={onAddNew}
            className="text-rose-500 text-xs"
          >
            + {t('routine.addNewProduct')}
          </Button>
          <Button
            onClick={confirm}
            className="ms-auto bg-rose-500 hover:bg-rose-600 text-white"
          >
            {t('routine.pickerDone')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RoutineTimeIcon({ time }: { time: 'am' | 'pm' | 'both' }) {
  if (time === 'am') return <Sun className="w-3.5 h-3.5 text-amber-500" />;
  if (time === 'pm') return <Moon className="w-3.5 h-3.5 text-indigo-400" />;
  return <SunMoon className="w-3.5 h-3.5 text-stone-400" />;
}

export function ProductThumb({
  product,
  size = 'sm',
}: {
  product: Product;
  size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 'w-9 h-9' : 'w-12 h-12';
  return (
    <div className={`${dim} rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center overflow-hidden flex-shrink-0`}>
      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
      ) : (
        <ImageIcon className="w-3.5 h-3.5 text-rose-200" />
      )}
    </div>
  );
}

// ---------- AI suggestion sheet ----------

export interface AiPick {
  name: string;
  brand: string;
  reason: string;
  category: ProductCategory;
}

export function StepAiSuggestSheet({
  open,
  onOpenChange,
  category,
  time,
  library,
  goals,
  concerns,
  onPick,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  category: ProductCategory;
  time: 'am' | 'pm';
  library: Product[];
  goals?: string[];
  concerns?: string[];
  onPick: (pick: AiPick) => void | Promise<void>;
}) {
  const { t } = useLocale();
  const [picks, setPicks] = useState<AiPick[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedNames, setAddedNames] = useState<Set<string>>(new Set());

  // Fetch on open; reset when closing.
  useEffect(() => {
    if (!open) {
      setPicks(null);
      setError(null);
      setAddedNames(new Set());
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch('/api/suggest-step-products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category,
            time,
            goals,
            concerns,
            library: library.map((p) => ({
              name: p.name,
              brand: p.brand,
              category: p.category,
            })),
          }),
        });
        const data = (await res.json()) as { picks?: AiPick[]; error?: string };
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || 'Suggestion failed');
        setPicks(data.picks ?? []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Suggestion failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, category, time, library, goals, concerns]);

  const stepLabel = t('cat.' + category);

  const handlePick = async (pick: AiPick) => {
    await onPick(pick);
    setAddedNames((prev) => new Set(prev).add(pick.name));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[85vh] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="text-stone-700">
            {t('routine.aiSuggestionsTitle').replace('{step}', stepLabel)}
          </SheetTitle>
        </SheetHeader>

        <p className="text-xs text-stone-400 mt-1 mb-4">
          {t('routine.aiSuggestionsHint')}
        </p>

        {loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="w-7 h-7 text-rose-400 animate-spin" />
            <p className="text-sm text-stone-500">
              {t('routine.aiSuggestingProducts')}
            </p>
          </div>
        )}

        {error && !loading && (
          <p className="text-xs text-rose-500 py-6 text-center">{error}</p>
        )}

        {!loading && !error && picks && picks.length === 0 && (
          <p className="text-xs text-stone-400 py-6 text-center">
            {t('routine.aiNoResults')}
          </p>
        )}

        {!loading && picks && picks.length > 0 && (
          <div className="space-y-2">
            {picks.map((p, idx) => {
              const added = addedNames.has(p.name);
              return (
                <div
                  key={`${p.name}_${idx}`}
                  className={`p-3 rounded-xl border ${
                    added
                      ? 'border-emerald-200 bg-emerald-50/40'
                      : 'border-rose-100'
                  }`}
                >
                  <div className="flex items-start gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-700">{p.name}</p>
                      <p className="text-[11px] text-stone-400">{p.brand}</p>
                    </div>
                  </div>
                  {p.reason && (
                    <p className="text-[12px] text-stone-500 ms-6 mb-2">{p.reason}</p>
                  )}
                  <div className="ms-6">
                    {added ? (
                      <span className="text-[11px] text-emerald-600 font-medium inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {t('routine.added')}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePick(p)}
                        className="text-[11px] text-rose-500 hover:text-rose-600 font-medium"
                      >
                        + {t('routine.addToLibrary')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full text-stone-500"
          >
            {t('routine.pickerDone')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
