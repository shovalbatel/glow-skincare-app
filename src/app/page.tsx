'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { useAppState } from '@/hooks/use-app-state';
import { getSuggestedRoutine, getProductById, getLogByDate } from '@/lib/store';
import { format, subDays, addDays } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Circle,
  Sun,
  Moon,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SKIN_CONDITION_ICONS, RoutineStep } from '@/lib/types';
import { useLocale } from '@/components/locale-provider';

export default function HomePage() {
  const { state } = useAppState();
  const { t } = useLocale();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  if (!state) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse text-rose-300">{t('common.loading')}</div>
        </div>
      </AppShell>
    );
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  const isToday = selectedDate === today;
  const dateFormatted = format(new Date(selectedDate), 'EEEE, MMMM d');
  const amRoutine = getSuggestedRoutine(state, 'am');
  const pmRoutine = getSuggestedRoutine(state, 'pm');
  const dayLog = getLogByDate(state, selectedDate);

  const amSteps = amRoutine?.amSteps || [];
  const pmSteps = pmRoutine?.pmSteps || [];
  const hasRoutine = !!(amRoutine || pmRoutine);

  // Build a set of logged product IDs for quick lookup per time slot.
  const amLoggedIds = new Set(dayLog?.amProducts ?? []);
  const pmLoggedIds = new Set(dayLog?.pmProducts ?? []);

  const weekLogs = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = format(d, 'yyyy-MM-dd');
    const log = getLogByDate(state, dateStr);
    return { date: d, dateStr, log, dayLabel: format(d, 'EEE') };
  });

  const completedThisWeek = weekLogs.filter((d) => d.log?.amCompleted && d.log?.pmCompleted).length;

  const goDay = (delta: number) => {
    const d = delta > 0 ? addDays(new Date(selectedDate), 1) : subDays(new Date(selectedDate), 1);
    setSelectedDate(format(d, 'yyyy-MM-dd'));
  };

  /** Check whether a routine step has at least one product that appears in the
   *  day's logged products. */
  const isStepLogged = (step: RoutineStep, loggedIds: Set<string>): boolean => {
    // A step is "done" if any of its assigned products was logged, OR if the
    // step has no products but the category appears in the log (product added
    // at log time).
    if (step.productIds.length > 0) {
      return step.productIds.some((id) => loggedIds.has(id));
    }
    // Step has no pre-assigned product — check if the user logged any product
    // of the same category.
    for (const id of loggedIds) {
      const p = getProductById(state, id);
      if (p?.category === step.category) return true;
    }
    return false;
  };

  const renderSteps = (
    steps: RoutineStep[],
    loggedIds: Set<string>,
    completed: boolean | undefined
  ) =>
    steps.map((step) => {
      const products = step.productIds
        .map((id) => getProductById(state, id))
        .filter(Boolean);
      const stepDone = completed || isStepLogged(step, loggedIds);

      return (
        <div key={step.id} className="flex items-start gap-2.5">
          {/* Per-step completion indicator */}
          <div className="mt-0.5 flex-shrink-0">
            {stepDone ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <Circle className="w-4 h-4 text-stone-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-[11px] font-medium uppercase tracking-wider mb-0.5 ${
                stepDone ? 'text-emerald-600' : 'text-stone-500'
              }`}
            >
              {t('cat.' + step.category)}
            </p>
            {products.length === 0 ? (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-stone-100 flex items-center justify-center">
                  <ImageIcon className="w-3.5 h-3.5 text-stone-300" />
                </div>
                <span className="text-xs text-stone-400 italic">{t('home.noProductYet')}</span>
              </div>
            ) : (
              products.map(
                (p) =>
                  p && (
                    <div key={p.id} className="flex items-center gap-2 mb-0.5">
                      <div className="w-7 h-7 rounded-md bg-rose-50 border border-rose-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5 text-rose-200" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span
                          className={`text-sm ${stepDone ? 'text-stone-500' : 'text-stone-700'}`}
                        >
                          {p.name}
                        </span>
                        <span className="text-xs text-stone-400 ms-1.5">{p.brand}</span>
                      </div>
                    </div>
                  )
              )
            )}
          </div>
        </div>
      );
    });

  return (
    <AppShell>
      <PageHeader title={t('app.name')} subtitle={dateFormatted} showUser />

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

      {/* Week streak */}
      <div className="px-5 mb-5">
        <Card className="border-rose-100 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                {t('home.thisWeek')}
              </span>
              <span className="text-xs text-rose-500 font-semibold">
                {completedThisWeek}/7 {t('home.days')}
              </span>
            </div>
            <div className="flex items-center justify-between gap-1">
              {weekLogs.map((d) => {
                const isSel = d.dateStr === selectedDate;
                const completed = d.log?.amCompleted && d.log?.pmCompleted;
                const partial = d.log?.amCompleted || d.log?.pmCompleted;
                return (
                  <button
                    key={d.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(d.dateStr)}
                    className="flex flex-col items-center gap-1"
                  >
                    <span
                      className={`text-[10px] font-medium ${
                        isSel ? 'text-rose-600' : 'text-stone-400'
                      }`}
                    >
                      {d.dayLabel}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        completed
                          ? 'bg-rose-500 text-white'
                          : partial
                          ? 'bg-rose-200 text-rose-600'
                          : isSel
                          ? 'bg-rose-100 text-rose-400 ring-2 ring-rose-300'
                          : 'bg-stone-100 text-stone-300'
                      }`}
                    >
                      {completed ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day's routine plan */}
      {hasRoutine && (
        <div className="px-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
              {t('home.plan')}
            </h2>
          </div>

          {/* AM */}
          {amRoutine && (
            <Card className="border-rose-100 shadow-sm mb-3">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-3">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-stone-700">
                    {t('common.morning')}
                  </span>
                  <Badge
                    variant="secondary"
                    className="bg-rose-100 text-rose-600 text-[10px]"
                  >
                    {amRoutine.name}
                  </Badge>
                  {dayLog?.amCompleted && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 ms-auto" />
                  )}
                </div>
                <div className="space-y-3">
                  {renderSteps(amSteps, amLoggedIds, dayLog?.amCompleted)}
                  {amSteps.length === 0 && (
                    <p className="text-xs text-stone-400 italic">{t('home.noSteps')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* PM */}
          {pmRoutine && (
            <Card className="border-rose-100 shadow-sm">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-3">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-semibold text-stone-700">
                    {t('common.evening')}
                  </span>
                  <Badge
                    variant="secondary"
                    className="bg-rose-100 text-rose-600 text-[10px]"
                  >
                    {pmRoutine.name}
                  </Badge>
                  {dayLog?.pmCompleted && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 ms-auto" />
                  )}
                </div>
                <div className="space-y-3">
                  {renderSteps(pmSteps, pmLoggedIds, dayLog?.pmCompleted)}
                  {pmSteps.length === 0 && (
                    <p className="text-xs text-stone-400 italic">{t('home.noSteps')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Log CTA — shown when no log exists for the selected day */}
      {!dayLog && (
        <div className="px-5 mb-5">
          <Link href={`/log?date=${selectedDate}`}>
            <Card className="border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-4 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-rose-400" />
                  <div>
                    <p className="text-sm font-semibold text-stone-700">
                      {t('home.logRoutine')}
                    </p>
                    <p className="text-xs text-stone-500">
                      {t('home.logSubtitleDay')}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-rose-400 rtl:rotate-180" />
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Day's log summary */}
      {dayLog && (
        <div className="px-5 mb-5">
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-3">
            {t('home.dayLog')}
          </h2>
          <Card className="border-rose-100 shadow-sm">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-stone-600">{t('home.skinFeeling')}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                        n <= dayLog.skinFeeling
                          ? 'bg-rose-400 text-white'
                          : 'bg-stone-100 text-stone-300'
                      }`}
                    >
                      {n}
                    </div>
                  ))}
                </div>
              </div>
              {dayLog.skinConditions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {dayLog.skinConditions.map((c) => (
                    <Badge key={c} variant="secondary" className="text-xs bg-stone-100">
                      {SKIN_CONDITION_ICONS[c]} {t('skin.' + c)}
                    </Badge>
                  ))}
                </div>
              )}
              {dayLog.notes && (
                <p className="text-xs text-stone-500 mt-1">{dayLog.notes}</p>
              )}
              <Link href={`/log?date=${selectedDate}`} className="block mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-500 text-xs p-0 h-auto hover:text-rose-600"
                >
                  {t('home.editLog')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recommendations teaser */}
      <div className="px-5 mb-5">
        <Link href="/recommendations">
          <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-4 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-semibold text-stone-700">{t('rec.title')}</p>
                  <p className="text-xs text-stone-500">{t('rec.generateSub')}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-400 rtl:rotate-180" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick stats */}
      <div className="px-5 mb-5">
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-rose-100 shadow-sm">
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-2xl font-semibold text-rose-600">
                {state.products.filter((p) => p.status === 'have' && p.isActive).length}
              </p>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">
                {t('home.active')}
              </p>
            </CardContent>
          </Card>
          <Card className="border-rose-100 shadow-sm">
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-2xl font-semibold text-amber-500">
                {state.products.filter((p) => p.status === 'need_to_buy').length}
              </p>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">
                {t('home.toBuy')}
              </p>
            </CardContent>
          </Card>
          <Card className="border-rose-100 shadow-sm">
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-2xl font-semibold text-stone-600">
                {state.dailyLogs.length}
              </p>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">
                {t('home.logs')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
