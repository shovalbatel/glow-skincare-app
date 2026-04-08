'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { useAppState } from '@/hooks/use-app-state';
import {
  getLogByDate,
  getRoutinesForTime,
  getSuggestedRoutine,
  writeLastUsedRoutineId,
} from '@/lib/store';
import { format, subDays, addDays } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Save,
  CheckCircle2,
  Plus,
  Pencil,
  X,
} from 'lucide-react';
import {
  Product,
  ProductCategory,
  RoutineDay,
  RoutineStep,
  SkinCondition,
  SkinFeeling,
  SKIN_CONDITION_ICONS,
  CATEGORY_LABELS,
} from '@/lib/types';
import { useLocale } from '@/components/locale-provider';
import { SmartAddSheet } from '@/components/product-add-flow';

const ALL_CONDITIONS: SkinCondition[] = [
  'glow', 'smoothness', 'dryness', 'oily', 'redness', 'irritation', 'breakout', 'tight',
];
const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as ProductCategory[];

interface LoggedStep {
  id: string;
  category: ProductCategory;
  /** Product the user used. Optional — a step can be marked done without one. */
  productId: string | null;
  /** True once the user has tapped to mark this step done. */
  done: boolean;
}

function newStepId() {
  return `lstep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function stepsFromRoutine(routineSteps: RoutineStep[] | undefined): LoggedStep[] {
  if (!routineSteps) return [];
  return routineSteps.map((s) => ({
    id: newStepId(),
    category: s.category,
    productId: s.productIds[0] ?? null,
    done: false,
  }));
}

export default function LogPage() {
  const { state, saveLog, addProduct } = useAppState();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForStep, setAddForStep] = useState<{ time: 'am' | 'pm'; stepId: string } | null>(null);
  const { t } = useLocale();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [amRoutineId, setAmRoutineId] = useState<string | null>(null);
  const [pmRoutineId, setPmRoutineId] = useState<string | null>(null);
  const [amSteps, setAmSteps] = useState<LoggedStep[]>([]);
  const [pmSteps, setPmSteps] = useState<LoggedStep[]>([]);

  const [skinFeeling, setSkinFeeling] = useState<SkinFeeling>(3);
  const [skinConditions, setSkinConditions] = useState<SkinCondition[]>([]);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  // Initialize from existing log + suggested routines whenever date or state
  // changes.
  useEffect(() => {
    if (!state) return;
    const log = getLogByDate(state, selectedDate);
    const amSuggest = getSuggestedRoutine(state, 'am');
    const pmSuggest = getSuggestedRoutine(state, 'pm');

    setAmRoutineId(amSuggest?.id ?? null);
    setPmRoutineId(pmSuggest?.id ?? null);

    const amBase = stepsFromRoutine(amSuggest?.amSteps);
    const pmBase = stepsFromRoutine(pmSuggest?.pmSteps);

    if (log) {
      // Mark steps as done if their product matches one in the log; also seed
      // from log products if there are no routine steps.
      const productById = (id: string) => state.products.find((p) => p.id === id);
      const markUsed = (steps: LoggedStep[], usedIds: string[]): LoggedStep[] => {
        const matched = new Set<string>();
        const next = steps.map((s) => {
          const match = usedIds.find(
            (id) => !matched.has(id) && productById(id)?.category === s.category
          );
          if (match) {
            matched.add(match);
            return { ...s, productId: match, done: true };
          }
          return s;
        });
        // Any leftover logged products that didn't fit a routine step → add as
        // extra logged steps so they're visible.
        for (const id of usedIds) {
          if (matched.has(id)) continue;
          const p = productById(id);
          next.push({
            id: newStepId(),
            category: (p?.category || 'serum') as ProductCategory,
            productId: id,
            done: true,
          });
        }
        return next;
      };
      setAmSteps(markUsed(amBase, log.amProducts));
      setPmSteps(markUsed(pmBase, log.pmProducts));
      setSkinFeeling(log.skinFeeling);
      setSkinConditions(log.skinConditions);
      setNotes(log.notes);
    } else {
      setAmSteps(amBase);
      setPmSteps(pmBase);
      setSkinFeeling(3);
      setSkinConditions([]);
      setNotes('');
    }
    setSaved(false);
  }, [selectedDate, state]);

  if (!state)
    return (
      <AppShell>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse text-rose-300">{t('common.loading')}</div>
        </div>
      </AppShell>
    );

  const morningRoutines = getRoutinesForTime(state, 'am');
  const eveningRoutines = getRoutinesForTime(state, 'pm');

  // No filter by AM/PM — products are unconstrained at log time.
  const allProducts = state.products;

  const switchRoutine = (time: 'am' | 'pm', id: string) => {
    const routine = state.routineDays.find((d) => d.id === id);
    if (!routine) return;
    if (time === 'am') {
      setAmRoutineId(id);
      setAmSteps(stepsFromRoutine(routine.amSteps));
    } else {
      setPmRoutineId(id);
      setPmSteps(stepsFromRoutine(routine.pmSteps));
    }
    setSaved(false);
  };

  const toggleCondition = (c: SkinCondition) => {
    setSkinConditions((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
    setSaved(false);
  };

  const updateStep = (
    time: 'am' | 'pm',
    stepId: string,
    patch: Partial<LoggedStep>
  ) => {
    const setter = time === 'am' ? setAmSteps : setPmSteps;
    setter((prev) => prev.map((s) => (s.id === stepId ? { ...s, ...patch } : s)));
    setSaved(false);
  };

  const addExtraStep = (time: 'am' | 'pm', category: ProductCategory) => {
    const setter = time === 'am' ? setAmSteps : setPmSteps;
    setter((prev) => [
      ...prev,
      { id: newStepId(), category, productId: null, done: false },
    ]);
  };

  const removeStep = (time: 'am' | 'pm', stepId: string) => {
    const setter = time === 'am' ? setAmSteps : setPmSteps;
    setter((prev) => prev.filter((s) => s.id !== stepId));
  };

  const handleSave = () => {
    const amProducts = amSteps
      .filter((s) => s.done && s.productId)
      .map((s) => s.productId!) as string[];
    const pmProducts = pmSteps
      .filter((s) => s.done && s.productId)
      .map((s) => s.productId!) as string[];
    const amDone = amSteps.length > 0 && amSteps.every((s) => s.done);
    const pmDone = pmSteps.length > 0 && pmSteps.every((s) => s.done);
    saveLog({
      date: selectedDate,
      amCompleted: amDone,
      pmCompleted: pmDone,
      amProducts,
      pmProducts,
      skinFeeling,
      skinConditions,
      notes,
    });
    // Remember which routine was just used so it's the suggestion next time.
    if (amRoutineId && amSteps.some((s) => s.done)) {
      writeLastUsedRoutineId('am', amRoutineId);
    }
    if (pmRoutineId && pmSteps.some((s) => s.done)) {
      writeLastUsedRoutineId('pm', pmRoutineId);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const goDay = (delta: number) => {
    const d = delta > 0 ? addDays(new Date(selectedDate), 1) : subDays(new Date(selectedDate), 1);
    setSelectedDate(format(d, 'yyyy-MM-dd'));
  };

  return (
    <AppShell>
      <PageHeader title={t('log.title')} />

      {/* Date picker */}
      <div className="px-5 mb-5">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => goDay(-1)} className="text-stone-400">
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-semibold text-stone-700">
              {format(new Date(selectedDate), 'EEEE')}
            </p>
            <p className="text-xs text-stone-400">
              {format(new Date(selectedDate), 'MMMM d, yyyy')}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => goDay(1)} className="text-stone-400">
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </Button>
        </div>
      </div>

      {/* AM section */}
      <div className="px-5 mb-5">
        <RoutineSection
          time="am"
          icon={<Sun className="w-4 h-4 text-amber-500" />}
          label={t('log.amSection')}
          routines={morningRoutines}
          selectedRoutineId={amRoutineId}
          onChangeRoutine={(id) => switchRoutine('am', id)}
          steps={amSteps}
          allProducts={allProducts}
          onUpdateStep={(stepId, patch) => updateStep('am', stepId, patch)}
          onAddStep={(cat) => addExtraStep('am', cat)}
          onRemoveStep={(stepId) => removeStep('am', stepId)}
          onAddNewProduct={(stepId) => {
            setAddForStep({ time: 'am', stepId });
            setIsAddOpen(true);
          }}
        />
      </div>

      {/* PM section */}
      <div className="px-5 mb-5">
        <RoutineSection
          time="pm"
          icon={<Moon className="w-4 h-4 text-indigo-400" />}
          label={t('log.pmSection')}
          routines={eveningRoutines}
          selectedRoutineId={pmRoutineId}
          onChangeRoutine={(id) => switchRoutine('pm', id)}
          steps={pmSteps}
          allProducts={allProducts}
          onUpdateStep={(stepId, patch) => updateStep('pm', stepId, patch)}
          onAddStep={(cat) => addExtraStep('pm', cat)}
          onRemoveStep={(stepId) => removeStep('pm', stepId)}
          onAddNewProduct={(stepId) => {
            setAddForStep({ time: 'pm', stepId });
            setIsAddOpen(true);
          }}
        />
      </div>

      {/* Skin feeling */}
      <div className="px-5 mb-5">
        <Card className="border-rose-100 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <Label className="text-sm font-semibold text-stone-700 mb-3 block">
              {t('log.howFeel')}
            </Label>
            <div className="flex items-center justify-between mb-4">
              {([1, 2, 3, 4, 5] as SkinFeeling[]).map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    setSkinFeeling(n);
                    setSaved(false);
                  }}
                  className={`w-12 h-12 rounded-full text-sm font-semibold transition-all ${
                    n === skinFeeling
                      ? 'bg-rose-500 text-white scale-110 shadow-md'
                      : 'bg-stone-100 text-stone-400 hover:bg-rose-100'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between px-1">
              <span className="text-[10px] text-stone-400">{t('log.bad')}</span>
              <span className="text-[10px] text-stone-400">{t('log.great')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Skin conditions */}
      <div className="px-5 mb-5">
        <Card className="border-rose-100 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <Label className="text-sm font-semibold text-stone-700 mb-3 block">
              {t('log.conditions')}
            </Label>
            <div className="flex flex-wrap gap-2">
              {ALL_CONDITIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleCondition(c)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                    skinConditions.includes(c)
                      ? 'bg-rose-500 text-white'
                      : 'bg-stone-100 text-stone-500 hover:bg-rose-50'
                  }`}
                >
                  {SKIN_CONDITION_ICONS[c]} {t('skin.' + c)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      <div className="px-5 mb-5">
        <Card className="border-rose-100 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <Label className="text-sm font-semibold text-stone-700 mb-2 block">
              {t('log.notes')}
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setSaved(false);
              }}
              placeholder={t('log.notesPlaceholder')}
              rows={3}
              className="border-rose-100"
            />
          </CardContent>
        </Card>
      </div>

      {/* Save button */}
      <div className="px-5 mb-8">
        <Button
          onClick={handleSave}
          className={`w-full h-12 text-sm font-semibold rounded-xl transition-all ${
            saved
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
              : 'bg-rose-500 hover:bg-rose-600 text-white'
          }`}
        >
          {saved ? (
            <>
              <CheckCircle2 className="w-4 h-4 me-2" /> {t('log.saved')}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 me-2" /> {t('log.save')}
            </>
          )}
        </Button>
      </div>

      <SmartAddSheet
        open={isAddOpen}
        onOpenChange={(next) => {
          setIsAddOpen(next);
          if (!next) setAddForStep(null);
        }}
        onSave={async (product) => {
          const newId = await addProduct(product);
          if (newId && addForStep) {
            updateStep(addForStep.time, addForStep.stepId, {
              productId: newId,
              done: true,
            });
          }
          setIsAddOpen(false);
          setAddForStep(null);
        }}
      />
    </AppShell>
  );
}

// ----------------- helpers -----------------

function RoutineSection({
  time,
  icon,
  label,
  routines,
  selectedRoutineId,
  onChangeRoutine,
  steps,
  allProducts,
  onUpdateStep,
  onAddStep,
  onRemoveStep,
  onAddNewProduct,
}: {
  time: 'am' | 'pm';
  icon: React.ReactNode;
  label: string;
  routines: RoutineDay[];
  selectedRoutineId: string | null;
  onChangeRoutine: (id: string) => void;
  steps: LoggedStep[];
  allProducts: Product[];
  onUpdateStep: (stepId: string, patch: Partial<LoggedStep>) => void;
  onAddStep: (cat: ProductCategory) => void;
  onRemoveStep: (stepId: string) => void;
  onAddNewProduct: (stepId: string) => void;
}) {
  const { t } = useLocale();
  const [adding, setAdding] = useState(false);
  const [newCat, setNewCat] = useState<ProductCategory | ''>('');

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Card className="border-rose-100 shadow-sm">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-semibold text-stone-700">{label}</span>
          </div>
          {steps.length > 0 && (
            <span className="text-[11px] text-stone-400">
              {doneCount}/{steps.length}
            </span>
          )}
        </div>

        {/* Routine picker */}
        {routines.length > 0 ? (
          <div className="mb-3">
            <Select
              value={selectedRoutineId ?? ''}
              onValueChange={(v) => v && onChangeRoutine(v)}
            >
              <SelectTrigger className="h-9 text-xs bg-rose-50/40 border-rose-100">
                <SelectValue
                  placeholder={time === 'am' ? t('log.pickMorningRoutine') : t('log.pickEveningRoutine')}
                >
                  {(v) => routines.find((r) => r.id === v)?.name ?? ''}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {routines.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-xs text-stone-400 italic mb-3">{t('log.noRoutineYet')}</p>
        )}

        {/* Steps list */}
        <div className="space-y-2">
          {steps.length === 0 && routines.length === 0 && (
            <p className="text-[11px] text-stone-400 italic">{t('log.tapToAddStep')}</p>
          )}
          {steps.map((step) => (
            <LogStepRow
              key={step.id}
              step={step}
              allProducts={allProducts}
              onToggleDone={() => onUpdateStep(step.id, { done: !step.done })}
              onSetProduct={(pid) => onUpdateStep(step.id, { productId: pid, done: true })}
              onClearProduct={() => onUpdateStep(step.id, { productId: null })}
              onRemove={() => onRemoveStep(step.id)}
              onAddNew={() => onAddNewProduct(step.id)}
            />
          ))}
        </div>

        {/* Add step */}
        {adding ? (
          <div className="flex items-center gap-2 mt-3">
            <Select value={newCat} onValueChange={(v) => setNewCat((v ?? '') as ProductCategory | '')}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder={t('log.addStep')}>
                  {(v) => (v ? t('cat.' + v) : t('log.addStep'))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ALL_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t('cat.' + c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="ghost"
              disabled={!newCat}
              onClick={() => {
                if (!newCat) return;
                onAddStep(newCat as ProductCategory);
                setNewCat('');
                setAdding(false);
              }}
              className="h-8 text-xs text-rose-500"
            >
              <Plus className="w-3 h-3 me-1" /> {t('common.add')}
            </Button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setNewCat('');
              }}
              className="text-stone-400 hover:text-stone-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-stone-200 hover:border-rose-200 hover:bg-rose-50/40 transition-colors text-xs text-stone-500"
          >
            <Plus className="w-3 h-3" /> {t('log.addStep')}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function LogStepRow({
  step,
  allProducts,
  onToggleDone,
  onSetProduct,
  onClearProduct,
  onRemove,
  onAddNew,
}: {
  step: LoggedStep;
  allProducts: Product[];
  onToggleDone: () => void;
  onSetProduct: (pid: string) => void;
  onClearProduct: () => void;
  onRemove: () => void;
  onAddNew: () => void;
}) {
  const { t } = useLocale();
  const [picking, setPicking] = useState(false);

  const sortedProducts = useMemo(() => {
    // Same-category products first; routineTime is just a hint, no filtering.
    const same = allProducts.filter((p) => p.category === step.category);
    const others = allProducts.filter((p) => p.category !== step.category);
    return [...same, ...others];
  }, [allProducts, step.category]);

  const product = step.productId
    ? allProducts.find((p) => p.id === step.productId)
    : null;

  return (
    <div
      className={`rounded-xl border p-3 transition-colors ${
        step.done
          ? 'border-emerald-200 bg-emerald-50/40'
          : 'border-stone-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Big checkbox = the primary action */}
        <button
          type="button"
          onClick={onToggleDone}
          aria-label={t('log.didStep')}
          className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
            step.done
              ? 'bg-emerald-500 text-white'
              : 'bg-stone-100 text-stone-300 hover:bg-rose-100 hover:text-rose-400'
          }`}
        >
          {step.done && <CheckCircle2 className="w-4 h-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={onToggleDone}
            className="text-start w-full"
          >
            <p
              className={`text-sm font-semibold ${
                step.done ? 'text-stone-500' : 'text-stone-700'
              }`}
            >
              {t('cat.' + step.category)}
            </p>
            {product ? (
              <p className="text-xs text-stone-500 mt-0.5 truncate">
                {product.name}
                <span className="text-stone-400"> · {product.brand}</span>
              </p>
            ) : (
              <p className="text-xs text-stone-400 italic mt-0.5">
                {t('log.noProductOptional')}
              </p>
            )}
          </button>

          {!picking && (
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="text-[11px] text-rose-500 hover:text-rose-600 mt-1.5 flex items-center gap-1"
            >
              <Pencil className="w-3 h-3" />
              {product ? t('log.changeProduct') : t('log.addProductOptional')}
            </button>
          )}

          {picking && (
            <div className="mt-2 space-y-2">
              <Select
                value={step.productId ?? ''}
                onValueChange={(v) => {
                  if (v) {
                    onSetProduct(v);
                    setPicking(false);
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={t('log.pickProduct')}>
                    {(v) => {
                      const p = allProducts.find((x) => x.id === v);
                      return p ? `${p.name} — ${p.brand}` : t('log.pickProduct');
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {sortedProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {p.brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={onAddNew}
                  className="text-[11px] text-rose-500 hover:text-rose-600 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> {t('log.addNewProduct')}
                </button>
                {product && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearProduct();
                      setPicking(false);
                    }}
                    className="text-[11px] text-stone-400 hover:text-stone-600"
                  >
                    {t('log.clearProduct')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPicking(false)}
                  className="text-[11px] text-stone-400 hover:text-stone-600 ms-auto"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="text-stone-300 hover:text-rose-500 -me-1"
          aria-label={t('routine.deleteStep')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
