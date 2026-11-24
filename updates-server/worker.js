// Cupped anlık güncelleme sunucusu (Cloudflare Worker, ücretsiz plan).
// Telefon "yeni güncelleme var mı?" diye sorar; bu sunucu GitHub'daki `updates` dalından ilgili manifesti okuyup
// Expo Updates protokolünün istediği başlıklarla (expo-protocol-version: 1) cevaplar.
// Güncelleme dosyaları (JS paketi, görseller) doğrudan GitHub'dan iner; bu sunucudan geçmez.

export const RAW_BASE = 'https://raw.githubusercontent.com/perso1224/Cupped/updates';
const SAFE = /^[A-Za-z0-9._-]+$/;

const PROTOCOL_HEADERS = {
  'expo-protocol-version': '1',
  'expo-sfv-version': '0',
  'cache-control': 'private, max-age=0',
};

function noUpdate() {
  return new Response(null, { status: 204, headers: PROTOCOL_HEADERS });
}

/**
 * @param {Request} request
 * @param {(url: string) => Promise<Response>} fetchManifest  GitHub'dan dosya okur (testte sahte verilir)
 */
export async function handle(request, fetchManifest) {
  const url = new URL(request.url);
  if (url.pathname === '/' || url.pathname === '/health') return new Response('cupped-updates ok', { status: 200 });
  if (url.pathname !== '/manifest') return new Response('not found', { status: 404 });
  if (request.method !== 'GET') return new Response('method not allowed', { status: 405 });

  const h = request.headers;
  const platform = h.get('expo-platform') ?? url.searchParams.get('platform');
  const runtimeVersion = h.get('expo-runtime-version') ?? url.searchParams.get('runtime-version');
  const channel = h.get('expo-channel-name') ?? url.searchParams.get('channel') ?? 'preview';
  if (!['ios', 'android'].includes(platform ?? '')) return new Response('expo-platform gerekli (ios | android)', { status: 400 });
  if (!runtimeVersion || !SAFE.test(runtimeVersion) || !SAFE.test(channel)) return new Response('geçersiz runtime/kanal', { status: 400 });

  const res = await fetchManifest(`${RAW_BASE}/${channel}/${runtimeVersion}/${platform}/manifest.json`);
  if (res.status === 404) return noUpdate(); // bu kanal/sürüm için henüz güncelleme yok
  if (!res.ok) return new Response('upstream error', { status: 502 });
  const body = await res.text();
  let manifest;
  try {
    manifest = JSON.parse(body);
  } catch {
    return new Response('bad manifest', { status: 502 });
  }
  // Telefon zaten bu güncellemedeyse boşuna indirmesin
  if (h.get('expo-current-update-id') && h.get('expo-current-update-id') === manifest.id) return noUpdate();

  return new Response(JSON.stringify(manifest), {
    status: 200,
    headers: { ...PROTOCOL_HEADERS, 'content-type': 'application/expo+json; charset=utf-8' },
  });
}

export default {
  async fetch(request) {
    // GitHub'a 60 sn önbellekle sor: yeni güncelleme en geç ~1-5 dk içinde görünür
    return handle(request, (u) => fetch(u, { cf: { cacheTtl: 60, cacheEverything: true } }));
  },
};
