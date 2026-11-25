// Kendi anlık güncelleme sunucumuz için paket hazırlama (Expo Updates protokolü, v1).
// `npx expo export` çıktısından (dist/metadata.json) her platform için bir manifest üretir ve
// dosyaları <çıktı>/assets/<anahtar>.<uzantı> olarak kopyalar. Sunucu (updates-server/worker.js)
// manifesti okuyup telefona verir; dosyalar doğrudan GitHub'dan (raw.githubusercontent.com) iner.
//
// Kullanım: node scripts/updateManifest.mjs <dist> <çıktı klasörü> <kanal> <runtimeVersion> <dosya tabanı URL> [expoConfig.json]
import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2',
  json: 'application/json', xml: 'application/xml', tflite: 'application/octet-stream',
};

/** Telefonun doğruladığı özet: sha256, base64url, dolgusuz. */
export function sha256Base64Url(buf) {
  return createHash('sha256').update(buf).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const md5Hex = (buf) => createHash('md5').update(buf).digest('hex');

/** Dosya adları güvenli mi (telefon, anahtar + uzantıyı dosya adı olarak kullanır). */
export const safeName = (s) => /^[A-Za-z0-9._-]+$/.test(s);

/**
 * Tek platform için manifest. `readFile(path)` dist içindeki dosyayı döner.
 * Dönen `files`: [{ src, name }] (kopyalanacak dosyalar, ad = assets/ altındaki ad).
 */
export function buildPlatformManifest({ platformMeta, readFile, runtimeVersion, baseUrl, expoClient, id = randomUUID(), createdAt = new Date().toISOString() }) {
  const files = [];
  const entry = (path, ext, contentType) => {
    const buf = readFile(path);
    const key = md5Hex(buf);
    const fileExtension = `.${ext}`;
    if (!safeName(key) || !safeName(fileExtension)) throw new Error(`güvensiz dosya adı: ${path}`);
    const name = `${key}${fileExtension}`;
    files.push({ src: path, name });
    return { hash: sha256Base64Url(buf), key, contentType, fileExtension, url: `${baseUrl}/assets/${name}` };
  };
  const launchAsset = entry(platformMeta.bundle, 'bundle', 'application/javascript');
  const assets = platformMeta.assets.map((a) => entry(a.path, a.ext, MIME[a.ext] ?? 'application/octet-stream'));
  const manifest = {
    id,
    createdAt,
    runtimeVersion,
    launchAsset,
    assets,
    metadata: {},
    extra: expoClient ? { expoClient } : {},
  };
  return { manifest, files };
}

/** Klasördeki tüm manifest dosyaları (manifest.json ve bir önceki: manifest.prev.json). */
export function listManifests(dir) {
  const out = [];
  const walk = (d) => {
    for (const n of readdirSync(d)) {
      if (n === 'assets' || n === '.git') continue;
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (n === 'manifest.json' || n === 'manifest.prev.json') out.push(p);
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
}

/** Hiçbir manifestin (şimdiki ya da bir önceki) kullanmadığı dosyaları siler; depo büyümesin. */
export function pruneAssets(dir) {
  const used = new Set();
  for (const m of listManifests(dir)) {
    const j = JSON.parse(readFileSync(m, 'utf8'));
    for (const a of [j.launchAsset, ...(j.assets ?? [])]) used.add(basename(new URL(a.url).pathname));
  }
  const assetsDir = join(dir, 'assets');
  let removed = 0;
  if (existsSync(assetsDir)) for (const f of readdirSync(assetsDir)) if (!used.has(f)) { rmSync(join(assetsDir, f)); removed += 1; }
  return { kept: used.size, removed };
}

function main() {
  if (process.argv[2] === 'prune') {
    const r = pruneAssets(process.argv[3]);
    console.log(`kullanılan ${r.kept} dosya, silinen ${r.removed}`);
    return;
  }
  const [dist, out, channel, runtimeVersion, baseUrl, expoConfigPath] = process.argv.slice(2);
  if (!dist || !out || !channel || !runtimeVersion || !baseUrl) {
    console.error('Kullanım: node scripts/updateManifest.mjs <dist> <çıktı> <kanal> <runtimeVersion> <dosya tabanı URL> [expoConfig.json]');
    process.exit(2);
  }
  if (!safeName(channel) || !safeName(runtimeVersion)) throw new Error('kanal ya da runtimeVersion geçersiz');
  const meta = JSON.parse(readFileSync(join(dist, 'metadata.json'), 'utf8'));
  const expoClient = expoConfigPath && existsSync(expoConfigPath) ? JSON.parse(readFileSync(expoConfigPath, 'utf8')) : undefined;
  mkdirSync(join(out, 'assets'), { recursive: true });
  for (const platform of ['ios', 'android']) {
    const platformMeta = meta.fileMetadata?.[platform];
    if (!platformMeta) continue;
    const { manifest, files } = buildPlatformManifest({
      platformMeta,
      readFile: (p) => readFileSync(join(dist, p)),
      runtimeVersion,
      baseUrl,
      expoClient,
    });
    for (const f of files) copyFileSync(join(dist, f.src), join(out, 'assets', f.name));
    const dir = join(out, channel, runtimeVersion, platform);
    mkdirSync(dir, { recursive: true });
    // Bir önceki güncelleme saklanır: indirme ortasındaki telefonların dosyaları hemen silinmesin
    if (existsSync(join(dir, 'manifest.json'))) renameSync(join(dir, 'manifest.json'), join(dir, 'manifest.prev.json'));
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest));
    console.log(`${platform}: ${manifest.id} · ${files.length} dosya`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
