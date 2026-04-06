'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { useAppState } from '@/hooks/use-app-state';
import { getTodayRoutineDay, getProductById, getLogByDate } from '@/lib/store';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Sun, Moon, Pencil, CheckCircle2, Circle } from 'lucide-react';
import { RoutineDay } from '@/lib/types';
import { useLocale } from '@/components/locale-provider';

export default function RoutinePage() {
  const { state, updateRoutine } = useAppState();
  const { t } = useLocale();
  const [editingDay, setEditingDay] = useState<RoutineDay | null>(null);
  const [editName, setEditName] = useState('');
  const [editAm, setEditAm] = useState<string[]>([]);
  const [editPm, setEditPm] = useState<string[]>([]);

  if (!state) return <AppShell><div className="flex items-center justify-center h-screen"><div className="animate-pulse text-rose-300">{t('common.loading')}</div></div></AppShell>;

  const todayRoutine = getTodayRoutineDay(state);
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayLog = getLogByDate(state, today);

  const activeProducts = state.products.filter((p) => p.status === 'have' || p.status === 'almost_empty');
  const amProducts = activeProducts.filter((p) => p.routineTime === 'am' || p.routineTime === 'both');
  const pmProducts = activeProducts.filter((p) => p.routineTime === 'pm' || p.routineTime === 'both');

  const startEdit = (day: RoutineDay) => {
    setEditingDay(day);
    setEditName(day.name);
    setEditAm(day.amProducts);
    setEditPm(day.pmProducts);
  };

  const saveEdit = () => {
    if (!editingDay) return;
    const updated = state.routineDays.map((d) =>
      d.id === editingDay.id ? { ...d, name: editName, amProducts: editAm, pmProducts: editPm } : d
    );
    updateRoutine(updated, state.cycleLength);
    setEditingDay(null);
  };

  return (
    <AppShell>
      <PageHeader
        title={t('routine.title')}
        subtitle={`${state.cycleLength}${t('routine.dayCycle')}`}
      />

      {/* Today highlight */}
      {todayRoutine && (
        <div className="px-5 mb-5">
          <Card className="border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 shadow-sm">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-rose-500 uppercase tracking-wider">{t('routine.today')}</span>
                {todayLog?.amCompleted && todayLog?.pmCompleted ? (
                  <Badge className="bg-emerald-100 text-emerald-600 text-[10px]">{t('routine.completed')}</Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-600 text-[10px]">{t('routine.inProgress')}</Badge>
                )}
              </div>
              <h3 className="text-lg font-semibold text-stone-700">{todayRoutine.name}</h3>
              <p className="text-xs text-stone-500 mt-1">
                {t('routine.dayOf').replace('{n}', String(todayRoutine.dayNumber)).replace('{total}', String(state.cycleLength))}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cycle days */}
      <div className="px-5 space-y-3">
        {state.routineDays.map((day) => {
          const isToday = day.id === todayRoutine?.id;
          const dayAmProducts = day.amProducts.map((id) => getProductById(state, id)).filter(Boolean);
          const dayPmProducts = day.pmProducts.map((id) => getProductById(state, id)).filter(Boolean);

          return (
            <Card key={day.id} className={`shadow-sm ${isToday ? 'border-rose-300 ring-1 ring-rose-200' : 'border-rose-100'}`}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                        isToday ? 'bg-rose-500 text-white' : 'bg-stone-100 text-stone-500'
                      }`}>
                        {day.dayNumber}
                      </div>
                      <h3 className="text-sm font-semibold text-stone-700">{day.name}</h3>
                      {isToday && <Badge className="bg-rose-100 text-rose-500 text-[10px]">{t('routine.today')}</Badge>}
                    </div>
                  </div>
                  <Sheet>
                    <SheetTrigger
                      render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-stone-400" />}
                      onClick={() => startEdit(day)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </SheetTrigger>
                    <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
                      <SheetHeader><SheetTitle className="text-stone-700">{t('routine.editDay').replace('{n}', String(editingDay?.dayNumber))}</SheetTitle></SheetHeader>
                      <div className="space-y-4 px-1 mt-4">
                        <div>
                          <Label className="text-xs text-stone-500">{t('routine.dayName')}</Label>
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs text-stone-500 flex items-center gap-1"><Sun className="w-3 h-3" /> {t('routine.morningProducts')}</Label>
                          <div className="space-y-2 mt-2">
                            {amProducts.map((p) => (
                              <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={editAm.includes(p.id)}
                                  onCheckedChange={() => setEditAm(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                                />
                                <span className="text-sm">{p.name} <span className="text-xs text-stone-400">{p.brand}</span></span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-stone-500 flex items-center gap-1"><Moon className="w-3 h-3" /> {t('routine.eveningProducts')}</Label>
                          <div className="space-y-2 mt-2">
                            {pmProducts.map((p) => (
                              <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={editPm.includes(p.id)}
                                  onCheckedChange={() => setEditPm(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                                />
                                <span className="text-sm">{p.name} <span className="text-xs text-stone-400">{p.brand}</span></span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <Button onClick={saveEdit} className="w-full bg-rose-500 hover:bg-rose-600 text-white">
                          {t('routine.saveChanges')}
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center gap-1 mb-1.5">
                      <Sun className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] font-medium text-stone-500 uppercase">{t('common.am')}</span>
                    </div>
                    {dayAmProducts.map((p) => p && (
                      <p key={p.id} className="text-xs text-stone-600 mb-0.5">{p.name}</p>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1.5">
                      <Moon className="w-3 h-3 text-indigo-400" />
                      <span className="text-[10px] font-medium text-stone-500 uppercase">{t('common.pm')}</span>
                    </div>
                    {dayPmProducts.map((p) => p && (
                      <p key={p.id} className="text-xs text-stone-600 mb-0.5">{p.name}</p>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
