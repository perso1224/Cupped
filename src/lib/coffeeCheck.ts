import { COFFEE_CHECK } from '../config/scoring.config';
import type { PhotoCheck } from './types';

/**
 * Fotoğrafta kahve kontrolünün karar kısmı (saf, testli). Modeli çalıştıran kısım coffeeCheckRunner.ts'te.
 *
 * - 'coffee': kahve gibi görünüyor ya da emin değiliz → uyarı yok
 * - 'unsure': model başka bir şeyden emin → "Bu kahveye benzemiyor" notu (kayıt engellenmez)
 */

const COFFEE = Object.values(COFFEE_CHECK.coffeeClasses) as number[];
const NEUTRAL = Object.values(COFFEE_CHECK.neutralClasses) as number[];

/** Model çıktısını (her sınıf için 0-1 olasılık) karara çevirir. */
export function judgeCoffee(probs: ArrayLike<number>): Exclude<PhotoCheck, 'skipped'> {
  let coffee = 0;
  for (const i of COFFEE) coffee += probs[i] ?? 0;
  if (coffee >= COFFEE_CHECK.minCoffee) return 'coffee';
  let neutral = 0;
  for (const i of NEUTRAL) neutral += probs[i] ?? 0;
  if (coffee + neutral >= COFFEE_CHECK.minDrinkLike) return 'coffee';
  const skip = new Set([0, ...COFFEE, ...NEUTRAL]);
  let other = 0;
  for (let i = 0; i < probs.length; i++) if (!skip.has(i) && probs[i] > other) other = probs[i];
  return other >= COFFEE_CHECK.minOtherConfidence ? 'unsure' : 'coffee';
}

/** Nicemlenmiş (uint8) model çıktısını olasılığa çevirir. MobileNet quant: ölçek 1/256, sıfır noktası 0. */
export function dequantize(out: Uint8Array): Float32Array {
  const p = new Float32Array(out.length);
  for (let i = 0; i < out.length; i++) p[i] = out[i] / 256;
  return p;
}

/** RGBA piksel dizisini modelin istediği RGB (uint8, 224×224×3) girdisine çevirir. */
export function rgbaToRgb(rgba: Uint8Array, pixels: number): Uint8Array {
  const rgb = new Uint8Array(pixels * 3);
  for (let i = 0, j = 0; i < pixels; i++, j += 4) {
    rgb[i * 3] = rgba[j];
    rgb[i * 3 + 1] = rgba[j + 1];
    rgb[i * 3 + 2] = rgba[j + 2];
  }
  return rgb;
}
