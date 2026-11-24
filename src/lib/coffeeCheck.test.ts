import { describe, expect, it } from 'vitest';
import { COFFEE_CHECK } from '../config/scoring.config';
import { dequantize, judgeCoffee, rgbaToRgb, toImagenet1001 } from './coffeeCheck';

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
  it('kahve olasılığı çok düşükse uyarı (model başka şeyden emin olmasa da)', () => {
    expect(judgeCoffee(probs({ [PIZZA]: 0.99 }))).toBe('unsure');
    expect(judgeCoffee(probs({ [PIZZA]: 0.2, [WATER_BOTTLE]: 0.2, 10: 0.2 }))).toBe('unsure');
    expect(judgeCoffee(probs({ [C.cup]: 0.035, [N.pitcher]: 0.1 }))).toBe('unsure'); // tencere fotoğrafındaki değerler
  });
  it('düşük ama eşiğin üstündeki kahve olasılığı (bardakta buzlu kahve) kahve sayılır', () => {
    expect(judgeCoffee(probs({ [C.cup]: 0.098, [PIZZA]: 0.2 }))).toBe('coffee');
  });
  it('1000 sınıflı çıktı 1001 düzenine kayar', () => {
    const p = new Float32Array(1000);
    p[C.espresso - 1] = 0.9;
    const q = toImagenet1001(p);
    expect(q.length).toBe(1001);
    expect(q[C.espresso]).toBeCloseTo(0.9);
    expect(q[0]).toBe(0);
    expect(toImagenet1001(new Float32Array(1001)).length).toBe(1001);
  });
  it('nicemlenmiş çıktı 1/256 ölçekle olasılığa döner', () => {
    expect([...dequantize(new Uint8Array([0, 128, 255]))]).toEqual([0, 0.5, 255 / 256]);
  });
  it('RGBA pikseller RGB girdiye çevrilir (alfa atılır)', () => {
    expect([...rgbaToRgb(new Uint8Array([1, 2, 3, 255, 4, 5, 6, 0]), 2)]).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
