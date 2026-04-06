'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, PenSquare, CalendarDays, ShoppingBag, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/components/locale-provider';

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  const NAV_ITEMS = [
    { href: '/', icon: Home, label: t('nav.today') },
    { href: '/products', icon: Package, label: t('nav.products') },
    { href: '/log', icon: PenSquare, label: t('nav.log') },
    { href: '/routine', icon: CalendarDays, label: t('nav.routine') },
    { href: '/shopping', icon: ShoppingBag, label: t('nav.shop') },
    { href: '/insights', icon: BarChart3, label: t('nav.insights') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-rose-100">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors min-w-[48px]',
                isActive ? 'text-rose-600' : 'text-stone-400 hover:text-stone-600'
              )}
            >
              <item.icon className={cn('w-5 h-5', isActive && 'stroke-[2.5px]')} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
