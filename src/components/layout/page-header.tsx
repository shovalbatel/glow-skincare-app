'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/components/auth-provider';
import { LogOut } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  showUser?: boolean;
}

export function PageHeader({ title, subtitle, action, showUser = false }: PageHeaderProps) {
  const { user, signOut } = useAuth();

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
        {showUser && user && (
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 group"
            title="Sign out"
          >
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
          </button>
        )}
      </div>
    </div>
  );
}
