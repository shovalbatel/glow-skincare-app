'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Camera, Link2, FileText, Loader2, Sparkles, ImageIcon, X, Wand2, Trash2,
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
import { useAuth } from '@/components/auth-provider';
import { uploadProductPhoto, deleteProductPhoto } from '@/lib/store';

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as ProductCategory[];
const ALL_STATUSES = Object.keys(STATUS_LABELS) as ProductStatus[];

// Canonical frequency keys (translation keys live under freq.*)
const FREQUENCY_PRESETS = [
  'daily',
  'every_other_day',
  '2_3_per_week',
  'weekly',
  'as_needed',
] as const;
type FrequencyPreset = (typeof FREQUENCY_PRESETS)[number];

// Normalize free-text frequency strings (often coming from the LLM) into a
// canonical preset key. Returns 'custom' when nothing matches.
function normalizeFrequency(raw: string | undefined): FrequencyPreset | 'custom' {
  if (!raw) return 'daily';
  const v = raw.toLowerCase().trim();
  if (!v) return 'daily';
  if (/(^|\b)(daily|every\s*day|once\s*a\s*day|יומי)/.test(v)) return 'daily';
  if (/(every\s*other\s*day|alternate\s*days|יום\s*כן\s*יום\s*לא)/.test(v)) return 'every_other_day';
  if (/(2[-–\s]?3\s*(?:x|times)?\s*(?:per|a)?\s*week|פעמיים|שלוש)/.test(v)) return '2_3_per_week';
  if (/(weekly|once\s*a\s*week|שבועי)/.test(v)) return 'weekly';
  if (/(as\s*needed|when\s*needed|prn|לפי\s*הצורך)/.test(v)) return 'as_needed';
  if (FREQUENCY_PRESETS.includes(v as FrequencyPreset)) return v as FrequencyPreset;
  return 'custom';
}

