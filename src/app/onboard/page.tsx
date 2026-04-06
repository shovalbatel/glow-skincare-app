'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  fetchProducts,
} from '@/lib/store';
import { Product, RoutineDay, CATEGORY_LABELS } from '@/lib/types';
import {
  Sparkles, Sun, Moon, Camera, ImageIcon, Loader2, X,
  ChevronRight, ChevronLeft, Package, Layers, UserCircle,
  Shield, CheckCircle2,
} from 'lucide-react';

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
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="text-xl font-semibold text-stone-800">Before we begin</h2>
        <p className="text-sm text-stone-500 mt-1">Please read and accept</p>
      </div>

      <Card className="border-amber-100">
        <CardContent className="pt-4 pb-4">
          <div className="text-xs text-stone-600 space-y-3 leading-relaxed max-h-48 overflow-y-auto">
            <p>
              <strong>AI-Powered Recommendations Disclaimer</strong>
            </p>
            <p>
              Glow uses artificial intelligence to provide skincare product suggestions and skin analysis.
              These recommendations are for <strong>informational purposes only</strong> and should not be
              considered medical advice.
            </p>
            <p>
              You acknowledge and agree that:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>AI recommendations may not be accurate or suitable for your specific skin condition</li>
              <li>You should always consult with a qualified dermatologist or healthcare professional before starting any new skincare regimen</li>
              <li>You are solely responsible for verifying any product recommendations with a medical professional</li>
              <li>Glow and its creators are not liable for any adverse reactions, skin damage, or health issues resulting from following AI-generated recommendations</li>
              <li>Individual results may vary and past performance of products does not guarantee future results</li>
            </ul>
            <p>
              By proceeding, you confirm that you understand these limitations and accept full
              responsibility for your skincare decisions.
            </p>
          </div>
        </CardContent>
      </Card>

      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox
          checked={agreed}
          onCheckedChange={(c) => setAgreed(c === true)}
          className="mt-0.5 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
        />
        <span className="text-sm text-stone-600 leading-snug">
          I understand that all AI recommendations are informational only and I will consult a professional before making skincare decisions
        </span>
      </label>

      <Button
        onClick={onNext}
        disabled={!agreed}
        className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl"
      >
        I Agree &amp; Continue
        <ChevronRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

