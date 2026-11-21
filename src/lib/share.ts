import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { captureRef } from 'react-native-view-shot';
import { bumpCounter } from './storage';

/** Ekrandaki bir kartı PNG'ye çevirip iOS paylaşım sayfasını açar. */
export async function shareViewAsImage(ref: RefObject<any>): Promise<void> {
  const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
  await bumpCounter('shares');
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
}
