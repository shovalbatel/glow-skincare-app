'use client';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/components/auth-provider';
import { useLocale } from '@/components/locale-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  fetchFacePhotos,
  fetchSkinProfile,
  fetchProducts,
  fetchRecommendation,
  saveRecommendation,
  loadState,
} from '@/lib/store';
import {
  iherbLink,
  SkinAnalysis,
  ProductPick,
  RoutineSuggestion,
  RecommendationData,
} from '@/lib/types';
import { useEffect, useState, useCallback } from 'react';
import { Loader2, Sparkles, RefreshCw, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export default function RecommendationsPage() {
  const { user } = useAuth();
  const { t } = useLocale();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [rec, setRec] = useState<RecommendationData | null>(null);
  const [facePhotos, setFacePhotos] = useState<string[]>([]);

  // Load cached recommendations on mount
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [cached, photos] = await Promise.all([
          fetchRecommendation(user.id),
          fetchFacePhotos(user.id),
        ]);
        setFacePhotos(photos);
        if (cached) {
          setRec({
            skinAnalysis: cached.skinAnalysis as SkinAnalysis | null,
            routineSuggestions: (cached.routineSuggestions as RoutineSuggestion[]) || [],
            productPicks: (cached.productPicks as ProductPick[]) || [],
            logInsights: [],
            createdAt: cached.createdAt,
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleGenerate = useCallback(async () => {
    if (!user) return;
    setGenerating(true);
    try {
      // Fetch everything needed
      const [photos, profile, state] = await Promise.all([
        fetchFacePhotos(user.id),
        fetchSkinProfile(user.id),
        loadState(),
      ]);
      const products = await fetchProducts(user.id);

      // Step 1: analyze skin
      let skinAnalysis: SkinAnalysis | null = null;
      if (photos.length > 0) {
        const analysisRes = await fetch('/api/analyze-skin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photoUrls: photos,
            goals: profile.goals,
            concerns: profile.concerns,
          }),
        });
        if (analysisRes.ok) {
          skinAnalysis = await analysisRes.json();
        }
      }

      // Step 2: get recommendations
      const recentLogs = state.dailyLogs.slice(-14);
      const recRes = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skinAnalysis,
          products,
          routineDays: state.routineDays,
          recentLogs,
          goals: profile.goals,
          concerns: profile.concerns,
        }),
      });

      if (!recRes.ok) throw new Error('Recommendation API failed');

      const recData = await recRes.json();

      const result: RecommendationData = {
        skinAnalysis,
        routineSuggestions: recData.routineSuggestions || [],
        productPicks: recData.productPicks || [],
        logInsights: recData.logInsights || [],
        createdAt: new Date().toISOString(),
      };

      // Save to DB
      await saveRecommendation(user.id, {
        skinAnalysis: result.skinAnalysis,
        routineSuggestions: result.routineSuggestions,
        productPicks: result.productPicks,
      });

      setRec(result);
    } catch (err) {
      console.error('Error generating recommendations:', err);
    } finally {
      setGenerating(false);
    }
  }, [user]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse text-rose-300">{t('common.loading')}</div>
        </div>
      </AppShell>
    );
  }

  const suggestionBadgeColor = (type: RoutineSuggestion['type']) => {
    switch (type) {
      case 'add_step':
        return 'bg-emerald-100 text-emerald-700';
      case 'change_product':
        return 'bg-amber-100 text-amber-700';
      case 'reorder':
        return 'bg-sky-100 text-sky-700';
      case 'frequency':
        return 'bg-violet-100 text-violet-700';
    }
  };

  return (
    <AppShell>
      <PageHeader
        title={t('rec.title')}
        subtitle={t('rec.subtitle')}
        showUser
      />

      {/* ── Generating spinner ─────────────────────────────────────────────── */}
      {generating && (
        <div className="px-5 mb-5">
          <Card className="border-rose-100 shadow-sm">
            <CardContent className="pt-6 pb-6 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
              <p className="text-sm text-stone-500">{t('rec.generating')}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── No recommendations yet ─────────────────────────────────────────── */}
      {!generating && !rec && (
        <div className="px-5 mb-5">
          {facePhotos.length === 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4">
              {t('rec.noPhotos')}
            </p>
          )}
          <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 shadow-sm">
            <CardContent className="pt-6 pb-6 flex flex-col items-center gap-4 text-center">
              <Sparkles className="w-10 h-10 text-rose-400" />
              <div>
                <p className="text-base font-semibold text-stone-700 mb-1">{t('rec.generate')}</p>
                <p className="text-xs text-stone-500">{t('rec.generateSub')}</p>
              </div>
              <Button
                className="bg-rose-500 hover:bg-rose-600 text-white px-6"
                onClick={handleGenerate}
                disabled={generating}
              >
                {t('rec.generate')}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {!generating && rec && (
        <>
          {/* Refresh row */}
          <div className="px-5 mb-4 flex items-center justify-between">
            {rec.createdAt && (
              <p className="text-xs text-stone-400">
                {t('rec.lastUpdated').replace('{date}', format(new Date(rec.createdAt), 'MMM d, yyyy'))}
              </p>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-500 hover:text-rose-600 text-xs flex items-center gap-1 ms-auto"
              onClick={handleGenerate}
              disabled={generating}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t('rec.refresh')}
            </Button>
          </div>

          {/* ── Skin Analysis ──────────────────────────────────────────────── */}
          {rec.skinAnalysis && (
            <div className="px-5 mb-5">
              <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-3">
                {t('rec.skinAnalysis')}
              </h2>
              <Card className="border-rose-100 shadow-sm">
                <CardContent className="pt-4 pb-4">
                  {/* Skin type */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-stone-500 font-medium">{t('rec.skinType')}:</span>
                    <Badge className="bg-rose-100 text-rose-700 text-xs capitalize">
                      {rec.skinAnalysis.skinType}
                    </Badge>
                  </div>

                  {/* Assessment */}
                  {rec.skinAnalysis.overallAssessment && (
                    <p className="text-sm text-stone-600 mb-3">{rec.skinAnalysis.overallAssessment}</p>
                  )}

                  {/* Visible concerns */}
                  {rec.skinAnalysis.visibleConcerns.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-stone-500 font-medium mb-1.5">{t('rec.visibleConcerns')}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {rec.skinAnalysis.visibleConcerns.map((c, i) => (
                          <Badge key={i} variant="secondary" className="text-xs bg-stone-100 text-stone-600">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* High-level recommendations */}
                  {rec.skinAnalysis.recommendations.length > 0 && (
                    <ul className="space-y-1.5">
                      {rec.skinAnalysis.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-300 mt-1.5 shrink-0" />
                          <span className="text-sm text-stone-600">{r}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Routine Suggestions ────────────────────────────────────────── */}
          {rec.routineSuggestions.length > 0 && (
            <div className="px-5 mb-5">
              <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-3">
                {t('rec.routineTips')}
              </h2>
              <div className="space-y-3">
                {rec.routineSuggestions.map((s, i) => (
                  <Card key={i} className="border-rose-100 shadow-sm">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`text-xs ${suggestionBadgeColor(s.type)}`}>
                          {t(`rec.${s.type}`)}
                        </Badge>
                        <span className="text-sm font-semibold text-stone-700">{s.title}</span>
                      </div>
                      <p className="text-xs text-stone-500 mb-3">{s.description}</p>
                      {s.productPick && (
                        <div className="bg-stone-50 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
                          <span className="text-xs font-medium text-stone-700">{s.productPick.name}</span>
                          <a
                            href={iherbLink(s.productPick.iherbSearch)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              size="sm"
                              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-7 px-3 flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {t('rec.viewOnIherb')}
                            </Button>
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ── Product Picks ──────────────────────────────────────────────── */}
          {rec.productPicks.length > 0 && (
            <div className="px-5 mb-5">
              <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-3">
                {t('rec.productPicks')}
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {rec.productPicks.map((pick, i) => (
                  <Card key={i} className="border-rose-100 shadow-sm">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="text-sm font-semibold text-stone-700">{pick.name}</p>
                          {pick.brand && (
                            <p className="text-xs text-stone-400">{pick.brand}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs bg-stone-100 text-stone-500 shrink-0">
                          {pick.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-stone-500 mb-3">{pick.reason}</p>
                      <a
                        href={iherbLink(pick.iherbSearch)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          size="sm"
                          className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs flex items-center gap-1.5 w-full justify-center"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          {t('rec.viewOnIherb')}
                        </Button>
                      </a>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ── Log Insights ───────────────────────────────────────────────── */}
          {rec.logInsights && rec.logInsights.length > 0 && (
            <div className="px-5 mb-5">
              <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-3">
                {t('rec.logInsights')}
              </h2>
              <Card className="border-rose-100 shadow-sm">
                <CardContent className="pt-4 pb-4">
                  <ul className="space-y-2">
                    {rec.logInsights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 mt-1.5 shrink-0" />
                        <span className="text-sm text-stone-600">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Disclaimer ─────────────────────────────────────────────────── */}
          <div className="px-5 mb-8">
            <p className="text-[11px] text-stone-400 text-center leading-relaxed">
              {t('rec.disclaimer')}
            </p>
          </div>
        </>
      )}
    </AppShell>
  );
}
