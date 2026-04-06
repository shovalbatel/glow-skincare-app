'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { useLocale } from '@/components/locale-provider';
import { Locale } from '@/lib/translations';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  showUser?: boolean;
}

export function PageHeader({ title, subtitle, action, showUser = false }: PageHeaderProps) {
  const { user } = useAuth();
  const { locale, setLocale } = useLocale();

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const name = (user?.user_metadata?.full_name as string) || user?.email || '';
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="flex items-start justify-between px-5 pt-12 pb-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-stone-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1">
        {action}
        {/* Language toggle */}
        <div className="flex gap-0.5 bg-stone-100 rounded-full p-0.5">
          {(['en', 'he'] as Locale[]).map((l) => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                locale === l ? 'bg-rose-500 text-white' : 'text-stone-400'
              }`}
            >
              {l === 'en' ? 'EN' : 'HE'}
            </button>
          ))}
        </div>
        {showUser && user && (
          <Link href="/profile" className="flex items-center gap-1.5 group">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="w-8 h-8 rounded-full ring-2 ring-rose-200 group-hover:ring-rose-400 transition-all"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-rose-200 text-rose-600 flex items-center justify-center text-xs font-semibold ring-2 ring-rose-200 group-hover:ring-rose-400 transition-all">
                {initial}
              </div>
            )}
          </Link>
        )}
      </div>
    </div>
  );
}
