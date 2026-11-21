import type { RefObject } from 'react';
import { PixelRatio, Share } from 'react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import type { ShareSource } from './metrics';
import { bumpCounter, recordShare } from './storage';

/** Instagram Story / WhatsApp durumu için standart boyut (piksel). */
export const STORY_PX = { width: 1080, height: 1920 } as const;

function asFileUrl(uri: string) {
  return uri.startsWith('file://') ? uri : `file://${uri}`;
}

/**
 * 9:16 bir görünümü 1080x1920 görsel olarak kaydedip iOS paylaşım sayfasını açar.
 * Paylaşımın gerçekten tamamlanıp tamamlanmadığı ve hangi uygulamaya gittiği kaydedilir (H2).
 * @returns paylaşım tamamlandıysa true
 */
export async function shareViewAsImage(ref: RefObject<any>, source: ShareSource, cupId?: string): Promise<boolean> {
  const scale = PixelRatio.get();
  const uri = await captureRef(ref, {
    format: 'jpg',
    quality: 0.92,
    result: 'tmpfile',
    width: STORY_PX.width / scale,
    height: STORY_PX.height / scale,
  });
  recordShare(source, 'tap').catch(() => {});
  try {
    const res = await Share.share({ url: asFileUrl(uri) });
    if (res.action === Share.sharedAction) {
      await recordShare(source, 'completed', res.activityType, cupId).catch(() => {});
      bumpCounter('shares').catch(() => {});
      return true;
    }
    return false;
  } finally {
    try {
      releaseCapture(uri);
    } catch {
      // geçici dosya temizlenemese de sorun değil
    }
  }
}

/** Herhangi bir dosyayı (ör. veri yedeği) paylaşım sayfasıyla gönderir. */
export async function shareFile(uri: string): Promise<boolean> {
  const res = await Share.share({ url: asFileUrl(uri) });
  return res.action === Share.sharedAction;
}
