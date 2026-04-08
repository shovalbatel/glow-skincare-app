'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { useAppState } from '@/hooks/use-app-state';
import { getTodayRoutineDay, getProductById, getLogByDate } from '@/lib/store';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sun,
  Moon,
  Pencil,
  CalendarDays,
  Sparkles,
  Plus,
  Trash2,
  Loader2,
} from 'lucide-react';
import { ProductCategory, RoutineDay, RoutineStep, CATEGORY_LABELS } from '@/lib/types';
import { useLocale } from '@/components/locale-provider';
import { SmartAddSheet } from '@/components/product-add-flow';

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as ProductCategory[];

function newStepId() {
  return `step_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function RoutinePage() {
  const { state, updateRoutine, addProduct } = useAppState();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { t } = useLocale();
  const [editingDay, setEditingDay] = useState<RoutineDay | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmSteps, setEditAmSteps] = useState<RoutineStep[]>([]);
  const [editPmSteps, setEditPmSteps] = useState<RoutineStep[]>([]);
  // Which step is currently being assigned a freshly added product (so we can
  // attach the new product to that step on return from SmartAddSheet).
  const [pendingAddStep, setPendingAddStep] = useState<{ time: 'am' | 'pm'; stepId: string } | null>(
    null
  );
  // Per-step AI hint shown when the AI suggested a step but the user has no
  // product for it. Keyed by step id, only displayed while the step has no
  // products assigned, so it disappears naturally as soon as the user picks
  // or adds one. Cleared when the editor opens on a different day.
  const [aiHints, setAiHints] = useState<Record<string, { name: string; reason: string }>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  if (!state)
    return (
      <AppShell>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse text-rose-300">{t('common.loading')}</div>
        </div>
      </AppShell>
    );

  const todayRoutine = getTodayRoutineDay(state);
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayLog = getLogByDate(state, today);

  const eligibleProducts = state.products.filter(
    (p) => p.status === 'have' || p.status === 'almost_empty'
  );
  const amProducts = eligibleProducts.filter(
    (p) => p.routineTime === 'am' || p.routineTime === 'both'
  );
  const pmProducts = eligibleProducts.filter(
    (p) => p.routineTime === 'pm' || p.routineTime === 'both'
  );

  const startEdit = (day: RoutineDay) => {
    setEditingDay(day);
    setEditName(day.name);
    setEditAmSteps(JSON.parse(JSON.stringify(day.amSteps || [])));
    setEditPmSteps(JSON.parse(JSON.stringify(day.pmSteps || [])));
    setAiHints({});
    setAiError(null);
  };

  const buildWithAi = async () => {
    if (!editingDay) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/recommend-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayName: editName || editingDay.name,
          dayNumber: editingDay.dayNumber,
          products: eligibleProducts.map((p) => ({
            id: p.id,
            name: p.name,
            brand: p.brand,
            category: p.category,
            routineTime: p.routineTime,
          })),
        }),
      });
      const data = (await res.json()) as {
        amSteps?: Array<{
          category: ProductCategory;
          productIds: string[];
          suggestion: { name: string; reason: string } | null;
        }>;
        pmSteps?: Array<{
          category: ProductCategory;
          productIds: string[];
          suggestion: { name: string; reason: string } | null;
        }>;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'AI request failed');

      const hints: Record<string, { name: string; reason: string }> = {};
      const materialize = (
        items: NonNullable<typeof data.amSteps>
      ): RoutineStep[] =>
        items.map((it) => {
          const id = newStepId();
          if (it.suggestion && it.productIds.length === 0 && it.suggestion.name) {
            hints[id] = it.suggestion;
          }
          return { id, category: it.category, productIds: it.productIds };
        });

      setEditAmSteps(materialize(data.amSteps || []));
      setEditPmSteps(materialize(data.pmSteps || []));
      setAiHints(hints);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI request failed');
    } finally {
      setAiLoading(false);
    }
  };

  const saveEdit = () => {
    if (!editingDay) return;
    const updated = state.routineDays.map((d) =>
      d.id === editingDay.id
        ? {
            ...d,
            name: editName,
            amSteps: editAmSteps,
            pmSteps: editPmSteps,
            amProducts: editAmSteps.flatMap((s) => s.productIds),
            pmProducts: editPmSteps.flatMap((s) => s.productIds),
          }
        : d
    );
    updateRoutine(updated, state.cycleLength);
    setEditingDay(null);
  };

  const addStep = (time: 'am' | 'pm', category: ProductCategory) => {
    const setter = time === 'am' ? setEditAmSteps : setEditPmSteps;
    setter((prev) => [
      ...prev,
      { id: newStepId(), category, productIds: [] },
    ]);
  };

  const removeStep = (time: 'am' | 'pm', stepId: string) => {
    const setter = time === 'am' ? setEditAmSteps : setEditPmSteps;
    setter((prev) => prev.filter((s) => s.id !== stepId));
  };

  const toggleStepProduct = (
    time: 'am' | 'pm',
    stepId: string,
    productId: string
  ) => {
    const setter = time === 'am' ? setEditAmSteps : setEditPmSteps;
    setter((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? {
              ...s,
              productIds: s.productIds.includes(productId)
                ? s.productIds.filter((id) => id !== productId)
                : [...s.productIds, productId],
            }
          : s
      )
    );
  };

  const addNewDay = () => {
    const nextNumber = state.routineDays.length + 1;
    const newDay: RoutineDay = {
      id: `rd_${Date.now()}`,
      dayNumber: nextNumber,
      name: `${t('routine.newDayName')} ${nextNumber}`,
      amSteps: [],
      pmSteps: [],
      amProducts: [],
      pmProducts: [],
    };
    const updated = [...state.routineDays, newDay];
    updateRoutine(updated, updated.length);
    // Open the editor on the new day immediately
    setTimeout(() => startEdit(newDay), 100);
  };

  const deleteDay = (day: RoutineDay) => {
    if (!window.confirm(t('routine.confirmDelete'))) return;
    const remaining = state.routineDays
      .filter((d) => d.id !== day.id)
      .map((d, idx) => ({ ...d, dayNumber: idx + 1 }));
    updateRoutine(remaining, Math.max(remaining.length, 1));
  };

  return (
    <AppShell>
      <PageHeader
        title={t('routine.title')}
        subtitle={`${state.cycleLength}${t('routine.dayCycle')}`}
      />

      {/* Today highlight */}
      {todayRoutine && (
        <div className="px-5 mb-5">
          <Card className="border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 shadow-sm">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-rose-500 uppercase tracking-wider">
                  {t('routine.today')}
                </span>
                {todayLog?.amCompleted && todayLog?.pmCompleted ? (
                  <Badge className="bg-emerald-100 text-emerald-600 text-[10px]">
                    {t('routine.completed')}
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-600 text-[10px]">
                    {t('routine.inProgress')}
                  </Badge>
                )}
              </div>
              <h3 className="text-lg font-semibold text-stone-700">{todayRoutine.name}</h3>
              <p className="text-xs text-stone-500 mt-1">
                {t('routine.dayOf')
                  .replace('{n}', String(todayRoutine.dayNumber))
                  .replace('{total}', String(state.cycleLength))}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {state.routineDays.length === 0 && (
        <div className="px-5 mb-5">
          <Card className="border-rose-100 shadow-sm">
            <CardContent className="pt-8 pb-6 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center mb-4">
                <CalendarDays className="w-7 h-7 text-rose-400" />
              </div>
              <h3 className="text-lg font-semibold text-stone-700 mb-1">{t('routine.noRoutine')}</h3>
              <p className="text-sm text-stone-400 mb-5">{t('routine.noRoutineHint')}</p>
              <Button
                onClick={addNewDay}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-xl h-11 mb-3"
              >
                {t('routine.createRoutine')}
              </Button>
              <button
                type="button"
                onClick={addNewDay}
                className="flex items-center gap-1.5 text-sm text-rose-500 hover:text-rose-600"
              >
                <Sparkles className="w-4 h-4" /> {t('routine.getRecommendations')}
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cycle days */}
      <div className="px-5 space-y-3">
        {state.routineDays.map((day) => {
          const isToday = day.id === todayRoutine?.id;
          return (
            <Card
              key={day.id}
              className={`shadow-sm ${
                isToday ? 'border-rose-300 ring-1 ring-rose-200' : 'border-rose-100'
              }`}
            >
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                          isToday ? 'bg-rose-500 text-white' : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {day.dayNumber}
                      </div>
                      <h3 className="text-sm font-semibold text-stone-700">{day.name}</h3>
                      {isToday && (
                        <Badge className="bg-rose-100 text-rose-500 text-[10px]">
                          {t('routine.today')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Sheet>
                      <SheetTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-stone-400"
                          />
                        }
                        onClick={() => startEdit(day)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </SheetTrigger>
                      <SheetContent
                        side="bottom"
                        className="rounded-t-2xl max-h-[85vh] overflow-y-auto"
                      >
                        <SheetHeader>
                          <SheetTitle className="text-stone-700">
                            {t('routine.editDay').replace('{n}', String(editingDay?.dayNumber))}
                          </SheetTitle>
                        </SheetHeader>
                        <div className="space-y-5 px-1 mt-4">
                          <div>
                            <Label className="text-xs text-stone-500">{t('routine.dayName')}</Label>
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="mt-1"
                            />
                          </div>

                          {/* Build with AI */}
                          <div>
                            <Button
                              type="button"
                              onClick={buildWithAi}
                              disabled={aiLoading}
                              variant="ghost"
                              className="w-full border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                            >
                              {aiLoading ? (
                                <Loader2 className="w-4 h-4 me-2 animate-spin" />
                              ) : (
                                <Sparkles className="w-4 h-4 me-2" />
                              )}
                              {t(aiLoading ? 'routine.buildingWithAi' : 'routine.buildWithAi')}
                            </Button>
                            {aiError && (
                              <p className="text-xs text-rose-500 mt-1">{aiError}</p>
                            )}
                          </div>

                          {/* AM steps */}
                          <StepEditor
                            time="am"
                            steps={editAmSteps}
                            eligibleProducts={amProducts}
                            aiHints={aiHints}
                            onAddStep={(cat) => addStep('am', cat)}
                            onRemoveStep={(id) => removeStep('am', id)}
                            onToggleProduct={(stepId, pid) =>
                              toggleStepProduct('am', stepId, pid)
                            }
                            onAddNewProduct={(stepId) => {
                              setPendingAddStep({ time: 'am', stepId });
                              setIsAddOpen(true);
                            }}
                          />

                          {/* PM steps */}
                          <StepEditor
                            time="pm"
                            steps={editPmSteps}
                            eligibleProducts={pmProducts}
                            aiHints={aiHints}
                            onAddStep={(cat) => addStep('pm', cat)}
                            onRemoveStep={(id) => removeStep('pm', id)}
                            onToggleProduct={(stepId, pid) =>
                              toggleStepProduct('pm', stepId, pid)
                            }
                            onAddNewProduct={(stepId) => {
                              setPendingAddStep({ time: 'pm', stepId });
                              setIsAddOpen(true);
                            }}
                          />

                          <Button
                            onClick={saveEdit}
                            className="w-full bg-rose-500 hover:bg-rose-600 text-white"
                          >
                            {t('routine.saveChanges')}
                          </Button>
                        </div>
                      </SheetContent>
                    </Sheet>
                    {state.routineDays.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-stone-400 hover:text-rose-500"
                        onClick={() => deleteDay(day)}
                        aria-label={t('routine.deleteDay')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <DayStepList
                    icon={<Sun className="w-3 h-3 text-amber-500" />}
                    label={t('common.am')}
                    steps={day.amSteps || []}
                    state={state}
                  />
                  <DayStepList
                    icon={<Moon className="w-3 h-3 text-indigo-400" />}
                    label={t('common.pm')}
                    steps={day.pmSteps || []}
                    state={state}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {state.routineDays.length > 0 && (
        <div className="px-5 mt-3">
          <button
            onClick={addNewDay}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-rose-200 hover:bg-rose-50 transition-colors"
          >
            <Plus className="w-4 h-4 text-rose-400" />
            <span className="text-sm font-medium text-rose-500">{t('routine.addDay')}</span>
          </button>
        </div>
      )}

      <SmartAddSheet
        open={isAddOpen}
        onOpenChange={(next) => {
          setIsAddOpen(next);
          if (!next) setPendingAddStep(null);
        }}
        onSave={async (product) => {
          const newId = await addProduct(product);
          if (newId && pendingAddStep) {
            const setter =
              pendingAddStep.time === 'am' ? setEditAmSteps : setEditPmSteps;
            setter((prev) =>
              prev.map((s) =>
                s.id === pendingAddStep.stepId
                  ? { ...s, productIds: [...s.productIds, newId] }
                  : s
              )
            );
          }
          setIsAddOpen(false);
          setPendingAddStep(null);
        }}
      />
    </AppShell>
  );
}

// ----------------- helpers -----------------

function StepEditor({
  time,
  steps,
  eligibleProducts,
  aiHints,
  onAddStep,
  onRemoveStep,
  onToggleProduct,
  onAddNewProduct,
}: {
  time: 'am' | 'pm';
  steps: RoutineStep[];
  eligibleProducts: { id: string; name: string; brand: string }[];
  aiHints?: Record<string, { name: string; reason: string }>;
  onAddStep: (category: ProductCategory) => void;
  onRemoveStep: (stepId: string) => void;
  onToggleProduct: (stepId: string, productId: string) => void;
  onAddNewProduct: (stepId: string) => void;
}) {
  const { t } = useLocale();
  const [pickerCat, setPickerCat] = useState<ProductCategory | ''>('');

  return (
    <div>
      <Label className="text-xs text-stone-500 flex items-center gap-1">
        {time === 'am' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}{' '}
        {time === 'am' ? t('routine.morningProducts') : t('routine.eveningProducts')}
      </Label>

      <div className="space-y-3 mt-2">
        {steps.length === 0 && (
          <p className="text-xs text-stone-400 italic">{t('routine.noSteps')}</p>
        )}
        {steps.map((step) => {
          const hint =
            step.productIds.length === 0 ? aiHints?.[step.id] : undefined;
          return (
          <div key={step.id} className="border border-stone-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-stone-700">
                {t('cat.' + step.category)}
              </span>
              <button
                type="button"
                onClick={() => onRemoveStep(step.id)}
                className="text-stone-300 hover:text-rose-500"
                aria-label={t('routine.deleteStep')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {hint && (
              <div className="mb-2 rounded-md bg-rose-50 border border-rose-100 px-2 py-1.5">
                <p className="text-[11px] font-medium text-rose-600">
                  <Sparkles className="w-3 h-3 inline me-1" />
                  {t('routine.aiSuggests')}: {hint.name}
                </p>
                {hint.reason && (
                  <p className="text-[10px] text-stone-500 mt-0.5">{hint.reason}</p>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              {eligibleProducts.map((p) => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={step.productIds.includes(p.id)}
                    onCheckedChange={() => onToggleProduct(step.id, p.id)}
                  />
                  <span className="text-xs">
                    {p.name} <span className="text-stone-400">{p.brand}</span>
                  </span>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onAddNewProduct(step.id)}
              className="mt-2 text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1"
            >
              ＋ {t('routine.addProduct')}
            </button>
          </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <Select value={pickerCat} onValueChange={(v) => setPickerCat((v ?? '') as ProductCategory | '')}>
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue placeholder={t('routine.stepCategory')}>
              {(v) => (v ? t('cat.' + v) : t('routine.stepCategory'))}
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
          disabled={!pickerCat}
          onClick={() => {
            if (!pickerCat) return;
            onAddStep(pickerCat as ProductCategory);
            setPickerCat('');
          }}
          className="h-8 text-xs text-rose-500"
        >
          <Plus className="w-3 h-3 me-1" /> {t('routine.addStep')}
        </Button>
      </div>
    </div>
  );
}

function DayStepList({
  icon,
  label,
  steps,
  state,
}: {
  icon: React.ReactNode;
  label: string;
  steps: RoutineStep[];
  state: ReturnType<typeof useAppState>['state'];
}) {
  const { t } = useLocale();
  return (
    <div>
      <div className="flex items-center gap-1 mb-1.5">
        {icon}
        <span className="text-[10px] font-medium text-stone-500 uppercase">{label}</span>
      </div>
      {steps.length === 0 ? (
        <p className="text-[11px] text-stone-400 italic">{t('routine.noSteps')}</p>
      ) : (
        steps.map((step) => (
          <div key={step.id} className="mb-1.5">
            <p className="text-[11px] text-stone-500 font-medium">{t('cat.' + step.category)}</p>
            {step.productIds.map((id) => {
              const p = state ? getProductById(state, id) : null;
              return p ? (
                <p key={id} className="text-xs text-stone-600 ms-2">
                  • {p.name}
                </p>
              ) : null;
            })}
          </div>
        ))
      )}
    </div>
  );
}
