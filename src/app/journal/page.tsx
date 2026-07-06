'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { useAppState } from '@/hooks/use-app-state';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Scale, Lightbulb, NotebookPen } from 'lucide-react';
import { format } from 'date-fns';
import { JournalKind } from '@/lib/types';
import { useLocale } from '@/components/locale-provider';

type Filter = 'all' | JournalKind;

const KIND_META: Record<
  JournalKind,
  { icon: typeof BookOpen; color: string; badge: string }
> = {
  journal: { icon: BookOpen, color: 'text-rose-500', badge: 'bg-rose-100 text-rose-600' },
  decision: { icon: Scale, color: 'text-indigo-500', badge: 'bg-indigo-100 text-indigo-600' },
  insight: { icon: Lightbulb, color: 'text-amber-500', badge: 'bg-amber-100 text-amber-700' },
};

export default function JournalPage() {
  const { state } = useAppState();
  const { t } = useLocale();
  const [filter, setFilter] = useState<Filter>('all');

  if (!state) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse text-rose-300">{t('common.loading')}</div>
        </div>
      </AppShell>
    );
  }

  const entries = state.journalEntries.filter((e) => filter === 'all' || e.kind === filter);

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: t('journal.all') },
    { key: 'journal', label: t('journal.journal') },
    { key: 'decision', label: t('journal.decisions') },
    { key: 'insight', label: t('journal.insights') },
  ];

  return (
    <AppShell>
      <PageHeader title={t('journal.title')} subtitle={t('journal.subtitle')} />

      {/* Filter tabs */}
      <div className="px-5 mb-4 flex gap-1.5 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f.key
                ? 'bg-rose-500 text-white'
                : 'bg-white border border-rose-100 text-stone-500 hover:bg-rose-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="px-5 py-16 text-center">
          <NotebookPen className="w-10 h-10 text-rose-200 mx-auto mb-3" />
          <p className="text-sm text-stone-400">{t('journal.empty')}</p>
        </div>
      ) : (
        <div className="px-5 space-y-3 pb-6">
          {entries.map((e) => {
            const meta = KIND_META[e.kind];
            const Icon = meta.icon;
            return (
              <Card key={e.id} className="border-rose-100 shadow-sm">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {e.title && (
                          <h3 className="text-sm font-semibold text-stone-700">{e.title}</h3>
                        )}
                        <Badge variant="secondary" className={`text-[10px] ${meta.badge}`}>
                          {t('journal.' + e.kind)}
                        </Badge>
                        {e.status && (
                          <Badge variant="outline" className="text-[10px] text-stone-400 capitalize">
                            {e.status}
                          </Badge>
                        )}
                      </div>
                      {e.body && (
                        <p className="text-xs text-stone-600 mt-1 whitespace-pre-wrap leading-relaxed">
                          {e.body}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {e.entryDate && (
                          <span className="text-[10px] text-stone-400">
                            {format(new Date(e.entryDate), 'MMM d, yyyy')}
                          </span>
                        )}
                        {e.tags?.map((tag) => (
                          <span key={tag} className="text-[10px] text-stone-400">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
