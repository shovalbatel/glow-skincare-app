'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { useAppState } from '@/hooks/use-app-state';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingBag, AlertTriangle, RotateCcw, XCircle, CheckCircle2 } from 'lucide-react';
import { ProductStatus, STATUS_COLORS } from '@/lib/types';
import { useLocale } from '@/components/locale-provider';

export default function ShoppingPage() {
  const { state, updateProduct } = useAppState();
  const { t } = useLocale();
  const [filter, setFilter] = useState<string>('all');

  if (!state) return <AppShell><div className="flex items-center justify-center h-screen"><div className="animate-pulse text-rose-300">{t('common.loading')}</div></div></AppShell>;

  const shoppingStatuses: ProductStatus[] = ['need_to_buy', 'almost_empty', 'repurchase', 'do_not_repurchase'];
  const shoppingProducts = state.products.filter((p) => {
    if (filter === 'all') return shoppingStatuses.includes(p.status);
    return p.status === filter;
  });

  const statusIcon = (s: ProductStatus) => {
    switch (s) {
      case 'need_to_buy': return <ShoppingBag className="w-4 h-4 text-amber-500" />;
      case 'almost_empty': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'repurchase': return <RotateCcw className="w-4 h-4 text-sky-500" />;
      case 'do_not_repurchase': return <XCircle className="w-4 h-4 text-rose-500" />;
      default: return null;
    }
  };

  const counts = {
    need_to_buy: state.products.filter((p) => p.status === 'need_to_buy').length,
    almost_empty: state.products.filter((p) => p.status === 'almost_empty').length,
    repurchase: state.products.filter((p) => p.status === 'repurchase').length,
    do_not_repurchase: state.products.filter((p) => p.status === 'do_not_repurchase').length,
  };

  return (
    <AppShell>
      <PageHeader title={t('shop.title')} subtitle={t('shop.subtitle')} />

      {/* Summary cards */}
      <div className="px-5 mb-5">
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-amber-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('need_to_buy')}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium text-stone-600">{t('shop.toBuy')}</span>
              </div>
              <p className="text-2xl font-semibold text-amber-600 mt-1">{counts.need_to_buy}</p>
            </CardContent>
          </Card>
          <Card className="border-orange-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('almost_empty')}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-medium text-stone-600">{t('shop.almostEmpty')}</span>
              </div>
              <p className="text-2xl font-semibold text-orange-600 mt-1">{counts.almost_empty}</p>
            </CardContent>
          </Card>
          <Card className="border-sky-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('repurchase')}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-sky-500" />
                <span className="text-xs font-medium text-stone-600">{t('shop.repurchase')}</span>
              </div>
              <p className="text-2xl font-semibold text-sky-600 mt-1">{counts.repurchase}</p>
            </CardContent>
          </Card>
          <Card className="border-rose-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('do_not_repurchase')}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-500" />
                <span className="text-xs font-medium text-stone-600">{t('shop.skipLabel')}</span>
              </div>
              <p className="text-2xl font-semibold text-rose-600 mt-1">{counts.do_not_repurchase}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filter */}
      <div className="px-5 mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-700">
          {filter === 'all' ? t('shop.allItems') : t('status.' + filter)}
        </h2>
        {filter !== 'all' && (
          <Button variant="ghost" size="sm" className="text-xs text-rose-500" onClick={() => setFilter('all')}>
            {t('shop.showAll')}
          </Button>
        )}
      </div>

      {/* Product list */}
      <div className="px-5 space-y-3">
        {shoppingProducts.map((p) => (
          <Card key={p.id} className="border-rose-100 shadow-sm">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{statusIcon(p.status)}</div>
                  <div>
                    <h3 className="text-sm font-semibold text-stone-700">{p.name}</h3>
                    <p className="text-xs text-stone-400">{p.brand} &middot; {t('cat.' + p.category)}</p>
                    <p className="text-xs text-stone-500 mt-1">{p.description}</p>
                    {p.notes && <p className="text-xs text-stone-400 mt-1 italic">{p.notes}</p>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 ms-2">
                  {p.status === 'need_to_buy' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[10px] h-6 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                      onClick={() => updateProduct(p.id, { status: 'have', isActive: true })}
                    >
                      <CheckCircle2 className="w-3 h-3 me-1" /> {t('shop.bought')}
                    </Button>
                  )}
                  {p.status === 'almost_empty' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-6 border-sky-200 text-sky-600"
                        onClick={() => updateProduct(p.id, { status: 'repurchase' })}
                      >
                        {t('shop.repurchase')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-6 border-rose-200 text-rose-600"
                        onClick={() => updateProduct(p.id, { status: 'do_not_repurchase' })}
                      >
                        {t('shop.skipLabel')}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {shoppingProducts.length === 0 && (
          <div className="text-center py-12">
            <ShoppingBag className="w-8 h-8 text-stone-200 mx-auto mb-2" />
            <p className="text-sm text-stone-400">{t('shop.noItems')}</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