export interface ExtractedProduct {
  name: string;
  brand: string;
  category: ProductCategory;
  description: string;
  routineTime: RoutineTime;
  frequency: string;
  notes: string;
  purchaseUrl?: string;
  imageUrl?: string;
  imagePath?: string;
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
  const { user } = useAuth();
  const src = product || initial;
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? initial?.imageUrl ?? '');
  const [imagePath, setImagePath] = useState(product?.imagePath ?? initial?.imagePath ?? '');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(src?.name || '');
  const [brand, setBrand] = useState(src?.brand || '');
  const [category, setCategory] = useState<ProductCategory>(src?.category || 'serum');
  const [description, setDescription] = useState(src?.description || '');
  const [routineTime, setRoutineTime] = useState<RoutineTime>(src?.routineTime || 'both');

  const initialFreqPreset = normalizeFrequency(src?.frequency);
  const [frequencyPreset, setFrequencyPreset] = useState<FrequencyPreset | 'custom'>(initialFreqPreset);
  const [frequencyCustom, setFrequencyCustom] = useState(
    initialFreqPreset === 'custom' ? src?.frequency || '' : ''
  );

  const [status, setStatus] = useState<ProductStatus>(product?.status || 'have');
  // isActive is no longer surfaced in the UI — kept defaulted true for any
  // legacy callers that still read it.
  const isActive = product?.isActive ?? true;
  const [notes, setNotes] = useState(src?.notes || '');
  const [purchaseUrl, setPurchaseUrl] = useState(src?.purchaseUrl || '');
  const [enriching, setEnriching] = useState(false);
  const [findingLink, setFindingLink] = useState(false);

  const handleFindBuyLink = async () => {
    if (!name.trim() || findingLink) return;
    setFindingLink(true);
    try {
      const res = await fetch('/api/find-buy-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), brand: brand.trim() }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (res.ok && data.url) {
        setPurchaseUrl(data.url);
      }
    } catch (e) {
      console.warn('[ProductForm] find buy link failed', e);
    } finally {
      setFindingLink(false);
    }
  };

  // Manually trigger LLM/web enrichment for the current name + brand. Only
  // touches fields the user hasn't filled in.
  const handleEnrich = async () => {
    if (!name.trim() || !brand.trim() || enriching) return;
    setEnriching(true);
    try {
      const res = await fetch('/api/extract-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), brand: brand.trim() }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as ExtractedProduct;
      if (data.category) setCategory(data.category);
      if (data.routineTime) setRoutineTime(data.routineTime);
      if (data.description && !description) setDescription(data.description);
      if (data.notes && !notes) setNotes(data.notes);
      if (data.frequency) {
        const preset = normalizeFrequency(data.frequency);
        setFrequencyPreset(preset);
        if (preset === 'custom') setFrequencyCustom(data.frequency);
      }
    } catch (e) {
      console.warn('[ProductForm] enrich failed', e);
    } finally {
      setEnriching(false);
    }
  };

  const handlePhotoFile = async (file: File) => {
    if (!user) {
      setPhotoError('Not signed in');
      return;
    }
    setPhotoUploading(true);
    setPhotoError('');
    try {
      // If replacing, drop the old object so we don't pile up orphans.
      const oldPath = imagePath;
      const { storagePath, publicUrl } = await uploadProductPhoto(user.id, file);
      setImagePath(storagePath);
      setImageUrl(publicUrl);
      if (oldPath && oldPath !== storagePath) {
        deleteProductPhoto(oldPath).catch((e) => console.warn('[ProductForm] cleanup failed', e));
      }
    } catch (e: unknown) {
      console.error('[ProductForm] photo upload failed', e);
      setPhotoError(e instanceof Error ? e.message : 'Photo upload failed');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    const oldPath = imagePath;
    setImageUrl('');
    setImagePath('');
    if (oldPath) {
      deleteProductPhoto(oldPath).catch((e) => console.warn('[ProductForm] cleanup failed', e));
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    // Store the canonical preset key (translatable). For 'custom', store the
    // free-text the user typed.
    const frequency = frequencyPreset === 'custom' ? frequencyCustom : frequencyPreset;
    onSave({ name, brand, category, description, routineTime, frequency, status, isActive, notes, purchaseUrl: purchaseUrl.trim(), imageUrl, imagePath });
    onClose();
  };

  return (
    <div className="space-y-4 px-1">
      {/* Photo */}
      <div className="flex items-center gap-3">
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handlePhotoFile(f);
            // Reset input so picking the same file again still fires onChange.
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={photoUploading}
          className="relative w-20 h-20 rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 flex items-center justify-center overflow-hidden flex-shrink-0 hover:bg-rose-50"
          aria-label={t('form.productPhoto')}
        >
          {photoUploading ? (
            <Loader2 className="w-5 h-5 text-rose-400 animate-spin" />
          ) : imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={name || 'Product'} className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-6 h-6 text-rose-300" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <Label className="text-xs text-stone-500 block">{t('form.productPhoto')}</Label>
          <p className="text-[11px] text-stone-400 mb-2">{t('form.productPhotoHint')}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading}
              className="text-[11px] text-rose-500 hover:text-rose-600 disabled:opacity-50 inline-flex items-center gap-1"
            >
              <Camera className="w-3 h-3" />
              {imageUrl ? t('form.replacePhoto') : t('form.addPhoto')}
            </button>
            {imageUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="text-[11px] text-stone-400 hover:text-rose-500 inline-flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                {t('form.removePhoto')}
              </button>
            )}
          </div>
          {photoError && <p className="text-[11px] text-rose-500 mt-1">{photoError}</p>}
        </div>
      </div>

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
      <button
        type="button"
        onClick={handleEnrich}
        disabled={!name.trim() || !brand.trim() || enriching}
        className="flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {enriching ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Wand2 className="w-3 h-3" />
        )}
        {enriching ? t('form.autofilling') : t('form.autofill')}
      </button>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-stone-500">{t('form.category')}</Label>
          <Select value={category} onValueChange={(v) => v && setCategory(v as ProductCategory)}>
            <SelectTrigger className="mt-1 w-full">
              <SelectValue>{(v) => (v ? t('cat.' + v) : '')}</SelectValue>
            </SelectTrigger>
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
            <SelectTrigger className="mt-1 w-full">
              <SelectValue>
                {(v) =>
                  v === 'am'
                    ? t('common.morning')
                    : v === 'pm'
                    ? t('common.evening')
                    : v === 'both'
                    ? t('common.both')
                    : ''
                }
              </SelectValue>
            </SelectTrigger>
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
          <Select
            value={frequencyPreset}
            onValueChange={(v) => v && setFrequencyPreset(v as FrequencyPreset | 'custom')}
          >
            <SelectTrigger className="mt-1 w-full">
              <SelectValue>{(v) => (v ? t('freq.' + v) : '')}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_PRESETS.map((f) => (
                <SelectItem key={f} value={f}>{t('freq.' + f)}</SelectItem>
              ))}
              <SelectItem value="custom">{t('freq.custom')}</SelectItem>
            </SelectContent>
          </Select>
          {frequencyPreset === 'custom' && (
            <Input
              value={frequencyCustom}
              onChange={(e) => setFrequencyCustom(e.target.value)}
              placeholder={t('form.frequencyPlaceholder')}
              className="mt-2"
            />
          )}
        </div>
        {!hideStatus && (
          <div>
            <Label className="text-xs text-stone-500">{t('form.status')}</Label>
            <Select value={status} onValueChange={(v) => v && setStatus(v as ProductStatus)}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue>{(v) => (v ? t('status.' + v) : '')}</SelectValue>
              </SelectTrigger>
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
      <div>
        <div className="flex items-center justify-between">
          <Label className="text-xs text-stone-500">{t('form.purchaseUrl')}</Label>
          <button
            type="button"
            onClick={handleFindBuyLink}
            disabled={!name.trim() || findingLink}
            className="text-[11px] text-rose-500 hover:text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
          >
            {findingLink ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            {findingLink ? t('form.findingBuyLink') : t('form.findBuyLink')}
          </button>
        </div>
        <Input
          value={purchaseUrl}
          onChange={(e) => setPurchaseUrl(e.target.value)}
          placeholder={t('form.purchaseUrlPlaceholder')}
          className="mt-1"
          type="url"
          dir="ltr"
        />
      </div>
      <Button onClick={handleSubmit} className="w-full bg-rose-500 hover:bg-rose-600 text-white">
        {product ? t('form.update') : t('form.add')}
      </Button>
    </div>
  );
}

type AddMode = 'choose' | 'photo' | 'batch' | 'batchReview' | 'link' | 'manual' | 'review';

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
  const { user } = useAuth();
  const [mode, setMode] = useState<AddMode>('choose');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [extracted, setExtracted] = useState<ExtractedProduct | null>(null);
  const [batchExtracted, setBatchExtracted] = useState<ExtractedProduct[]>([]);
  const [url, setUrl] = useState('');
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const batchFileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setMode('choose');
    setLoading(false);
    setError('');
    setExtracted(null);
    setBatchExtracted([]);
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

    // Kick off the photo upload in parallel with AI extraction so the user
    // doesn't wait twice. If the upload fails we still let extraction proceed
    // — the user can retake/remove the photo from the form.
    const uploadPromise = user
      ? uploadProductPhoto(user.id, file).catch((e) => {
          console.warn('[SmartAddSheet] photo upload failed', e);
          return null;
        })
      : Promise.resolve(null);

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
        const upload = await uploadPromise;
        setExtracted({
          ...data,
          imageUrl: upload?.publicUrl ?? '',
          imagePath: upload?.storagePath ?? '',
        });
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

  const handleBatchFile = async (file: File) => {
    setLoading(true);
    setError('');
    setPreviewSrc(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await fetch('/api/extract-products-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Extraction failed');
        const products = Array.isArray(data) ? data : data.products ? data.products : [data];
        if (products.length === 0) throw new Error('No products detected in the image');
        setBatchExtracted(products);
        setMode('batchReview');
      } catch (e: unknown) {
        console.error('[BatchScan] Error:', e);
        setError(e instanceof Error ? e.message : 'Failed to extract products');
        setMode('batch');
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
      setExtracted({ ...data, purchaseUrl: data.purchaseUrl || url.trim() });
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
              <Sparkles className="w-4 h-4 text-rose-300 ms-auto" />
            </button>
            <button onClick={() => setMode('batch')} className="w-full flex items-center gap-4 p-4 rounded-xl border border-rose-100 hover:bg-rose-50 transition-colors text-left">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center"><ImageIcon className="w-5 h-5 text-violet-500" /></div>
              <div><p className="text-sm font-semibold text-stone-700">{t('add.scanMultiple')}</p><p className="text-xs text-stone-400">{t('add.scanMultipleHint')}</p></div>
              <Sparkles className="w-4 h-4 text-violet-300 ms-auto" />
            </button>
            <button onClick={() => setMode('link')} className="w-full flex items-center gap-4 p-4 rounded-xl border border-rose-100 hover:bg-rose-50 transition-colors text-left">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-sky-100 to-blue-100 flex items-center justify-center"><Link2 className="w-5 h-5 text-sky-500" /></div>
              <div><p className="text-sm font-semibold text-stone-700">{t('add.pasteLink')}</p><p className="text-xs text-stone-400">{t('add.pasteLinkSub')}</p></div>
              <Sparkles className="w-4 h-4 text-sky-300 ms-auto" />
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
            <Button onClick={handleUrl} disabled={!url.trim()} className="w-full bg-sky-500 hover:bg-sky-600 text-white"><Sparkles className="w-4 h-4 me-2" />{t('add.extract')}</Button>
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

        {mode === 'batch' && !loading && (
          <div className="space-y-4 mt-2">
            <input ref={batchFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBatchFile(f); }} />
            <div className="text-center py-4">
              <ImageIcon className="w-12 h-12 text-violet-300 mx-auto mb-3" />
              <p className="text-sm text-stone-600 mb-1">{t('add.scanMultipleHint')}</p>
              <p className="text-xs text-stone-400">AI will identify each product separately</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { batchFileRef.current?.setAttribute('capture', 'environment'); batchFileRef.current?.click(); }}
                className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-violet-200 hover:bg-violet-50 transition-colors">
                <Camera className="w-8 h-8 text-violet-400" /><span className="text-xs font-medium text-stone-600">{t('add.camera')}</span>
              </button>
              <button onClick={() => { batchFileRef.current?.removeAttribute('capture'); batchFileRef.current?.click(); }}
                className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-violet-200 hover:bg-violet-50 transition-colors">
                <ImageIcon className="w-8 h-8 text-violet-400" /><span className="text-xs font-medium text-stone-600">{t('add.gallery')}</span>
              </button>
            </div>
            <Button variant="ghost" className="w-full text-xs text-stone-400" onClick={() => setMode('choose')}>{t('common.back')}</Button>
          </div>
        )}

        {mode === 'batchReview' && !loading && (
          <div className="space-y-3 mt-2">
            <div className="flex items-center gap-2 p-2 bg-violet-50 border border-violet-200 rounded-lg">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <p className="text-xs text-violet-700">{t('add.foundProducts', { n: batchExtracted.length })}</p>
            </div>
            {batchExtracted.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white border border-rose-100 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-700 truncate">{p.name}</p>
                  <p className="text-xs text-stone-400">{p.brand} &middot; {t('cat.' + p.category)}</p>
                </div>
                <button onClick={() => setBatchExtracted(batchExtracted.filter((_, j) => j !== i))} className="text-stone-300 hover:text-rose-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <Button
              onClick={() => { batchExtracted.forEach((p) => onSave({ ...p, purchaseUrl: p.purchaseUrl || '', imageUrl: p.imageUrl || '', imagePath: p.imagePath || '', status: 'have', isActive: true })); handleOpenChange(false); }}
              className="w-full bg-violet-500 hover:bg-violet-600 text-white">
              {t('add.saveAll', { n: batchExtracted.length })}
            </Button>
            <Button variant="ghost" className="w-full text-xs text-stone-400" onClick={() => { setBatchExtracted([]); setMode('choose'); }}>{t('common.cancel')}</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
