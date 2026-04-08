'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ProductForm, ExtractedProduct } from '@/components/product-add-flow';
import {
  addProduct as storeAddProduct,
  updateRoutineDays,
  saveDisclaimerAgreement,
  saveSkinProfile,
  completeOnboarding,
  uploadFacePhoto,
  saveFacePhotoRecord,
} from '@/lib/store';
import { Product, ProductCategory, RoutineDay, RoutineStep, SkinGoal, SkinConcern } from '@/lib/types';
import {
  Sparkles, Sun, Moon, Camera, Loader2, X, Link2,
  ChevronRight, ChevronLeft, UserCircle, ImageIcon, Package,
  Shield, CheckCircle2, Plus, SkipForward,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/components/locale-provider';
import { Locale } from '@/lib/translations';

// ============ Constants ============

interface RoutineStepDef {
  category: ProductCategory;
  labelKey: string;
  descriptionKey: string;
  time: 'am' | 'pm';
}

const AM_STEPS: RoutineStepDef[] = [
  { category: 'cleanser', labelKey: 'cat.cleanser', descriptionKey: 'onboard.step.cleanser.am', time: 'am' },
  { category: 'toner', labelKey: 'cat.toner', descriptionKey: 'onboard.step.toner.am', time: 'am' },
  { category: 'serum', labelKey: 'cat.serum', descriptionKey: 'onboard.step.serum.am', time: 'am' },
  { category: 'eye_cream', labelKey: 'cat.eye_cream', descriptionKey: 'onboard.step.eye_cream.am', time: 'am' },
  { category: 'moisturizer', labelKey: 'cat.moisturizer', descriptionKey: 'onboard.step.moisturizer.am', time: 'am' },
  { category: 'sunscreen', labelKey: 'cat.sunscreen', descriptionKey: 'onboard.step.sunscreen.am', time: 'am' },
];

const PM_STEPS: RoutineStepDef[] = [
  { category: 'cleanser', labelKey: 'cat.cleanser', descriptionKey: 'onboard.step.cleanser.pm', time: 'pm' },
  { category: 'toner', labelKey: 'cat.toner', descriptionKey: 'onboard.step.toner.pm', time: 'pm' },
  { category: 'exfoliant_gentle', labelKey: 'cat.exfoliant_gentle', descriptionKey: 'onboard.step.exfoliant_gentle.pm', time: 'pm' },
  { category: 'treatment', labelKey: 'cat.treatment', descriptionKey: 'onboard.step.treatment.pm', time: 'pm' },
  { category: 'serum', labelKey: 'cat.serum', descriptionKey: 'onboard.step.serum.pm', time: 'pm' },
  { category: 'eye_cream', labelKey: 'cat.eye_cream', descriptionKey: 'onboard.step.eye_cream.pm', time: 'pm' },
  { category: 'oil', labelKey: 'cat.oil', descriptionKey: 'onboard.step.oil.pm', time: 'pm' },
  { category: 'night_cream', labelKey: 'cat.night_cream', descriptionKey: 'onboard.step.night_cream.pm', time: 'pm' },
];

const GOALS: { key: SkinGoal; emoji: string }[] = [
  { key: 'anti_aging', emoji: '🧴' },
  { key: 'hydration', emoji: '💧' },
  { key: 'acne_control', emoji: '🎯' },
  { key: 'even_tone', emoji: '✨' },
  { key: 'glow', emoji: '🌟' },
  { key: 'pore_minimizing', emoji: '🔬' },
  { key: 'reduce_redness', emoji: '🩹' },
  { key: 'sun_protection', emoji: '☀️' },
];

const CONCERNS: { key: SkinConcern; emoji: string }[] = [
  { key: 'dryness', emoji: '🏜️' },
  { key: 'oily_skin', emoji: '💦' },
  { key: 'acne', emoji: '😣' },
  { key: 'dark_spots', emoji: '🟤' },
  { key: 'wrinkles', emoji: '〰️' },
  { key: 'redness', emoji: '🔴' },
  { key: 'dull_skin', emoji: '😶' },
  { key: 'large_pores', emoji: '🕳️' },
  { key: 'sensitivity', emoji: '🌸' },
];

// ============ Tracked product during onboarding ============
interface RoutineProduct {
  product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
  stepCategory: ProductCategory;
  time: 'am' | 'pm';
}

// Build a step list for a given time (am/pm) by walking the onboarding-collected
// RoutineProducts in order, looking up the matching saved product by name+brand,
// and grouping consecutive same-category items into one step.
function buildStepsForTime(
  savedProducts: Product[],
  collected: RoutineProduct[],
  time: 'am' | 'pm'
): RoutineStep[] {
  const filtered = collected.filter((rp) => rp.time === time);
  const stepsByCategory = new Map<ProductCategory, string[]>();
  for (const rp of filtered) {
    const found = savedProducts.find(
      (sp) =>
        sp.name === rp.product.name &&
        sp.brand === rp.product.brand &&
        (sp.routineTime === time || sp.routineTime === 'both')
    );
    if (!found) continue;
    const list = stepsByCategory.get(rp.stepCategory) || [];
    if (!list.includes(found.id)) list.push(found.id);
    stepsByCategory.set(rp.stepCategory, list);
  }
  // Preserve the order of categories as they were collected
  const orderedCategories: ProductCategory[] = [];
  for (const rp of filtered) {
    if (!orderedCategories.includes(rp.stepCategory)) {
      orderedCategories.push(rp.stepCategory);
    }
  }
  return orderedCategories
    .filter((c) => stepsByCategory.has(c))
    .map((category) => ({
      id: `step_${category}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      category,
      productIds: stepsByCategory.get(category)!,
    }));
}

// ============ Progress Dots ============
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === current ? 'w-8 bg-rose-500' : i < current ? 'w-2 bg-rose-300' : 'w-2 bg-stone-200'
          }`}
        />
      ))}
    </div>
  );
}

