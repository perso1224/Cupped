import { describe, expect, it } from 'vitest';
import { RAW_BASE, handle } from './worker.js';

const manifest = { id: 'abc', runtimeVersion: '1.0.0', launchAsset: {}, assets: [] };
const req = (headers = {}, path = '/manifest') => new Request(`https://u.example${path}`, { headers });
const okFetch = (seen) => async (u) => {
  seen?.push(u);
  return new Response(JSON.stringify(manifest), { status: 200 });
};

describe('güncelleme sunucusu', () => {
  it('manifesti protokol başlıklarıyla döner, doğru dosyayı okur', async () => {
    const seen = [];
    const res = await handle(req({ 'expo-platform': 'ios', 'expo-runtime-version': '1.0.0', 'expo-channel-name': 'preview' }), okFetch(seen));
    expect(res.status).toBe(200);
    expect(res.headers.get('expo-protocol-version')).toBe('1');
    expect(res.headers.get('expo-sfv-version')).toBe('0');
    expect(res.headers.get('content-type')).toContain('application/expo+json');
    expect(await res.json()).toEqual(manifest);
    expect(seen).toEqual([`${RAW_BASE}/preview/1.0.0/ios/manifest.json`]);
  });
  it('kanal başlığı yoksa preview', async () => {
    const seen = [];
    await handle(req({ 'expo-platform': 'android', 'expo-runtime-version': '1.0.0' }), okFetch(seen));
    expect(seen[0]).toContain('/preview/1.0.0/android/');
  });
  it('güncelleme yoksa ya da telefon zaten güncelse 204', async () => {
    const none = await handle(req({ 'expo-platform': 'ios', 'expo-runtime-version': '9.9.9' }), async () => new Response('', { status: 404 }));
    expect(none.status).toBe(204);
    expect(none.headers.get('expo-protocol-version')).toBe('1');
    const same = await handle(req({ 'expo-platform': 'ios', 'expo-runtime-version': '1.0.0', 'expo-current-update-id': 'abc' }), okFetch());
    expect(same.status).toBe(204);
  });
  it('geçersiz istekler reddedilir (yol enjeksiyonu yok)', async () => {
    expect((await handle(req({ 'expo-platform': 'web', 'expo-runtime-version': '1' }), okFetch())).status).toBe(400);
    expect((await handle(req({ 'expo-platform': 'ios', 'expo-runtime-version': '../x' }), okFetch())).status).toBe(400);
    expect((await handle(req({ 'expo-platform': 'ios', 'expo-runtime-version': '1', 'expo-channel-name': 'a/b' }), okFetch())).status).toBe(400);
    expect((await handle(req({}, '/other'), okFetch())).status).toBe(404);
  });
  it('GitHub hata verirse 502', async () => {
    const res = await handle(req({ 'expo-platform': 'ios', 'expo-runtime-version': '1.0.0' }), async () => new Response('x', { status: 500 }));
    expect(res.status).toBe(502);
  });
});

describe('Ad Hoc yükleme sayfası', () => {
  it('sayfa itms-services bağlantısı verir', async () => {
    const res = await handle(new Request('https://u.example/install'), okFetch());
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('itms-services://?action=download-manifest');
  });
  it('manifest.plist, GitHub’daki bilgiden üretilir', async () => {
    const info = { ipaUrl: 'https://raw.example/adhoc/cupped.ipa', bundleId: 'com.perso1224.cupped', version: '1.0.0' };
    const res = await handle(new Request('https://u.example/install/manifest.plist'), async () => new Response(JSON.stringify(info)));
    const t = await res.text();
    expect(t).toContain('<string>https://raw.example/adhoc/cupped.ipa</string>');
    expect(t).toContain('com.perso1224.cupped');
  });
  it('derleme yoksa 404', async () => {
    const res = await handle(new Request('https://u.example/install/manifest.plist'), async () => new Response('', { status: 404 }));
    expect(res.status).toBe(404);
  });
});
