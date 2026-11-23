import type { RefObject } from 'react';
import * as Sharing from 'expo-sharing';
import { Alert, Linking, PixelRatio, Platform, Share } from 'react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import { INSTAGRAM } from '../config/brand';
import { tr } from '../i18n/tr';
import { colors } from '../theme';
import type { ShareSource } from './metrics';
import { bumpCounter, recordShare } from './storage';

type RNShareModule = typeof import('react-native-share');
let rnShare: RNShareModule | null | undefined;

/** react-native-share, güvenli şekilde: yerel parçası olmayan derlemede (Expo Go, eski sürüm) null. */
function shareModule(): RNShareModule | null {
  if (rnShare !== undefined) return rnShare;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    rnShare = require('react-native-share') as RNShareModule;
  } catch {
    rnShare = null;
  }
  return rnShare;
}

/** Instagram Hikayesi'ne doğrudan paylaşım bu telefonda mümkün mü? (kimlik tanımlı, modül var, Instagram yüklü) */
export async function instagramStoryAvailable(): Promise<boolean> {
  if (!INSTAGRAM.appId || Platform.OS === 'web') return false;
  const mod = shareModule();
  if (!mod) return false;
  try {
    if (Platform.OS === 'ios') return await Linking.canOpenURL('instagram-stories://share');
    return (await mod.default.isPackageInstalled('com.instagram.android')).isInstalled;
  } catch {
    return false;
  }
}

/** Görseli Instagram Hikayesi düzenleyicisinde açar (kart tam ekran arka plan olur). */
async function shareToInstagramStory(fileUrl: string): Promise<void> {
  const mod = shareModule();
  if (!mod) throw new Error('react-native-share yok');
  await mod.default.shareSingle({
    social: mod.Social.InstagramStories,
    appId: INSTAGRAM.appId,
    backgroundImage: fileUrl,
    backgroundTopColor: colors.bg,
    backgroundBottomColor: colors.bg,
  });
}

type Target = 'story' | 'other' | 'cancel';

/** Instagram varsa nereye paylaşılacağını sorar (iOS ve Android'de aynı: sistem uyarı penceresi). */
async function chooseTarget(): Promise<Target> {
  if (!(await instagramStoryAvailable())) return 'other';
  return new Promise((resolve) => {
    Alert.alert(
      tr.result.shareWhere,
      undefined,
      [
        { text: tr.result.shareInstagramStory, onPress: () => resolve('story') },
        { text: tr.result.shareOtherApps, onPress: () => resolve('other') },
        { text: tr.result.shareCancel, style: 'cancel', onPress: () => resolve('cancel') },
      ],
      { cancelable: true, onDismiss: () => resolve('cancel') },
    );
  });
}

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
export async function shareViewAsImage(ref: RefObject<unknown>, source: ShareSource, cupId?: string): Promise<boolean> {
  const scale = PixelRatio.get();
  // Kart bileşenleri farklı ref türleri taşır (View ya da CardHandle); view-shot hepsini kabul eder
  const uri = await captureRef(ref as Parameters<typeof captureRef>[0], {
    format: 'jpg',
    quality: 0.92,
    result: 'tmpfile',
    width: STORY_PX.width / scale,
    height: STORY_PX.height / scale,
  });
  recordShare(source, 'tap').catch(() => {});
  // Android'de Instagram dosyayı paylaşımdan sonra okur: o yolda geçici dosya hemen silinmemeli.
  let keepFile = false;
  try {
    const target = await chooseTarget();
    if (target === 'cancel') return false;
    if (target === 'story') {
      keepFile = Platform.OS === 'android';
      await shareToInstagramStory(asFileUrl(uri));
      await recordShare(source, 'completed', 'instagram-stories', cupId).catch(() => {});
      bumpCounter('shares').catch(() => {});
      return true;
    }
    const done = await shareFileUrl(asFileUrl(uri), 'image/jpeg');
    if (done.shared) {
      await recordShare(source, 'completed', done.activityType, cupId).catch(() => {});
      bumpCounter('shares').catch(() => {});
      return true;
    }
    return false;
  } finally {
    try {
      if (!keepFile) releaseCapture(uri);
    } catch {
      // geçici dosya temizlenemese de sorun değil
    }
  }
}

/**
 * shareViewAsImage, hata fırlatmadan: başarısızsa 'error' döner. Ekranlarda try/finally gerekmesin diye
 * (React Compiler try/finally içeren bileşenleri optimize edemiyor).
 */
export async function shareViewSafely(ref: RefObject<unknown>, source: ShareSource, cupId?: string): Promise<'shared' | 'cancelled' | 'error'> {
  try {
    return (await shareViewAsImage(ref, source, cupId)) ? 'shared' : 'cancelled';
  } catch {
    return 'error';
  }
}

/** Herhangi bir dosyayı (ör. veri yedeği) paylaşım sayfasıyla gönderir. */
export async function shareFile(uri: string, mimeType = 'application/json'): Promise<boolean> {
  return (await shareFileUrl(asFileUrl(uri), mimeType)).shared;
}

/**
 * Dosya paylaşımı. iOS: sistem paylaşım sayfası (hangi uygulamaya gittiği de öğrenilir).
 * Android: React Native'in Share'i dosya göndermez (yalnızca metin), bu yüzden expo-sharing.
 * Android paylaşımın tamamlanıp tamamlanmadığını bildirmez; pencere kapanınca paylaşıldı sayılır.
 */
async function shareFileUrl(url: string, mimeType: string): Promise<{ shared: boolean; activityType?: string | null }> {
  if (Platform.OS === 'android') {
    await Sharing.shareAsync(url, { mimeType });
    return { shared: true, activityType: null };
  }
  const res = await Share.share({ url });
  return { shared: res.action === Share.sharedAction, activityType: res.activityType };
}
