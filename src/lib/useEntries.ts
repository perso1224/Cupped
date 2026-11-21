import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { loadEntries } from './storage';
import type { CupEntry } from './types';

/** Ekran her görünür olduğunda kayıtları telefondan yeniden okur. */
export function useEntries() {
  const [entries, setEntries] = useState<CupEntry[] | null>(null);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadEntries().then((list) => alive && setEntries(list));
      return () => {
        alive = false;
      };
    }, []),
  );
  return entries;
}
