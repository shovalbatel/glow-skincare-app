'use client';

import { useState, useEffect, useRef } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/components/auth-provider';
import { useLocale } from '@/components/locale-provider';
import { Locale } from '@/lib/translations';
import {
  fetchSkinProfile,
  saveSkinProfile,
  fetchFacePhotosWithDates,
  uploadFacePhoto,
  saveFacePhotoRecord,
} from '@/lib/store';
import { SkinGoal, SkinConcern } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import { format } from 'date-fns';

const ALL_GOALS: SkinGoal[] = [
  'anti_aging',
  'hydration',
  'acne_control',
  'even_tone',
  'glow',
  'pore_minimizing',
  'reduce_redness',
  'sun_protection',
];

const ALL_CONCERNS: SkinConcern[] = [
  'dryness',
  'oily_skin',
  'acne',
  'dark_spots',
  'wrinkles',
  'redness',
  'dull_skin',
  'large_pores',
  'sensitivity',
];

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { t, locale, setLocale } = useLocale();

  const [goals, setGoals] = useState<SkinGoal[]>([]);
  const [concerns, setConcerns] = useState<SkinConcern[]>([]);
  const [profileSaved, setProfileSaved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [photos, setPhotos] = useState<Array<{ url: string; date: string }>>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    fetchSkinProfile(user.id).then(({ goals: g, concerns: c }) => {
      setGoals(g as SkinGoal[]);
      setConcerns(c as SkinConcern[]);
    });

    fetchFacePhotosWithDates(user.id).then(setPhotos);
  }, [user]);

  const toggleGoal = (goal: SkinGoal) => {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
    setProfileSaved(false);
  };

  const toggleConcern = (concern: SkinConcern) => {
    setConcerns((prev) =>
      prev.includes(concern) ? prev.filter((c) => c !== concern) : [...prev, concern]
    );
    setProfileSaved(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    await saveSkinProfile(user.id, goals, concerns);
    setSavingProfile(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handlePhotoUpload = async (file: File) => {
    if (!user) return;
    setUploadingPhoto(true);
    try {
      const { storagePath, publicUrl } = await uploadFacePhoto(user.id, file);
      await saveFacePhotoRecord(user.id, storagePath, publicUrl);
      const updated = await fetchFacePhotosWithDates(user.id);
      setPhotos(updated);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onPhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoUpload(file);
  };

  if (!user) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse text-rose-300">{t('common.loading')}</div>
        </div>
      </AppShell>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const fullName = (user.user_metadata?.full_name as string) || user.email || '';
  const email = user.email || '';

  return (
    <AppShell>
      <PageHeader title={t('profile.title')} />

      {/* Account Card */}
      <div className="px-5 mb-5">
        <Card className="border-rose-100 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">
              {t('profile.account')}
            </h2>
            <div className="flex items-center gap-4 mb-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full object-cover ring-2 ring-rose-100"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center text-2xl font-semibold text-rose-400">
                  {fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-base font-semibold text-stone-800 truncate">{fullName}</p>
                <p className="text-sm text-stone-500 truncate">{email}</p>
              </div>
            </div>
            <Button
              onClick={signOut}
              variant="outline"
              className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              {t('profile.signOut')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Skin Profile Card */}
      <div className="px-5 mb-5">
        <Card className="border-rose-100 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">
              {t('profile.skinProfile')}
            </h2>

            {/* Goals */}
            <p className="text-sm font-medium text-stone-700 mb-2">{t('onboard.goals.title')}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {ALL_GOALS.map((goal) => (
                <button
                  key={goal}
                  onClick={() => toggleGoal(goal)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                    goals.includes(goal)
                      ? 'bg-rose-500 text-white'
                      : 'bg-stone-100 text-stone-500 hover:bg-rose-50'
                  }`}
                >
                  {t(`onboard.goals.${goal}`)}
                </button>
              ))}
            </div>

            {/* Concerns */}
            <p className="text-sm font-medium text-stone-700 mb-2">{t('onboard.concerns.title')}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {ALL_CONCERNS.map((concern) => (
                <button
                  key={concern}
                  onClick={() => toggleConcern(concern)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                    concerns.includes(concern)
                      ? 'bg-rose-500 text-white'
                      : 'bg-stone-100 text-stone-500 hover:bg-rose-50'
                  }`}
                >
                  {t(`onboard.concerns.${concern}`)}
                </button>
              ))}
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className={`w-full transition-all ${
                profileSaved
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-rose-500 hover:bg-rose-600 text-white'
              }`}
            >
              {profileSaved ? t('profile.saved') : t('profile.saveChanges')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Face Photos Timeline Card */}
      <div className="px-5 mb-5">
        <Card className="border-rose-100 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                {t('profile.skinJourney')}
              </h2>
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600 disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5" />
                {uploadingPhoto ? t('common.loading') : t('profile.addPhoto')}
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onPhotoFileChange}
              />
            </div>

            {photos.length === 0 ? (
              <p className="text-xs text-stone-400 italic text-center py-4">
                {t('profile.noPhotos')}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <img
                      src={photo.url}
                      alt={`Skin photo ${i + 1}`}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                    <span className="text-[10px] text-stone-400">
                      {format(new Date(photo.date), 'MMM d, yyyy')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Language Card */}
      <div className="px-5 mb-5">
        <Card className="border-rose-100 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">
              {t('profile.language')}
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => setLocale('en')}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                  locale === 'en'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-500 hover:bg-rose-50'
                }`}
              >
                {t('lang.en')}
              </button>
              <button
                onClick={() => setLocale('he')}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                  locale === 'he'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-500 hover:bg-rose-50'
                }`}
              >
                {t('lang.he')}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* App Info */}
      <div className="px-5 mb-8 text-center">
        <p className="text-xs text-stone-400 mb-1">{t('profile.appInfo')}</p>
        <p className="text-xs text-stone-400">{t('profile.disclaimer')}</p>
      </div>
    </AppShell>
  );
}
