// Ad Hoc derleme için EAS'te "AD_HOC" imza kaydı yoksa, App Store kaydındaki AYNI dağıtım sertifikasıyla oluşturur.
// (eas credentials'ın etkileşimli adımının yaptığıyla aynı; yeni sertifika oluşturmaz, Apple'a dokunmaz.)
// Ad Hoc profilinin kendisini sonra `eas build --refresh-ad-hoc-provisioning-profile` oluşturur.
// Kullanım: EXPO_TOKEN=… node scripts/setupAdhocCredentials.mjs <projectId> <bundleIdentifier>
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

const [projectId, bundleIdentifier] = process.argv.slice(2);
if (!process.env.EXPO_TOKEN || !projectId || !bundleIdentifier) {
  console.error('Kullanım: EXPO_TOKEN=… node scripts/setupAdhocCredentials.mjs <projectId> <bundleIdentifier>');
  process.exit(2);
}

const data = await gql(
  `query($appId: String!) { app { byId(appId: $appId) {
    iosAppCredentials {
      id
      appleAppIdentifier { bundleIdentifier }
      iosAppBuildCredentialsList { id iosDistributionType distributionCertificate { id } provisioningProfile { id } }
    }
  } } }`,
  { appId: projectId },
);
const creds = data.app.byId.iosAppCredentials.find((c) => c.appleAppIdentifier?.bundleIdentifier === bundleIdentifier);
if (!creds) throw new Error(`EAS'te ${bundleIdentifier} için iOS kimlik bilgisi yok`);
const list = creds.iosAppBuildCredentialsList ?? [];
const adhoc = list.find((b) => b.iosDistributionType === 'AD_HOC');
if (adhoc?.distributionCertificate?.id) {
  console.log('Ad Hoc imza kaydı zaten var; dokunulmadı.');
  process.exit(0);
}
const store = list.find((b) => b.iosDistributionType === 'APP_STORE' && b.distributionCertificate?.id);
if (!store) throw new Error('App Store imza kaydı (dağıtım sertifikası) bulunamadı');

if (adhoc) {
  await gql(
    `mutation($id: ID!, $cert: ID!) { iosAppBuildCredentials { setDistributionCertificate(id: $id, distributionCertificateId: $cert) { id } } }`,
    { id: adhoc.id, cert: store.distributionCertificate.id },
  );
  console.log('Ad Hoc imza kaydına mevcut dağıtım sertifikası bağlandı.');
} else {
  // Profil alanı geçici olarak App Store profiliyle doldurulur; --refresh-ad-hoc-provisioning-profile bunu
  // kayıtlı cihazları içeren gerçek Ad Hoc profiliyle değiştirir.
  await gql(
    `mutation($input: IosAppBuildCredentialsInput!, $credsId: ID!) {
      iosAppBuildCredentials { createIosAppBuildCredentials(iosAppBuildCredentialsInput: $input, iosAppCredentialsId: $credsId) { id } }
    }`,
    {
      input: { iosDistributionType: 'AD_HOC', distributionCertificateId: store.distributionCertificate.id, provisioningProfileId: store.provisioningProfile?.id },
      credsId: creds.id,
    },
  );
  console.log('Ad Hoc imza kaydı oluşturuldu (mevcut dağıtım sertifikasıyla).');
}
