// Ad Hoc derleme için EAS'te "AD_HOC" imza kaydı yoksa, App Store kaydındaki AYNI dağıtım sertifikasıyla oluşturur.
// (eas credentials'ın etkileşimli adımının yaptığıyla aynı; yeni sertifika oluşturmaz, Apple'a dokunmaz.)
// Ad Hoc profilinin kendisini sonra `eas build --refresh-ad-hoc-provisioning-profile` oluşturur.
//
// Uygulama uzantıları (ör. widget) için de aynısı: EAS'te uzantının kimliği ve AD_HOC kaydı yoksa oluşturulur.
// Kayıt bir profil ister; geçici olarak ana uygulamanın Ad Hoc profili konur, --refresh-ad-hoc-provisioning-profile
// bunu uzantının gerçek profiliyle değiştirir (EAS kimliği farklı görünce eskisini siler, yenisini oluşturur).
//
// Kullanım: EXPO_TOKEN=… node scripts/setupAdhocCredentials.mjs <projectId> <bundleIdentifier> [uzantıBundleId …]
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

const [projectId, bundleIdentifier, ...extensionIds] = process.argv.slice(2);
if (!process.env.EXPO_TOKEN || !projectId || !bundleIdentifier) {
  console.error('Kullanım: EXPO_TOKEN=… node scripts/setupAdhocCredentials.mjs <projectId> <bundleIdentifier> [uzantıBundleId …]');
  process.exit(2);
}

const CREDS = `query($appId: String!) { app { byId(appId: $appId) {
    ownerAccount { id name }
    iosAppCredentials {
      id
      appleTeam { id }
      appleAppIdentifier { id bundleIdentifier }
      iosAppBuildCredentialsList {
        id iosDistributionType
        distributionCertificate { id appleTeam { id } }
        provisioningProfile { id provisioningProfile }
      }
    }
  } } }`;

async function load() {
  return (await gql(CREDS, { appId: projectId })).app.byId;
}

const createBuildCreds = (input, credsId) =>
  gql(
    `mutation($input: IosAppBuildCredentialsInput!, $credsId: ID!) {
      iosAppBuildCredentials { createIosAppBuildCredentials(iosAppBuildCredentialsInput: $input, iosAppCredentialsId: $credsId) { id } }
    }`,
    { input, credsId },
  );

// ---------- Ana uygulama ----------
let app = await load();
const main = app.iosAppCredentials.find((c) => c.appleAppIdentifier?.bundleIdentifier === bundleIdentifier);
if (!main) throw new Error(`EAS'te ${bundleIdentifier} için iOS kimlik bilgisi yok`);
const mainList = main.iosAppBuildCredentialsList ?? [];
const store = mainList.find((b) => b.iosDistributionType === 'APP_STORE' && b.distributionCertificate?.id);
if (!store) throw new Error('App Store imza kaydı (dağıtım sertifikası) bulunamadı');
const cert = store.distributionCertificate;
const mainAdhoc = mainList.find((b) => b.iosDistributionType === 'AD_HOC');
if (mainAdhoc?.distributionCertificate?.id) {
  console.log('Ad Hoc imza kaydı zaten var; dokunulmadı.');
} else if (mainAdhoc) {
  await gql(
    `mutation($id: ID!, $cert: ID!) { iosAppBuildCredentials { setDistributionCertificate(id: $id, distributionCertificateId: $cert) { id } } }`,
    { id: mainAdhoc.id, cert: cert.id },
  );
  console.log('Ad Hoc imza kaydına mevcut dağıtım sertifikası bağlandı.');
} else {
  // Profil alanı geçici olarak App Store profiliyle doldurulur; --refresh-ad-hoc-provisioning-profile bunu
  // kayıtlı cihazları içeren gerçek Ad Hoc profiliyle değiştirir.
  await createBuildCreds({ iosDistributionType: 'AD_HOC', distributionCertificateId: cert.id, provisioningProfileId: store.provisioningProfile?.id }, main.id);
  console.log('Ad Hoc imza kaydı oluşturuldu (mevcut dağıtım sertifikasıyla).');
}

