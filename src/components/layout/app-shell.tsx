'use client';

import { ReactNode } from 'react';
import { BottomNav } from './bottom-nav';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 to-white">
      <main className="max-w-lg mx-auto pb-32">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
