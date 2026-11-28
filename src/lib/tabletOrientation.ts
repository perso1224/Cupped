import { Dimensions, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

/**
 * Android tabletlerde yatay ekran: Android'de yön ayarı (app.json "portrait") telefon ve tablet için ortaktır.
 * Uygulama açılırken cihaz tabletse (kısa kenarı ≥ 600 dp) kilit kaldırılır; telefonlar dikey kalır.
 * iPhone/iPad Info.plist'ten yönetilir (iPad dört yön, iPhone dikey), burada dokunulmaz.
 * Eski derlemede modül yoksa sessizce hiçbir şey yapmaz.
 */
export function unlockTabletOrientation() {
  if (Platform.OS !== 'android') return;
  const { width, height } = Dimensions.get('screen');
  if (Math.min(width, height) < 600) return;
  if (!requireOptionalNativeModule('ExpoScreenOrientation')) return;
  // Modül varsa yükle (yoksa yukarıda çıktık; eski derlemede hata vermesin)
  import('expo-screen-orientation')
    .then((SO) => SO.unlockAsync())
    .catch(() => {});
}
