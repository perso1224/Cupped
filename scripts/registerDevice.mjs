// iPhone'u Ad Hoc yükleme için kaydettirme bağlantısı üretir (eas device:create'in "web sitesi" yöntemiyle aynı).
// GitHub iş akışında EXPO_TOKEN ile çalışır. Bağlantı iPhone'da Safari ile açılır; küçük bir profil yüklenince
// cihazın kimliği (UDID) Expo'ya ve Apple geliştirici hesabına kaydolur.
// Kullanım: EXPO_TOKEN=… node scripts/registerDevice.mjs <projectId> <appleTeamIdentifier>
const API = 'https://api.expo.dev/graphql';

async function gql(query, variables) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.EXPO_TOKEN}` },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(`GraphQL hatası: ${JSON.stringify(json.errors ?? res.status)}`);
  return json.data;
}

const [projectId, appleTeamIdentifier] = process.argv.slice(2);
if (!process.env.EXPO_TOKEN || !projectId || !appleTeamIdentifier) {
  console.error('Kullanım: EXPO_TOKEN=… node scripts/registerDevice.mjs <projectId> <appleTeamIdentifier>');
  process.exit(2);
}

const app = await gql('query($appId: String!) { app { byId(appId: $appId) { id ownerAccount { id name } } } }', { appId: projectId });
const accountId = app.app.byId.ownerAccount.id;
const team = await gql(
  'query($accountId: ID!, $id: String!) { appleTeam { byAppleTeamIdentifier(accountId: $accountId, identifier: $id) { id appleTeamIdentifier } } }',
  { accountId, id: appleTeamIdentifier },
);
const appleTeamId = team.appleTeam.byAppleTeamIdentifier?.id;
if (!appleTeamId) throw new Error(`Apple takımı EAS'te bulunamadı: ${appleTeamIdentifier}`);
const req = await gql(
  `mutation($appleTeamId: ID!, $accountId: ID!) {
    appleDeviceRegistrationRequest { createAppleDeviceRegistrationRequest(appleTeamId: $appleTeamId, accountId: $accountId) { id } }
  }`,
  { appleTeamId, accountId },
);
const id = req.appleDeviceRegistrationRequest.createAppleDeviceRegistrationRequest.id;
console.log(`KAYIT_BAGLANTISI=https://expo.dev/register-device/${id}`);
