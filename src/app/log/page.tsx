'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { useAppState } from '@/hooks/use-app-state';
import { getLogByDate, getTodayRoutineDay, getProductById } from '@/lib/store';
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
  SkipForward,
  Plus,
} from 'lucide-react';
import {
  ProductCategory,
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
  /** Product the user actually used in this step. null = skipped. */
  productId: string | null;
  /** True once the user has acted on this step (done or skipped). */
  resolved: boolean;
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
    resolved: false,
  }));
}

function stepsFromFlatProducts(
  productIds: string[],
  productById: (id: string) => { category: ProductCategory } | undefined
): LoggedStep[] {
  const seen = new Set<ProductCategory>();
  const steps: LoggedStep[] = [];
  for (const id of productIds) {
    const p = productById(id);
    const cat = (p?.category || 'serum') as ProductCategory;
    if (seen.has(cat)) continue;
    seen.add(cat);
    steps.push({ id: newStepId(), category: cat, productId: id, resolved: false });
  }
  return steps;
}

export default function LogPage() {
  const { state, saveLog, addProduct } = useAppState();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForStep, setAddForStep] = useState<{ time: 'am' | 'pm'; stepId: string } | null>(null);
  const { t } = useLocale();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amCompleted, setAmCompleted] = useState(false);
  const [pmCompleted, setPmCompleted] = useState(false);
  const [amSteps, setAmSteps] = useState<LoggedStep[]>([]);
  const [pmSteps, setPmSteps] = useState<LoggedStep[]>([]);
  const [skinFeeling, setSkinFeeling] = useState<SkinFeeling>(3);
  const [skinConditions, setSkinConditions] = useState<SkinCondition[]>([]);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  // Initialize steps from today's routine day, falling back to existing log if any.
  useEffect(() => {
    if (!state) return;
    const log = getLogByDate(state, selectedDate);
    const routineDay = getTodayRoutineDay(state);

    if (log) {
      // Build editable step list from existing log + routine.
      const productById = (id: string) => state.products.find((p) => p.id === id);
      const baseAm = routineDay?.amSteps?.length
        ? stepsFromRoutine(routineDay.amSteps)
        : stepsFromFlatProducts(log.amProducts, productById);
      const basePm = routineDay?.pmSteps?.length
        ? stepsFromRoutine(routineDay.pmSteps)
        : stepsFromFlatProducts(log.pmProducts, productById);
      // Mark logged products as resolved
      const markUsed = (steps: LoggedStep[], usedIds: string[]) =>
        steps.map((s) => {
          const matchInStep = usedIds.find((id) => productById(id)?.category === s.category);
          if (matchInStep) return { ...s, productId: matchInStep, resolved: true };
          return s;
        });
      setAmSteps(markUsed(baseAm, log.amProducts));
      setPmSteps(markUsed(basePm, log.pmProducts));
      setAmCompleted(log.amCompleted);
      setPmCompleted(log.pmCompleted);
      setSkinFeeling(log.skinFeeling);
      setSkinConditions(log.skinConditions);
      setNotes(log.notes);
    } else {
      setAmSteps(stepsFromRoutine(routineDay?.amSteps));
      setPmSteps(stepsFromRoutine(routineDay?.pmSteps));
      setAmCompleted(false);
      setPmCompleted(false);
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

  const allEligible = state.products.filter((p) => p.isActive || p.status === 'have');
  const amEligible = allEligible.filter((p) => p.routineTime === 'am' || p.routineTime === 'both');
  const pmEligible = allEligible.filter((p) => p.routineTime === 'pm' || p.routineTime === 'both');

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
      { id: newStepId(), category, productId: null, resolved: false },
    ]);
  };

  const removeStep = (time: 'am' | 'pm', stepId: string) => {
    const setter = time === 'am' ? setAmSteps : setPmSteps;
    setter((prev) => prev.filter((s) => s.id !== stepId));
  };

  const handleSave = () => {
    const amProducts = amSteps
      .filter((s) => s.resolved && s.productId)
      .map((s) => s.productId!) as string[];
    const pmProducts = pmSteps
      .filter((s) => s.resolved && s.productId)
      .map((s) => s.productId!) as string[];
    saveLog({
      date: selectedDate,
      amCompleted,
      pmCompleted,
      amProducts,
      pmProducts,
      skinFeeling,
      skinConditions,
      notes,
    });
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goDay(-1)}
            className="text-stone-400"
          >
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goDay(1)}
            className="text-stone-400"
          >
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </Button>
        </div>
      </div>

      {/* AM section */}
      <div className="px-5 mb-5">
        <SectionHeader
          icon={<Sun className="w-4 h-4 text-amber-500" />}
          label={t('log.amSection')}
          completed={amCompleted}
          onToggleCompleted={() => {
            setAmCompleted(!amCompleted);
            setSaved(false);
          }}
        />
        <StepFlow
          time="am"
          steps={amSteps}
          eligibleProducts={amEligible}
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
        <SectionHeader
          icon={<Moon className="w-4 h-4 text-indigo-400" />}
          label={t('log.pmSection')}
          completed={pmCompleted}
          onToggleCompleted={() => {
            setPmCompleted(!pmCompleted);
            setSaved(false);
          }}
        />
        <StepFlow
          time="pm"
          steps={pmSteps}
          eligibleProducts={pmEligible}
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
              resolved: true,
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

