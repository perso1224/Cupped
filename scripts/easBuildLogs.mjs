// Expo bulutundaki son derlemenin (ya da verilen kimliğin) kayıtlarından hata satırlarını yazdırır.
// Kullanım: EXPO_TOKEN=… node scripts/easBuildLogs.mjs <projectId> [buildId]
const API = 'https://api.expo.dev/graphql';
const [projectId, buildId] = process.argv.slice(2);
async function gql(query, variables) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.EXPO_TOKEN}` },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}
let build;
if (buildId) {
  build = (await gql(`query($id: ID!) { builds { byId(buildId: $id) { id status platform logFiles error { message } } } }`, { id: buildId })).builds.byId;
} else {
  const d = await gql(
    `query($appId: String!) { app { byId(appId: $appId) { builds(offset: 0, limit: 1, filter: {}) { id status platform logFiles error { message } } } } }`,
    { appId: projectId },
  );
  build = d.app.byId.builds[0];
}
console.log(`Derleme ${build.id} · ${build.platform} · ${build.status}`);
if (build.error?.message) console.log(`Hata: ${build.error.message}`);
const lines = [];
for (const url of build.logFiles ?? []) {
  const text = await (await fetch(url)).text();
  for (const l of text.split('\n')) {
    try {
      const j = JSON.parse(l);
      lines.push(`[${j.phase ?? ''}] ${j.msg ?? ''}`);
    } catch {
      if (l) lines.push(l);
    }
  }
}
const important = lines.filter((l) => /error|❌|failed|fatal|exception|warning: .*CuppedWidget/i.test(l));
console.log(`--- Hata içeren satırlar (${important.length}) ---`);
for (const l of important.slice(-120)) console.log(l);
console.log('--- Son 150 satır ---');
for (const l of lines.slice(-150)) console.log(l);
