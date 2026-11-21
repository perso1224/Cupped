# Cupped

Kahve damak kimliği uygulaması (Expo + React Native + TypeScript).
Şu an sadece ekranda **"Merhaba"** yazan boş bir uygulama.

---

## Telefonda açma rehberi (teknik olmayanlar için)

İki yol var. Bilgisayarın (Windows veya Linux da olur, Mac gerekmez) varsa **Yol A**'yı kullan; asıl geliştirme bu yolla yapılacak.
Bilgisayar yoksa **Yol B** ile sadece hızlıca denemek mümkün.

### Hazırlık (bir kere yapılır, iPhone'da)

1. App Store'dan **Expo Go** uygulamasını indir (ücretsiz).
2. Açınca hesap isterse "Sign up" ile ücretsiz bir Expo hesabı aç (mail + şifre yeterli).

---

### Yol A — Bilgisayarla (önerilen)

**1. Programları kur (bir kere):**
- **Node.js**: https://nodejs.org adresine gir, büyük yeşil **LTS** düğmesine bas, indirdiğin dosyayı kur. Hep "Next / İleri" de.
- **Git**: https://git-scm.com/downloads adresinden indir ve kur. Yine hep "Next".

**2. Terminali aç:**
- Windows: Başlat menüsüne `PowerShell` yaz, aç.
- Siyah/mavi bir pencere açılacak. Aşağıdaki komutları **tek tek** kopyala, yapıştır, Enter'a bas.

**3. Projeyi bilgisayarına indir:**
```
git clone https://github.com/perso1224/Cupped.git
cd Cupped
git checkout claude/expo-setup-guide-9xz45k
```
> GitHub kullanıcı adı/şifre sorarsa GitHub hesabınla giriş yap (açılan tarayıcı penceresinden).

**4. Gerekli paketleri kur (bir kere, 1-3 dakika sürer):**
```
npm install
```
Sarı "warn" yazıları normaldir, görmezden gel.

**5. Uygulamayı başlat:**
```
npx expo start
```
Ekranda büyük bir **QR kod** çıkacak. Bu pencereyi kapatma; uygulama çalıştığı sürece açık kalmalı.

**6. Telefonda aç:**
- iPhone'un normal **Kamera** uygulamasını aç, QR koda tut.
- Çıkan "Expo Go'da aç" yazısına dokun.
- Birkaç saniye sonra ekranda **"Merhaba"** yazacak. 🎉

**7. Durdurmak için:** terminal penceresinde `Ctrl + C` tuşlarına bas.
Bir dahaki sefere sadece `cd Cupped` ve `npx expo start` yeterli.

#### Sorun çıkarsa

| Sorun | Çözüm |
|---|---|
| `npm` / `git` "tanınmıyor" diyor | Node.js veya Git kurulumu bitmemiş. Kurup terminali **kapatıp yeniden aç**. |
| Telefon QR'ı okuyunca "bağlanamadı" diyor | Telefon ve bilgisayar **aynı Wi-Fi**'da olmalı. Yurt/okul Wi-Fi'ı engelliyorsa: `Ctrl + C` ile durdur, `npx expo start --tunnel` yaz (ilk seferde ek paket kurmak isterse `y` de). |
| Expo Go "SDK sürümü uyumsuz" diyor | App Store'dan Expo Go'yu güncelle. |
| Windows "betik çalıştırma devre dışı" hatası | PowerShell'e `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` yaz, `Y` de, tekrar dene. |

---

### Yol B — Bilgisayarsız (sadece hızlı deneme)

1. iPad'de Safari ile https://snack.expo.dev adresine gir (Expo hesabınla giriş yap).
2. Soldaki `App.js` dosyasının içini tamamen sil, bu projedeki `App.tsx` dosyasının içeriğini yapıştır.
3. Sağdaki **"My Device"** sekmesine dokun, çıkan QR kodu iPhone kamerasıyla okut → Expo Go'da açılır.

> Not: Snack küçük denemeler içindir. Kamera, kayıt, paylaşım gibi sonraki adımlar için Yol A gerekecek.

---

## Proje yapısı (şimdilik)

- `App.tsx` — ekranda görünen her şey burada. "Merhaba" yazısını değiştirip kaydedersen telefonda anında güncellenir.
- `app.json` — uygulamanın adı, ikonu gibi ayarlar.
- `package.json` — kullanılan paketlerin listesi.