// ============ Step 1: Routine Setup ============
function StepRoutineSetup({
  onNext,
  onBack,
}: {
  onNext: (data: { hasMorning: boolean; hasEvening: boolean; cycleLength: number; dayNames: string[] }) => void;
  onBack: () => void;
}) {
  const [hasMorning, setHasMorning] = useState(true);
  const [hasEvening, setHasEvening] = useState(true);
  const [cycleLength, setCycleLength] = useState(1);
  const [dayNames, setDayNames] = useState<string[]>(['Day 1']);

  const updateCycleLength = (n: number) => {
    setCycleLength(n);
    setDayNames(Array.from({ length: n }, (_, i) => dayNames[i] || `Day ${i + 1}`));
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center mx-auto mb-4">
          <Layers className="w-7 h-7 text-rose-500" />
        </div>
        <h2 className="text-xl font-semibold text-stone-800">Set up your routine</h2>
        <p className="text-sm text-stone-500 mt-1">Tell us about your skincare schedule</p>
      </div>

      <div className="space-y-4">
        <Card className="border-rose-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-stone-700">Morning routine?</span>
              </div>
              <div className="flex gap-2">
                {[true, false].map((v) => (
                  <button
                    key={String(v)}
                    onClick={() => setHasMorning(v)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      hasMorning === v ? 'bg-rose-500 text-white' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {v ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-medium text-stone-700">Evening routine?</span>
              </div>
              <div className="flex gap-2">
                {[true, false].map((v) => (
                  <button
                    key={String(v)}
                    onClick={() => setHasEvening(v)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      hasEvening === v ? 'bg-rose-500 text-white' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {v ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-100">
          <CardContent className="pt-4 pb-4">
            <Label className="text-sm font-medium text-stone-700 mb-3 block">
              How many days in your routine cycle?
            </Label>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  onClick={() => updateCycleLength(n)}
                  className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                    cycleLength === n ? 'bg-rose-500 text-white' : 'bg-stone-100 text-stone-500 hover:bg-rose-50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-stone-400 mt-2">
              {cycleLength === 1 ? 'Same routine every day' : `${cycleLength}-day rotating cycle`}
            </p>
          </CardContent>
        </Card>

        {cycleLength > 1 && (
          <Card className="border-rose-100">
            <CardContent className="pt-4 pb-4">
              <Label className="text-sm font-medium text-stone-700 mb-3 block">Name each day</Label>
              <div className="space-y-2">
                {dayNames.map((name, i) => (
                  <Input
                    key={i}
                    value={name}
                    onChange={(e) => {
                      const next = [...dayNames];
                      next[i] = e.target.value;
                      setDayNames(next);
                    }}
                    placeholder={`Day ${i + 1}`}
                    className="text-sm"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack} className="text-stone-400">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button
          onClick={() => onNext({ hasMorning, hasEvening, cycleLength, dayNames })}
          disabled={!hasMorning && !hasEvening}
          className="flex-1 h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl"
        >
          Continue <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ============ Step 2: Add Products ============
function StepAddProducts({
  userId,
  onNext,
  onBack,
}: {
  userId: string;
  onNext: () => void;
  onBack: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'menu' | 'single' | 'batch' | 'manual' | 'review' | 'batchReview'>('menu');
  const [extracted, setExtracted] = useState<ExtractedProduct | null>(null);
  const [batchExtracted, setBatchExtracted] = useState<ExtractedProduct[]>([]);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts(userId).then(setProducts);
  }, [userId]);

  const refreshProducts = async () => {
    const p = await fetchProducts(userId);
    setProducts(p);
  };

  const handleSingleFile = async (file: File) => {
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
        setMode('single');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBatchFile = async (file: File) => {
    setLoading(true);
    setError('');
    setPreviewSrc(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/extract-products-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: reader.result }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setBatchExtracted(Array.isArray(data) ? data : [data]);
        setMode('batchReview');
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to extract');
        setMode('batch');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveProduct = async (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    await storeAddProduct(userId, data);
    await refreshProducts();
    setMode('menu');
    setExtracted(null);
    setPreviewSrc(null);
  };

  const saveBatchProducts = async () => {
    for (const p of batchExtracted) {
      await storeAddProduct(userId, {
        name: p.name, brand: p.brand, category: p.category, description: p.description,
        routineTime: p.routineTime, frequency: p.frequency, status: 'have', isActive: true, notes: p.notes,
      });
    }
    await refreshProducts();
    setMode('menu');
    setBatchExtracted([]);
    setPreviewSrc(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center mx-auto mb-4">
          <Package className="w-7 h-7 text-emerald-600" />
        </div>
        <h2 className="text-xl font-semibold text-stone-800">Add your products</h2>
        <p className="text-sm text-stone-500 mt-1">
          {products.length === 0 ? 'Start building your collection' : `${products.length} product${products.length > 1 ? 's' : ''} added`}
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
          <p className="text-xs text-rose-600">{error}</p>
          <Button variant="ghost" size="sm" className="text-xs text-rose-500 mt-1 p-0 h-auto" onClick={() => { setError(''); setMode('menu'); }}>
            Try again
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center py-12 gap-3">
          <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
          <p className="text-sm text-stone-500">Analyzing product{mode === 'batch' ? 's' : ''}...</p>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (mode === 'batch') handleBatchFile(f);
        else handleSingleFile(f);
      }} />

      {mode === 'menu' && !loading && (
        <div className="space-y-3">
          <button onClick={() => { setMode('single'); fileRef.current?.setAttribute('capture', 'environment'); fileRef.current?.click(); }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-rose-100 hover:bg-rose-50 transition-colors text-left">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center"><Camera className="w-5 h-5 text-rose-500" /></div>
            <div><p className="text-sm font-semibold text-stone-700">Scan a product</p><p className="text-xs text-stone-400">Take a photo of one product</p></div>
            <Sparkles className="w-4 h-4 text-rose-300 ml-auto" />
          </button>
          <button onClick={() => { setMode('batch'); fileRef.current?.removeAttribute('capture'); fileRef.current?.click(); }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-rose-100 hover:bg-rose-50 transition-colors text-left">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center"><ImageIcon className="w-5 h-5 text-violet-500" /></div>
            <div><p className="text-sm font-semibold text-stone-700">Scan multiple products</p><p className="text-xs text-stone-400">Photo of all your products together</p></div>
            <Sparkles className="w-4 h-4 text-violet-300 ml-auto" />
          </button>
          <button onClick={() => setMode('manual')}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-rose-100 hover:bg-rose-50 transition-colors text-left">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center"><Package className="w-5 h-5 text-stone-500" /></div>
            <div><p className="text-sm font-semibold text-stone-700">Add manually</p><p className="text-xs text-stone-400">Type in product details</p></div>
          </button>
        </div>
      )}

      {mode === 'manual' && !loading && (
        <>
          <Button variant="ghost" className="text-xs text-stone-400 p-0 h-auto" onClick={() => setMode('menu')}>&larr; Back</Button>
          <ProductForm hideStatus onSave={saveProduct} onClose={() => setMode('menu')} />
        </>
      )}

      {mode === 'review' && extracted && !loading && (
        <>
          <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <p className="text-xs text-emerald-700">Review the extracted details</p>
          </div>
          {previewSrc && <img src={previewSrc} alt="" className="w-full h-28 object-cover rounded-xl" />}
          <ProductForm hideStatus initial={extracted} onSave={saveProduct} onClose={() => setMode('menu')} />
        </>
      )}

      {mode === 'batchReview' && !loading && (
        <>
          <div className="flex items-center gap-2 p-2 bg-violet-50 border border-violet-200 rounded-lg">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <p className="text-xs text-violet-700">Found {batchExtracted.length} product{batchExtracted.length > 1 ? 's' : ''}</p>
          </div>
          <div className="space-y-2">
            {batchExtracted.map((p, i) => (
              <Card key={i} className="border-rose-100">
                <CardContent className="pt-3 pb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-stone-700">{p.name}</p>
                    <p className="text-xs text-stone-400">{p.brand} &middot; {CATEGORY_LABELS[p.category] || p.category}</p>
                  </div>
                  <button onClick={() => {
                    setBatchExtracted(batchExtracted.filter((_, j) => j !== i));
                  }} className="text-stone-300 hover:text-rose-500"><X className="w-4 h-4" /></button>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button onClick={saveBatchProducts} className="w-full bg-violet-500 hover:bg-violet-600 text-white">
            Save All {batchExtracted.length} Products
          </Button>
          <Button variant="ghost" className="w-full text-xs text-stone-400" onClick={() => { setBatchExtracted([]); setMode('menu'); }}>Cancel</Button>
        </>
      )}

      {/* Added products list */}
      {products.length > 0 && mode === 'menu' && (
        <div>
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Your products</h3>
          <div className="space-y-1.5">
            {products.map((p) => (
              <div key={p.id} className="flex items-center gap-2 py-1.5 px-3 bg-white rounded-lg border border-rose-50">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-300" />
                <span className="text-sm text-stone-700 flex-1">{p.name}</span>
                <span className="text-xs text-stone-400">{p.brand}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack} className="text-stone-400">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button onClick={onNext} className="flex-1 h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl">
          {products.length > 0 ? 'Continue' : 'Skip for now'} <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ============ Step 3: Assign Products to Routine ============
function StepAssignRoutine({
  userId,
  routineDays,
  cycleLength,
  onNext,
  onBack,
}: {
  userId: string;
  routineDays: RoutineDay[];
  cycleLength: number;
  onNext: () => void;
  onBack: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [assignments, setAssignments] = useState<Record<string, { am: string[]; pm: string[] }>>({});
  const [activeDay, setActiveDay] = useState(0);

  useEffect(() => {
    fetchProducts(userId).then((prods) => {
      setProducts(prods);
      // Auto-assign based on routineTime
      const a: Record<string, { am: string[]; pm: string[] }> = {};
      routineDays.forEach((d) => {
        a[d.id] = {
          am: prods.filter((p) => p.routineTime === 'am' || p.routineTime === 'both').map((p) => p.id),
          pm: prods.filter((p) => p.routineTime === 'pm' || p.routineTime === 'both').map((p) => p.id),
        };
      });
      setAssignments(a);
    });
  }, [userId, routineDays]);

  const toggle = (dayId: string, time: 'am' | 'pm', productId: string) => {
    setAssignments((prev) => {
      const current = prev[dayId]?.[time] || [];
      const next = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId];
      return { ...prev, [dayId]: { ...prev[dayId], [time]: next } };
    });
  };

  const handleSave = async () => {
    const updated = routineDays.map((d) => ({
      ...d,
      amProducts: assignments[d.id]?.am || [],
      pmProducts: assignments[d.id]?.pm || [],
    }));
    await updateRoutineDays(userId, updated, cycleLength);
    onNext();
  };

  const day = routineDays[activeDay];
  if (!day) return null;
  const dayAssign = assignments[day.id] || { am: [], pm: [] };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-stone-800">Assign products</h2>
        <p className="text-sm text-stone-500 mt-1">Select which products go in each routine</p>
      </div>

      {routineDays.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {routineDays.map((d, i) => (
            <button
              key={d.id}
              onClick={() => setActiveDay(i)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                i === activeDay ? 'bg-rose-500 text-white' : 'bg-stone-100 text-stone-500'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <Card className="border-stone-100"><CardContent className="pt-6 pb-6 text-center">
          <p className="text-sm text-stone-400">No products added yet. You can assign products later.</p>
        </CardContent></Card>
      ) : (
        <>
          <Card className="border-rose-100">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-3">
                <Sun className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-stone-700">Morning</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {products.filter((p) => p.routineTime === 'am' || p.routineTime === 'both').map((p) => (
                  <button key={p.id} onClick={() => toggle(day.id, 'am', p.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      dayAssign.am.includes(p.id) ? 'bg-rose-100 text-rose-700 border border-rose-300' : 'bg-white text-stone-500 border border-stone-200'
                    }`}>
                    {p.name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-rose-100">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-3">
                <Moon className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-stone-700">Evening</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {products.filter((p) => p.routineTime === 'pm' || p.routineTime === 'both').map((p) => (
                  <button key={p.id} onClick={() => toggle(day.id, 'pm', p.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      dayAssign.pm.includes(p.id) ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' : 'bg-white text-stone-500 border border-stone-200'
                    }`}>
                    {p.name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack} className="text-stone-400">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button onClick={handleSave} className="flex-1 h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl">
          Continue <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ============ Step 4: Face Photos ============
function StepFacePhotos({
  userId,
  onNext,
  onBack,
}: {
  userId: string;
  onNext: () => void;
  onBack: () => void;
}) {
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
    } catch {
      // silently fail for MVP
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-100 to-blue-100 flex items-center justify-center mx-auto mb-4">
          <UserCircle className="w-7 h-7 text-sky-500" />
        </div>
        <h2 className="text-xl font-semibold text-stone-800">Your skin profile</h2>
        <p className="text-sm text-stone-500 mt-1">Take 1-5 photos of your face in natural daylight</p>
        <p className="text-xs text-stone-400 mt-1">This helps us recommend products for your skin type</p>
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
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-xl border-2 border-dashed border-rose-200 flex flex-col items-center justify-center gap-1 hover:bg-rose-50 transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 text-rose-300 animate-spin" />
            ) : (
              <>
                <Camera className="w-6 h-6 text-rose-300" />
                <span className="text-[10px] text-stone-400">{photos.length === 0 ? 'Add photo' : 'Add more'}</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack} className="text-stone-400">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button onClick={onNext} className="flex-1 h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl">
          {photos.length > 0 ? 'Continue' : 'Skip for now'} <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ============ Step 5: Done ============
function StepDone({
  productCount,
  cycleLength,
  onFinish,
}: {
  productCount: number;
  cycleLength: number;
  onFinish: () => void;
}) {
  return (
    <div className="space-y-8 text-center pt-8">
      <div>
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-semibold text-stone-800">You&apos;re all set!</h2>
        <p className="text-sm text-stone-500 mt-2">Your skincare routine is ready to go</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-rose-100">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-semibold text-rose-600">{productCount}</p>
            <p className="text-xs text-stone-500">Products</p>
          </CardContent>
        </Card>
        <Card className="border-rose-100">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-semibold text-rose-600">{cycleLength}</p>
            <p className="text-xs text-stone-500">{cycleLength === 1 ? 'Day routine' : 'Day cycle'}</p>
          </CardContent>
        </Card>
      </div>

      <Button onClick={onFinish} className="w-full h-14 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-base font-semibold">
        <Sparkles className="w-5 h-5 mr-2" />
        Start Your Routine
      </Button>
    </div>
  );
}

// ============ Main Wizard ============
export default function OnboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [routineDays, setRoutineDays] = useState<RoutineDay[]>([]);
  const [cycleLength, setCycleLength] = useState(1);
  const [productCount, setProductCount] = useState(0);

  const handleDisclaimerDone = useCallback(async () => {
    if (!user) return;
    await saveDisclaimerAgreement(user.id);
    setStep(1);
  }, [user]);

  const handleRoutineDone = useCallback(async (data: {
    hasMorning: boolean; hasEvening: boolean; cycleLength: number; dayNames: string[];
  }) => {
    if (!user) return;
    const days: RoutineDay[] = data.dayNames.map((name, i) => ({
      id: `rd_${Date.now()}_${i}`,
      dayNumber: i + 1,
      name: data.cycleLength === 1 ? 'Daily Routine' : name,
      amProducts: [],
      pmProducts: [],
    }));
    await updateRoutineDays(user.id, days, data.cycleLength);
    setRoutineDays(days);
    setCycleLength(data.cycleLength);
    setStep(2);
  }, [user]);

  const handleProductsDone = useCallback(async () => {
    if (!user) return;
    const prods = await fetchProducts(user.id);
    setProductCount(prods.length);
    setStep(3);
  }, [user]);

  const handleAssignDone = useCallback(() => setStep(4), []);

  const handlePhotosDone = useCallback(() => setStep(5), []);

  const handleFinish = useCallback(async () => {
    if (!user) return;
    await completeOnboarding(user.id);
    router.push('/');
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 to-white">
      <div className="max-w-lg mx-auto px-5 pt-12 pb-8">
        <ProgressDots current={step} total={6} />

        {step === 0 && <StepDisclaimer onNext={handleDisclaimerDone} />}
        {step === 1 && <StepRoutineSetup onNext={handleRoutineDone} onBack={() => setStep(0)} />}
        {step === 2 && <StepAddProducts userId={user.id} onNext={handleProductsDone} onBack={() => setStep(1)} />}
        {step === 3 && <StepAssignRoutine userId={user.id} routineDays={routineDays} cycleLength={cycleLength} onNext={handleAssignDone} onBack={() => setStep(2)} />}
        {step === 4 && <StepFacePhotos userId={user.id} onNext={handlePhotosDone} onBack={() => setStep(3)} />}
        {step === 5 && <StepDone productCount={productCount} cycleLength={cycleLength} onFinish={handleFinish} />}
      </div>
    </div>
  );
}
