'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AppState, Product, SkinCondition, SkinFeeling, RoutineDay } from '@/lib/types';
import {
  loadState,
  addProduct as storeAddProduct,
  updateProduct as storeUpdateProduct,
  deleteProduct as storeDeleteProduct,
  addOrUpdateLog as storeAddOrUpdateLog,
  updateRoutineDays as storeUpdateRoutineDays,
  checkOnboardingStatus,
} from '@/lib/store';
import { useAuth } from '@/components/auth-provider';

export function useAppState() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<AppState | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const s = await loadState();
    setState(s);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setState(null);
      return;
    }

    checkOnboardingStatus(user.id).then((completed) => {
      if (!completed && pathname !== '/onboard') {
        router.push('/onboard');
        return;
      }
      refresh();
    });
  }, [user, refresh, pathname, router]);

  const doAddProduct = useCallback(
    async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | undefined> => {
      if (!user) return undefined;
      const id = await storeAddProduct(user.id, product);
      await refresh();
      return id;
    },
    [user, refresh]
  );

  const doUpdateProduct = useCallback(
    async (id: string, updates: Partial<Product>) => {
      await storeUpdateProduct(id, updates);
      await refresh();
    },
    [refresh]
  );

  const doDeleteProduct = useCallback(
    async (id: string) => {
      await storeDeleteProduct(id);
      await refresh();
    },
    [refresh]
  );

  const doSaveLog = useCallback(
    async (log: {
      date: string;
      amCompleted: boolean;
      pmCompleted: boolean;
      amProducts: string[];
      pmProducts: string[];
      skinFeeling: SkinFeeling;
      skinConditions: SkinCondition[];
      notes: string;
    }) => {
      if (!user) return;
      await storeAddOrUpdateLog(user.id, log);
      await refresh();
    },
    [user, refresh]
  );

  const doUpdateRoutine = useCallback(
    async (days: RoutineDay[], cycleLength: number) => {
      if (!user) return;
      await storeUpdateRoutineDays(user.id, days, cycleLength);
      await refresh();
    },
    [user, refresh]
  );

  return {
    state,
    addProduct: doAddProduct,
    updateProduct: doUpdateProduct,
    deleteProduct: doDeleteProduct,
    saveLog: doSaveLog,
    updateRoutine: doUpdateRoutine,
  };
}
