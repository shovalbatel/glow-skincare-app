'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { useAppState } from '@/hooks/use-app-state';
import { getProductById } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
  Sparkles,
  Plus,
  Trash2,
  Loader2,
  X,
  CheckSquare,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Product, ProductCategory, RoutineDay, RoutineStep, CATEGORY_LABELS } from '@/lib/types';
import { useLocale } from '@/components/locale-provider';
import { SmartAddSheet } from '@/components/product-add-flow';
import {
  StepProductPicker,
  StepAiSuggestSheet,
  AiPick,
} from '@/components/routine-step-pickers';

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as ProductCategory[];

function newStepId() {
  return `step_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function newRoutineId() {
  return `rd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

type EditMode = 'am' | 'pm' | 'both';

export default function RoutinePage() {
  const { state, updateRoutine, addProduct } = useAppState();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { t } = useLocale();
  const [editing, setEditing] = useState<RoutineDay | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmSteps, setEditAmSteps] = useState<RoutineStep[]>([]);
  const [editPmSteps, setEditPmSteps] = useState<RoutineStep[]>([]);
  const [editMode, setEditMode] = useState<EditMode>('am');
  // Which step is currently being assigned a freshly added product
  const [pendingAddStep, setPendingAddStep] = useState<{ time: 'am' | 'pm'; stepId: string } | null>(
    null
  );
  // Per-step picker / AI sheets
  const [pickerStep, setPickerStep] = useState<{ time: 'am' | 'pm'; stepId: string } | null>(null);
  const [aiStep, setAiStep] = useState<{ time: 'am' | 'pm'; stepId: string } | null>(null);
  // AI hints per step (from build-with-AI), keyed by step id
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

  // Suggestions are NOT filtered by routineTime — that's a per-product hint,
  // not a hard rule. Users can pick any product for any slot.
  const eligibleProducts = state.products.filter(
    (p) => p.status === 'have' || p.status === 'almost_empty'
  );

  const morningRoutines = state.routineDays.filter((d) => (d.amSteps?.length ?? 0) > 0);
  const eveningRoutines = state.routineDays.filter((d) => (d.pmSteps?.length ?? 0) > 0);

  const startEdit = (day: RoutineDay, modeOverride?: EditMode) => {
    setEditing(day);
    setEditName(day.name);
    setEditAmSteps(JSON.parse(JSON.stringify(day.amSteps || [])));
    setEditPmSteps(JSON.parse(JSON.stringify(day.pmSteps || [])));
    if (modeOverride) {
      setEditMode(modeOverride);
    } else {
      const hasAm = (day.amSteps?.length ?? 0) > 0;
      const hasPm = (day.pmSteps?.length ?? 0) > 0;
      setEditMode(hasAm && hasPm ? 'both' : hasPm ? 'pm' : 'am');
    }
    setAiHints({});
    setAiError(null);
  };

  const closeEdit = () => {
    setEditing(null);
    setAiHints({});
    setAiError(null);
  };

  const buildWithAi = async () => {
    if (!editing) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/recommend-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayName: editName || editing.name,
          dayNumber: 1,
          routineType: editMode,
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

      if (editMode === 'am' || editMode === 'both') {
        setEditAmSteps(materialize(data.amSteps || []));
      }
      if (editMode === 'pm' || editMode === 'both') {
        setEditPmSteps(materialize(data.pmSteps || []));
      }
      setAiHints(hints);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI request failed');
    } finally {
      setAiLoading(false);
    }
  };

  const saveEdit = () => {
    if (!editing) return;
    const finalAm = editMode === 'pm' ? [] : editAmSteps;
    const finalPm = editMode === 'am' ? [] : editPmSteps;
    const updated = state.routineDays.map((d) =>
      d.id === editing.id
        ? {
            ...d,
            name: editName || d.name,
            amSteps: finalAm,
            pmSteps: finalPm,
            amProducts: finalAm.flatMap((s) => s.productIds),
            pmProducts: finalPm.flatMap((s) => s.productIds),
          }
        : d
    );
    updateRoutine(updated);
    closeEdit();
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

  const moveStep = (time: 'am' | 'pm', stepId: string, delta: -1 | 1) => {
    const setter = time === 'am' ? setEditAmSteps : setEditPmSteps;
    setter((prev) => {
      const idx = prev.findIndex((s) => s.id === stepId);
      const target = idx + delta;
      if (idx === -1 || target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const setStepProducts = (
    time: 'am' | 'pm',
    stepId: string,
    productIds: string[]
  ) => {
    const setter = time === 'am' ? setEditAmSteps : setEditPmSteps;
    setter((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, productIds } : s))
    );
  };

  const removeStepProduct = (
    time: 'am' | 'pm',
    stepId: string,
    productId: string
  ) => {
    const setter = time === 'am' ? setEditAmSteps : setEditPmSteps;
    setter((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? { ...s, productIds: s.productIds.filter((id) => id !== productId) }
          : s
      )
    );
  };

  const findStep = (
    time: 'am' | 'pm',
    stepId: string
  ): RoutineStep | undefined => {
    const list = time === 'am' ? editAmSteps : editPmSteps;
    return list.find((s) => s.id === stepId);
  };

  const activePickerStep = pickerStep ? findStep(pickerStep.time, pickerStep.stepId) : undefined;
  const activeAiStep = aiStep ? findStep(aiStep.time, aiStep.stepId) : undefined;

  const createRoutine = (mode: EditMode) => {
    const baseName =
      mode === 'pm'
        ? t('routine.newEveningName')
        : mode === 'am'
        ? t('routine.newMorningName')
        : t('routine.newDayName');
    // Routines start empty — the user picks their first step in the editor.
    const newRoutine: RoutineDay = {
      id: newRoutineId(),
      dayNumber: state.routineDays.length + 1,
      name: baseName,
      amSteps: [],
      pmSteps: [],
      amProducts: [],
      pmProducts: [],
    };
    const updated = [...state.routineDays, newRoutine];
    updateRoutine(updated);
    setTimeout(() => startEdit(newRoutine, mode), 100);
  };

  const deleteRoutine = (day: RoutineDay) => {
    if (!window.confirm(t('routine.confirmDelete'))) return;
    const remaining = state.routineDays.filter((d) => d.id !== day.id);
    updateRoutine(remaining);
  };

  const renderRoutineCard = (day: RoutineDay, time: 'am' | 'pm') => {
    const isFullDay = (day.amSteps?.length ?? 0) > 0 && (day.pmSteps?.length ?? 0) > 0;
    const steps = time === 'am' ? day.amSteps : day.pmSteps;
    return (
      <Card key={`${day.id}_${time}`} className="border-rose-100 shadow-sm">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-stone-700">{day.name}</h3>
              {isFullDay && (
                <Badge className="bg-violet-100 text-violet-600 text-[10px]">
                  {t('routine.fullDayBadge')}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-stone-400"
                onClick={() => startEdit(day)}
                aria-label={t('routine.editRoutine')}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-stone-400 hover:text-rose-500"
                onClick={() => deleteRoutine(day)}
                aria-label={t('routine.deleteRoutine')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div>
            {(steps?.length ?? 0) === 0 ? (
              <p className="text-[11px] text-stone-400 italic">{t('routine.noSteps')}</p>
            ) : (
              steps.map((step) => (
                <div key={step.id} className="mb-1.5">
                  <p className="text-[11px] text-stone-500 font-medium">
                    {t('cat.' + step.category)}
                  </p>
                  {step.productIds.length === 0 ? (
                    <p className="text-[11px] text-stone-300 italic ms-2">
                      {t('routine.noProductYet')}
                    </p>
                  ) : (
                    step.productIds.map((id) => {
                      const p = getProductById(state, id);
                      return p ? (
                        <p key={id} className="text-xs text-stone-600 ms-2">
                          • {p.name}
                        </p>
                      ) : null;
                    })
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AppShell>
      <PageHeader title={t('routine.title')} />

      {state.routineDays.length === 0 && (
        <div className="px-5 mb-5">
          <Card className="border-rose-100 shadow-sm">
            <CardContent className="pt-8 pb-6 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-rose-400" />
              </div>
              <h3 className="text-lg font-semibold text-stone-700 mb-1">
                {t('routine.noRoutine')}
              </h3>
              <p className="text-sm text-stone-400 mb-5">{t('routine.noRoutineHint')}</p>
              <div className="grid grid-cols-1 gap-2 w-full">
                <Button
                  onClick={() => createRoutine('am')}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-xl h-11"
                >
                  <Sun className="w-4 h-4 me-2" /> {t('routine.addMorningRoutine')}
                </Button>
                <Button
                  onClick={() => createRoutine('pm')}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl h-11"
                >
                  <Moon className="w-4 h-4 me-2" /> {t('routine.addEveningRoutine')}
                </Button>
                <Button
                  onClick={() => createRoutine('both')}
                  variant="ghost"
                  className="w-full border border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100 rounded-xl h-11"
                >
                  {t('routine.addFullDayRoutine')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Morning section */}
      {state.routineDays.length > 0 && (
        <div className="px-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sun className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
              {t('routine.morningRoutines')}
            </h2>
          </div>
          <div className="space-y-3">
            {morningRoutines.length === 0 ? (
              <p className="text-xs text-stone-400 italic mb-2">{t('routine.noMorningYet')}</p>
            ) : (
              morningRoutines.map((d) => renderRoutineCard(d, 'am'))
            )}
            <button
              onClick={() => createRoutine('am')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-rose-200 hover:bg-rose-50 transition-colors"
            >
              <Plus className="w-4 h-4 text-rose-400" />
              <span className="text-sm font-medium text-rose-500">
                {t('routine.addMorningRoutine')}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Evening section */}
      {state.routineDays.length > 0 && (
        <div className="px-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Moon className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
              {t('routine.eveningRoutines')}
            </h2>
          </div>
          <div className="space-y-3">
            {eveningRoutines.length === 0 ? (
              <p className="text-xs text-stone-400 italic mb-2">{t('routine.noEveningYet')}</p>
            ) : (
              eveningRoutines.map((d) => renderRoutineCard(d, 'pm'))
            )}
            <button
              onClick={() => createRoutine('pm')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-indigo-200 hover:bg-indigo-50 transition-colors"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-medium text-indigo-500">
                {t('routine.addEveningRoutine')}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Edit sheet (controlled) */}
      <Sheet
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) closeEdit();
        }}
      >
        <SheetContent
          side="bottom"
          className="rounded-t-2xl max-h-[90vh] overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle className="text-stone-700">{t('routine.editRoutine')}</SheetTitle>
          </SheetHeader>
          {editing && (
            <div className="space-y-5 px-1 mt-4">
              <div>
                <Label className="text-xs text-stone-500">{t('routine.routineName')}</Label>
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
                {aiError && <p className="text-xs text-rose-500 mt-1">{aiError}</p>}
              </div>

              {(editMode === 'am' || editMode === 'both') && (
                <StepEditor
                  time="am"
                  steps={editAmSteps}
                  allProducts={state.products}
                  aiHints={aiHints}
                  onAddStep={(cat) => addStep('am', cat)}
                  onRemoveStep={(id) => removeStep('am', id)}
                  onMoveStep={(id, delta) => moveStep('am', id, delta)}
                  onRemoveProduct={(stepId, pid) => removeStepProduct('am', stepId, pid)}
                  onOpenPicker={(stepId) => setPickerStep({ time: 'am', stepId })}
                  onOpenAi={(stepId) => setAiStep({ time: 'am', stepId })}
                  onAddNewProduct={(stepId) => {
                    setPendingAddStep({ time: 'am', stepId });
                    setIsAddOpen(true);
                  }}
                />
              )}

              {(editMode === 'pm' || editMode === 'both') && (
                <StepEditor
                  time="pm"
                  steps={editPmSteps}
                  allProducts={state.products}
                  aiHints={aiHints}
                  onAddStep={(cat) => addStep('pm', cat)}
                  onRemoveStep={(id) => removeStep('pm', id)}
                  onMoveStep={(id, delta) => moveStep('pm', id, delta)}
                  onRemoveProduct={(stepId, pid) => removeStepProduct('pm', stepId, pid)}
                  onOpenPicker={(stepId) => setPickerStep({ time: 'pm', stepId })}
                  onOpenAi={(stepId) => setAiStep({ time: 'pm', stepId })}
                  onAddNewProduct={(stepId) => {
                    setPendingAddStep({ time: 'pm', stepId });
                    setIsAddOpen(true);
                  }}
                />
              )}

              {/* Add the other side, if missing */}
              {editMode === 'am' && (
                <button
                  type="button"
                  onClick={() => setEditMode('both')}
                  className="w-full text-xs text-indigo-500 hover:text-indigo-600 flex items-center justify-center gap-1.5 py-2"
                >
                  <Moon className="w-3 h-3" /> {t('routine.addEveningSide')}
                </button>
              )}
              {editMode === 'pm' && (
                <button
                  type="button"
                  onClick={() => setEditMode('both')}
                  className="w-full text-xs text-amber-500 hover:text-amber-600 flex items-center justify-center gap-1.5 py-2"
                >
                  <Sun className="w-3 h-3" /> {t('routine.addMorningSide')}
                </button>
              )}

              <Button
                onClick={saveEdit}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white"
              >
                {t('routine.saveChanges')}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

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

      {/* Step product picker (multi-select from existing library) */}
      {pickerStep && activePickerStep && (
        <StepProductPicker
          open={!!pickerStep}
          onOpenChange={(next) => {
            if (!next) setPickerStep(null);
          }}
          category={activePickerStep.category}
          time={pickerStep.time}
          allProducts={state.products}
          initialSelected={activePickerStep.productIds}
          onConfirm={(ids) => {
            if (pickerStep) setStepProducts(pickerStep.time, pickerStep.stepId, ids);
          }}
          onAddNew={() => {
            if (pickerStep) {
              setPendingAddStep({ time: pickerStep.time, stepId: pickerStep.stepId });
              setPickerStep(null);
              setIsAddOpen(true);
            }
          }}
        />
      )}

      {/* AI step suggestions (2-3 picks) */}
      {aiStep && activeAiStep && (
        <StepAiSuggestSheet
          open={!!aiStep}
          onOpenChange={(next) => {
            if (!next) setAiStep(null);
          }}
          category={activeAiStep.category}
          time={aiStep.time}
          library={state.products}
          onPick={async (pick: AiPick) => {
            const newId = await addProduct({
              name: pick.name,
              brand: pick.brand,
              category: pick.category,
              description: pick.reason,
              routineTime: aiStep!.time === 'am' ? 'am' : 'pm',
              frequency: 'daily',
              status: 'need_to_buy',
              isActive: true,
              notes: '',
              purchaseUrl: '',
              imageUrl: '',
              imagePath: '',
            } as Omit<Product, 'id' | 'createdAt' | 'updatedAt'>);
            if (newId && aiStep) {
              const setter = aiStep.time === 'am' ? setEditAmSteps : setEditPmSteps;
              setter((prev) =>
                prev.map((s) =>
                  s.id === aiStep.stepId
                    ? { ...s, productIds: [...s.productIds, newId] }
                    : s
                )
              );
            }
          }}
        />
      )}
    </AppShell>
  );
}

// ----------------- helpers -----------------

function StepEditor({
  time,
  steps,
  allProducts,
  aiHints,
  onAddStep,
  onRemoveStep,
  onMoveStep,
  onRemoveProduct,
  onOpenPicker,
  onOpenAi,
  onAddNewProduct,
}: {
  time: 'am' | 'pm';
  steps: RoutineStep[];
  allProducts: Product[];
  aiHints?: Record<string, { name: string; reason: string }>;
  onAddStep: (category: ProductCategory) => void;
  onRemoveStep: (stepId: string) => void;
  onMoveStep: (stepId: string, delta: -1 | 1) => void;
  onRemoveProduct: (stepId: string, productId: string) => void;
  onOpenPicker: (stepId: string) => void;
  onOpenAi: (stepId: string) => void;
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
          <p className="text-xs text-stone-400 italic">{t('routine.firstAddStep')}</p>
        )}
        {steps.map((step, idx) => {
          const stepLabel = t('cat.' + step.category);
          const explanation = t('step.about.' + step.category);
          const hint =
            step.productIds.length === 0 ? aiHints?.[step.id] : undefined;
          const stepProducts = step.productIds
            .map((id) => allProducts.find((p) => p.id === id))
            .filter((p): p is Product => !!p);
          const canMoveUp = idx > 0;
          const canMoveDown = idx < steps.length - 1;
          return (
            <div
              key={step.id}
              className="border border-stone-200 rounded-xl p-3 bg-white"
            >
              <div className="flex items-start justify-between mb-1 gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-700">
                    <span className="text-stone-400 me-1.5">{idx + 1}.</span>
                    {stepLabel}
                  </p>
                  {explanation && explanation !== 'step.about.' + step.category && (
                    <p className="text-[11px] text-stone-400 mt-0.5">{explanation}</p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onMoveStep(step.id, -1)}
                    disabled={!canMoveUp}
                    className="text-stone-300 hover:text-rose-500 disabled:opacity-30 disabled:hover:text-stone-300 p-1"
                    aria-label={t('routine.moveStepUp')}
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveStep(step.id, 1)}
                    disabled={!canMoveDown}
                    className="text-stone-300 hover:text-rose-500 disabled:opacity-30 disabled:hover:text-stone-300 p-1"
                    aria-label={t('routine.moveStepDown')}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveStep(step.id)}
                    className="text-stone-300 hover:text-rose-500 p-1 ms-1"
                    aria-label={t('routine.deleteStep')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {hint && (
                <div className="mt-2 rounded-md bg-rose-50 border border-rose-100 px-2 py-1.5">
                  <p className="text-[11px] font-medium text-rose-600">
                    <Sparkles className="w-3 h-3 inline me-1" />
                    {t('routine.aiSuggests')}: {hint.name}
                  </p>
                  {hint.reason && (
                    <p className="text-[10px] text-stone-500 mt-0.5">{hint.reason}</p>
                  )}
                </div>
              )}

              {/* Selected products as chips */}
              {stepProducts.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {stepProducts.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1.5 ps-1 pe-1 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-[11px] text-stone-700 max-w-full"
                    >
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.imageUrl}
                          alt=""
                          className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-rose-100 flex-shrink-0" />
                      )}
                      <span className="truncate max-w-[140px]">{p.name}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveProduct(step.id, p.id)}
                        className="text-rose-300 hover:text-rose-500 flex-shrink-0 me-0.5"
                        aria-label={t('routine.removeProduct')}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-stone-400 italic mt-2">
                  {t('routine.noProductsForStep')}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={() => onOpenPicker(step.id)}
                  className="text-[11px] px-2.5 py-1.5 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 inline-flex items-center gap-1"
                >
                  <CheckSquare className="w-3 h-3" /> {t('routine.pickProducts')}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAi(step.id)}
                  className="text-[11px] px-2.5 py-1.5 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 inline-flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> {t('routine.aiSuggestProducts')}
                </button>
                <button
                  type="button"
                  onClick={() => onAddNewProduct(step.id)}
                  className="text-[11px] px-2.5 py-1.5 rounded-full text-rose-500 hover:text-rose-600 inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> {t('routine.addNewProduct')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add another step */}
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
