import { useEffect, useState } from 'react';
import type { Settings } from './settings';
import { cachedSettings, loadSettings, subscribeSettings } from './storage';

export function useSettings(): Settings {
  const [s, setS] = useState<Settings>(cachedSettings());
  useEffect(() => {
    loadSettings().then(setS);
    return subscribeSettings(setS);
  }, []);
  return s;
}
