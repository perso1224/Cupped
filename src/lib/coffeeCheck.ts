import { COFFEE_CHECK } from '../config/scoring.config';
import type { PhotoCheck } from './types';

/**
 * Fotoğrafta kahve kontrolünün karar kısmı (saf, testli). Modeli çalıştıran kısım coffeeCheckRunner.ts'te.
 *
 * - 'coffee': kahve (ya da kahve bardağı gibi bir içecek kabı) olasılığı yeterli → uyarı yok
 * - 'unsure': kahve olasılığı çok düşük → "Bu kahveye benzemiyor" notu (kayıt engellenmez)
 *
 * Eşikler gerçek fotoğraflarla ayarlandı (7 kahve, 10 kahve olmayan; bkz. assets/models/README.md).
 */

const COFFEE = Object.values(COFFEE_CHECK.coffeeClasses) as number[];
const NEUTRAL = Object.values(COFFEE_CHECK.neutralClasses) as number[];

/** Model çıktısını (her sınıf için 0-1 olasılık; 1001 sınıf, 0 = "arka plan") karara çevirir. */
export function judgeCoffee(probs: ArrayLike<number>): Exclude<PhotoCheck, 'skipped'> {
  let coffee = 0;
  for (const i of COFFEE) coffee += probs[i] ?? 0;
  if (coffee >= COFFEE_CHECK.minCoffee) return 'coffee';
  let neutral = 0;
  for (const i of NEUTRAL) neutral += probs[i] ?? 0;
  return coffee + neutral >= COFFEE_CHECK.minDrinkLike ? 'coffee' : 'unsure';
}

/**
 * 1000 sınıflı modellerin (EfficientNet-Lite) çıktısını, sınıf numaralarımızın dayandığı 1001 sınıflı
 * düzene (başta "arka plan") kaydırır. Zaten 1001 ise olduğu gibi döner.
 */
export function toImagenet1001(p: Float32Array): Float32Array {
  if (p.length !== 1000) return p;
  const out = new Float32Array(1001);
  out.set(p, 1);
  return out;
}

/** Nicemlenmiş (uint8) model çıktısını olasılığa çevirir. EfficientNet-Lite0 int8: ölçek 1/256, sıfır noktası 0. */
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
