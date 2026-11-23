# TestFlight'a ilk yükleme

Apple Developer üyeliği açık. Bu adımlar bir kez yapılır; sonraki sürümler tek tuşla gider (GitHub > Actions > "TestFlight'a gönder").

Doğrulama notu: ayar adları EAS CLI 27.11 kaynak kodundan kontrol edildi.
- Otomatik derleme ilk seferde imza sertifikasını kendisi oluşturamıyor. Kaynak kodda: "Credentials are not set up. Run this command again in interactive mode."
- Otomatik gönderim için App Store Connect'teki uygulama numarası (`ascAppId`) şart.

---

## Adım 1: Takım kimliği (Team ID)

1. developer.apple.com → **Account** → **Membership details**.
2. **Team ID**'yi kopyala (10 karakter, ör. `AB12CD34EF`).

## Adım 2: App Store Connect API anahtarı

1. appstoreconnect.apple.com → **Users and Access** → **Integrations** → **App Store Connect API** → **Team Keys** → **+**.
2. Ad: `Cupped CI`, erişim (Access): **Admin**.
3. **Download** ile `.p8` dosyasını indir. Bu dosya yalnızca bir kez indirilebilir.
4. Sayfadaki **Issuer ID** ve anahtarın **Key ID** değerini not al.

## Adım 3: GitHub gizli anahtarları

GitHub → Cupped deposu → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Ad | Değer |
|---|---|
| `ASC_API_KEY_P8` | `.p8` dosyasının **içeriği** (dosyayı not defteriyle aç, hepsini kopyala) |
| `ASC_API_KEY_ID` | Key ID |
| `ASC_API_ISSUER_ID` | Issuer ID |
| `APPLE_TEAM_ID` | Team ID |

`EXPO_TOKEN` zaten var.

## Adım 4: İmza sertifikası (tek seferlik, bilgisayarda yapılır)

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

## Adım 5: App Store Connect'te uygulama kaydı

1. appstoreconnect.apple.com → **Uygulamalar** → **+** → **Yeni Uygulama**.
2. Değerler `docs/APP_STORE.md` dosyasının 1. bölümünde:
   - Ad: Cupped: Kahve Günlüğü
   - Dil: Türkçe
   - Paket kimliği: com.perso1224.cupped
   - SKU: cupped-ios-1
3. Kayıttan sonra **Uygulama Bilgileri** sayfasındaki **Apple ID** numarasını (ör. `6740000000`) Claude'a gönder. Claude bunu `eas.json`'a `ascAppId` olarak ekler.

## Adım 6: Yükleme

1. GitHub → **Actions** → **TestFlight'a gönder** → **Run workflow**.
2. Derleme Expo sunucularında yaklaşık 15–25 dakika sürer, sonra kendiliğinden TestFlight'a yüklenir.
3. Apple'ın işlemesi 10–30 dakika sürer. Ardından iPhone'daki **TestFlight** uygulamasında görünür. Kendini iç test grubuna eklemen yeterli; iç test için Apple incelemesi gerekmez.

---

### Sorun çıkarsa
- **"Credentials are not set up"**: Adım 4 yapılmamış.
- **"Set ascAppId in the submit profile"**: Adım 5'teki numara henüz `eas.json`'a eklenmemiş.
- **İzin hatası (403)**: API anahtarının erişimi **Admin** değil.
