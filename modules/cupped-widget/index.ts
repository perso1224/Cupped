import { requireOptionalNativeModule } from 'expo';

/** Widget'a veri yazan yerel modül. Eski derlemelerde (modül yokken) null: anlık güncelleme onlara da gider. */
type CuppedWidgetModule = { setData(json: string): boolean };

export const CuppedWidget = requireOptionalNativeModule<CuppedWidgetModule>('CuppedWidget');
