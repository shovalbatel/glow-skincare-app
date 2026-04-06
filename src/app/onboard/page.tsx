'use client';

import { useState, useRef, useCallback } from 'react';
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
  completeOnboarding,
  uploadFacePhoto,
  saveFacePhotoRecord,
} from '@/lib/store';
import { Product, ProductCategory, RoutineDay } from '@/lib/types';
import {
  Sparkles, Sun, Moon, Camera, Loader2, X,
  ChevronRight, ChevronLeft, UserCircle, ImageIcon, Package,
  Shield, CheckCircle2, Plus, SkipForward,
} from 'lucide-react';
import { useLocale } from '@/components/locale-provider';

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
            <ul className="list-disc pl-4 space-y-1">
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
        {t('onboard.disclaimer.agree')} <ChevronRight className="w-4 h-4 ml-2" />
      </Button>
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
  const [mode, setMode] = useState<'choose' | 'photo' | 'manual' | 'review'>('choose');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [extracted, setExtracted] = useState<ExtractedProduct | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
        <Button variant="ghost" className="text-xs text-stone-400 p-0 h-auto" onClick={() => setMode('choose')}>&larr; {t('common.back')}</Button>
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
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
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
        <Button variant="ghost" className="w-full text-xs text-stone-400" onClick={() => setMode('choose')}>{t('common.back')}</Button>
      </div>
    );
  }

  // choose mode
  return (
    <div className="flex gap-2">
      <button onClick={() => setMode('photo')}
        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors">
        <Camera className="w-4 h-4 text-rose-400" />
        <span className="text-xs font-medium text-stone-600">{t('add.scanPhoto')}</span>
      </button>
      <button onClick={() => setMode('manual')}
        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors">
        <Plus className="w-4 h-4 text-stone-400" />
        <span className="text-xs font-medium text-stone-600">{t('add.manual')}</span>
      </button>
    </div>
  );
}

// ============ Step 1: Routine Builder ============
interface RoutineProduct {
  product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
  stepCategory: ProductCategory;
  time: 'am' | 'pm';
}

