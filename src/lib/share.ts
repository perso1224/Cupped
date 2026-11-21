import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { PixelRatio } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { bumpCounter } from './storage';

/** Instagram Story / WhatsApp durumu için standart boyut (piksel). */
export const STORY_PX = { width: 1080, height: 1920 } as const;

/**
 * 9:16 bir görünümü tam 1080x1920 piksel PNG olarak kaydedip iOS paylaşım sayfasını açar.
 * Görünüm 9:16 oranında olmalı; boyut ayarı cihazın piksel yoğunluğuna göre yapılır.
 */
export async function shareViewAsImage(ref: RefObject<any>): Promise<void> {
  const scale = PixelRatio.get();
  const uri = await captureRef(ref, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
    width: STORY_PX.width / scale,
    height: STORY_PX.height / scale,
  });
  await bumpCounter('shares');
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
}