// ============ Step 0: Disclaimer ============
function StepDisclaimer({ onNext }: { onNext: () => void }) {
  const { t } = useLocale();
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="text-xl font-semibold text-stone-800">{t('onboard.disclaimer.title')}</h2>
        <p className="text-sm text-stone-500 mt-1">{t('onboard.disclaimer.subtitle')}</p>
      </div>

      <Card className="border-amber-100">
        <CardContent className="pt-4 pb-4">
          <div className="text-xs text-stone-600 space-y-3 leading-relaxed max-h-48 overflow-y-auto">
            <p><strong>{t('onboard.disclaimer.heading')}</strong></p>
            <p>{t('onboard.disclaimer.text1')}</p>
            <p>{t('onboard.disclaimer.text2')}</p>
            <ul className="list-disc ps-4 space-y-1">
              <li>{t('onboard.disclaimer.item1')}</li>
              <li>{t('onboard.disclaimer.item2')}</li>
              <li>{t('onboard.disclaimer.item3')}</li>
              <li>{t('onboard.disclaimer.item4')}</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox checked={agreed} onCheckedChange={(c) => setAgreed(c === true)} className="mt-0.5 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500" />
        <span className="text-sm text-stone-600 leading-snug">
          {t('onboard.disclaimer.checkbox')}
        </span>
      </label>

      <Button onClick={onNext} disabled={!agreed} className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl">
        {t('onboard.disclaimer.agree')} <ChevronRight className="w-4 h-4 ms-2 rtl:rotate-180" />
      </Button>
    </div>
  );
}

