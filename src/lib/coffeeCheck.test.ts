import { describe, expect, it } from 'vitest';
import { COFFEE_CHECK } from '../config/scoring.config';
import { dequantize, judgeCoffee, rgbaToRgb } from './coffeeCheck';

/** 1001 sınıflı model çıktısı: verilen sınıflara olasılık, gerisi 0. */
function probs(set: Record<number, number>): Float32Array {
  const p = new Float32Array(1001);
  for (const [i, v] of Object.entries(set)) p[Number(i)] = v;
  return p;
}
const C = COFFEE_CHECK.coffeeClasses;
const N = COFFEE_CHECK.neutralClasses;
const PIZZA = 963;
const WATER_BOTTLE = 899;

describe('fotoğrafta kahve kontrolü', () => {
  it('kahve sınıfları yeterliyse kahve', () => {
    expect(judgeCoffee(probs({ [C.espresso]: 0.95 }))).toBe('coffee');
    expect(judgeCoffee(probs({ [C.cup]: 0.05, [C.coffeeMug]: 0.05, [PIZZA]: 0.8 }))).toBe('coffee');
  });
  it('içecek kabı gibi görünen (nötr) sınıflar uyarı sebebi değil', () => {
    expect(judgeCoffee(probs({ [N.beerGlass]: 0.63, [WATER_BOTTLE]: 0.3 }))).toBe('coffee');
  });
  it('model başka bir şeyden eminse uyarı', () => {
    expect(judgeCoffee(probs({ [PIZZA]: 0.99 }))).toBe('unsure');
    expect(judgeCoffee(probs({ [WATER_BOTTLE]: 0.86 }))).toBe('unsure');
  });
  it('model emin değilse (karanlık/bulanık fotoğraf) uyarı yok', () => {
    expect(judgeCoffee(probs({ [PIZZA]: 0.2, [WATER_BOTTLE]: 0.2, 10: 0.2 }))).toBe('coffee');
    expect(judgeCoffee(new Float32Array(1001))).toBe('coffee');
  });
  it('"background" sınıfı (0) başka bir şey sayılmaz', () => {
    expect(judgeCoffee(probs({ 0: 0.9 }))).toBe('coffee');
  });
  it('nicemlenmiş çıktı 1/256 ölçekle olasılığa döner', () => {
    expect([...dequantize(new Uint8Array([0, 128, 255]))]).toEqual([0, 0.5, 255 / 256]);
  });
  it('RGBA pikseller RGB girdiye çevrilir (alfa atılır)', () => {
    expect([...rgbaToRgb(new Uint8Array([1, 2, 3, 255, 4, 5, 6, 0]), 2)]).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
