import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildPlatformManifest, md5Hex, safeName, sha256Base64Url } from './updateManifest.mjs';

const files = { 'b.hbc': Buffer.from('bundle'), 'assets/x': Buffer.from('png-bytes') };
const build = () =>
  buildPlatformManifest({
    platformMeta: { bundle: 'b.hbc', assets: [{ path: 'assets/x', ext: 'png' }] },
    readFile: (p) => files[p],
    runtimeVersion: '1.0.0',
    baseUrl: 'https://raw.example/updates',
    expoClient: { name: 'Cupped' },
    id: '11111111-1111-4111-8111-111111111111',
    createdAt: '2026-11-24T00:00:00.000Z',
  });

describe('güncelleme manifesti', () => {
  it('özet telefonun beklediği biçimde (sha256, base64url, dolgusuz)', () => {
    const h = sha256Base64Url(Buffer.from('bundle'));
    const ref = createHash('sha256').update('bundle').digest('base64url');
    expect(h).toBe(ref);
    expect(h).not.toMatch(/[+/=]/);
  });
  it('paket ve dosyalar anahtar + uzantıyla adreslenir', () => {
    const { manifest, files: out } = build();
    expect(manifest.runtimeVersion).toBe('1.0.0');
    expect(manifest.launchAsset).toMatchObject({
      key: md5Hex(files['b.hbc']),
      fileExtension: '.bundle',
      contentType: 'application/javascript',
      url: `https://raw.example/updates/assets/${md5Hex(files['b.hbc'])}.bundle`,
    });
    expect(manifest.assets[0]).toMatchObject({ contentType: 'image/png', fileExtension: '.png' });
    expect(out.map((f) => f.name)).toEqual([`${md5Hex(files['b.hbc'])}.bundle`, `${md5Hex(files['assets/x'])}.png`]);
    expect(manifest.extra.expoClient.name).toBe('Cupped');
    for (const a of [manifest.launchAsset, ...manifest.assets]) expect(safeName(a.key + a.fileExtension)).toBe(true);
  });
  it('güvensiz ad reddedilir', () => {
    expect(safeName('../x')).toBe(false);
    expect(safeName('a/b')).toBe(false);
  });
});
