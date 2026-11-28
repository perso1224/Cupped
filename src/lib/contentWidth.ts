import { useWindowDimensions } from 'react-native';

/**
 * iPad (ve geniş ekran) uyarlaması: uygulamanın içeriği en fazla bu genişlikte, ekranın ortasında durur.
 * Telefonlarda (≤ 640 pt) hiçbir şey değişmez. Kartlar, listeler ve paylaşım görselleri iPad'de
 * yayılıp bozulmasın diye tek kural.
 */
export const CONTENT_MAX = 640;

/** Ekranın iki yanında bırakılacak boşluk (telefonda 0). */
export function sidePad(windowWidth: number): number {
  return Math.max(0, Math.round((windowWidth - CONTENT_MAX) / 2));
}

/** useWindowDimensions gibi, ama genişlik içerik alanının genişliği (iPad'de en fazla CONTENT_MAX). */
export function useContentSize(): { width: number; height: number } {
  const { width, height } = useWindowDimensions();
  return { width: Math.min(width, CONTENT_MAX), height };
}
