'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Moon } from 'lucide-react';
import { useLocale } from '@/components/locale-provider';

/**
 * Floating action button that opens Luna, the skincare agent.
 * Rendered globally by the AppShell; hidden on the agent page itself and on
 * full-screen flows (onboarding / login) where the bottom nav isn't shown.
 */
const HIDDEN_ON = ['/agent', '/onboard', '/login'];

export function AgentFab() {
  const pathname = usePathname();
  const { t } = useLocale();

  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <Link
      href="/agent"
      aria-label={t('agent.name')}
      className="fixed z-50 bottom-24 end-4 flex items-center gap-2 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 text-white ps-2 pe-4 py-2 shadow-lg shadow-rose-500/30 ring-4 ring-white/60 hover:scale-105 active:scale-95 transition-transform"
    >
      <span className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white/20">
        <Moon className="w-5 h-5" />
        <span className="absolute -top-0.5 -end-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
      </span>
      <span className="text-sm font-semibold pe-0.5">{t('agent.name')}</span>
    </Link>
  );
}
