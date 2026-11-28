import { createContext, useContext } from 'react';
import { useWindowDimensions } from 'react-native';

/**
 * iPad (ve geniş ekran) uyarlaması: uygulamanın içeriği en fazla bu genişlikte, ekranın ortasında durur.
 * Telefonlarda (≤ 640 pt) hiçbir şey değişmez. Kartlar, listeler ve paylaşım görselleri iPad'de
 * yayılıp bozulmasın diye tek kural.
 */
export const CONTENT_MAX = 640;

/** Tablet (iPad, Android tablet): menü solda yüzen dikey kapsül olur. */
export const WIDE_MIN = 700;
export const isWide = (windowWidth: number) => windowWidth >= WIDE_MIN;

/** Ekranın iki yanında bırakılacak boşluk (telefonda 0). */
export function sidePad(windowWidth: number): number {
  return Math.max(0, Math.round((windowWidth - CONTENT_MAX) / 2));
}

/** useWindowDimensions gibi, ama genişlik içerik alanının genişliği (iPad'de en fazla CONTENT_MAX). */
export function useContentSize(): { width: number; height: number } {
  const { width, height } = useWindowDimensions();
  // Tablette soldaki menü yer kaplar: içerik alanı ondan dar olabilir (iPad mini dikey)
  const avail = isWide(width) ? width - 2 * SIDE_BAR_SPACE : width;
  return { width: Math.min(avail, CONTENT_MAX), height };
}

/** Tablette sekme ekranlarında solda yüzen dikey menünün kapladığı yer (menü + kenar boşlukları). */
export const SIDE_BAR_SPACE = 104;

/** Sekme ekranları bu bağlamı açar: tablette içerik, soldaki yüzen menünün altında kalmasın. */
export const InTabsContext = createContext(false);

/**
 * Sayfanın kaydırma alanına eklenecek yan boşluk. Kaydırma alanı ekranın tamamını kaplar (her yerinden
 * kaydırılabilir), içerik ise bu boşlukla ortada durur. Telefonda 0.
 */
export function usePagePad(): number {
  const { width } = useWindowDimensions();
  const inTabs = useContext(InTabsContext);
  const pad = sidePad(width);
  return inTabs && isWide(width) ? Math.max(pad, SIDE_BAR_SPACE) : pad;
}
