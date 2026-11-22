import { beforeEach, describe, expect, it, vi } from 'vitest';

// Bellek içi dosya sistemi ve AsyncStorage (telefon olmadan deneme)
const files = new Map<string, string>();
const kv = new Map<string, string>();
let failWrites = false;

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
      files.set(dest.uri, files.get(this.uri)!);
      files.delete(this.uri);
      this.uri = dest.uri;
    }
    async text() {
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
  it('dosyaya yazılamazsa AsyncStorage yedeğine yazar ve bayat dosyayı siler', async () => {
    await store.writeRaw('main', '[1]');
    failWrites = true;
    await store.writeRaw('main', '[2]');
    expect(files.has('doc/data/entries.json')).toBe(false);
    expect(await store.readRaw('main')).toBe('[2]');
  });
  it('bozuk kopyalardan en yeni 3 tanesi kalır', async () => {
    for (let i = 0; i < 5; i++) {
      await store.keepCorruptRaw(`x${i}`);
      await new Promise((r) => setTimeout(r, 2));
    }
    expect([...files.keys()].filter((k) => k.includes('entries.corrupt.')).length).toBe(3);
  });
});
