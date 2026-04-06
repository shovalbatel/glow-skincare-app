'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Camera, Link2, FileText, Loader2, Sparkles, ImageIcon,
} from 'lucide-react';
import {
  Product,
  ProductCategory,
  ProductStatus,
  RoutineTime,
  CATEGORY_LABELS,
  STATUS_LABELS,
} from '@/lib/types';
import { useLocale } from '@/components/locale-provider';

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as ProductCategory[];
const ALL_STATUSES = Object.keys(STATUS_LABELS) as ProductStatus[];

export interface ExtractedProduct {
  name: string;
  brand: string;
  category: ProductCategory;
  description: string;
  routineTime: RoutineTime;
  frequency: string;
  notes: string;
}

export function ProductForm({
  product,
  initial,
  onSave,
  onClose,
  hideStatus = false,
}: {
  product?: Product;
  initial?: Partial<ExtractedProduct>;
  onSave: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
  hideStatus?: boolean;
}) {
  const { t } = useLocale();
  const src = product || initial;
  const [name, setName] = useState(src?.name || '');
  const [brand, setBrand] = useState(src?.brand || '');
  const [category, setCategory] = useState<ProductCategory>(src?.category || 'serum');
  const [description, setDescription] = useState(src?.description || '');
  const [routineTime, setRoutineTime] = useState<RoutineTime>(src?.routineTime || 'both');
  const [frequency, setFrequency] = useState(src?.frequency || '');
  const [status, setStatus] = useState<ProductStatus>(product?.status || 'have');
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [notes, setNotes] = useState(src?.notes || '');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({ name, brand, category, description, routineTime, frequency, status, isActive, notes });
    onClose();
  };

  return (
    <div className="space-y-4 px-1">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-stone-500">{t('form.name')}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('form.namePlaceholder')} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs text-stone-500">{t('form.brand')}</Label>
          <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder={t('form.brand')} className="mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-stone-500">{t('form.category')}</Label>
          <Select value={category} onValueChange={(v) => v && setCategory(v as ProductCategory)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{t('cat.' + c)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-stone-500">{t('form.when')}</Label>
          <Select value={routineTime} onValueChange={(v) => v && setRoutineTime(v as RoutineTime)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="am">{t('common.morning')}</SelectItem>
              <SelectItem value="pm">{t('common.evening')}</SelectItem>
              <SelectItem value="both">{t('common.both')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-stone-500">{t('form.frequency')}</Label>
          <Input value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder={t('form.frequencyPlaceholder')} className="mt-1" />
        </div>
        {!hideStatus && (
          <div>
            <Label className="text-xs text-stone-500">{t('form.status')}</Label>
            <Select value={status} onValueChange={(v) => v && setStatus(v as ProductStatus)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{t('status.' + s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div>
        <Label className="text-xs text-stone-500">{t('form.description')}</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('form.descriptionPlaceholder')} className="mt-1" rows={2} />
      </div>
      <div>
        <Label className="text-xs text-stone-500">{t('form.notes')}</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('form.notesPlaceholder')} className="mt-1" rows={2} />
      </div>
      {!hideStatus && (
        <div className="flex items-center gap-3">
          <Label className="text-xs text-stone-500">{t('form.activeInRoutine')}</Label>
          <button
            onClick={() => setIsActive(!isActive)}
            className={`w-10 h-6 rounded-full transition-colors ${isActive ? 'bg-rose-400' : 'bg-stone-200'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${isActive ? 'translate-x-4' : ''}`} />
          </button>
        </div>
      )}
      <Button onClick={handleSubmit} className="w-full bg-rose-500 hover:bg-rose-600 text-white">
        {product ? t('form.update') : t('form.add')}
      </Button>
    </div>
  );
}

type AddMode = 'choose' | 'photo' | 'link' | 'manual' | 'review';

export function SmartAddSheet({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
}) {
  const { t } = useLocale();
  const [mode, setMode] = useState<AddMode>('choose');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [extracted, setExtracted] = useState<ExtractedProduct | null>(null);
  const [url, setUrl] = useState('');
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setMode('choose');
    setLoading(false);
    setError('');
    setExtracted(null);
    setUrl('');
    setPreviewSrc(null);
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFile = async (file: File) => {
    setLoading(true);
    setError('');
    setPreviewSrc(URL.createObjectURL(file));

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await fetch('/api/extract-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Extraction failed');
        setExtracted(data);
        setMode('review');
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to extract product details');
        setMode('photo');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

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

  const sheetTitle = () => {
    if (mode === 'choose') return t('add.title');
    if (mode === 'photo') return t('add.scan');
    if (mode === 'link') return t('add.fromLink');
    if (mode === 'manual') return t('add.manual');
    return t('add.review');
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-stone-700">
            {sheetTitle()}
          </SheetTitle>
        </SheetHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
            <p className="text-sm text-stone-500">{t('add.analyzingProduct')}</p>
            {previewSrc && (
              <img src={previewSrc} alt="Preview" className="w-24 h-24 object-cover rounded-xl mt-2 opacity-60" />
            )}
          </div>
        )}

        {error && !loading && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-xs text-rose-600">{error}</p>
            <Button variant="ghost" size="sm" className="text-xs text-rose-500 mt-1 p-0 h-auto" onClick={() => setError('')}>
              {t('common.tryAgain')}
            </Button>
          </div>
        )}

        {mode === 'choose' && !loading && (
          <div className="space-y-3 mt-2">
            <button onClick={() => setMode('photo')} className="w-full flex items-center gap-4 p-4 rounded-xl border border-rose-100 hover:bg-rose-50 transition-colors text-left">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center"><Camera className="w-5 h-5 text-rose-500" /></div>
              <div><p className="text-sm font-semibold text-stone-700">{t('add.scanPhoto')}</p><p className="text-xs text-stone-400">{t('add.scanPhotoSub')}</p></div>
              <Sparkles className="w-4 h-4 text-rose-300 ml-auto" />
            </button>
            <button onClick={() => setMode('link')} className="w-full flex items-center gap-4 p-4 rounded-xl border border-rose-100 hover:bg-rose-50 transition-colors text-left">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-sky-100 to-blue-100 flex items-center justify-center"><Link2 className="w-5 h-5 text-sky-500" /></div>
              <div><p className="text-sm font-semibold text-stone-700">{t('add.pasteLink')}</p><p className="text-xs text-stone-400">{t('add.pasteLinkSub')}</p></div>
              <Sparkles className="w-4 h-4 text-sky-300 ml-auto" />
            </button>
            <button onClick={() => setMode('manual')} className="w-full flex items-center gap-4 p-4 rounded-xl border border-rose-100 hover:bg-rose-50 transition-colors text-left">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center"><FileText className="w-5 h-5 text-stone-500" /></div>
              <div><p className="text-sm font-semibold text-stone-700">{t('add.manual')}</p><p className="text-xs text-stone-400">{t('add.manualSub')}</p></div>
            </button>
          </div>
        )}

        {mode === 'photo' && !loading && (
          <div className="space-y-4 mt-2">
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { fileRef.current?.setAttribute('capture', 'environment'); fileRef.current?.click(); }} className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-rose-200 hover:bg-rose-50 transition-colors">
                <Camera className="w-8 h-8 text-rose-400" /><span className="text-xs font-medium text-stone-600">{t('add.takePhoto')}</span>
              </button>
              <button onClick={() => { fileRef.current?.removeAttribute('capture'); fileRef.current?.click(); }} className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-rose-200 hover:bg-rose-50 transition-colors">
                <ImageIcon className="w-8 h-8 text-rose-400" /><span className="text-xs font-medium text-stone-600">{t('add.uploadImage')}</span>
              </button>
            </div>
            <p className="text-xs text-stone-400 text-center">{t('add.photoHint')}</p>
            <Button variant="ghost" className="w-full text-xs text-stone-400" onClick={() => setMode('choose')}>{t('common.back')}</Button>
          </div>
        )}

        {mode === 'link' && !loading && (
          <div className="space-y-4 mt-2">
            <div><Label className="text-xs text-stone-500">{t('add.urlLabel')}</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('add.urlPlaceholder')} className="mt-1" type="url" /></div>
            <p className="text-xs text-stone-400">{t('add.urlHint')}</p>
            <Button onClick={handleUrl} disabled={!url.trim()} className="w-full bg-sky-500 hover:bg-sky-600 text-white"><Sparkles className="w-4 h-4 mr-2" />{t('add.extract')}</Button>
            <Button variant="ghost" className="w-full text-xs text-stone-400" onClick={() => setMode('choose')}>{t('common.back')}</Button>
          </div>
        )}

        {mode === 'manual' && !loading && (
          <>
            <Button variant="ghost" className="text-xs text-stone-400 mb-2 p-0 h-auto" onClick={() => setMode('choose')}>&larr; {t('common.back')}</Button>
            <ProductForm onSave={(data) => { onSave(data); handleOpenChange(false); }} onClose={() => handleOpenChange(false)} />
          </>
        )}

        {mode === 'review' && extracted && !loading && (
          <>
            <div className="flex items-center gap-2 mb-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <p className="text-xs text-emerald-700">{t('add.aiExtracted')}</p>
            </div>
            {previewSrc && <img src={previewSrc} alt="Product" className="w-full h-32 object-cover rounded-xl mb-3" />}
            <ProductForm initial={extracted} onSave={(data) => { onSave(data); handleOpenChange(false); }} onClose={() => handleOpenChange(false)} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
