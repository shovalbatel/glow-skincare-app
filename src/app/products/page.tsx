'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { useAppState } from '@/hooks/use-app-state';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Plus, Search, Sun, Moon, SunMoon, Pencil, Trash2 } from 'lucide-react';
import { ProductForm, SmartAddSheet } from '@/components/product-add-flow';
import {
  Product,
  ProductStatus,
  RoutineTime,
  CATEGORY_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/lib/types';

const ALL_STATUSES = Object.keys(STATUS_LABELS) as ProductStatus[];

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
          <Button size="sm" className="bg-rose-500 hover:bg-rose-600 text-white rounded-full h-8 w-8 p-0" onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4" />
          </Button>
        }
      />
      <SmartAddSheet open={isAddOpen} onOpenChange={setIsAddOpen} onSave={addProduct} />

      <div className="px-5 mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="pl-9 bg-white border-rose-100" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? 'all')}>
            <SelectTrigger className="w-auto min-w-[120px] h-8 text-xs bg-white border-rose-100"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {ALL_STATUSES.map((s) => (<SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filterTime} onValueChange={(v) => setFilterTime(v ?? 'all')}>
            <SelectTrigger className="w-auto min-w-[100px] h-8 text-xs bg-white border-rose-100"><SelectValue placeholder="Time" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Times</SelectItem>
              <SelectItem value="am">Morning</SelectItem>
              <SelectItem value="pm">Evening</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
                    <SheetTrigger render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-stone-400" />} onClick={() => setEditingProduct(p)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </SheetTrigger>
                    <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
                      <SheetHeader><SheetTitle className="text-stone-700">Edit Product</SheetTitle></SheetHeader>
                      {editingProduct && (
                        <ProductForm product={editingProduct} onSave={(data) => updateProduct(editingProduct.id, data)} onClose={() => setEditingProduct(null)} />
                      )}
                    </SheetContent>
                  </Sheet>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-stone-400 hover:text-rose-500" onClick={() => deleteProduct(p.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12"><p className="text-sm text-stone-400">No products found</p></div>
        )}
      </div>
    </AppShell>
  );
}
