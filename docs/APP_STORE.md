# App Store ve TestFlight metinleri

App Store Connect'e kopyala-yapıştır yapılacak metinler. Karakter sınırları parantez içinde; metinler sınırların altında.
`[…]` ile işaretli yerleri kurucu doldurur.

---

## 1. Şimdi gerekenler: TestFlight

### Uygulama kaydı (App Store Connect → Uygulamalar → +)

| Alan | Değer |
|---|---|
| Platform | iOS |
| Ad (30) | `Cupped: Kahve Günlüğü` |
| Birincil dil | Türkçe |
| Paket kimliği (Bundle ID) | `com.perso1224.cupped` (app.json'daki ile aynı olmalı) |
| SKU | `cupped-ios-1` (sadece senin için bir kod; kullanıcı görmez) |
| Kullanıcı erişimi | Tam erişim |

> Not: "Cupped" adı tek başına App Store'da başka bir uygulamada kullanılıyorsa kabul edilmez. Bu yüzden ad "Cupped: Kahve Günlüğü". Telefonun ana ekranında yine sadece **Cupped** yazar.

### Test bilgileri (TestFlight → Test Bilgileri)

**Beta uygulama açıklaması (4000)**

```
Cupped, içtiğin her fincanı birkaç saniyede kaydettiğin bir kahve günlüğü. Fotoğrafını çek, yöntemi ve yeri seç; Cupped fincanına bir skor verir ve zamanla damak tipini çıkarır.

Bu beta sürümünde:
• Hızlı fincan kaydı (fotoğraflı ya da fotoğrafsız)
• Fincan skoru ve damak tipi
• Damak Pasaportu: yöntem ve vize damgaları, mekanlar, rozetler
• Günlük seri, haftalık ve aylık Damak Özeti
• Damak Kartı ve paylaşım kartları
• Damak Uyumu: arkadaşınla damak kodunu karşılaştır

Hesap açman gerekmez. Tüm verilerin yalnızca telefonunda saklanır.
```

**Neyi test etmeli? (4000)**

```
Teşekkürler! Lütfen bir hafta boyunca içtiğin her kahveyi Cupped'a ekle.

Özellikle şunlara bak:
1. Fincan eklemek ne kadar sürüyor? Bir yerde takıldın mı?
2. Skor ve damak tipi sana mantıklı geldi mi?
3. Paylaşım kartını Instagram'da paylaştın mı? Neden paylaştın / paylaşmadın?
4. Hatırlatma bildirimi geldi mi, rahatsız etti mi?

Hata ya da garip bir şey görürsen ekran görüntüsü alıp TestFlight'taki "Geri Bildirim Gönder" ile gönder.
```

| Alan | Değer |
|---|---|
| Geri bildirim e-postası | `beratyapar4@gmail.com` |
| Pazarlama URL'si | Boş bırakılabilir |
| Gizlilik politikası URL'si | `https://perso1224.github.io/Cupped/gizlilik.html` (bkz. bölüm 3) |

**Beta İnceleme bilgileri** (yalnızca dış test için; ilk 100 kişiye kadar iç test bunu istemez)

| Alan | Değer |
|---|---|
| İletişim adı, telefonu, e-postası | `[kurucunun bilgileri]` |
| Giriş gerekli mi? | Hayır (hesap yok) |
| İnceleme notu | aşağıda |

```
Cupped hesap gerektirmez; açılışta üç kısa soru sorulur, ardından uygulama kullanılabilir. Tüm veriler cihazda saklanır, sunucumuz yoktur. Kamera yalnızca fincan fotoğrafı için kullanılır; kamera izni verilmezse "Fotoğrafsız devam et" ile kayıt yapılabilir.

English: Cupped requires no account or login. On first launch it asks three short questions, then the app is fully usable. All data (cups, photos, settings) is stored only on the device; we run no server. The camera is used only to photograph your coffee; if camera access is denied, tap "Fotoğrafsız devam et" (continue without photo) to log a cup. The UI is in Turkish.
```

---

## 2. Sonra gerekenler: App Store'da yayın

### Metinler

**Ad (30):** `Cupped: Kahve Günlüğü`

**Alt başlık (30):** `Her fincan bir damak kimliği`

**Tanıtım metni (170)** (yayından sonra da sürüm göndermeden değiştirilebilir)

```
Bugün ne içtin? Fincanını saniyeler içinde kaydet, skorunu gör, damak tipini keşfet ve pasaportunu damgalarla doldur.
```

**Açıklama (4000)**

```
Cupped, kahve içenler için bir damak günlüğü. Her fincanı birkaç saniyede kaydet; Cupped zamanla neyi sevdiğini sana gösterir.

FİNCANINI KAYDET
Fotoğrafını çek (ya da fotoğrafsız devam et), yöntemi ve yeri seç. Hepsi bu. İstersen tat notları, çekirdeğin menşei, gram, su ve öğütme gibi ayrıntıları da ekle.

FİNCAN SKORU
Her fincan bir skor alır: emek, keşif ve derinlik. Yeni bir kafe denemek, farklı bir yöntem seçmek ve tadı not etmek skorunu yükseltir.

DAMAK TİPİN
Meyve Kaşifi mi, Klasik Usta mı, Gece Vardiyası mı? İçtiklerine göre damak tipin ortaya çıkar ve zevkin değiştikçe o da değişir.

DAMAK PASAPORTU
Denediğin her yöntem pasaportuna bir damga, keşfettiğin her damak tipi bir vize olarak işlenir. Gittiğin mekanlar ve kazandığın rozetler de burada.

SERİ VE ÖZETLER
Günlük serini koru, haftalık ve aylık Damak Özeti'ni izle. Yıl sonunda tüm fincanların Fincan Duvarı'nda bir arada.

PAYLAŞ
Fincan kartını, Damak Kartı'nı ya da özetini paylaşım menüsünden Instagram, WhatsApp ve diğer uygulamalarda paylaş. Damak kodunla arkadaşlarınla Damak Uyumu'na bak.

GİZLİLİK ÖNCE
Hesap açman gerekmez. Fincanların, fotoğrafların ve ayarların yalnızca telefonunda saklanır; sunucumuz yok. İstediğin zaman verilerini dışa aktarabilir ya da tamamen silebilirsin.
```

**Anahtar kelimeler (100)** (virgülle, boşluksuz; adda geçen kelimeler tekrar edilmez)

```
espresso,filtre,türk,kafe,barista,tadım,latte,v60,demleme,çekirdek,rozet,seri,damak,pasaport
```

**Destek URL'si:** `https://perso1224.github.io/Cupped/#destek`

**Pazarlama URL'si (isteğe bağlı):** `https://perso1224.github.io/Cupped/` (tanıtım sayfası, docs/index.html)

### Kategori ve yaş

| Alan | Değer |
|---|---|
| Birincil kategori | Yemek ve İçecek |
| İkincil kategori | Yaşam Tarzı |
| Yaş sınırı | 4+ (anketteki tüm sorulara "Hayır / Yok") |
| Telif hakkı | `2026 [kurucunun adı ya da şirket adı]` |

### Uygulama gizliliği (App Privacy anketi)

Fincanlar, fotoğraflar, ayarlar ve kullanım sayıları cihazda kalır. Hesap, reklam ve analitik aracı yok.
Tek istisna: uygulama güncellemeleri (expo-updates) her açılışta Expo'nun güncelleme sunucusuna rastgele bir **kurulum kimliği** gönderir.
Bu kimlik kişiyle ilişkilendirilmez, ama Apple'ın tanımına göre "Cihaz Kimliği" sayılabilir. Bu yüzden ihtiyatlı cevap:

- **"Bu uygulamadan veri topluyor musunuz?" → Evet.**
- Veri türü: **Tanımlayıcılar → Cihaz Kimliği**
  - Amaç: **Uygulama İşlevselliği**
  - Kullanıcının kimliğine bağlı mı? **Hayır**
  - İzleme (tracking) için mi? **Hayır**
- Başka hiçbir veri türü işaretlenmez.

App Store sayfasında "Kimliğinize Bağlı Olmayan Veriler: Tanımlayıcılar" olarak görünür. Bu, "Veri Toplanmıyor" demekten daha doğru ve güvenlidir.

**Google Play "Veri güvenliği" formu:**
- Veri toplanıyor mu? Evet.
  - Tür: **Cihaz veya diğer kimlikler**.
  - Amaç: Uygulama işlevselliği.
  - Paylaşılıyor mu? Hayır.
- Aktarımda şifreli mi? Evet.
- Kullanıcı silme isteyebilir mi? Evet, uygulama içinde "Tüm verileri sil" var.
- İleride analitik, hesap ya da sunucu eklenirse bu cevaplar güncellenmeli.

### Ekran görüntüleri

- App Store Connect, yükleme ekranında hangi iPhone boyutlarının zorunlu olduğunu gösterir. Genelde büyük ekranlı bir iPhone boyutu yeterlidir; küçük ekranlar ondan türetilir.
- Önerilen 6 görüntü, sırasıyla:
  1. Ana sayfa (bugünkü skor kartı)
  2. Sonuç ekranı (büyük skor + konfeti)
  3. Damak Pasaportu (damgalar)
  4. Damak Kartı
  5. İlerleme (seviye, seri, grafik)
  6. Damak Özeti'nden bir sayfa
- Görüntülerde gerçek görünen deneme verisi olsun (en az 10–15 fincan, birkaç mekan).
- Telefonun saati 9:41, pil dolu olursa Apple tarzı temiz görünür.

---

## 3. Gizlilik politikası sayfası

- Apple, gizlilik politikası için herkese açık bir internet adresi ister.
- Hazır sayfa: `docs/gizlilik.html`. Uygulamadaki Gizlilik ekranıyla aynı konuları anlatır (veri telefonda, kamera ve fotoğraflar, bildirimler, kullanım sayıları, güncelleme sunucusu, silme) ve ek olarak çocuklar ile iletişim bölümü içerir.
- İletişim e-postası: `beratyapar4@gmail.com` (23 Kas).

Ücretsiz yayınlama seçenekleri:

1. **GitHub Pages:** Depo herkese açıksa, Ayarlar → Pages → `docs` klasörü seçilir. Adres `https://perso1224.github.io/Cupped/gizlilik.html` olur.
2. **Herhangi bir ücretsiz sayfa servisi:** Notion'da "Web'de yayınla" ya da Google Sites. Sayfanın içeriği kopyalanır.

Aynı sayfa, içinde iletişim e-postası olduğu için Destek URL'si olarak da kullanılabilir.
