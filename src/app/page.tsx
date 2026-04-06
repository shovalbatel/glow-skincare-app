'use client';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { useAppState } from '@/hooks/use-app-state';
import { getTodayRoutineDay, getProductById, getLogByDate } from '@/lib/store';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Sun, Moon, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SKIN_CONDITION_ICONS } from '@/lib/types';
import { useLocale } from '@/components/locale-provider';

export default function HomePage() {
  const { state } = useAppState();
  const { t } = useLocale();

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
  const todayFormatted = format(new Date(), 'EEEE, MMMM d');
  const routineDay = getTodayRoutineDay(state);
  const todayLog = getLogByDate(state, today);

  const amProducts = routineDay?.amProducts.map((id) => getProductById(state, id)).filter(Boolean) || [];
  const pmProducts = routineDay?.pmProducts.map((id) => getProductById(state, id)).filter(Boolean) || [];

  const weekLogs = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = format(d, 'yyyy-MM-dd');
    const log = getLogByDate(state, dateStr);
    return { date: d, dateStr, log, dayLabel: format(d, 'EEE') };
  });

  const completedThisWeek = weekLogs.filter((d) => d.log?.amCompleted && d.log?.pmCompleted).length;

  return (
    <AppShell>
      <PageHeader title={t('app.name')} subtitle={todayFormatted} showUser />

      {/* Week streak */}
      <div className="px-5 mb-5">
        <Card className="border-rose-100 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">{t('home.thisWeek')}</span>
              <span className="text-xs text-rose-500 font-semibold">{completedThisWeek}/7 {t('home.days')}</span>
            </div>
            <div className="flex items-center justify-between gap-1">
              {weekLogs.map((d) => {
                const isToday = d.dateStr === today;
                const completed = d.log?.amCompleted && d.log?.pmCompleted;
                const partial = d.log?.amCompleted || d.log?.pmCompleted;
                return (
                  <div key={d.dateStr} className="flex flex-col items-center gap-1">
                    <span className={`text-[10px] font-medium ${isToday ? 'text-rose-600' : 'text-stone-400'}`}>
                      {d.dayLabel}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        completed
                          ? 'bg-rose-500 text-white'
                          : partial
                          ? 'bg-rose-200 text-rose-600'
                          : isToday
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
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's routine */}
      {routineDay && (
        <div className="px-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
              {t('home.todaysPlan')}
            </h2>
            <Badge variant="secondary" className="bg-rose-100 text-rose-600 text-xs">
              {routineDay.name}
            </Badge>
          </div>

          {/* AM */}
          <Card className="border-rose-100 shadow-sm mb-3">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-3">
                <Sun className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-stone-700">{t('common.morning')}</span>
                {todayLog?.amCompleted && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 ms-auto" />
                )}
              </div>
              <div className="space-y-2">
                {amProducts.map((p) => p && (
                  <div key={p.id} className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-300" />
                    <div>
                      <span className="text-sm text-stone-700">{p.name}</span>
                      <span className="text-xs text-stone-400 ms-1.5">{p.brand}</span>
                    </div>
                  </div>
                ))}
                {amProducts.length === 0 && (
                  <p className="text-xs text-stone-400 italic">{t('home.noProducts')}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* PM */}
          <Card className="border-rose-100 shadow-sm">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-3">
                <Moon className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-stone-700">{t('common.evening')}</span>
                {todayLog?.pmCompleted && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 ms-auto" />
                )}
              </div>
              <div className="space-y-2">
                {pmProducts.map((p) => p && (
                  <div key={p.id} className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-300" />
                    <div>
                      <span className="text-sm text-stone-700">{p.name}</span>
                      <span className="text-xs text-stone-400 ms-1.5">{p.brand}</span>
                    </div>
                  </div>
                ))}
                {pmProducts.length === 0 && (
                  <p className="text-xs text-stone-400 italic">{t('home.noProducts')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick log CTA */}
      {!todayLog && (
        <div className="px-5 mb-5">
          <Link href="/log">
            <Card className="border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-4 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-rose-400" />
                  <div>
                    <p className="text-sm font-semibold text-stone-700">{t('home.logToday')}</p>
                    <p className="text-xs text-stone-500">{t('home.logSubtitle')}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-rose-400 rtl:rotate-180" />
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Today's log summary */}
      {todayLog && (
        <div className="px-5 mb-5">
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-3">
            {t('home.todaysLog')}
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
                        n <= todayLog.skinFeeling
                          ? 'bg-rose-400 text-white'
                          : 'bg-stone-100 text-stone-300'
                      }`}
                    >
                      {n}
                    </div>
                  ))}
                </div>
              </div>
              {todayLog.skinConditions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {todayLog.skinConditions.map((c) => (
                    <Badge key={c} variant="secondary" className="text-xs bg-stone-100">
                      {SKIN_CONDITION_ICONS[c]} {t('skin.' + c)}
                    </Badge>
                  ))}
                </div>
              )}
              {todayLog.notes && (
                <p className="text-xs text-stone-500 mt-1">{todayLog.notes}</p>
              )}
              <Link href="/log" className="block mt-3">
                <Button variant="ghost" size="sm" className="text-rose-500 text-xs p-0 h-auto hover:text-rose-600">
                  {t('home.editLog')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick stats */}
      <div className="px-5 mb-5">
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-rose-100 shadow-sm">
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-2xl font-semibold text-rose-600">
                {state.products.filter((p) => p.status === 'have' && p.isActive).length}
              </p>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">{t('home.active')}</p>
            </CardContent>
          </Card>
          <Card className="border-rose-100 shadow-sm">
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-2xl font-semibold text-amber-500">
                {state.products.filter((p) => p.status === 'need_to_buy').length}
              </p>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">{t('home.toBuy')}</p>
            </CardContent>
          </Card>
          <Card className="border-rose-100 shadow-sm">
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-2xl font-semibold text-stone-600">
                {state.dailyLogs.length}
              </p>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">{t('home.logs')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
