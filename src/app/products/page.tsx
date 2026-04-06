'use client';

import { useState, useRef, useCallback } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { useAppState } from '@/hooks/use-app-state';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Plus, Search, Sun, Moon, SunMoon, Pencil, Trash2,
  Camera, Link2, FileText, Loader2, Sparkles, ImageIcon,
} from 'lucide-react';
import {
  Product,
  ProductCategory,
  ProductStatus,
  RoutineTime,
  CATEGORY_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/lib/types';

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as ProductCategory[];
const ALL_STATUSES = Object.keys(STATUS_LABELS) as ProductStatus[];

// ---------- extracted product type from AI ----------
interface ExtractedProduct {
  name: string;
  brand: string;
  category: ProductCategory;
  description: string;
  routineTime: RoutineTime;
  frequency: string;
  notes: string;
}

// ---------- Product Form (reusable for add & edit) ----------
function ProductForm({
  product,
  initial,
  onSave,
  onClose,
}: {
  product?: Product;
  initial?: Partial<ExtractedProduct>;
  onSave: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}) {
  const src = product || initial;
  const [name, setName] = useState(src?.name || '');
  const [brand, setBrand] = useState(src?.brand || '');
  const [category, setCategory] = useState<ProductCategory>(src?.category || 'serum');
  const [description, setDescription] = useState(src?.description || '');
  const [routineTime, setRoutineTime] = useState<RoutineTime>(src?.routineTime || 'both');
  const [frequency, setFrequency] = useState(src?.frequency || 'Daily');
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
          <Label className="text-xs text-stone-500">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs text-stone-500">Brand</Label>
          <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Brand" className="mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-stone-500">Category</Label>
          <Select value={category} onValueChange={(v) => v && setCategory(v as ProductCategory)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-stone-500">When</Label>
          <Select value={routineTime} onValueChange={(v) => v && setRoutineTime(v as RoutineTime)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="am">Morning</SelectItem>
              <SelectItem value="pm">Evening</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-stone-500">Frequency</Label>
          <Input value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="e.g. Daily" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs text-stone-500">Status</Label>
          <Select value={status} onValueChange={(v) => v && setStatus(v as ProductStatus)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs text-stone-500">What does it do?</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" className="mt-1" rows={2} />
      </div>
      <div>
        <Label className="text-xs text-stone-500">Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" className="mt-1" rows={2} />
      </div>
      <div className="flex items-center gap-3">
        <Label className="text-xs text-stone-500">Active in routine?</Label>
        <button
          onClick={() => setIsActive(!isActive)}
          className={`w-10 h-6 rounded-full transition-colors ${isActive ? 'bg-rose-400' : 'bg-stone-200'}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${isActive ? 'translate-x-4' : ''}`} />
        </button>
      </div>
      <Button onClick={handleSubmit} className="w-full bg-rose-500 hover:bg-rose-600 text-white">
        {product ? 'Update Product' : 'Add Product'}
      </Button>
    </div>
  );
}

// ---------- Smart Add Sheet (photo / link / manual) ----------
type AddMode = 'choose' | 'photo' | 'link' | 'manual' | 'review';

function SmartAddSheet({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
}) {
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

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-stone-700">
            {mode === 'choose' && 'Add Product'}
            {mode === 'photo' && 'Scan Product'}
            {mode === 'link' && 'From Store Link'}
            {mode === 'manual' && 'Add Manually'}
            {mode === 'review' && 'Review Details'}
          </SheetTitle>
        </SheetHeader>

        {/* Loading overlay */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
            <p className="text-sm text-stone-500">Analyzing product...</p>
            {previewSrc && (
              <img src={previewSrc} alt="Preview" className="w-24 h-24 object-cover rounded-xl mt-2 opacity-60" />
            )}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-xs text-rose-600">{error}</p>
            <Button variant="ghost" size="sm" className="text-xs text-rose-500 mt-1 p-0 h-auto" onClick={() => { setError(''); }}>
              Try again
            </Button>
          </div>
        )}

        {/* Choose mode */}
        {mode === 'choose' && !loading && (
          <div className="space-y-3 mt-2">
            <button
              onClick={() => setMode('photo')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-rose-100 hover:bg-rose-50 transition-colors text-left"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center">
                <Camera className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-700">Scan a photo</p>
                <p className="text-xs text-stone-400">Take or upload a product photo</p>
              </div>
              <Sparkles className="w-4 h-4 text-rose-300 ml-auto" />
            </button>

            <button
              onClick={() => setMode('link')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-rose-100 hover:bg-rose-50 transition-colors text-left"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-sky-100 to-blue-100 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-sky-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-700">Paste store link</p>
                <p className="text-xs text-stone-400">Auto-fill from any product page</p>
              </div>
              <Sparkles className="w-4 h-4 text-sky-300 ml-auto" />
            </button>

            <button
              onClick={() => setMode('manual')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-rose-100 hover:bg-rose-50 transition-colors text-left"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
                <FileText className="w-5 h-5 text-stone-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-700">Add manually</p>
                <p className="text-xs text-stone-400">Fill in all details yourself</p>
              </div>
            </button>
          </div>
        )}

        {/* Photo mode */}
        {mode === 'photo' && !loading && (
          <div className="space-y-4 mt-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  if (fileRef.current) {
                    fileRef.current.setAttribute('capture', 'environment');
                    fileRef.current.click();
                  }
                }}
                className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-rose-200 hover:bg-rose-50 transition-colors"
              >
                <Camera className="w-8 h-8 text-rose-400" />
                <span className="text-xs font-medium text-stone-600">Take Photo</span>
              </button>

              <button
                onClick={() => {
                  if (fileRef.current) {
                    fileRef.current.removeAttribute('capture');
                    fileRef.current.click();
                  }
                }}
                className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-rose-200 hover:bg-rose-50 transition-colors"
              >
                <ImageIcon className="w-8 h-8 text-rose-400" />
                <span className="text-xs font-medium text-stone-600">Upload Image</span>
              </button>
            </div>

            <p className="text-xs text-stone-400 text-center">
              Snap the front of your product — AI will extract name, brand, and details
            </p>

            <Button variant="ghost" className="w-full text-xs text-stone-400" onClick={() => setMode('choose')}>
              Back
            </Button>
          </div>
        )}

        {/* Link mode */}
        {mode === 'link' && !loading && (
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs text-stone-500">Product page URL</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://store.com/product..."
                className="mt-1"
                type="url"
              />
            </div>
            <p className="text-xs text-stone-400">
              Works with most skincare stores — Sephora, Ulta, Amazon, brand sites, etc.
            </p>
            <Button
              onClick={handleUrl}
              disabled={!url.trim()}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Extract Details
            </Button>
            <Button variant="ghost" className="w-full text-xs text-stone-400" onClick={() => setMode('choose')}>
              Back
            </Button>
          </div>
        )}

        {/* Manual mode */}
        {mode === 'manual' && !loading && (
          <>
            <Button variant="ghost" className="text-xs text-stone-400 mb-2 p-0 h-auto" onClick={() => setMode('choose')}>
              &larr; Back
            </Button>
            <ProductForm
              onSave={(data) => { onSave(data); handleOpenChange(false); }}
              onClose={() => handleOpenChange(false)}
            />
          </>
        )}

        {/* Review extracted data */}
        {mode === 'review' && extracted && !loading && (
          <>
            <div className="flex items-center gap-2 mb-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <p className="text-xs text-emerald-700">AI-extracted details — review and adjust before saving</p>
            </div>
            {previewSrc && (
              <img src={previewSrc} alt="Product" className="w-full h-32 object-cover rounded-xl mb-3" />
            )}
            <ProductForm
              initial={extracted}
              onSave={(data) => { onSave(data); handleOpenChange(false); }}
              onClose={() => handleOpenChange(false)}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------- Main Products Page ----------
export default function ProductsPage() {
  const { state, addProduct, updateProduct, deleteProduct } = useAppState();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTime, setFilterTime] = useState<string>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  if (!state) return <AppShell><div className="flex items-center justify-center h-screen"><div className="animate-pulse text-rose-300">Loading...</div></div></AppShell>;

  const filtered = state.products.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.brand.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (filterTime !== 'all' && p.routineTime !== filterTime && p.routineTime !== 'both') return false;
    return true;
  });

  const timeIcon = (t: RoutineTime) => {
    if (t === 'am') return <Sun className="w-3 h-3 text-amber-500" />;
    if (t === 'pm') return <Moon className="w-3 h-3 text-indigo-400" />;
    return <SunMoon className="w-3 h-3 text-stone-400" />;
  };

  return (
    <AppShell>
      <PageHeader
        title="Products"
        subtitle={`${state.products.length} products`}
        action={
          <Button
            size="sm"
            className="bg-rose-500 hover:bg-rose-600 text-white rounded-full h-8 w-8 p-0"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        }
      />

      {/* Smart Add Sheet */}
      <SmartAddSheet
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSave={addProduct}
      />

      {/* Filters */}
      <div className="px-5 mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="pl-9 bg-white border-rose-100"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? 'all')}>
            <SelectTrigger className="w-auto min-w-[120px] h-8 text-xs bg-white border-rose-100">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTime} onValueChange={(v) => setFilterTime(v ?? 'all')}>
            <SelectTrigger className="w-auto min-w-[100px] h-8 text-xs bg-white border-rose-100">
              <SelectValue placeholder="Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Times</SelectItem>
              <SelectItem value="am">Morning</SelectItem>
              <SelectItem value="pm">Evening</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Product list */}
      <div className="px-5 space-y-3">
        {filtered.map((p) => (
          <Card key={p.id} className={`border-rose-100 shadow-sm ${!p.isActive ? 'opacity-60' : ''}`}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {timeIcon(p.routineTime)}
                    <h3 className="text-sm font-semibold text-stone-700 truncate">{p.name}</h3>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">{p.brand} &middot; {CATEGORY_LABELS[p.category]}</p>
                  <p className="text-xs text-stone-500 mt-1">{p.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={`text-[10px] ${STATUS_COLORS[p.status]}`}>{STATUS_LABELS[p.status]}</Badge>
                    <span className="text-[10px] text-stone-400">{p.frequency}</span>
                    {!p.isActive && <Badge variant="outline" className="text-[10px] text-stone-400">Paused</Badge>}
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <Sheet>
                    <SheetTrigger
                      render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-stone-400" />}
                      onClick={() => setEditingProduct(p)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </SheetTrigger>
                    <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
                      <SheetHeader><SheetTitle className="text-stone-700">Edit Product</SheetTitle></SheetHeader>
                      {editingProduct && (
                        <ProductForm
                          product={editingProduct}
                          onSave={(data) => updateProduct(editingProduct.id, data)}
                          onClose={() => setEditingProduct(null)}
                        />
                      )}
                    </SheetContent>
                  </Sheet>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-stone-400 hover:text-rose-500"
                    onClick={() => deleteProduct(p.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-stone-400">No products found</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
