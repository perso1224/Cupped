import { requireOptionalNativeModule } from 'expo';

/** Widget'a veri yazan yerel modül. Eski derlemelerde (modül yokken) null: anlık güncelleme onlara da gider. */
type CuppedWidgetModule = {
  setData(json: string): boolean;
  /** Sonradan eklendi: ilk widget derlemesinde yok (çağırmadan önce varlığını kontrol et). */
  setImage?: (uri: string | null) => boolean;
};

export const CuppedWidget = requireOptionalNativeModule<CuppedWidgetModule>('CuppedWidget');
