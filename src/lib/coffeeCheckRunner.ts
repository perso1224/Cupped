import { Platform } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'jpeg-js';
import { dequantize, judgeCoffee, rgbaToRgb, toImagenet1001 } from './coffeeCheck';
import type { PhotoCheck } from './types';

/**
 * Fotoğrafta kahve kontrolü: modeli telefonda çalıştırır (internet yok, ücret yok).
 * Yerel modül bu derlemede yoksa (Expo Go, eski TestFlight derlemesi, web) hiçbir şey çökmez: null döner.
 */

type Tflite = typeof import('react-native-fast-tflite');
type Model = Awaited<ReturnType<Tflite['loadTensorflowModel']>>;

const SIZE = 224;
let modelPromise: Promise<Model | null> | null = null;

function loadModel(): Promise<Model | null> {
  if (modelPromise) return modelPromise;
  modelPromise = (async () => {
    if (Platform.OS === 'web') return null;
    try {
      // Yerel parça yoksa içe aktarma hata fırlatır; bu yüzden try içinde ve ilk kullanımda yüklenir.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const tflite = require('react-native-fast-tflite') as Tflite;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return await tflite.loadTensorflowModel(require('../../assets/models/coffee-check.tflite'), []);
    } catch {
      return null;
    }
  })();
  return modelPromise;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Fotoğrafın ortasından kare kesip 224×224 RGB piksellere çevirir. */
async function photoPixels(uri: string): Promise<Uint8Array> {
  const small = await ImageManipulator.manipulate(uri).resize({ width: 320 }).renderAsync();
  const side = Math.min(small.width, small.height);
  const square = await ImageManipulator.manipulate(small)
    .crop({ originX: Math.floor((small.width - side) / 2), originY: Math.floor((small.height - side) / 2), width: side, height: side })
    .resize({ width: SIZE, height: SIZE })
    .renderAsync();
  const saved = await square.saveAsync({ format: SaveFormat.JPEG, compress: 0.95, base64: true });
  const img = decode(base64ToBytes(saved.base64 ?? ''), { useTArray: true, formatAsRGBA: true });
  if (img.width !== SIZE || img.height !== SIZE) throw new Error('unexpected size');
  return rgbaToRgb(img.data, SIZE * SIZE);
}

/** Model kullanılabiliyor mu (önceden yüklemek için de çağrılabilir). */
export async function coffeeCheckAvailable(): Promise<boolean> {
  return (await loadModel()) !== null;
}

/**
 * Fotoğrafı kontrol eder. Kontrol yapılamazsa (model yok, dosya okunamadı…) null döner; çağıran uyarı göstermez.
 * Hata fırlatmaz.
 */
export async function checkCoffeePhoto(uri: string): Promise<Exclude<PhotoCheck, 'skipped'> | null> {
  try {
    const model = await loadModel();
    if (!model) return null;
    const input = await photoPixels(uri);
    const [out] = await model.run([input.buffer as ArrayBuffer]);
    if (!out) return null;
    return judgeCoffee(toImagenet1001(dequantize(new Uint8Array(out))));
  } catch {
    return null;
  }
}
