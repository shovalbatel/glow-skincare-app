'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { useAppState } from '@/hooks/use-app-state';
import { getLogByDate, getTodayRoutineDay, getProductById } from '@/lib/store';
import { format, subDays, addDays } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, Sun, Moon, Save, CheckCircle2 } from 'lucide-react';
import {
  SkinCondition,
  SkinFeeling,
  SKIN_CONDITION_ICONS,
} from '@/lib/types';
import { useLocale } from '@/components/locale-provider';
import { SmartAddSheet } from '@/components/product-add-flow';

const ALL_CONDITIONS: SkinCondition[] = [
  'glow', 'smoothness', 'dryness', 'oily', 'redness', 'irritation', 'breakout', 'tight',
];

export default function LogPage() {
  const { state, saveLog, addProduct } = useAppState();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { t } = useLocale();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amCompleted, setAmCompleted] = useState(false);
  const [pmCompleted, setPmCompleted] = useState(false);
  const [amProducts, setAmProducts] = useState<string[]>([]);
  const [pmProducts, setPmProducts] = useState<string[]>([]);
  const [skinFeeling, setSkinFeeling] = useState<SkinFeeling>(3);
  const [skinConditions, setSkinConditions] = useState<SkinCondition[]>([]);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!state) return;
    const log = getLogByDate(state, selectedDate);
    if (log) {
      setAmCompleted(log.amCompleted);
      setPmCompleted(log.pmCompleted);
      setAmProducts(log.amProducts);
      setPmProducts(log.pmProducts);
      setSkinFeeling(log.skinFeeling);
      setSkinConditions(log.skinConditions);
      setNotes(log.notes);
    } else {
      const routineDay = getTodayRoutineDay(state);
      setAmCompleted(false);
      setPmCompleted(false);
      setAmProducts(routineDay?.amProducts || []);
      setPmProducts(routineDay?.pmProducts || []);
      setSkinFeeling(3);
      setSkinConditions([]);
      setNotes('');
    }
    setSaved(false);
  }, [selectedDate, state]);

  if (!state) return <AppShell><div className="flex items-center justify-center h-screen"><div className="animate-pulse text-rose-300">{t('common.loading')}</div></div></AppShell>;

  const activeProducts = state.products.filter((p) => p.isActive || p.status === 'have');
  const amEligible = activeProducts.filter((p) => p.routineTime === 'am' || p.routineTime === 'both');
  const pmEligible = activeProducts.filter((p) => p.routineTime === 'pm' || p.routineTime === 'both');

  const toggleCondition = (c: SkinCondition) => {
    setSkinConditions((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
    setSaved(false);
  };

  const toggleAmProduct = (id: string) => {
    setAmProducts((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    setSaved(false);
  };

  const togglePmProduct = (id: string) => {
    setPmProducts((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    setSaved(false);
  };

  const handleSave = () => {
    saveLog({
      date: selectedDate,
      amCompleted,
      pmCompleted,
      amProducts,
      pmProducts,
      skinFeeling,
      skinConditions,
      notes,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const goDay = (delta: number) => {
    const d = delta > 0 ? addDays(new Date(selectedDate), 1) : subDays(new Date(selectedDate), 1);
    setSelectedDate(format(d, 'yyyy-MM-dd'));
  };

  return (
    <AppShell>
      <PageHeader title={t('log.title')} />

      {/* Date picker */}
      <div className="px-5 mb-5">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => goDay(-1)} className="text-stone-400">
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-semibold text-stone-700">
              {format(new Date(selectedDate), 'EEEE')}
            </p>
            <p className="text-xs text-stone-400">
              {format(new Date(selectedDate), 'MMMM d, yyyy')}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => goDay(1)} className="text-stone-400">
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </Button>
        </div>
      </div>

      {/* AM routine */}
      <div className="px-5 mb-5">
        <Card className="border-rose-100 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-stone-700">{t('log.morningRoutine')}</span>
              </div>
              <button
                onClick={() => { setAmCompleted(!amCompleted); setSaved(false); }}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
                  amCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-400'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                {amCompleted ? t('common.done') : t('log.markDone')}
              </button>
            </div>
            <div className="space-y-2">
              {amEligible.map((p) => (
                <label key={p.id} className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox
                    checked={amProducts.includes(p.id)}
                    onCheckedChange={() => toggleAmProduct(p.id)}
                    className="data-[state=checked]:bg-rose-400 data-[state=checked]:border-rose-400"
                  />
                  <span className="text-sm text-stone-700">{p.name}</span>
                  <span className="text-xs text-stone-400">{p.brand}</span>
                </label>
              ))}
            </div>
            <button
              onClick={() => setIsAddOpen(true)}
              className="mt-2 text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1"
            >
              ＋ {t('log.addProduct')}
            </button>
          </CardContent>
        </Card>
      </div>

      {/* PM routine */}
      <div className="px-5 mb-5">
        <Card className="border-rose-100 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-stone-700">{t('log.eveningRoutine')}</span>
              </div>
              <button
                onClick={() => { setPmCompleted(!pmCompleted); setSaved(false); }}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
                  pmCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-400'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                {pmCompleted ? t('common.done') : t('log.markDone')}
              </button>
            </div>
            <div className="space-y-2">
              {pmEligible.map((p) => (
                <label key={p.id} className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox
                    checked={pmProducts.includes(p.id)}
                    onCheckedChange={() => togglePmProduct(p.id)}
                    className="data-[state=checked]:bg-indigo-400 data-[state=checked]:border-indigo-400"
                  />
                  <span className="text-sm text-stone-700">{p.name}</span>
                  <span className="text-xs text-stone-400">{p.brand}</span>
                </label>
              ))}
            </div>
            <button
              onClick={() => setIsAddOpen(true)}
              className="mt-2 text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1"
            >
              ＋ {t('log.addProduct')}
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Skin feeling */}
      <div className="px-5 mb-5">
        <Card className="border-rose-100 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <Label className="text-sm font-semibold text-stone-700 mb-3 block">{t('log.howFeel')}</Label>
            <div className="flex items-center justify-between mb-4">
              {([1, 2, 3, 4, 5] as SkinFeeling[]).map((n) => (
                <button
                  key={n}
                  onClick={() => { setSkinFeeling(n); setSaved(false); }}
                  className={`w-12 h-12 rounded-full text-sm font-semibold transition-all ${
                    n === skinFeeling
                      ? 'bg-rose-500 text-white scale-110 shadow-md'
                      : 'bg-stone-100 text-stone-400 hover:bg-rose-100'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between px-1">
              <span className="text-[10px] text-stone-400">{t('log.bad')}</span>
              <span className="text-[10px] text-stone-400">{t('log.great')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Skin conditions */}
      <div className="px-5 mb-5">
        <Card className="border-rose-100 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <Label className="text-sm font-semibold text-stone-700 mb-3 block">{t('log.conditions')}</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_CONDITIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleCondition(c)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                    skinConditions.includes(c)
                      ? 'bg-rose-500 text-white'
                      : 'bg-stone-100 text-stone-500 hover:bg-rose-50'
                  }`}
                >
                  {SKIN_CONDITION_ICONS[c]} {t('skin.' + c)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      <div className="px-5 mb-5">
        <Card className="border-rose-100 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <Label className="text-sm font-semibold text-stone-700 mb-2 block">{t('log.notes')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
              placeholder={t('log.notesPlaceholder')}
              rows={3}
              className="border-rose-100"
            />
          </CardContent>
        </Card>
      </div>

      {/* Save button */}
      <div className="px-5 mb-8">
        <Button
          onClick={handleSave}
          className={`w-full h-12 text-sm font-semibold rounded-xl transition-all ${
            saved
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
              : 'bg-rose-500 hover:bg-rose-600 text-white'
          }`}
        >
          {saved ? (
            <><CheckCircle2 className="w-4 h-4 me-2" /> {t('log.saved')}</>
          ) : (
            <><Save className="w-4 h-4 me-2" /> {t('log.save')}</>
          )}
        </Button>
      </div>

      <SmartAddSheet
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSave={(product) => {
          addProduct(product);
          setIsAddOpen(false);
        }}
      />
    </AppShell>
  );
}