// ============ Step 1: Skin Goals & Concerns ============
function StepGoalsConcerns({
  userId,
  onNext,
  onBack,
}: {
  userId: string;
  onNext: () => void;
  onBack: () => void;
}) {
  const { t } = useLocale();
  const [selectedGoals, setSelectedGoals] = useState<Set<SkinGoal>>(new Set());
  const [selectedConcerns, setSelectedConcerns] = useState<Set<SkinConcern>>(new Set());

  const toggleGoal = (g: SkinGoal) => {
    setSelectedGoals((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  };

  const toggleConcern = (c: SkinConcern) => {
    setSelectedConcerns((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  const handleContinue = async () => {
    await saveSkinProfile(userId, Array.from(selectedGoals), Array.from(selectedConcerns));
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Goals section */}
      <div>
        <div className="text-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-rose-500" />
          </div>
          <h2 className="text-xl font-semibold text-stone-800">{t('onboard.goals.title')}</h2>
          <p className="text-sm text-stone-500 mt-1">{t('onboard.goals.subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {GOALS.map(({ key, emoji }) => (
            <button
              type="button"
              key={key}
              onClick={() => toggleGoal(key)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-start transition-colors ${
                selectedGoals.has(key)
                  ? 'border-rose-300 bg-rose-50 text-rose-700'
                  : 'border-stone-100 text-stone-600 hover:bg-stone-50'
              }`}
            >
              <span className="text-lg">{emoji}</span>
              <span className="text-sm font-medium">{t(`onboard.goals.${key}`)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Concerns section */}
      <div>
        <h3 className="text-lg font-semibold text-stone-800 mb-3">{t('onboard.concerns.title')}</h3>
        <div className="grid grid-cols-2 gap-2">
          {CONCERNS.map(({ key, emoji }) => (
            <button
              type="button"
              key={key}
              onClick={() => toggleConcern(key)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-start transition-colors ${
                selectedConcerns.has(key)
                  ? 'border-amber-300 bg-amber-50 text-amber-700'
                  : 'border-stone-100 text-stone-600 hover:bg-stone-50'
              }`}
            >
              <span className="text-lg">{emoji}</span>
              <span className="text-sm font-medium">{t(`onboard.concerns.${key}`)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation — sticky at bottom */}
      <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-white via-white to-transparent -mx-5 px-5">
        <Button onClick={handleContinue} className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl">
          {t('common.continue')} <ChevronRight className="w-4 h-4 ms-2 rtl:rotate-180" />
        </Button>
        <Button variant="ghost" onClick={onBack} className="w-full text-stone-400 mt-1">
          <ChevronLeft className="w-4 h-4 me-1 rtl:rotate-180" /> {t('common.back')}
        </Button>
      </div>
    </div>
  );
}

// ============ Inline Product Adder (for routine steps) ============
function InlineProductAdder({
  onAdd,
  category,
}: {
  onAdd: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  category: ProductCategory;
}) {
  const { t } = useLocale();
  const [mode, setMode] = useState<'choose' | 'photo' | 'link' | 'manual' | 'review'>('choose');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [extracted, setExtracted] = useState<ExtractedProduct | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUrl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/extract-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed');
      setExtracted(data);
      setMode('review');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to extract from URL');
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (file: File) => {
    setLoading(true);
    setError('');
    setPreviewSrc(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/extract-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: reader.result }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setExtracted(data);
        setMode('review');
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to extract');
        setMode('photo');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    onAdd(data);
    setMode('choose');
    setExtracted(null);
    setPreviewSrc(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 gap-2">
        <Loader2 className="w-5 h-5 text-rose-400 animate-spin" />
        <span className="text-xs text-stone-500">{t('common.analyzing')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
        <p className="text-xs text-rose-600">{error}</p>
        <Button variant="ghost" size="sm" className="text-xs text-rose-500 mt-1 p-0 h-auto" onClick={() => { setError(''); setMode('choose'); }}>{t('common.tryAgain')}</Button>
      </div>
    );
  }

  if (mode === 'review' && extracted) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
          <Sparkles className="w-3 h-3 text-emerald-500" />
          <p className="text-[11px] text-emerald-700">{t('add.aiExtracted')}</p>
        </div>
        {previewSrc && <img src={previewSrc} alt="" className="w-full h-24 object-cover rounded-lg" />}
        <ProductForm hideStatus initial={extracted} onSave={handleSave} onClose={() => setMode('choose')} />
      </div>
    );
  }

  if (mode === 'manual') {
    return (
      <div className="space-y-2">
        <button onClick={() => setMode('choose')} className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600">
          <ChevronLeft className="w-3 h-3 rtl:rotate-180" /> {t('common.back')}
        </button>
        <ProductForm
          hideStatus
          initial={{ category, routineTime: 'both' }}
          onSave={handleSave}
          onClose={() => setMode('choose')}
        />
      </div>
    );
  }

  if (mode === 'photo') {
    return (
      <div className="space-y-3">
        <button onClick={() => setMode('choose')} className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600">
          <ChevronLeft className="w-3 h-3 rtl:rotate-180" /> {t('common.back')}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        <p className="text-xs text-rose-500 font-medium text-center">{t('onboard.step.photoHint')}</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => { fileRef.current?.setAttribute('capture', 'environment'); fileRef.current?.click(); }}
            className="flex flex-col items-center gap-1.5 p-4 rounded-lg border-2 border-dashed border-rose-200 hover:bg-rose-50 transition-colors">
            <Camera className="w-6 h-6 text-rose-400" /><span className="text-[10px] font-medium text-stone-600">{t('add.camera')}</span>
          </button>
          <button onClick={() => { fileRef.current?.removeAttribute('capture'); fileRef.current?.click(); }}
            className="flex flex-col items-center gap-1.5 p-4 rounded-lg border-2 border-dashed border-rose-200 hover:bg-rose-50 transition-colors">
            <ImageIcon className="w-6 h-6 text-rose-400" /><span className="text-[10px] font-medium text-stone-600">{t('add.gallery')}</span>
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'link') {
    return (
      <div className="space-y-3">
        <button onClick={() => setMode('choose')} className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600">
          <ChevronLeft className="w-3 h-3 rtl:rotate-180" /> {t('common.back')}
        </button>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('add.urlPlaceholder')} type="url" />
        <p className="text-xs text-stone-400">{t('add.urlHint')}</p>
        <Button onClick={handleUrl} disabled={!url.trim()} className="w-full bg-sky-500 hover:bg-sky-600 text-white">
          <Sparkles className="w-4 h-4 me-2" />{t('add.extract')}
        </Button>
      </div>
    );
  }

  // choose mode
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button onClick={() => setMode('photo')}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors">
          <Camera className="w-5 h-5 text-rose-400" />
          <span className="text-[11px] font-medium text-stone-600">{t('add.scanShort')}</span>
        </button>
        <button onClick={() => setMode('link')}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-lg border border-sky-200 hover:bg-sky-50 transition-colors">
          <Link2 className="w-5 h-5 text-sky-400" />
          <span className="text-[11px] font-medium text-stone-600">{t('add.linkShort')}</span>
        </button>
        <button onClick={() => setMode('manual')}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors">
          <Plus className="w-5 h-5 text-stone-400" />
          <span className="text-[11px] font-medium text-stone-600">{t('add.manualShort')}</span>
        </button>
      </div>
    </div>
  );
}

// ============ Step 2: Morning Routine Builder ============
function StepMorningRoutine({
  userId,
  onNext,
  onBack,
  products,
  setProducts,
}: {
  userId: string;
  onNext: (continueEvening: boolean) => void;
  onBack: () => void;
  products: RoutineProduct[];
  setProducts: React.Dispatch<React.SetStateAction<RoutineProduct[]>>;
}) {
  const { t } = useLocale();
  const [stepIndex, setStepIndex] = useState(0);
  const [addingProduct, setAddingProduct] = useState(false);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customStepName, setCustomStepName] = useState('');
  const [customSteps, setCustomSteps] = useState<RoutineStepDef[]>([]);
  const [done, setDone] = useState(false);

  const allSteps = [...AM_STEPS, ...customSteps];
  const currentStep = allSteps[stepIndex];
  const productsForCurrentStep = currentStep
    ? products.filter((p) => p.stepCategory === currentStep.category && p.time === 'am')
    : [];

  const addProductToStep = async (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentStep) return;
    await storeAddProduct(userId, { ...data, routineTime: 'am', category: currentStep.category });
    setProducts((prev) => [...prev, { product: data, stepCategory: currentStep.category, time: 'am' }]);
    setAddingProduct(false);
  };

  const goNextStep = () => {
    setAddingProduct(false);
    if (stepIndex < allSteps.length - 1) {
      setStepIndex(stepIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goPrevStep = () => {
    setAddingProduct(false);
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    } else {
      onBack();
    }
  };

  const handleAddCustomStep = () => {
    if (!customStepName.trim()) return;
    const newStep: RoutineStepDef = {
      category: customStepName.toLowerCase().replace(/\s+/g, '_') as ProductCategory,
      labelKey: customStepName,
      descriptionKey: '',
      time: 'am',
    };
    setCustomSteps((prev) => [...prev, newStep]);
    setAddingCustom(false);
    setCustomStepName('');
    // Jump to the new custom step
    setStepIndex(allSteps.length); // Will be the index of the newly added step
  };

  // Done summary
  if (done) {
    const amCount = products.filter((p) => p.time === 'am').length;
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-stone-800">{t('onboard.am.done')}</h2>
          <p className="text-sm text-stone-500 mt-1">{amCount} {t('common.morning').toLowerCase()}</p>
        </div>

        <Button onClick={() => onNext(true)} className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl">
          <Moon className="w-4 h-4 me-2" /> {t('onboard.am.continueEvening')} <ChevronRight className="w-4 h-4 ms-2 rtl:rotate-180" />
        </Button>
        <button onClick={() => onNext(false)} className="w-full text-center text-xs text-stone-400 hover:text-rose-500 transition-colors py-2">
          {t('onboard.am.skipEvening')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Phase header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            {t('onboard.am.title')}
          </span>
        </div>
        <div className="flex gap-0.5">
          {allSteps.map((_, i) => (
            <div key={i} className={`w-4 h-1.5 rounded-full ${
              i < stepIndex ? 'bg-amber-300' : i === stepIndex ? 'bg-amber-500' : 'bg-stone-200'
            }`} />
          ))}
        </div>
      </div>
      <p className="text-xs text-stone-400">{t('onboard.am.subtitle')}</p>
      <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-lg">
        <p className="text-xs text-sky-700">{t('onboard.am.currentHint')}</p>
      </div>

      {/* Current step */}
      {currentStep && (
        <Card key={`am-step-${stepIndex}`} className="border-amber-100 animate-slide-in">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-amber-500 font-semibold mb-1">
              Step {stepIndex + 1}/{allSteps.length}
            </p>
            <h3 className="text-lg font-semibold text-stone-800">{t(currentStep.labelKey)}</h3>
            <p className="text-sm text-stone-600 mt-1 mb-1">
              {t('onboard.step.doYouUse', { step: t(currentStep.labelKey).toLowerCase(), time: t('common.morning').toLowerCase() })}
            </p>
            {currentStep.descriptionKey && (
              <p className="text-xs text-stone-400 mb-4">{t(currentStep.descriptionKey)}</p>
            )}

            {/* Products already added for this step */}
            {productsForCurrentStep.length > 0 && (
              <div className="space-y-2 mb-4">
                {productsForCurrentStep.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-700 truncate">{p.product.name}</p>
                      <p className="text-xs text-stone-400">{p.product.brand}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProducts((prev) => prev.filter((_, idx) => idx !== products.indexOf(p)))}
                      className="shrink-0 p-1 rounded-full text-stone-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                      aria-label={t('onboard.step.removeProduct')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {!addingProduct && (
                  <button onClick={() => setAddingProduct(true)}
                    className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600 mt-1">
                    <Plus className="w-3 h-3" /> {t('onboard.step.addAnother')}
                  </button>
                )}
              </div>
            )}

            {/* Add product UI */}
            {(productsForCurrentStep.length === 0 || addingProduct) && (
              <InlineProductAdder category={currentStep.category} onAdd={addProductToStep} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Add custom step button */}
      {!addingCustom ? (
        <button onClick={() => setAddingCustom(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-stone-200 hover:bg-stone-50 transition-colors">
          <Plus className="w-4 h-4 text-stone-400" />
          <span className="text-xs font-medium text-stone-500">{t('onboard.step.addCustomStep')}</span>
        </button>
      ) : (
        <Card className="border-stone-200">
          <CardContent className="pt-4 pb-3 space-y-3">
            <p className="text-sm font-medium text-stone-700">{t('onboard.step.customStepName')}</p>
            <input
              type="text"
              value={customStepName}
              onChange={(e) => setCustomStepName(e.target.value)}
              placeholder={t('onboard.step.customStepPlaceholder')}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
            />
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setAddingCustom(false); setCustomStepName(''); }}>{t('common.cancel')}</Button>
              <Button size="sm" onClick={handleAddCustomStep} disabled={!customStepName.trim()} className="bg-rose-500 hover:bg-rose-600 text-white">{t('common.save')}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="space-y-2">
        <div className="flex gap-3">
          <Button variant="ghost" onClick={goPrevStep} className="text-stone-400">
            <ChevronLeft className="w-4 h-4 me-1 rtl:rotate-180" /> {t('common.back')}
          </Button>
          <Button onClick={goNextStep} className="flex-1 h-11 rounded-xl text-white bg-rose-500 hover:bg-rose-600">
            {productsForCurrentStep.length > 0 ? (
              <>{t('onboard.step.nextStep')} <ChevronRight className="w-4 h-4 ms-1 rtl:rotate-180" /></>
            ) : (
              <><SkipForward className="w-4 h-4 me-1" /> {t('onboard.step.dontUse')}</>
            )}
          </Button>
        </div>
        {productsForCurrentStep.length === 0 && (
          <button onClick={goNextStep} className="w-full text-center text-xs text-stone-400 hover:text-rose-500 transition-colors py-1">
            {t('onboard.step.addLater')}
          </button>
        )}
      </div>
    </div>
  );
}

// ============ Step 3: Evening Routine Builder ============
interface EveningDayVariation {
  name: string;
  products: RoutineProduct[];
}

function StepEveningRoutine({
  userId,
  onNext,
  onBack,
  products,
  setProducts,
}: {
  userId: string;
  onNext: (dayVariations: EveningDayVariation[]) => void;
  onBack: () => void;
  products: RoutineProduct[];
  setProducts: React.Dispatch<React.SetStateAction<RoutineProduct[]>>;
}) {
  const { t } = useLocale();
  const [stepIndex, setStepIndex] = useState(0);
  const [addingProduct, setAddingProduct] = useState(false);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customStepName, setCustomStepName] = useState('');
  const [customSteps, setCustomSteps] = useState<RoutineStepDef[]>([]);
  const [done, setDone] = useState(false);
  const [askingVariation, setAskingVariation] = useState(false);
  const [dayVariations, setDayVariations] = useState<EveningDayVariation[]>([]);
  const [addingNewDay, setAddingNewDay] = useState(false);
  const [newDayName, setNewDayName] = useState('');
  // Track current variation's products separately
  const [variationProducts, setVariationProducts] = useState<RoutineProduct[]>([]);
  const [buildingVariation, setBuildingVariation] = useState(false);
  const [variationStepIndex, setVariationStepIndex] = useState(0);

  const allSteps = [...PM_STEPS, ...customSteps];
  const currentStep = buildingVariation ? allSteps[variationStepIndex] : allSteps[stepIndex];
  const currentProducts = buildingVariation ? variationProducts : products;
  const productsForCurrentStep = currentStep
    ? currentProducts.filter((p) => p.stepCategory === currentStep.category && p.time === 'pm')
    : [];

  const addProductToStep = async (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentStep) return;
    await storeAddProduct(userId, { ...data, routineTime: 'pm', category: currentStep.category });
    const newProd: RoutineProduct = { product: data, stepCategory: currentStep.category, time: 'pm' };
    if (buildingVariation) {
      setVariationProducts((prev) => [...prev, newProd]);
    } else {
      setProducts((prev) => [...prev, newProd]);
    }
    setAddingProduct(false);
  };

  const goNextStep = () => {
    setAddingProduct(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (buildingVariation) {
      if (variationStepIndex < allSteps.length - 1) {
        setVariationStepIndex(variationStepIndex + 1);
      } else {
        setDayVariations((prev) => [...prev, { name: newDayName, products: variationProducts }]);
        setBuildingVariation(false);
        setVariationProducts([]);
        setVariationStepIndex(0);
        setNewDayName('');
        setAskingVariation(true);
      }
    } else {
      if (stepIndex < allSteps.length - 1) {
        setStepIndex(stepIndex + 1);
      } else {
        setDone(true);
        setAskingVariation(true);
      }
    }
  };

  const goPrevStep = () => {
    setAddingProduct(false);
    if (buildingVariation) {
      if (variationStepIndex > 0) setVariationStepIndex(variationStepIndex - 1);
      else { setBuildingVariation(false); setAskingVariation(true); }
    } else {
      if (stepIndex > 0) setStepIndex(stepIndex - 1);
      else onBack();
    }
  };

  const handleAddCustomStep = () => {
    if (!customStepName.trim()) return;
    const newStep: RoutineStepDef = {
      category: customStepName.toLowerCase().replace(/\s+/g, '_') as ProductCategory,
      labelKey: customStepName,
      descriptionKey: '',
      time: 'pm',
    };
    setCustomSteps((prev) => [...prev, newStep]);
    setAddingCustom(false);
    setCustomStepName('');
    if (buildingVariation) {
      setVariationStepIndex(allSteps.length);
    } else {
      setStepIndex(allSteps.length);
    }
  };

  const startNewDayVariation = () => {
    setAddingNewDay(true);
  };

  const confirmNewDay = () => {
    if (!newDayName.trim()) return;
    setBuildingVariation(true);
    setAddingNewDay(false);
    setAskingVariation(false);
    setVariationStepIndex(0);
    setVariationProducts([]);
  };

  // Ask about day variations
  if (askingVariation && !buildingVariation) {
    const pmCount = products.filter((p) => p.time === 'pm').length;
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-stone-800">{t('onboard.pm.done')}</h2>
          <p className="text-sm text-stone-500 mt-1">{pmCount} {t('common.evening').toLowerCase()}</p>
          {dayVariations.length > 0 && (
            <p className="text-xs text-emerald-500 mt-2">+ {dayVariations.length} day variation(s)</p>
          )}
        </div>

        {/* Another day variation */}
        <Card className="border-indigo-100">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm font-medium text-stone-700">{t('onboard.pm.anotherDay')}</p>
            <p className="text-xs text-stone-400 mt-1">{t('onboard.pm.anotherDayHint')}</p>

            {addingNewDay ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-stone-600">{t('onboard.pm.dayName')}</p>
                <input
                  type="text"
                  value={newDayName}
                  onChange={(e) => setNewDayName(e.target.value)}
                  placeholder={t('onboard.pm.dayNamePlaceholder')}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                />
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setAddingNewDay(false); setNewDayName(''); }}>{t('common.cancel')}</Button>
                  <Button size="sm" onClick={confirmNewDay} disabled={!newDayName.trim()} className="bg-indigo-500 hover:bg-indigo-600 text-white">{t('common.continue')}</Button>
                </div>
              </div>
            ) : (
              <button onClick={startNewDayVariation} className="mt-3 flex items-center gap-2 text-sm text-indigo-500 hover:text-indigo-600">
                <Plus className="w-4 h-4" /> {t('onboard.pm.addDay')}
              </button>
            )}
          </CardContent>
        </Card>

        <Button onClick={() => onNext(dayVariations)} className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl">
          {t('common.continue')} <ChevronRight className="w-4 h-4 ms-2 rtl:rotate-180" />
        </Button>
      </div>
    );
  }

  // Building steps (main evening or variation)
  const phaseTitle = buildingVariation ? newDayName : t('onboard.pm.title');
  const idx = buildingVariation ? variationStepIndex : stepIndex;

  return (
    <div className="space-y-5">
      {/* Phase header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            {phaseTitle}
          </span>
        </div>
        <div className="flex gap-0.5">
          {allSteps.map((_, i) => (
            <div key={i} className={`w-4 h-1.5 rounded-full ${
              i < idx ? 'bg-indigo-300' : i === idx ? 'bg-indigo-500' : 'bg-stone-200'
            }`} />
          ))}
        </div>
      </div>
      <p className="text-xs text-stone-400">{t('onboard.pm.subtitle')}</p>

      {/* Current step */}
      {currentStep && (
        <Card key={`pm-step-${idx}`} className="border-indigo-100 animate-slide-in">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-indigo-500 font-semibold mb-1">
              Step {idx + 1}/{allSteps.length}
            </p>
            <h3 className="text-lg font-semibold text-stone-800">{t(currentStep.labelKey)}</h3>
            <p className="text-sm text-stone-600 mt-1 mb-1">
              {t('onboard.step.doYouUse', { step: t(currentStep.labelKey).toLowerCase(), time: t('common.evening').toLowerCase() })}
            </p>
            {currentStep.descriptionKey && (
              <p className="text-xs text-stone-400 mb-4">{t(currentStep.descriptionKey)}</p>
            )}

            {/* Products already added */}
            {productsForCurrentStep.length > 0 && (
              <div className="space-y-2 mb-4">
                {productsForCurrentStep.map((p, i) => {
                  const setterFn = buildingVariation ? setVariationProducts : setProducts;
                  const sourceArr = buildingVariation ? variationProducts : products;
                  return (
                    <div key={i} className="flex items-center gap-2 py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-700 truncate">{p.product.name}</p>
                        <p className="text-xs text-stone-400">{p.product.brand}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setterFn((prev) => prev.filter((_, idx) => idx !== sourceArr.indexOf(p)))}
                        className="shrink-0 p-1 rounded-full text-stone-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                        aria-label={t('onboard.step.removeProduct')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                {!addingProduct && (
                  <button onClick={() => setAddingProduct(true)}
                    className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600 mt-1">
                    <Plus className="w-3 h-3" /> {t('onboard.step.addAnother')}
                  </button>
                )}
              </div>
            )}

            {/* Add product UI */}
            {(productsForCurrentStep.length === 0 || addingProduct) && (
              <InlineProductAdder category={currentStep.category} onAdd={addProductToStep} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Add custom step */}
      {!addingCustom ? (
        <button onClick={() => setAddingCustom(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-stone-200 hover:bg-stone-50 transition-colors">
          <Plus className="w-4 h-4 text-stone-400" />
          <span className="text-xs font-medium text-stone-500">{t('onboard.step.addCustomStep')}</span>
        </button>
      ) : (
        <Card className="border-stone-200">
          <CardContent className="pt-4 pb-3 space-y-3">
            <p className="text-sm font-medium text-stone-700">{t('onboard.step.customStepName')}</p>
            <input
              type="text"
              value={customStepName}
              onChange={(e) => setCustomStepName(e.target.value)}
              placeholder={t('onboard.step.customStepPlaceholder')}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
            />
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setAddingCustom(false); setCustomStepName(''); }}>{t('common.cancel')}</Button>
              <Button size="sm" onClick={handleAddCustomStep} disabled={!customStepName.trim()} className="bg-rose-500 hover:bg-rose-600 text-white">{t('common.save')}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="space-y-2">
        <div className="flex gap-3">
          <Button variant="ghost" onClick={goPrevStep} className="text-stone-400">
            <ChevronLeft className="w-4 h-4 me-1 rtl:rotate-180" /> {t('common.back')}
          </Button>
          <Button onClick={goNextStep} className={`flex-1 h-11 rounded-xl text-white ${
            productsForCurrentStep.length > 0
              ? 'bg-rose-500 hover:bg-rose-600'
              : 'bg-stone-300 hover:bg-stone-400'
          }`}>
            {productsForCurrentStep.length > 0 ? (
              <>{t('onboard.step.nextStep')} <ChevronRight className="w-4 h-4 ms-1 rtl:rotate-180" /></>
            ) : (
              <><SkipForward className="w-4 h-4 me-1" /> {t('onboard.step.dontUse')}</>
            )}
          </Button>
        </div>
        {productsForCurrentStep.length === 0 && (
          <button onClick={goNextStep} className="w-full text-center text-xs text-stone-400 hover:text-rose-500 transition-colors py-1">
            {t('onboard.step.addLater')}
          </button>
        )}
      </div>
    </div>
  );
}

// ============ Step 4: Other Products You Own ============
function StepOtherProducts({
  userId,
  onNext,
  onBack,
}: {
  userId: string;
  onNext: (count: number) => void;
  onBack: () => void;
}) {
  const { t } = useLocale();
  const [otherProducts, setOtherProducts] = useState<Array<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>>([]);
  const [mode, setMode] = useState<'menu' | 'single' | 'batch' | 'manual' | 'batchResults'>('menu');
  const [loading, setLoading] = useState(false);
  const [batchResults, setBatchResults] = useState<ExtractedProduct[]>([]);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const addOtherProduct = async (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    await storeAddProduct(userId, { ...data, isActive: false });
    setOtherProducts((prev) => [...prev, data]);
    setMode('menu');
  };

  const handleBatchFile = async (file: File) => {
    setLoading(true);
    setError('');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/extract-products-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: reader.result }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to extract');
        setBatchResults(Array.isArray(data) ? data : data.products || []);
        setMode('batchResults');
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to extract');
        setMode('menu');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveAllBatch = async () => {
    for (const p of batchResults) {
      const prodData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
        name: p.name,
        brand: p.brand || '',
        category: (p.category as ProductCategory) || 'serum',
        routineTime: 'both',
        isActive: false,
        status: 'have',
        description: p.description || '',
        frequency: '',
        notes: '',
      };
      await storeAddProduct(userId, prodData);
      setOtherProducts((prev) => [...prev, prodData]);
    }
    setBatchResults([]);
    setMode('menu');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
        <span className="text-sm text-stone-500">{t('common.analyzing')}</span>
      </div>
    );
  }

  if (mode === 'batchResults') {
    return (
      <div className="space-y-5">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-stone-800">{t('add.foundProducts', { n: batchResults.length })}</h2>
        </div>
        <div className="space-y-2">
          {batchResults.map((p, i) => (
            <div key={i} className="flex items-center gap-2 py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-700 truncate">{p.name}</p>
                <p className="text-xs text-stone-400">{p.brand}</p>
              </div>
            </div>
          ))}
        </div>
        <Button onClick={saveAllBatch} className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl">
          {t('add.saveAll', { n: batchResults.length })}
        </Button>
        <Button variant="ghost" onClick={() => { setBatchResults([]); setMode('menu'); }} className="w-full text-stone-400">
          {t('common.back')}
        </Button>
      </div>
    );
  }

  if (mode === 'single') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" className="text-xs text-stone-400 p-0 h-auto" onClick={() => setMode('menu')}>&larr; {t('common.back')}</Button>
        <InlineProductAdder category="serum" onAdd={addOtherProduct} />
      </div>
    );
  }

  if (mode === 'manual') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" className="text-xs text-stone-400 p-0 h-auto" onClick={() => setMode('menu')}>&larr; {t('common.back')}</Button>
        <ProductForm
          hideStatus
          initial={{ routineTime: 'both' }}
          onSave={addOtherProduct}
          onClose={() => setMode('menu')}
        />
      </div>
    );
  }

  // Menu mode
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center mx-auto mb-4">
          <Package className="w-7 h-7 text-stone-500" />
        </div>
        <h2 className="text-xl font-semibold text-stone-800">{t('onboard.other.title')}</h2>
        <p className="text-sm text-stone-500 mt-1">{t('onboard.other.subtitle')}</p>
        <p className="text-xs text-stone-400 mt-0.5">{t('onboard.other.hint')}</p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
          <p className="text-xs text-rose-600">{error}</p>
          <Button variant="ghost" size="sm" className="text-xs text-rose-500 mt-1 p-0 h-auto" onClick={() => setError('')}>{t('common.tryAgain')}</Button>
        </div>
      )}

      {/* Products added so far */}
      {otherProducts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-stone-500">{t('onboard.other.added', { n: otherProducts.length })}</p>
          {otherProducts.map((p, i) => (
            <div key={i} className="flex items-center gap-2 py-2 px-3 bg-stone-50 border border-stone-200 rounded-lg">
              <Package className="w-4 h-4 text-stone-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-700 truncate">{p.name}</p>
                <p className="text-xs text-stone-400">{p.brand}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBatchFile(f); }} />

      {/* Three options */}
      <div className="space-y-3">
        <button onClick={() => setMode('single')}
          className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-stone-100 hover:bg-stone-50 transition-colors text-start">
          <Camera className="w-5 h-5 text-rose-400" />
          <div>
            <p className="text-sm font-medium text-stone-700">{t('onboard.other.scanOne')}</p>
          </div>
        </button>

        <button onClick={() => fileRef.current?.click()}
          className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-stone-100 hover:bg-stone-50 transition-colors text-start">
          <ImageIcon className="w-5 h-5 text-indigo-400" />
          <div>
            <p className="text-sm font-medium text-stone-700">{t('onboard.other.scanMultiple')}</p>
            <p className="text-xs text-stone-400">{t('onboard.other.scanMultipleHint')}</p>
          </div>
        </button>

        <button onClick={() => setMode('manual')}
          className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-stone-100 hover:bg-stone-50 transition-colors text-start">
          <Plus className="w-5 h-5 text-stone-400" />
          <div>
            <p className="text-sm font-medium text-stone-700">{t('onboard.other.addManual')}</p>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack} className="text-stone-400">
          <ChevronLeft className="w-4 h-4 me-1 rtl:rotate-180" /> {t('common.back')}
        </Button>
        <Button onClick={() => onNext(otherProducts.length)} className="flex-1 h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl">
          {t('common.continue')} <ChevronRight className="w-4 h-4 ms-2 rtl:rotate-180" />
        </Button>
      </div>
    </div>
  );
}

