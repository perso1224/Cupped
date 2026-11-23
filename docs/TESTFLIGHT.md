# TestFlight'a ilk yükleme

Apple Developer üyeliği açık. Bu adımlar bir kez yapılır; sonraki sürümler tek tuşla gider (GitHub > Actions > "TestFlight'a gönder").

Doğrulama notu: ayar adları EAS CLI 27.11 kaynak kodundan kontrol edildi.
- Otomatik derleme ilk seferde imza sertifikasını kendisi oluşturamıyor. Kaynak kodda: "Credentials are not set up. Run this command again in interactive mode."
- Otomatik gönderim için App Store Connect'teki uygulama numarası (`ascAppId`) şart.
- Otomatik gönderim (EAS Submit), GitHub gizli anahtarlarını **okumaz**. Yalnızca EAS'e kayıtlı "EAS Submit" API anahtarını kullanır. Anahtar kayıtlı değilse şu hatayı verir: "App Store Connect API Keys cannot be set up in --non-interactive mode." Kayıt Adım 4'te yapılıyor.

### İki ayrı kimlik bilgisi
| Nerede | Ne | Ne için |
|---|---|---|
| **EAS (Expo)** | İmza sertifikası, provisioning profile, "EAS Submit" API anahtarı | Derleme ve TestFlight'a yükleme. **Zorunlu.** |
| **GitHub Secrets** | `EXPO_TOKEN` | İş akışının Expo hesabına girmesi. **Zorunlu.** |
| **GitHub Secrets** | `ASC_API_KEY_P8`, `ASC_API_KEY_ID`, `ASC_API_ISSUER_ID`, `APPLE_TEAM_ID` | Yalnızca derleme sırasında Apple'a giriş (ör. süresi dolan profili yenilemek). **İsteğe bağlı.** EAS'teki anahtar bu işi de görebiliyor. |

---

## Adım 1: Takım kimliği (Team ID)

1. developer.apple.com → **Account** → **Membership details**.
2. **Team ID**'yi kopyala (10 karakter, ör. `AB12CD34EF`).

## Adım 2: App Store Connect API anahtarı

1. appstoreconnect.apple.com → **Users and Access** → **Integrations** → **App Store Connect API** → **Team Keys** → **+**.
2. Ad: `Cupped CI`, erişim (Access): **Admin**.
3. **Download** ile `.p8` dosyasını indir. Bu dosya yalnızca bir kez indirilebilir.
4. Sayfadaki **Issuer ID** ve anahtarın **Key ID** değerini not al.

## Adım 3: GitHub gizli anahtarları (isteğe bağlı)

`EXPO_TOKEN` zaten var ve yeterli. Aşağıdakiler isteğe bağlı. Eklemek istersen `ASC_*` üçlüsünü **birlikte** ekle; yalnızca biri ya da ikisi eklenirse iş akışı durur.

GitHub → Cupped deposu → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Ad | Değer |
|---|---|
| `ASC_API_KEY_P8` | `.p8` dosyasının **içeriği** (dosyayı not defteriyle aç, hepsini kopyala) |
| `ASC_API_KEY_ID` | Key ID |
| `ASC_API_ISSUER_ID` | Issuer ID |
| `APPLE_TEAM_ID` | Team ID |

## Adım 4: İmza sertifikası ve EAS Submit anahtarı (tek seferlik, bilgisayarda yapılır)

Bulutta otomatik derleme, ilk sertifikayı kendisi oluşturamıyor. Bunun bir kere, soru-cevaplı olarak yapılması gerekiyor. Mac gerekmez; Windows ya da Mac fark etmez, Node.js kurulu herhangi bir bilgisayar yeterli.

