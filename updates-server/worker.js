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

// --- Ad Hoc yükleme (TestFlight'sız): kayıtlı iPhone'a doğrudan kurulum ---
const ADHOC_INFO = `${RAW_BASE}/adhoc/info.json`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function installPage() {
  const manifestUrl = 'https://cupped-updates.beratyapar4.workers.dev/install/manifest.plist';
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cupped · Yükle</title><style>body{font:17px -apple-system,system-ui,sans-serif;margin:0;padding:32px 20px;background:#FAF8F5;color:#1F1A17;text-align:center}
a.b{display:inline-block;margin-top:24px;padding:16px 28px;border-radius:14px;background:#D98B2B;color:#fff;text-decoration:none;font-weight:700}
p{color:#6B625B;line-height:1.5}@media(prefers-color-scheme:dark){body{background:#15110E;color:#F4EEE8}p{color:#B5ABA3}}</style></head>
<body><h1>Cupped</h1><p>Bu sayfayı iPhone'da <b>Safari</b> ile aç. Sadece kayıtlı iPhone'lara kurulur.</p>
<a class="b" href="itms-services://?action=download-manifest&amp;url=${encodeURIComponent(manifestUrl)}">Cupped'ı yükle</a>
<p>Yükleme bitince ana ekranda Cupped simgesine dokun.</p></body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

async function installManifest(fetchFile) {
  const res = await fetchFile(ADHOC_INFO);
  if (!res.ok) return new Response('henüz Ad Hoc derleme yok', { status: 404 });
  const info = JSON.parse(await res.text());
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>items</key><array><dict>
<key>assets</key><array><dict><key>kind</key><string>software-package</string><key>url</key><string>${esc(info.ipaUrl)}</string></dict></array>
<key>metadata</key><dict><key>bundle-identifier</key><string>${esc(info.bundleId)}</string><key>bundle-version</key><string>${esc(info.version)}</string>
<key>kind</key><string>software</string><key>title</key><string>Cupped</string></dict>
</dict></array></dict></plist>`;
  return new Response(plist, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'no-store' } });
}

/**
 * @param {Request} request
 * @param {(url: string) => Promise<Response>} fetchManifest  GitHub'dan dosya okur (testte sahte verilir)
 */
export async function handle(request, fetchManifest) {
  const url = new URL(request.url);
  if (url.pathname === '/' || url.pathname === '/health') return new Response('cupped-updates ok', { status: 200 });
  if (url.pathname === '/install') return installPage();
  if (url.pathname === '/install/manifest.plist') return installManifest(fetchManifest);
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
