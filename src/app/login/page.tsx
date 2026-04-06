'use client';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useLocale } from '@/components/locale-provider';
import { Locale } from '@/lib/translations';

export default function LoginPage() {
  const { t, locale, setLocale } = useLocale();

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 to-white flex flex-col items-center justify-center px-6">
      {/* Language toggle */}
      <div className="absolute top-6 end-6 flex gap-1 bg-white rounded-full p-1 shadow-sm border border-rose-100">
        {(['en', 'he'] as Locale[]).map((l) => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              locale === l ? 'bg-rose-500 text-white' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {t(`lang.${l}`)}
          </button>
        ))}
      </div>

      <div className="text-center mb-12">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-semibold text-stone-800 mb-2">{t('app.name')}</h1>
        <p className="text-sm text-stone-500">{t('login.subtitle')}</p>
      </div>

      <div className="w-full max-w-xs space-y-4">
        <Button
          onClick={handleGoogleLogin}
          className="w-full h-12 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-xl shadow-sm text-sm font-medium"
        >
          <svg className="w-5 h-5 ltr:mr-3 rtl:ml-3" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {t('login.google')}
        </Button>
      </div>

      <p className="text-xs text-stone-400 mt-8 text-center max-w-xs">
        {t('login.sync')}
      </p>
    </div>
  );
}