// ============ Step 5: Face Photos ============
function StepFacePhotos({
  userId,
  onNext,
  onBack,
}: {
  userId: string;
  onNext: () => void;
  onBack: () => void;
}) {
  const { t } = useLocale();
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (photos.length >= 5) return;
    setUploading(true);
    setPhotoError('');
    try {
      const { storagePath, publicUrl } = await uploadFacePhoto(userId, file);
      await saveFacePhotoRecord(userId, storagePath, publicUrl);
      setPhotos((prev) => [...prev, { id: storagePath, url: URL.createObjectURL(file) }]);
    } catch (e: unknown) {
      console.error('[onboard photos] upload failed', e);
      const msg = e instanceof Error ? e.message : 'Upload failed';
      setPhotoError(msg);
    } finally { setUploading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-100 to-blue-100 flex items-center justify-center mx-auto mb-4">
          <UserCircle className="w-7 h-7 text-sky-500" />
        </div>
        <h2 className="text-xl font-semibold text-stone-800">{t('onboard.photos.title')}</h2>
        <p className="text-sm text-stone-500 mt-1">{t('onboard.photos.subtitle')}</p>
        <p className="text-xs text-stone-400 mt-1">{t('onboard.photos.hint')}</p>
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

      {photoError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
          <p className="text-xs text-rose-600">{photoError}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {photos.map((p, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
            <img src={p.url} alt="" className="w-full h-full object-cover" />
            <button onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
              className="absolute top-1 end-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center">
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}
        {photos.length < 5 && (
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="aspect-square rounded-xl border-2 border-dashed border-rose-200 flex flex-col items-center justify-center gap-1 hover:bg-rose-50 transition-colors">
            {uploading ? <Loader2 className="w-6 h-6 text-rose-300 animate-spin" /> : (
              <><Camera className="w-6 h-6 text-rose-300" /><span className="text-[10px] text-stone-400">{photos.length === 0 ? t('onboard.photos.add') : t('onboard.photos.addMore')}</span></>
            )}
          </button>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack} className="text-stone-400"><ChevronLeft className="w-4 h-4 me-1 rtl:rotate-180" /> {t('common.back')}</Button>
        <Button onClick={onNext} className="flex-1 h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl">
          {photos.length > 0 ? t('common.continue') : t('onboard.photos.skipForNow')} <ChevronRight className="w-4 h-4 ms-2 rtl:rotate-180" />
        </Button>
      </div>
    </div>
  );
}

// ============ Step 6: Done ============
function StepDone({ productCount, onFinish }: { productCount: number; onFinish: () => void }) {
  const { t } = useLocale();
  return (
    <div className="space-y-8 text-center pt-8">
      <div>
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-semibold text-stone-800">{t('onboard.done.title')}</h2>
        <p className="text-sm text-stone-500 mt-2">
          {productCount > 0
            ? t('onboard.done.withProducts', { n: productCount })
            : t('onboard.done.noProducts')}
        </p>
      </div>
      <Button onClick={onFinish} className="w-full h-14 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-base font-semibold">
        <Sparkles className="w-5 h-5 me-2" /> {t('onboard.done.start')}
      </Button>
    </div>
  );
}

// ============ Main Wizard ============
export default function OnboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [products, setProducts] = useState<RoutineProduct[]>([]);
  const [hasEvening, setHasEvening] = useState(false);
  const [eveningVariations, setEveningVariations] = useState<EveningDayVariation[]>([]);

  const goToStep = useCallback((s: number) => {
    setStep(s);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Step 0 -> 1: Disclaimer done
  const handleDisclaimerDone = useCallback(async () => {
    if (!user) return;
    await saveDisclaimerAgreement(user.id);
    goToStep(1);
  }, [user, goToStep]);

  // Step 1 -> 2: Goals done
  const handleGoalsDone = useCallback(() => {
    goToStep(2);
  }, [goToStep]);

  // Step 2 -> 3 or 4: Morning done
  const handleMorningDone = useCallback((continueEvening: boolean) => {
    if (continueEvening) {
      setHasEvening(true);
      goToStep(3);
    } else {
      goToStep(4); // Skip to other products
    }
  }, []);

  // Step 3 -> 4: Evening done
  const handleEveningDone = useCallback((dayVariations: EveningDayVariation[]) => {
    setEveningVariations(dayVariations);
    goToStep(4);
  }, [goToStep]);

  // Step 4 -> 5: Other products done, build routine days
  const handleOtherProductsDone = useCallback(async (otherCount: number) => {
    if (!user) return;
    const totalCount = products.length + otherCount;
    setProductCount(totalCount);

    // Build routine days from collected products
    const { fetchProducts } = await import('@/lib/store');
    const savedProducts = await fetchProducts(user.id);

    // Group active routine products by their step category, separately for AM and PM.
    const amSteps = buildStepsForTime(savedProducts, products, 'am');
    const pmSteps = buildStepsForTime(savedProducts, products, 'pm');

    const days: RoutineDay[] = [];

    // Day 1: default daily routine
    if (amSteps.length > 0 || pmSteps.length > 0) {
      days.push({
        id: `rd_${Date.now()}`,
        dayNumber: 1,
        name: 'Daily Routine',
        amSteps,
        pmSteps,
        amProducts: amSteps.flatMap((s) => s.productIds),
        pmProducts: pmSteps.flatMap((s) => s.productIds),
      });
    }

    // Additional day variations from evening builder — same morning, custom evening.
    eveningVariations.forEach((variation, idx) => {
      const variationPmSteps = buildStepsForTime(savedProducts, variation.products, 'pm');
      days.push({
        id: `rd_${Date.now()}_v${idx}`,
        dayNumber: idx + 2,
        name: variation.name,
        amSteps,
        pmSteps: variationPmSteps,
        amProducts: amSteps.flatMap((s) => s.productIds),
        pmProducts: variationPmSteps.flatMap((s) => s.productIds),
      });
    });

    if (days.length > 0) {
      await updateRoutineDays(user.id, days, days.length);
    }

    goToStep(5);
  }, [user, products, eveningVariations, goToStep]);

  // Step 5 -> 6: Photos done
  const handlePhotosDone = useCallback(() => goToStep(6), [goToStep]);

  // Step 6: Finish
  const handleFinish = useCallback(async () => {
    if (!user) return;
    try {
      await completeOnboarding(user.id);
    } catch (e) {
      console.error('[onboard] completeOnboarding failed', e);
      return;
    }
    // Refresh the Supabase session so the proxy middleware sees fresh cookies
    // when we navigate to '/'.
    try {
      const { createClient } = await import('@/lib/supabase/client');
      await createClient().auth.refreshSession();
    } catch (e) {
      console.warn('[onboard] refreshSession failed', e);
    }
    router.replace('/');
  }, [user, router]);

  if (!user) return null;

  const { t: tOnboard, locale, setLocale } = useLocale();

  // Total steps: 0=Disclaimer, 1=Goals, 2=Morning, 3=Evening(optional), 4=OtherProducts, 5=Photos, 6=Done
  const totalDots = 7;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-rose-50/50 to-white overflow-x-hidden">
      {/* Language toggle */}
      <div className="fixed top-4 end-4 z-50 flex gap-1 bg-white rounded-full p-1 shadow-sm border border-rose-100">
        {(['en', 'he'] as Locale[]).map((l) => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              locale === l ? 'bg-rose-500 text-white' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {tOnboard(`lang.${l}`)}
          </button>
        ))}
      </div>

      <div className="max-w-lg mx-auto px-5 pt-12 pb-8">
        <ProgressDots current={step} total={totalDots} />

        <div key={`wizard-step-${step}`} className="animate-slide-in">
          {step === 0 && <StepDisclaimer onNext={handleDisclaimerDone} />}
          {step === 1 && <StepGoalsConcerns userId={user.id} onNext={handleGoalsDone} onBack={() => goToStep(0)} />}
          {step === 2 && <StepMorningRoutine userId={user.id} onNext={handleMorningDone} onBack={() => goToStep(1)} products={products} setProducts={setProducts} />}
          {step === 3 && <StepEveningRoutine userId={user.id} onNext={handleEveningDone} onBack={() => goToStep(2)} products={products} setProducts={setProducts} />}
          {step === 4 && <StepOtherProducts userId={user.id} onNext={handleOtherProductsDone} onBack={() => goToStep(hasEvening ? 3 : 2)} />}
          {step === 5 && <StepFacePhotos userId={user.id} onNext={handlePhotosDone} onBack={() => goToStep(4)} />}
          {step === 6 && <StepDone productCount={productCount} onFinish={handleFinish} />}
        </div>
      </div>
    </div>
  );
}
