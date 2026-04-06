'use client';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { useAppState } from '@/hooks/use-app-state';
import { getProductById } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  SKIN_CONDITION_LABELS,
  SKIN_CONDITION_ICONS,
  SkinCondition,
} from '@/lib/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
} from 'recharts';
import { format, subDays } from 'date-fns';

export default function InsightsPage() {
  const { state } = useAppState();

  if (!state) return <AppShell><div className="flex items-center justify-center h-screen"><div className="animate-pulse text-rose-300">Loading...</div></div></AppShell>;

  const logs = state.dailyLogs;
  const totalLogs = logs.length;
  const completedBoth = logs.filter((l) => l.amCompleted && l.pmCompleted).length;
  const completionRate = totalLogs > 0 ? Math.round((completedBoth / totalLogs) * 100) : 0;

  // Skin feeling over time (last 14 days)
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(new Date(), 13 - i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const log = logs.find((l) => l.date === dateStr);
    return {
      date: format(d, 'MM/dd'),
      feeling: log?.skinFeeling || null,
    };
  });

  // Condition frequency
  const conditionCounts: Record<SkinCondition, number> = {
    irritation: 0, dryness: 0, redness: 0, breakout: 0,
    glow: 0, smoothness: 0, oily: 0, tight: 0,
  };
  logs.forEach((l) => l.skinConditions.forEach((c) => conditionCounts[c]++));

  const conditionData = Object.entries(conditionCounts)
    .map(([key, count]) => ({
      name: SKIN_CONDITION_LABELS[key as SkinCondition],
      icon: SKIN_CONDITION_ICONS[key as SkinCondition],
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Most used products
  const productUsage: Record<string, number> = {};
  logs.forEach((l) => {
    [...l.amProducts, ...l.pmProducts].forEach((id) => {
      productUsage[id] = (productUsage[id] || 0) + 1;
    });
  });
  const topProducts = Object.entries(productUsage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, count]) => {
      const p = getProductById(state, id);
      return { name: p?.name || 'Unknown', brand: p?.brand || '', count };
    });

  // Average skin feeling
  const avgFeeling = totalLogs > 0
    ? (logs.reduce((sum, l) => sum + l.skinFeeling, 0) / totalLogs).toFixed(1)
    : '-';

  // Products linked to negative conditions
  const negativeConditions: SkinCondition[] = ['irritation', 'redness', 'breakout'];
  const productNegLinks: Record<string, number> = {};
  logs.forEach((l) => {
    const hasNegative = l.skinConditions.some((c) => negativeConditions.includes(c));
    if (hasNegative) {
      [...l.amProducts, ...l.pmProducts].forEach((id) => {
        productNegLinks[id] = (productNegLinks[id] || 0) + 1;
      });
    }
  });
  const irritationProducts = Object.entries(productNegLinks)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([id, count]) => {
      const p = getProductById(state, id);
      return { name: p?.name || 'Unknown', count };
    });

  return (
    <AppShell>
      <PageHeader title="Insights" subtitle={`Based on ${totalLogs} logged days`} />

      {/* Summary stats */}
      <div className="px-5 mb-5">
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-rose-100 shadow-sm">
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-2xl font-semibold text-rose-600">{completionRate}%</p>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">Completion</p>
            </CardContent>
          </Card>
          <Card className="border-rose-100 shadow-sm">
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-2xl font-semibold text-amber-500">{avgFeeling}</p>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">Avg Feeling</p>
            </CardContent>
          </Card>
          <Card className="border-rose-100 shadow-sm">
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-2xl font-semibold text-stone-600">{totalLogs}</p>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">Days Logged</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Skin feeling chart */}
      <div className="px-5 mb-5">
        <Card className="border-rose-100 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <h3 className="text-sm font-semibold text-stone-700 mb-3">Skin Feeling (Last 14 Days)</h3>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last14}>
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[1, 5]} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={20} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #fecdd3' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="feeling"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    dot={{ fill: '#f43f5e', r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conditions frequency */}
      <div className="px-5 mb-5">
        <Card className="border-rose-100 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <h3 className="text-sm font-semibold text-stone-700 mb-3">Skin Conditions Frequency</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conditionData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="count" fill="#fda4af" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top products */}
      <div className="px-5 mb-5">
        <Card className="border-rose-100 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <h3 className="text-sm font-semibold text-stone-700 mb-3">Most Used Products</h3>
            <div className="space-y-2.5">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-stone-400 w-4">{i + 1}</span>
                    <div>
                      <p className="text-sm text-stone-700">{p.name}</p>
                      <p className="text-xs text-stone-400">{p.brand}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs bg-rose-100 text-rose-600">
                    {p.count}x
                  </Badge>
                </div>
              ))}
              {topProducts.length === 0 && (
                <p className="text-xs text-stone-400 italic">Log more days to see product usage</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Irritation correlations */}
      {irritationProducts.length > 0 && (
        <div className="px-5 mb-5">
          <Card className="border-orange-100 shadow-sm">
            <CardContent className="pt-4 pb-3">
              <h3 className="text-sm font-semibold text-stone-700 mb-1">Products on Irritation Days</h3>
              <p className="text-xs text-stone-400 mb-3">Products used on days with irritation, redness, or breakout</p>
              <div className="space-y-2">
                {irritationProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-stone-700">{p.name}</span>
                    <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-600">
                      {p.count} days
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
