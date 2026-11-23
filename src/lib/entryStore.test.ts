import { beforeEach, describe, expect, it, vi } from 'vitest';

// Bellek içi dosya sistemi ve AsyncStorage (telefon olmadan deneme)
const files = new Map<string, string>();
const kv = new Map<string, string>();
let failWrites = false;
let failMoves = false;

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => kv.get(k) ?? null,
    setItem: async (k: string, v: string) => void kv.set(k, v),
    removeItem: async (k: string) => void kv.delete(k),
    getAllKeys: async () => [...kv.keys()],
    multiRemove: async (ks: string[]) => ks.forEach((k) => kv.delete(k)),
  },
}));
vi.mock('expo-file-system', () => {
  const join = (...p: unknown[]) => p.map((x) => (typeof x === 'string' ? x : (x as { uri: string }).uri)).join('/');
  class Directory {
    uri: string;
    constructor(...p: unknown[]) {
      this.uri = join(...p);
    }
    get exists() {
      return true;
    }
    create() {}
    delete() {
      for (const k of [...files.keys()]) if (k.startsWith(this.uri + '/')) files.delete(k);
    }
    list() {
      return [...files.keys()].filter((k) => k.startsWith(this.uri + '/')).map((k) => new File(k));
    }
  }
  class File {
    uri: string;
    constructor(...p: unknown[]) {
      this.uri = join(...p);
    }
    get name() {
      return this.uri.split('/').pop()!;
    }
    get exists() {
      return files.has(this.uri);
    }
    create() {
      files.set(this.uri, '');
    }
    writeSync(t: string) {
      if (failWrites) throw new Error('disk');
      files.set(this.uri, t);
    }
    moveSync(dest: File) {
      if (failMoves) throw new Error('move');
      files.set(dest.uri, files.get(this.uri)!);
      files.delete(this.uri);
      this.uri = dest.uri;
    }
    async text() {
      return files.get(this.uri)!;
    }
    textSync() {
      return files.get(this.uri)!;
    }
    delete() {
      files.delete(this.uri);
    }
  }
  return { Directory, File, Paths: { document: 'doc' } };
});

const store = await import('./entryStore');

beforeEach(() => {
  files.clear();
  kv.clear();
  failWrites = false;
  failMoves = false;
});

describe('fincan deposu (telefon)', () => {
  it('eski AsyncStorage verisini dosyaya taşır ve eski kopyayı siler', async () => {
    kv.set('cupped.entries.v1', '[{"id":"a"}]');
    expect(await store.readRaw('main')).toBe('[{"id":"a"}]');
    expect(files.get('doc/data/entries.json')).toBe('[{"id":"a"}]');
    expect(kv.has('cupped.entries.v1')).toBe(false);
  });
  it('yazma geçici dosyadan taşınır, geçici dosya kalmaz', async () => {
    await store.writeRaw('main', '[1]');
    expect(files.get('doc/data/entries.json')).toBe('[1]');
    expect([...files.keys()].some((k) => k.endsWith('.tmp'))).toBe(false);
  });
  it('dosyaya yazılamazsa hata verir ve eski veriye dokunmaz', async () => {
    await store.writeRaw('main', '[1]');
    failWrites = true;
    await expect(store.writeRaw('main', '[2]')).rejects.toThrow();
    failWrites = false;
    expect(await store.readRaw('main')).toBe('[1]');
  });
  it('taşıma başarısızsa eski dosya geri konur', async () => {
    await store.writeRaw('main', '[1]');
    failMoves = true;
    await expect(store.writeRaw('main', '[2]')).rejects.toThrow();
    failMoves = false;
    expect(await store.readRaw('main')).toBe('[1]');
  });
  it('yazarken uygulama kapandıysa (ana dosya taşınmış, yenisi yerine konmamış) yeni metin geri gelir', async () => {
    files.set('doc/data/entries.json.old', '[1]');
    files.set('doc/data/entries.json.tmp', '[1,2]');
    expect(await store.readRaw('main')).toBe('[1,2]');
    expect(files.get('doc/data/entries.json')).toBe('[1,2]');
    expect(files.has('doc/data/entries.json.old')).toBe(false);
  });
  it('ana liste kayıpsa boş değil yedek döner', async () => {
    files.set('doc/data/entries.bak.json', '[9]');
    expect(await store.readRaw('main')).toBe('[9]');
  });
  it('eski sürümün AsyncStorage yedek kopyası ilk yazmada temizlenir', async () => {
    kv.set('cupped.entries.v1.bak', '[old]');
    await store.writeRaw('backup', '[new]');
    expect(kv.has('cupped.entries.v1.bak')).toBe(false);
  });
  it('bozuk kopyalardan en yeni 3 tanesi kalır', async () => {
    for (let i = 0; i < 5; i++) {
      await store.keepCorruptRaw(`x${i}`);
      await new Promise((r) => setTimeout(r, 2));
    }
    expect([...files.keys()].filter((k) => k.includes('entries.corrupt.')).length).toBe(3);
  });
});
