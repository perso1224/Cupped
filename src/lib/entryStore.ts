import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Fincan listesinin ham metni nerede durur:
 * - Telefonda Documents/data/ altında dosyada. Android'de AsyncStorage veritabanı ~6 MB ile sınırlı ve çok büyük
 *   tek bir değer okunamayabiliyor; binlerce fincan ve yedek kopyası için dosya daha güvenli.
 *   Yazma önce geçici dosyaya yapılır, sonra yerine taşınır: yazarken uygulama kapanırsa eski hal sağlam kalır.
 * - Web'de (yalnızca test) AsyncStorage (localStorage).
 * Eski sürümlerin AsyncStorage'daki verisi ilk okumada dosyaya taşınır.
 */

export type Slot = 'main' | 'backup';
const KEYS: Record<Slot, string> = { main: 'cupped.entries.v1', backup: 'cupped.entries.v1.bak' };
const FILES: Record<Slot, string> = { main: 'entries.json', backup: 'entries.bak.json' };
const CORRUPT_PREFIX = 'entries.corrupt.';
const MAX_CORRUPT = 3;

const useFiles = Platform.OS !== 'web';

function dir(): Directory {
  const d = new Directory(Paths.document, 'data');
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  return d;
}
const file = (name: string) => new File(dir(), name);

/** Ham metni okur (yoksa null). Telefonda dosya yoksa eski AsyncStorage verisini dosyaya taşır. */
export async function readRaw(slot: Slot): Promise<string | null> {
  if (!useFiles) return AsyncStorage.getItem(KEYS[slot]);
  const f = file(FILES[slot]);
  if (f.exists) return f.text();
  const legacy = await AsyncStorage.getItem(KEYS[slot]);
  if (legacy == null) return null;
  // Taşıma: önce dosyaya yaz, dosya gerçekten oluştuysa eski kopyayı sil (yer açılsın)
  await writeRaw(slot, legacy);
  if (file(FILES[slot]).exists) await AsyncStorage.removeItem(KEYS[slot]).catch(() => {});
  return legacy;
}

/** Ham metni güvenli yazar (geçici dosya → yerine taşı). */
export async function writeRaw(slot: Slot, text: string): Promise<void> {
  if (!useFiles) {
    await AsyncStorage.setItem(KEYS[slot], text);
    return;
  }
  try {
    const tmp = file(`${FILES[slot]}.tmp`);
    tmp.create({ overwrite: true });
    tmp.writeSync(text);
    tmp.moveSync(file(FILES[slot]), { overwrite: true });
  } catch {
    // Dosyaya yazılamazsa (çok nadir) eski yere yaz; eski dosya silinir ki okurken bayat dosya öne geçmesin
    try {
      const f = file(FILES[slot]);
      if (f.exists) f.delete();
    } catch {
      // silinemezse de devam
    }
    await AsyncStorage.setItem(KEYS[slot], text);
  }
}

/** Okunamayan ham veriyi ayrıca saklar; en yeni 3 kopya tutulur. */
export async function keepCorruptRaw(raw: string): Promise<void> {
  const name = `${CORRUPT_PREFIX}${Date.now()}`;
  if (!useFiles) {
    await AsyncStorage.setItem(`cupped.${name}`, raw);
    const old = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(`cupped.${CORRUPT_PREFIX}`)).sort();
    if (old.length > MAX_CORRUPT) await AsyncStorage.multiRemove(old.slice(0, old.length - MAX_CORRUPT));
    return;
  }
  const f = file(`${name}.json`);
  f.create({ overwrite: true });
  f.writeSync(raw);
  const old = dir()
    .list()
    .filter((x): x is File => x instanceof File && x.name.startsWith(CORRUPT_PREFIX))
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const x of old.slice(0, Math.max(0, old.length - MAX_CORRUPT))) x.delete();
}

/** "Tüm verileri sil": fincan dosyalarının hepsi. */
export function deleteAllRaw(): void {
  if (!useFiles) return; // web: AsyncStorage anahtarları ayrıca silinir
  try {
    const d = new Directory(Paths.document, 'data');
    if (d.exists) d.delete();
  } catch {
    // silinemese de diğer veriler silinir
  }
}