// ---------- Uzantılar ----------
const accountId = app.ownerAccount.id;
const accountName = app.ownerAccount.name;
const teamId = main.appleTeam?.id ?? cert.appleTeam?.id;
if (extensionIds.length && !teamId) throw new Error('Apple ekibi bulunamadı');
// Geçici profil içeriği: ana uygulamanın (varsa Ad Hoc, yoksa App Store) profili
const placeholder = (mainAdhoc?.provisioningProfile ?? store.provisioningProfile)?.provisioningProfile;

for (const extId of extensionIds) {
  // Ad Hoc (doğrudan kurulum) ve App Store (TestFlight) derlemeleri için
  for (const type of ['AD_HOC', 'APP_STORE']) await setupExtension(extId, type);
}

async function setupExtension(extId, type) {
  app = await load();
  let ext = app.iosAppCredentials.find((c) => c.appleAppIdentifier?.bundleIdentifier === extId);
  const extCreds = ext?.iosAppBuildCredentialsList?.find((b) => b.iosDistributionType === type);
  if (extCreds?.distributionCertificate?.id && extCreds.provisioningProfile?.id) {
    console.log(`${extId} ${type}: imza kaydı zaten var; dokunulmadı.`);
    return;
  }
  if (!placeholder) throw new Error('Geçici profil için ana uygulamanın profili bulunamadı');

  // 1) EAS'te uzantının uygulama kimliği (ana uygulamaya bağlı)
  let identifierId = ext?.appleAppIdentifier?.id;
  if (!identifierId) {
    const found = await gql(
      `query($name: String!, $b: String!) { account { byName(accountName: $name) { appleAppIdentifiers(bundleIdentifier: $b) { id } } } }`,
      { name: accountName, b: extId },
    );
    identifierId = found.account.byName.appleAppIdentifiers[0]?.id;
  }
  if (!identifierId) {
    const r = await gql(
      `mutation($input: AppleAppIdentifierInput!, $accountId: ID!) {
        appleAppIdentifier { createAppleAppIdentifier(appleAppIdentifierInput: $input, accountId: $accountId) { id } }
      }`,
      { input: { bundleIdentifier: extId, appleTeamId: teamId, parentAppleAppId: main.appleAppIdentifier.id }, accountId },
    );
    identifierId = r.appleAppIdentifier.createAppleAppIdentifier.id;
    console.log(`${extId}: EAS uygulama kimliği oluşturuldu.`);
  }

  // 2) Uzantının kimlik bilgisi kaydı
  if (!ext) {
    const r = await gql(
      `mutation($input: IosAppCredentialsInput!, $appId: ID!, $identifierId: ID!) {
        iosAppCredentials { createIosAppCredentials(iosAppCredentialsInput: $input, appId: $appId, appleAppIdentifierId: $identifierId) { id } }
      }`,
      { input: { appleTeamId: teamId }, appId: projectId, identifierId },
    );
    ext = { id: r.iosAppCredentials.createIosAppCredentials.id };
    console.log(`${extId}: EAS kimlik bilgisi kaydı oluşturuldu.`);
  }

  // 3) Aynı dağıtım sertifikası + geçici profil
  if (extCreds) {
    await gql(
      `mutation($id: ID!, $cert: ID!) { iosAppBuildCredentials { setDistributionCertificate(id: $id, distributionCertificateId: $cert) { id } } }`,
      { id: extCreds.id, cert: cert.id },
    );
  } else {
    const p = await gql(
      `mutation($input: AppleProvisioningProfileInput!, $accountId: ID!, $identifierId: ID!) {
        appleProvisioningProfile { createAppleProvisioningProfile(appleProvisioningProfileInput: $input, accountId: $accountId, appleAppIdentifierId: $identifierId) { id } }
      }`,
      { input: { appleProvisioningProfile: placeholder }, accountId, identifierId },
    );
    await createBuildCreds(
      { iosDistributionType: type, distributionCertificateId: cert.id, provisioningProfileId: p.appleProvisioningProfile.createAppleProvisioningProfile.id },
      ext.id,
    );
  }
  console.log(`${extId} ${type}: imza kaydı hazır (gerçek profil derlemede oluşturulacak).`);
}
