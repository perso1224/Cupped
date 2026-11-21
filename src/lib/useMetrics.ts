import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import type { Metrics } from './metrics';
import { loadMetrics } from './storage';

/** Ekran her görünür olduğunda ölçüm verisini okur. reload() ile elle tazelenir. */
export function useMetrics(): [Metrics | null, () => void] {
  const [m, setM] = useState<Metrics | null>(null);
  const reload = useCallback(() => {
    loadMetrics().then(setM);
  }, []);
  useFocusEffect(reload);
  return [m, reload];
}