function SectionHeader({
  icon,
  label,
  completed,
  onToggleCompleted,
}: {
  icon: React.ReactNode;
  label: string;
  completed: boolean;
  onToggleCompleted: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-semibold text-stone-700">{label}</span>
      </div>
      <button
        onClick={onToggleCompleted}
        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
          completed
            ? 'bg-emerald-100 text-emerald-600'
            : 'bg-stone-100 text-stone-400'
        }`}
      >
        <CheckCircle2 className="w-3 h-3" />
        {completed ? t('common.done') : t('log.markDone')}
      </button>
    </div>
  );
}

function StepFlow({
  time,
  steps,
  eligibleProducts,
  onUpdateStep,
  onAddStep,
  onRemoveStep,
  onAddNewProduct,
}: {
  time: 'am' | 'pm';
  steps: LoggedStep[];
  eligibleProducts: { id: string; name: string; brand: string; category: ProductCategory }[];
  onUpdateStep: (stepId: string, patch: Partial<LoggedStep>) => void;
  onAddStep: (cat: ProductCategory) => void;
  onRemoveStep: (stepId: string) => void;
  onAddNewProduct: (stepId: string) => void;
}) {
  const { t } = useLocale();
  const [addingCat, setAddingCat] = useState<ProductCategory | ''>('');

  if (steps.length === 0) {
    return (
      <Card className="border-rose-100 shadow-sm">
        <CardContent className="pt-4 pb-3 text-center">
          <p className="text-xs text-stone-400 italic mb-3">{t('log.noRoutineYet')}</p>
          <AddStepRow
            value={addingCat}
            setValue={setAddingCat}
            onAdd={(cat) => {
              onAddStep(cat);
              setAddingCat('');
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {steps.map((step, idx) => (
        <LogStepCard
          key={step.id}
          index={idx + 1}
          total={steps.length}
          step={step}
          eligibleProducts={eligibleProducts}
          onSetProduct={(pid) => onUpdateStep(step.id, { productId: pid, resolved: true })}
          onSkip={() => onUpdateStep(step.id, { productId: null, resolved: true })}
          onMarkDone={() => onUpdateStep(step.id, { resolved: true })}
          onUnresolve={() => onUpdateStep(step.id, { resolved: false })}
          onAddNew={() => onAddNewProduct(step.id)}
          onRemove={() => onRemoveStep(step.id)}
        />
      ))}
      <Card className="border-dashed border-stone-200 bg-transparent shadow-none">
        <CardContent className="pt-3 pb-3">
          <AddStepRow
            value={addingCat}
            setValue={setAddingCat}
            onAdd={(cat) => {
              onAddStep(cat);
              setAddingCat('');
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function AddStepRow({
  value,
  setValue,
  onAdd,
}: {
  value: ProductCategory | '';
  setValue: (v: ProductCategory | '') => void;
  onAdd: (cat: ProductCategory) => void;
}) {
  const { t } = useLocale();
  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={(v) => setValue((v ?? '') as ProductCategory | '')}>
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
        disabled={!value}
        onClick={() => value && onAdd(value as ProductCategory)}
        className="h-8 text-xs text-rose-500"
      >
        <Plus className="w-3 h-3 me-1" /> {t('log.addStep')}
      </Button>
    </div>
  );
}

function LogStepCard({
  index,
  total,
  step,
  eligibleProducts,
  onSetProduct,
  onSkip,
  onMarkDone,
  onUnresolve,
  onAddNew,
  onRemove,
}: {
  index: number;
  total: number;
  step: LoggedStep;
  eligibleProducts: { id: string; name: string; brand: string; category: ProductCategory }[];
  onSetProduct: (productId: string) => void;
  onSkip: () => void;
  onMarkDone: () => void;
  onUnresolve: () => void;
  onAddNew: () => void;
  onRemove: () => void;
}) {
  const { t } = useLocale();
  const [picking, setPicking] = useState(false);

  // Pre-select products that match this step's category, but allow any
  // eligible product to be picked too (the user might use something else).
  const matching = useMemo(
    () => eligibleProducts.filter((p) => p.category === step.category),
    [eligibleProducts, step.category]
  );
  const others = useMemo(
    () => eligibleProducts.filter((p) => p.category !== step.category),
    [eligibleProducts, step.category]
  );
  const productList = [...matching, ...others];

  const currentProduct = step.productId
    ? eligibleProducts.find((p) => p.id === step.productId)
    : null;

  const skipped = step.resolved && !step.productId;

  return (
    <Card
      className={`border shadow-sm ${
        step.resolved
          ? skipped
            ? 'border-stone-200 bg-stone-50'
            : 'border-emerald-200 bg-emerald-50/40'
          : 'border-rose-100'
      }`}
    >
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">
            {t('routine.stepCategory')} {index}/{total}
          </p>
          <button
            type="button"
            onClick={onRemove}
            className="text-stone-300 hover:text-rose-500 text-xs"
            aria-label={t('routine.deleteStep')}
          >
            ×
          </button>
        </div>
        <h4 className="text-sm font-semibold text-stone-700">{t('cat.' + step.category)}</h4>

        {currentProduct ? (
          <p className="text-xs text-stone-600 mt-1">
            {currentProduct.name}{' '}
            <span className="text-stone-400">{currentProduct.brand}</span>
          </p>
        ) : skipped ? (
          <p className="text-xs text-stone-400 italic mt-1">{t('log.skipStep')}</p>
        ) : (
          <p className="text-xs text-stone-400 italic mt-1">{t('log.pickProduct')}</p>
        )}

        {!picking ? (
          <div className="flex flex-wrap gap-2 mt-3">
            {!step.resolved && currentProduct && (
              <button
                onClick={onMarkDone}
                className="text-[11px] px-3 py-1.5 rounded-full bg-emerald-500 text-white hover:bg-emerald-600"
              >
                <CheckCircle2 className="w-3 h-3 inline me-1" />
                {t('log.markStepDone')}
              </button>
            )}
            <button
              onClick={() => setPicking(true)}
              className="text-[11px] px-3 py-1.5 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200"
            >
              {t('log.useDifferent')}
            </button>
            {!skipped && (
              <button
                onClick={onSkip}
                className="text-[11px] px-3 py-1.5 rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200"
              >
                <SkipForward className="w-3 h-3 inline me-1" />
                {t('log.skipStep')}
              </button>
            )}
            {step.resolved && (
              <button
                onClick={onUnresolve}
                className="text-[11px] px-3 py-1.5 rounded-full text-stone-400 hover:text-stone-600"
              >
                ↺
              </button>
            )}
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <Select
              value={step.productId ?? ''}
              onValueChange={(v) => {
                if (v) {
                  onSetProduct(v);
                  setPicking(false);
                }
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder={t('log.pickProduct')}>
                  {(v) => {
                    const p = eligibleProducts.find((x) => x.id === v);
                    return p ? `${p.name} — ${p.brand}` : t('log.pickProduct');
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {productList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {p.brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <button
                onClick={onAddNew}
                className="text-[11px] text-rose-500 hover:text-rose-600 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> {t('log.addNewProduct')}
              </button>
              <button
                onClick={() => setPicking(false)}
                className="text-[11px] text-stone-400 hover:text-stone-600 ms-auto"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