function StepRoutineBuilder({
  userId,
  onNext,
  onSkip,
  onBack,
}: {
  userId: string;
  onNext: (products: RoutineProduct[], hasAm: boolean, hasPm: boolean) => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const { t } = useLocale();
  const [phase, setPhase] = useState<'ask' | 'am' | 'pm' | 'specials' | 'extras' | 'summary'>('ask');
  const [hasAm, setHasAm] = useState(false);
  const [hasPm, setHasPm] = useState(false);
  const [amStepIndex, setAmStepIndex] = useState(0);
  const [pmStepIndex, setPmStepIndex] = useState(0);
  const [products, setProducts] = useState<RoutineProduct[]>([]);
  const [addingProduct, setAddingProduct] = useState(false);
  const [specialProducts, setSpecialProducts] = useState<Array<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>>([]);
  const [extraProducts, setExtraProducts] = useState<Array<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>>([]);
  const [addingSpecial, setAddingSpecial] = useState(false);
  const [addingExtra, setAddingExtra] = useState(false);

  const currentSteps = phase === 'am' ? AM_STEPS : PM_STEPS;
  const currentIndex = phase === 'am' ? amStepIndex : pmStepIndex;
  const currentStep = currentSteps[currentIndex];

  const productsForCurrentStep = currentStep
    ? products.filter((p) => p.stepCategory === currentStep.category && p.time === currentStep.time)
    : [];

  const addProductToStep = async (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentStep) return;
    await storeAddProduct(userId, { ...data, routineTime: currentStep.time, category: currentStep.category });
    setProducts((prev) => [...prev, { product: data, stepCategory: currentStep.category, time: currentStep.time }]);
    setAddingProduct(false);
  };

  const addSpecialProduct = async (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    await storeAddProduct(userId, { ...data, isActive: true });
    setSpecialProducts((prev) => [...prev, data]);
    setAddingSpecial(false);
  };

  const addExtraProduct = async (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    await storeAddProduct(userId, { ...data, isActive: false });
    setExtraProducts((prev) => [...prev, data]);
    setAddingExtra(false);
  };

  const goNextStep = () => {
    if (phase === 'am') {
      if (amStepIndex < AM_STEPS.length - 1) {
        setAmStepIndex(amStepIndex + 1);
        setAddingProduct(false);
      } else if (hasPm) {
        setPhase('pm');
        setAddingProduct(false);
      } else {
        setPhase('specials');
      }
    } else if (phase === 'pm') {
      if (pmStepIndex < PM_STEPS.length - 1) {
        setPmStepIndex(pmStepIndex + 1);
        setAddingProduct(false);
      } else {
        setPhase('specials');
      }
    }
  };

  const goPrevStep = () => {
    if (phase === 'am') {
      if (amStepIndex > 0) { setAmStepIndex(amStepIndex - 1); setAddingProduct(false); }
      else setPhase('ask');
    } else if (phase === 'pm') {
      if (pmStepIndex > 0) { setPmStepIndex(pmStepIndex - 1); setAddingProduct(false); }
      else if (hasAm) { setPhase('am'); setAmStepIndex(AM_STEPS.length - 1); setAddingProduct(false); }
      else setPhase('ask');
    }
  };

  const startRoutine = () => {
    if (hasAm) setPhase('am');
    else if (hasPm) setPhase('pm');
  };

  // Ask phase
  if (phase === 'ask') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-rose-500" />
          </div>
          <h2 className="text-xl font-semibold text-stone-800">{t('onboard.routine.title')}</h2>
          <p className="text-sm text-stone-500 mt-1">{t('onboard.routine.subtitle')}</p>
        </div>

        <div className="space-y-3">
          <Card className={`border-2 cursor-pointer transition-colors ${hasAm ? 'border-amber-300 bg-amber-50/50' : 'border-stone-100'}`} onClick={() => setHasAm(!hasAm)}>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasAm ? 'bg-amber-200' : 'bg-stone-100'}`}>
                <Sun className={`w-5 h-5 ${hasAm ? 'text-amber-600' : 'text-stone-400'}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-stone-700">{t('common.morning')}</p>
                <p className="text-xs text-stone-400">{t('onboard.routine.morningSteps').replace('{n}', String(AM_STEPS.length))}</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${hasAm ? 'border-amber-400 bg-amber-400' : 'border-stone-200'}`}>
                {hasAm && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
            </CardContent>
          </Card>

          <Card className={`border-2 cursor-pointer transition-colors ${hasPm ? 'border-indigo-300 bg-indigo-50/50' : 'border-stone-100'}`} onClick={() => setHasPm(!hasPm)}>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasPm ? 'bg-indigo-200' : 'bg-stone-100'}`}>
                <Moon className={`w-5 h-5 ${hasPm ? 'text-indigo-600' : 'text-stone-400'}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-stone-700">{t('common.evening')}</p>
                <p className="text-xs text-stone-400">{t('onboard.routine.eveningSteps').replace('{n}', String(PM_STEPS.length))}</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${hasPm ? 'border-indigo-400 bg-indigo-400' : 'border-stone-200'}`}>
                {hasPm && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
            </CardContent>
          </Card>
        </div>

        <Button onClick={startRoutine} disabled={!hasAm && !hasPm} className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl">
          {t('onboard.routine.start')} <ChevronRight className="w-4 h-4 ml-2" />
        </Button>

        <button onClick={onSkip} className="w-full text-center text-xs text-stone-400 hover:text-rose-500 transition-colors py-2">
          {t('onboard.routine.noRoutine')}
        </button>

        <Button variant="ghost" onClick={onBack} className="w-full text-stone-400">
          <ChevronLeft className="w-4 h-4 mr-1" /> {t('common.back')}
        </Button>
      </div>
    );
  }

  // Specials phase — weekly/biweekly treatments (peels, masks, etc.)
  if (phase === 'specials') {
    return (
      <div className="space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-violet-500" />
          </div>
          <h2 className="text-xl font-semibold text-stone-800">{t('onboard.specials.title')}</h2>
          <p className="text-sm text-stone-500 mt-1">{t('onboard.specials.subtitle')}</p>
          <p className="text-xs text-stone-400 mt-0.5">{t('onboard.specials.hint')}</p>
        </div>

        {specialProducts.length > 0 && (
          <div className="space-y-2">
            {specialProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-2 py-2 px-3 bg-violet-50 border border-violet-200 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-violet-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-700 truncate">{p.name}</p>
                  <p className="text-xs text-stone-400">{p.brand} &middot; {p.frequency}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {addingSpecial ? (
          <Card className="border-violet-100">
            <CardContent className="pt-4 pb-3">
              <InlineProductAdder category="exfoliant_strong" onAdd={addSpecialProduct} />
            </CardContent>
          </Card>
        ) : (
          <button onClick={() => setAddingSpecial(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-violet-200 hover:bg-violet-50 transition-colors">
            <Plus className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium text-violet-600">{t('onboard.specials.add')}</span>
          </button>
        )}

        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => {
            if (hasPm) { setPhase('pm'); setPmStepIndex(PM_STEPS.length - 1); }
            else if (hasAm) { setPhase('am'); setAmStepIndex(AM_STEPS.length - 1); }
            else setPhase('ask');
          }} className="text-stone-400">
            <ChevronLeft className="w-4 h-4 mr-1" /> {t('common.back')}
          </Button>
          <Button onClick={() => setPhase('extras')} className="flex-1 h-11 bg-rose-500 hover:bg-rose-600 text-white rounded-xl">
            {specialProducts.length > 0 ? t('common.continue') : t('common.skip')} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // Extras phase — products you own but don't use daily
  if (phase === 'extras') {
    return (
      <div className="space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-stone-500" />
          </div>
          <h2 className="text-xl font-semibold text-stone-800">{t('onboard.extras.title')}</h2>
          <p className="text-sm text-stone-500 mt-1">{t('onboard.extras.subtitle')}</p>
          <p className="text-xs text-stone-400 mt-0.5">{t('onboard.extras.hint')}</p>
        </div>

        {extraProducts.length > 0 && (
          <div className="space-y-2">
            {extraProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-2 py-2 px-3 bg-stone-50 border border-stone-200 rounded-lg">
                <Package className="w-4 h-4 text-stone-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-700 truncate">{p.name}</p>
                  <p className="text-xs text-stone-400">{p.brand}</p>
                </div>
                <Badge className="text-[9px] bg-stone-100 text-stone-500">{t('common.paused')}</Badge>
              </div>
            ))}
          </div>
        )}

        {addingExtra ? (
          <Card className="border-stone-200">
            <CardContent className="pt-4 pb-3">
              <InlineProductAdder category="serum" onAdd={addExtraProduct} />
            </CardContent>
          </Card>
        ) : (
          <button onClick={() => setAddingExtra(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-stone-200 hover:bg-stone-50 transition-colors">
            <Plus className="w-4 h-4 text-stone-400" />
            <span className="text-sm font-medium text-stone-500">{t('onboard.extras.add')}</span>
          </button>
        )}

        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setPhase('specials')} className="text-stone-400">
            <ChevronLeft className="w-4 h-4 mr-1" /> {t('common.back')}
          </Button>
          <Button onClick={() => setPhase('summary')} className="flex-1 h-11 bg-rose-500 hover:bg-rose-600 text-white rounded-xl">
            {extraProducts.length > 0 ? t('common.continue') : t('common.skip')} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // Summary phase
  if (phase === 'summary') {
    const amProds = products.filter((p) => p.time === 'am');
    const pmProds = products.filter((p) => p.time === 'pm');
    const totalCount = products.length + specialProducts.length + extraProducts.length;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-stone-800">{t('onboard.summary.title')}</h2>
          <p className="text-sm text-stone-500 mt-1">{t('onboard.summary.products').replace('{n}', String(totalCount))}</p>
        </div>

        {amProds.length > 0 && (
          <Card className="border-amber-100">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-2"><Sun className="w-4 h-4 text-amber-500" /><span className="text-sm font-semibold text-stone-700">{t('common.morning')}</span></div>
              {amProds.map((p, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                  <span className="text-xs text-stone-600">{p.product.name}</span>
                  <Badge className="text-[9px] bg-stone-100 text-stone-500 ml-auto">{t('cat.' + p.stepCategory)}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {pmProds.length > 0 && (
          <Card className="border-indigo-100">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-2"><Moon className="w-4 h-4 text-indigo-400" /><span className="text-sm font-semibold text-stone-700">{t('common.evening')}</span></div>
              {pmProds.map((p, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-300" />
                  <span className="text-xs text-stone-600">{p.product.name}</span>
                  <Badge className="text-[9px] bg-stone-100 text-stone-500 ml-auto">{t('cat.' + p.stepCategory)}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {specialProducts.length > 0 && (
          <Card className="border-violet-100">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-violet-500" /><span className="text-sm font-semibold text-stone-700">{t('onboard.summary.specials')}</span></div>
              {specialProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-300" />
                  <span className="text-xs text-stone-600">{p.name}</span>
                  <span className="text-[9px] text-stone-400 ml-auto">{p.frequency}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {extraProducts.length > 0 && (
          <Card className="border-stone-100">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-2"><Package className="w-4 h-4 text-stone-400" /><span className="text-sm font-semibold text-stone-700">{t('onboard.summary.extras')}</span></div>
              {extraProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                  <span className="text-xs text-stone-600">{p.name}</span>
                  <Badge className="text-[9px] bg-stone-100 text-stone-500 ml-auto">{t('common.paused')}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Button onClick={() => onNext(products, hasAm, hasPm)} className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl">
          {t('common.continue')} <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  // Step-by-step building phase (AM or PM)
  const isAm = phase === 'am';
  const totalInPhase = currentSteps.length;
  const Icon = isAm ? Sun : Moon;
  const accentColor = isAm ? 'amber' : 'indigo';

  return (
    <div className="space-y-5">
      {/* Phase header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 text-${accentColor}-500`} />
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            {isAm ? t('common.morning') : t('common.evening')} &middot; {t('onboard.routine.step').replace('{n}', String(currentIndex + 1)).replace('{total}', String(totalInPhase))}
          </span>
        </div>
        <div className="flex gap-0.5">
          {currentSteps.map((_, i) => (
            <div key={i} className={`w-4 h-1.5 rounded-full ${
              i < currentIndex ? `bg-${accentColor}-300` : i === currentIndex ? `bg-${accentColor}-500` : 'bg-stone-200'
            }`} />
          ))}
        </div>
      </div>

      {/* Current step */}
      {currentStep && (
        <Card className={`border-${accentColor}-100`}>
          <CardContent className="pt-5 pb-4">
            <h3 className="text-lg font-semibold text-stone-800">{t(currentStep.labelKey)}</h3>
            <p className="text-xs text-stone-500 mt-0.5 mb-4">{t(currentStep.descriptionKey)}</p>

            {/* Products already added for this step */}
            {productsForCurrentStep.length > 0 && (
              <div className="space-y-2 mb-4">
                {productsForCurrentStep.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-700 truncate">{p.product.name}</p>
                      <p className="text-xs text-stone-400">{p.product.brand}</p>
                    </div>
                  </div>
                ))}
                {!addingProduct && (
                  <button onClick={() => setAddingProduct(true)}
                    className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600 mt-1">
                    <Plus className="w-3 h-3" /> {t('onboard.routine.addAlt')}
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

      {/* Navigation */}
      <div className="flex gap-3">
        <Button variant="ghost" onClick={goPrevStep} className="text-stone-400">
          <ChevronLeft className="w-4 h-4 mr-1" /> {t('common.back')}
        </Button>
        <Button onClick={goNextStep} className={`flex-1 h-11 rounded-xl text-white ${
          productsForCurrentStep.length > 0
            ? 'bg-rose-500 hover:bg-rose-600'
            : 'bg-stone-300 hover:bg-stone-400'
        }`}>
          {productsForCurrentStep.length > 0 ? (
            <>{t('onboard.routine.nextStep')} <ChevronRight className="w-4 h-4 ml-1" /></>
          ) : (
            <><SkipForward className="w-4 h-4 mr-1" /> {t('onboard.routine.dontUse')}</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============ Step 2: Face Photos ============
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
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (photos.length >= 5) return;
    setUploading(true);
    try {
      const { storagePath, publicUrl } = await uploadFacePhoto(userId, file);
      await saveFacePhotoRecord(userId, storagePath, publicUrl);
      setPhotos((prev) => [...prev, { id: storagePath, url: URL.createObjectURL(file) }]);
    } catch { /* silently fail for MVP */ }
    finally { setUploading(false); }
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

      <div className="grid grid-cols-3 gap-3">
        {photos.map((p, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
            <img src={p.url} alt="" className="w-full h-full object-cover" />
            <button onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center">
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
        <Button variant="ghost" onClick={onBack} className="text-stone-400"><ChevronLeft className="w-4 h-4 mr-1" /> {t('common.back')}</Button>
        <Button onClick={onNext} className="flex-1 h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl">
          {photos.length > 0 ? t('common.continue') : t('onboard.photos.skipForNow')} <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ============ Step 3: Done ============
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
            ? t('onboard.done.withProducts').replace('{n}', String(productCount))
            : t('onboard.done.noProducts')}
        </p>
      </div>
      <Button onClick={onFinish} className="w-full h-14 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-base font-semibold">
        <Sparkles className="w-5 h-5 mr-2" /> {t('onboard.done.start')}
      </Button>
    </div>
  );
}

// ============ Main Wizard ============
interface RoutineProduct {
  product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
  stepCategory: ProductCategory;
  time: 'am' | 'pm';
}

export default function OnboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [productCount, setProductCount] = useState(0);

  const handleDisclaimerDone = useCallback(async () => {
    if (!user) return;
    await saveDisclaimerAgreement(user.id);
    setStep(1);
  }, [user]);

  const handleRoutineDone = useCallback(async (
    products: RoutineProduct[],
    hasAm: boolean,
    hasPm: boolean,
  ) => {
    if (!user) return;
    setProductCount(products.length);

    // Build a single routine day with AM/PM product IDs
    // Products were already saved to DB in the builder, fetch their IDs
    const { fetchProducts } = await import('@/lib/store');
    const savedProducts = await fetchProducts(user.id);

    const amIds = savedProducts.filter((p) => p.routineTime === 'am' || p.routineTime === 'both').map((p) => p.id);
    const pmIds = savedProducts.filter((p) => p.routineTime === 'pm' || p.routineTime === 'both').map((p) => p.id);

    if (hasAm || hasPm) {
      const day: RoutineDay = {
        id: `rd_${Date.now()}`,
        dayNumber: 1,
        name: 'Daily Routine',
        amProducts: hasAm ? amIds : [],
        pmProducts: hasPm ? pmIds : [],
      };
      await updateRoutineDays(user.id, [day], 1);
    }

    setStep(2);
  }, [user]);

  const handleRoutineSkip = useCallback(() => {
    setStep(2);
  }, []);

  const handlePhotosDone = useCallback(() => setStep(3), []);

  const handleFinish = useCallback(async () => {
    if (!user) return;
    await completeOnboarding(user.id);
    router.push('/');
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 to-white">
      <div className="max-w-lg mx-auto px-5 pt-12 pb-8">
        <ProgressDots current={step} total={4} />

        {step === 0 && <StepDisclaimer onNext={handleDisclaimerDone} />}
        {step === 1 && <StepRoutineBuilder userId={user.id} onNext={handleRoutineDone} onSkip={handleRoutineSkip} onBack={() => setStep(0)} />}
        {step === 2 && <StepFacePhotos userId={user.id} onNext={handlePhotosDone} onBack={() => setStep(1)} />}
        {step === 3 && <StepDone productCount={productCount} onFinish={handleFinish} />}
      </div>
    </div>
  );
}
