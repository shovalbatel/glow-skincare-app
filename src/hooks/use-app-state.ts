'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  AppState,
  Product,
  SkinCondition,
  SkinFeeling,
  RoutineDay,
  JournalEntry,
  JournalKind,
  CurrentState,
  NightRotation,
} from '@/lib/types';
import {
  loadState,
  addProduct as storeAddProduct,
  updateProduct as storeUpdateProduct,
  deleteProduct as storeDeleteProduct,
  addOrUpdateLog as storeAddOrUpdateLog,
  updateRoutineDays as storeUpdateRoutineDays,
  addJournalEntry as storeAddJournalEntry,
  updateJournalEntry as storeUpdateJournalEntry,
  saveCurrentState as storeSaveCurrentState,
  saveNightRotation as storeSaveNightRotation,
  advanceRotation as storeAdvanceRotation,
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
    async (days: RoutineDay[]) => {
      if (!user) return;
      await storeUpdateRoutineDays(user.id, days);
      await refresh();
    },
    [user, refresh]
  );

  const doAddJournalEntry = useCallback(
    async (entry: {
      kind: JournalKind;
      title?: string;
      body: string;
      status?: string;
      tags?: string[];
      entryDate?: string | null;
    }): Promise<string | undefined> => {
      if (!user) return undefined;
      const id = await storeAddJournalEntry(user.id, entry);
      await refresh();
      return id;
    },
    [user, refresh]
  );

  const doUpdateJournalEntry = useCallback(
    async (id: string, updates: Partial<Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>>) => {
      await storeUpdateJournalEntry(id, updates);
      await refresh();
    },
    [refresh]
  );

  const doSaveCurrentState = useCallback(
    async (cs: CurrentState) => {
      if (!user) return;
      await storeSaveCurrentState(user.id, cs);
      await refresh();
    },
    [user, refresh]
  );

  /** Advance the night rotation to the next protocol. */
  const doAdvanceRotation = useCallback(async () => {
    if (!user || !state) return;
    await storeAdvanceRotation(user.id, state.nightRotation);
    await refresh();
  }, [user, state, refresh]);

  const doSaveNightRotation = useCallback(
    async (rotation: NightRotation) => {
      if (!user) return;
      await storeSaveNightRotation(user.id, rotation);
      await refresh();
    },
    [user, refresh]
  );

  return {
    state,
    refresh,
    addProduct: doAddProduct,
    updateProduct: doUpdateProduct,
    deleteProduct: doDeleteProduct,
    saveLog: doSaveLog,
    updateRoutine: doUpdateRoutine,
    addJournalEntry: doAddJournalEntry,
    updateJournalEntry: doUpdateJournalEntry,
    saveCurrentState: doSaveCurrentState,
    advanceRotation: doAdvanceRotation,
    saveNightRotation: doSaveNightRotation,
  };
}
