import { useEffect, useState } from 'react';
import type { Profile } from './onboarding';
import { cachedProfile, loadProfile, subscribeProfile } from './storage';

/** undefined = yükleniyor, null = tanıtım yapılmamış. */
export function useProfile(): Profile | null | undefined {
  const [profile, setProfile] = useState<Profile | null | undefined>(cachedProfile());
  useEffect(() => {
    loadProfile().then(setProfile);
    return subscribeProfile(setProfile);
  }, []);
  return profile;
}