1. nodejs.org'dan **LTS** sürümünü kur.
2. Terminali (Windows'ta "Komut İstemi") aç ve şunları sırayla yaz:
   ```
   git clone https://github.com/perso1224/Cupped.git
   cd Cupped
   git checkout claude/expo-setup-guide-9xz45k
   npm install
   npx eas-cli@latest login
   npx eas-cli@latest credentials -p ios
   ```
   Depo gizliyse `git clone` GitHub girişi ister. Kolay yol: **GitHub Desktop** ile depoyu indir, sonra o klasörde terminal aç.
3. Sorulara şöyle cevap ver:
   - Profil (build profile): **testflight**
   - **Build Credentials** → **Set up all the required credentials**
   - Apple hesabına giriş: Apple ID + iki adımlı doğrulama kodu
4. EAS uygulama kimliğini (`com.perso1224.cupped`) Apple'a kaydeder. Ardından dağıtım sertifikasını ve profilini oluşturup Expo'da saklar.
5. Aynı komut açıkken, ana menüye dön (**Go back**) ve App Store Connect API anahtarını EAS'e kaydet:
   - **App Store Connect: Manage your API Key**
   - **Set up your project to use an API Key for EAS Submit**
   - "Generate a new App Store Connect API Key?" sorusu:
     - **Yes** (en kolayı): EAS, Apple hesabınla yeni bir anahtar oluşturup kaydeder. Rol sorulursa **ADMIN** seç.
     - **No**: Adım 2'deki anahtarı kullanır. Sırayla `.p8` dosyasının yolunu, Key ID'yi ve Issuer ID'yi yaz.
6. Kontrol: Komutu bir daha çalıştır (`npx eas-cli@latest credentials -p ios`). Özet ekranında **Distribution Certificate**, **Provisioning Profile** ve **App Store Connect API Key** üçü de dolu görünmeli.

## Adım 5: App Store Connect'te uygulama kaydı

1. appstoreconnect.apple.com → **Uygulamalar** → **+** → **Yeni Uygulama**.
2. Değerler `docs/APP_STORE.md` dosyasının 1. bölümünde:
   - Ad: Cupped: Kahve Günlüğü
   - Dil: Türkçe
   - Paket kimliği: com.perso1224.cupped
   - SKU: cupped-ios-1
3. Kayıttan sonra **Uygulama Bilgileri** sayfasındaki **Apple ID** numarasını (ör. `6740000000`) Claude'a gönder. Claude bunu `eas.json` içinde `submit.testflight.ios.ascAppId` olarak ekler.
   - ✅ Eklendi: `6838273482` (`testflight` ve `production` gönderim profilleri). EAS, boş ya da rakam dışı bir `ascAppId` görürse `eas.json`'u geçersiz sayar; numara değişirse yalnızca rakam yazılmalı.

## Adım 6: Yükleme

1. GitHub → **Actions** → **TestFlight'a gönder** → **Run workflow**.
2. Derleme Expo sunucularında yaklaşık 15–25 dakika sürer, sonra kendiliğinden TestFlight'a yüklenir.
3. Apple'ın işlemesi 10–30 dakika sürer. Ardından iPhone'daki **TestFlight** uygulamasında görünür. Kendini iç test grubuna eklemen yeterli; iç test için Apple incelemesi gerekmez.

---

### Sorun çıkarsa
- **"Credentials are not set up"**: Adım 4'ün 1–4. maddeleri yapılmamış.
- **"App Store Connect API Keys cannot be set up in --non-interactive mode"** ya da **"An EAS Submit ASC Api Key could not be found"**: Adım 4'ün 5. maddesi yapılmamış.
- **"ASC_API_KEY_P8, ASC_API_KEY_ID ve ASC_API_ISSUER_ID ya üçü birlikte…"**: GitHub'daki `ASC_*` anahtarlarının bir kısmı eksik. Ya üçünü de ekle ya da hepsini sil.
- **"Set ascAppId in the submit profile"**: Adım 5'teki numara henüz `eas.json`'a eklenmemiş.
- **İzin hatası (403)**: API anahtarının erişimi **Admin** değil.
