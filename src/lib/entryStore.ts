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

/**
 * Ham metni okur (yoksa null). Telefonda:
 * - Yarım kalmış bir yazma varsa (ana dosya taşınırken uygulama kapandıysa) tamamlanmış yeni metin geri getirilir.
 * - Dosya hiç yoksa eski sürümün AsyncStorage verisi dosyaya taşınır.
 * - Ana liste hiç bulunamıyor ama yedek dosyası varsa yedek döner (boş liste gösterilip yedeğin üzerine yazılmasın).
 */
export async function readRaw(slot: Slot): Promise<string | null> {
  if (!useFiles) return AsyncStorage.getItem(KEYS[slot]);
  const name = FILES[slot];
  if (file(name).exists) return file(name).text();
  const recovered = recoverInterrupted(name);
  if (recovered !== null) return recovered;
  const legacy = await AsyncStorage.getItem(KEYS[slot]);
  if (legacy != null) {
    // Taşıma: önce dosyaya yaz; yazılınca eski kopya silinir (writeRaw içinde)
    await writeRaw(slot, legacy);
    return legacy;
  }
  if (slot === 'main' && file(FILES.backup).exists) return file(FILES.backup).text();
  return null;
}

/**
 * Yazma sırası: 1) yeni metin geçici dosyaya, 2) eski ana dosya ".old" olur, 3) geçici dosya ana dosya olur,
 * 4) ".old" silinir. 2 ile 3 arasında uygulama kapanırsa ana dosya yoktur ama ".tmp" tamdır (1 bitmeden 2 başlamaz):
 * okurken ".tmp" (yoksa ".old") yerine konur. 1 sırasında kapanırsa ana dosyaya hiç dokunulmamıştır.
 */
function recoverInterrupted(name: string): string | null {
  const old = file(`${name}.old`);
  if (!old.exists) return null;
  const tmp = file(`${name}.tmp`);
  const source = tmp.exists ? tmp : old;
  const text = source.textSync();
  source.moveSync(file(name), { overwrite: true });
  const leftover = file(`${name}.old`);
  if (leftover.exists) leftover.delete();
  return text;
}

const legacyCleared: Record<Slot, boolean> = { main: false, backup: false };

/** Ham metni güvenli yazar. Yazılamazsa hata fırlatır ve var olan dosyaya dokunmaz (veri kaybolmaz). */
export async function writeRaw(slot: Slot, text: string): Promise<void> {
  if (!useFiles) {
    await AsyncStorage.setItem(KEYS[slot], text);
    return;
  }
  const name = FILES[slot];
  const tmp = file(`${name}.tmp`);
  tmp.create({ overwrite: true });
  tmp.writeSync(text); // burada hata olursa ana dosya olduğu gibi kalır
  const hadMain = file(name).exists;
  if (hadMain) file(name).moveSync(file(`${name}.old`), { overwrite: true });
  try {
    file(`${name}.tmp`).moveSync(file(name));
  } catch (err) {
    // Yeni dosya yerine konamadıysa eskisini geri koy
    if (hadMain && file(`${name}.old`).exists && !file(name).exists) file(`${name}.old`).moveSync(file(name));
    throw err;
  }
  if (file(`${name}.old`).exists) file(`${name}.old`).delete();
  // Eski sürümden kalan AsyncStorage kopyası artık gereksiz (Android'de yer kaplamasın)
  if (!legacyCleared[slot]) {
    legacyCleared[slot] = true;
    await AsyncStorage.removeItem(KEYS[slot]).catch(() => {});
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
