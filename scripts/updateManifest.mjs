// Kendi anlık güncelleme sunucumuz için paket hazırlama (Expo Updates protokolü, v1).
// `npx expo export` çıktısından (dist/metadata.json) her platform için bir manifest üretir ve
// dosyaları <çıktı>/assets/<anahtar>.<uzantı> olarak kopyalar. Sunucu (updates-server/worker.js)
// manifesti okuyup telefona verir; dosyalar doğrudan GitHub'dan (raw.githubusercontent.com) iner.
//
// Kullanım: node scripts/updateManifest.mjs <dist> <çıktı klasörü> <kanal> <runtimeVersion> <dosya tabanı URL> [expoConfig.json]
import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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

function main() {
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
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest));
    console.log(`${platform}: ${manifest.id} · ${files.length} dosya`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
