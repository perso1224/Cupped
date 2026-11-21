# Test raporu: 21 Kasım 2026

4 test ajanı uygulamayı farklı açılardan test etti:
1. Kullanıcı akışları (iPhone boyutunda tarayıcı)
2. Hesap mantığı (skor, damak tipi, tarih, veri)
3. Gerçek iPhone ve Expo Go riskleri (kütüphane kaynak kodu üzerinden)
4. Ürün, brif uyumu ve Türkçe metinler

Aynı sorunu bulan ajanlar tek maddede birleştirildi. Köşeli parantez, sorunu bulan ajanları gösterir.

**Sonuç: Uygulama arkadaş betasına henüz hazır değil.** Aşağıdaki Kritik maddeler kapanmalı.

---

## KRİTİK: veri kaybı veya herkesin göreceği hata

| # | Sorun | Neden önemli | Kaynak |
|---|---|---|---|
| K1 | Telefon hafızasından okuma bir kez hata verirse, sonraki kayıt **bütün fincan geçmişini silip** tek fincan bırakıyor | Geri dönüşü olmayan veri kaybı | [2][3] |
| K2 | Fotoğrafların yeri "tam adres" olarak saklanıyor; iOS güncelleme veya yedekten dönüşte bu adres değişebiliyor | **Tüm eski fotoğraflar** sessizce boş görünür | [2][3] |
| K3 | Damak Kartı ekranından hızlı çıkınca veya uygulamayı alta alınca **ekran parlaklığı %100'de kalabiliyor** | Kullanıcıyı rahatsız eder, pil biter | [2][3] |
| K4 | Büyük harfli başlıklarda Türkçe "İ" bozuk: "FINCAN SKORU", "BAŞLANGIÇ DAMAK TIPIN", "DÖNEMIN FINCANI" | **Paylaşılan her kartta yazım hatası** görünür | [1][4] |
| K5 | Yanlış girilen fincan **silinemiyor veya düzeltilemiyor** | Yanlış dokunuş kalıcı olarak skoru, tipi, pasaportu ve ölçümleri bozar | [1][4] |
| K6 | Ölçüm güvenilir değil: paylaşım sayacı iptal edilen paylaşımı da sayıyor. H3 (kayıt süresi), H4 (geri dönüş) ve H6 (Kulüp sahte kapısı) hiç ölçülmüyor | Betanın amacı hipotez ölçmek; bu haliyle veri yanıltır | [1][4] |

## YÜKSEK

| # | Sorun | Kaynak |
|---|---|---|
| Y1 | **Skor hedefi tutmuyor.** 100 sanal kullanıcıyla simülasyonda ortalama **47** çıktı (brif hedefi ~60); kullanıcıların %38'i hep "Çaylak". 100 puana hiç ulaşılamıyor (en fazla 90). **Açık:** her seferinde uydurma yeni bir kafe adı yazan, evde demleyenden fazla puan alıyor (ortalama 64). Kurucu kararı gerekiyor (aşağıda) | [2] |
| Y2 | Zincir eşleştirme hatalı: "Armado Coffee" Mado sayılıyor, "Madonna Cafe" de öyle. "Nero", "Cafe Nero" ve "Gloria" ise zincir olarak tanınmıyor | [1][2] |
| Y3 | **Geçen ayın Damak Özeti 1'inde gece yarısı kayboluyor.** Tam paylaşılacağı anda erişilemez oluyor | [1][4] |
| Y4 | Paylaş düğmesine skor halkası animasyonu bitmeden basılabiliyor; kartta 75 yerine 37 çıkabiliyor. Özet slaytları da yarı saydam yakalanabiliyor, fotoğraf yüklenmeden boş kalabiliyor | [3][4] |
| Y5 | Damak tipi, tek bir detaylı fincanla değişip 10 fincan boyunca öyle kalıyor (fincanların %12'sinde tip değişiyor). Özet'te tip ile "en sadık yöntem" çelişebiliyor | [2] |
| Y6 | Kamera izni reddedilirse kullanıcı çıkmaza giriyor: "Ayarlar'ı aç" düğmesi yok. Expo Go'da izin metni İngilizce görünüyor | [3] |
| Y7 | Instagram hikayesinde üst ve alt kısım Instagram'ın kendi arayüzünün altında kalıyor; marka ve "Senin damak tipin ne?" yazısı kapanıyor. Kartta uygulamanın ne olduğunu anlatan bir cümle ve handle/link yok | [4] |
| Y8 | "Verilerimi dışa aktar" yok (brifte var). Ayrıca fincan verileri iCloud yedeğine girmiyor; telefon değişince geçmiş kaybolur | [3][4] |
| Y9 | Fotoğraflar tam çözünürlükte saklanıyor (fincan başına 1,5–3 MB) | [3] |
| Y10 | Detay modunda klavye kapanmıyor (sayı klavyesinde "bitti" tuşu yok); Kaydet düğmesi klavyenin altında kalabiliyor | [3] |
| Y11 | İlerleme "Bu ay" sekmesinde başlık yanlış ("Haftalık Damak Skoru"). Haftalık skor kolayca 100'e ulaşıyor ve rekor kırılamaz hale geliyor | [1][2][4] |
| Y12 | Çok hızlı kaydedince (geçmiş yüklenmeden) yanlış keşif puanı veriliyor; aynı anda iki yazma veri kaybettirebiliyor | [2][3] |

## ORTA

- **Türkçe metin hataları:**
  - "%40'i" (doğrusu "%40'ı") ve "%50'ini" (doğrusu "%50'sini") gibi yüzde ekleri yanlış.
  - Oat Milk Diplomatı cümlesinde özne karışık ("kaçınır… korursun").
  - Tek ziyarette "Barista seni tanıyor olabilir" çıkıyor.
  - Özet'te "Bu dönem" yazıyor; "Bu ay / Bu hafta" olmalı. [1][4]
- **Kilitli rozetler** nasıl kazanılacağını göstermiyor. "5 bağımsız mekan · 2/5" gibi ilerleme görünmeli; bu en güçlü geri dönüş kancası. [1][4]
- **Boş durumlar:**
  - Boş ana sayfada kocaman bir "0" görünüyor.
  - 0 fincanlı Damak Kartı "Çaylak / 0 / 0" haliyle paylaşılabiliyor.
  - Kartta "Çaylak" yazması utandırıcı olabilir. [1][4]
- **Sonuç ekranı:** puan dökümü ve detaylar kaydırmadan görünmüyor. [1]
- **Mekan girişi:**
  - Mekan yazınca "Kendim yaptım" seçimi sessizce kalkıyor.
  - "starbucks" ile "Starbucks" ayrı çip olarak çıkıyor; kartta küçük harfli hali görünüyor.
  - Uzun mekan adı çipi taşırıyor. [1][2]
- **TestFlight riski:** kullanılmayan, İngilizce bir **mikrofon izni** derlemeye ekleniyor ve App Review reddedebilir. Ayrıca `supportsTablet` açık. [3][4]
- **iPhone görünümü:**
  - Siyah ekranlarda (kamera, Özet) saat ve pil görünmüyor.
  - Alt menü yüksekliği sabit.
  - Eski 2x ekranlarda (iPhone SE) paylaşılan görsel biraz bulanık.
  - Büyük yazı tipi ayarı düzeni bozuyor. [3]
- **Kamera:** deklanşöre basınca hiçbir geri bildirim yok; çift basış sessizce hata veriyor. [3]
- **Özet'te geri gitme:** sol kenara dokununca geri gitmiyor olabilir. Bu sadece web'de görüldü, **iPhone'da doğrulanmalı**. [1]
- **Tanıtım soruları:** "günlük fincan" ve "hedef" cevapları toplanıyor ama hiçbir yerde kullanılmıyor. [4]

## DÜŞÜK

- **Kelime tutarlılığı:**
  - "Kendim yaptım" ile "Ev yapımı".
  - "Ofis / hazır" ile "Ofis kahvesi".
  - "Mekan" ile "mekân".
- **Profil ekranı:**
  - "Test sayaçları" yazısı kullanıcıya görünüyor.
  - "Tanıtımı tekrar göster" onay istemeden çalışıyor.
- **Tanıtım pürüzleri:**
  - Geri dönünce "Devam" düğmesi yok.
  - 3. tat notu seçilince ilki sessizce düşüyor.
- **Pasaport:** son damga satırı tam genişliğe yayılıyor; "9 Kas 26" tarihi belirsiz.
- **Geçmiş:** gün başlığı ve satırlar tarihi iki kez gösteriyor.
- **Diğer:**
  - Telefon saati ileri ayarlıysa sıralama bozuluyor.
  - Kullanılmayan metinler var.
  - Paylaşılan PNG büyük ve geçici dosyalar temizlenmiyor.

---

## Sorunsuz çalışanlar

- **Tanıtım:** baştan sona çalışıyor, sonunda kameraya geçiyor.
- **Fincan kaydı:** basit ve detay modu çalışıyor. Çift dokunuş tek kayıt oluşturuyor.
- **Skor dökümü:** toplam doğru.
- **Tarih hesapları:** seri, haftalık şerit, gece yarısı, Pazar→Pazartesi ve ay geçişleri İstanbul saatiyle doğru.
- **Damak Özeti:** bütün slaytlar ve çıkış yolları çalışıyor.
- **Rozetler ve seviye sınırları:** briften birebir uyuyor.
- **Ekranlar:** geçmiş, Pasaport ve Profil istatistikleri doğru.
- **iPhone uyumu:**
  - Bütün kütüphaneler Expo Go'yla uyumlu.
  - Paylaşım görseli 3x iPhone'larda tam 1080×1920.
  - Fotoğraf kopyalama doğru.
- **Kod:** tür kontrolü temiz, 47 test geçiyor.

---

## Kurucu kararı gereken konular

1. **Skor ayarı (Y1).**
   - **Önerilen:** taban puanı 30 → 40, ofis 0 → 5. Yeni mekan keşif puanı haftada en fazla 2 kez verilsin (kasma açığını kapatır). Detay bonusu +20 → +10 (brif "küçük bonus" diyor).
   - **Simülasyon:** taban 40 ve ofis 5 ile ortalama ~58 ve %1 civarında 90+ çıkıyor. Keşif sınırı ve +10 detay bonusu dahil son değerler, ayardan sonra simülasyon tekrar çalıştırılarak kontrol edilecek.
2. **Paylaşım kartında seviye.** "Çaylak" gibi seviyeler kartta görünsün mü, yoksa sadece uygulama içinde mi kalsın?
3. **Günlük hatırlatma.** Telefonun kendi bildirimi; ücretsiz, sunucu gerekmez, Expo Go'da çalışır. Örneğin "Bugün de ekle, serin 5 olsun". Eklensin mi?

## Önerilen düzeltme sırası

- **Paket 1: Veri güvenliği ve herkesin göreceği hatalar.** K1, K2, K3, K4, K5, Y2, Y3, Y4, Y6 ve Türkçe metin hataları.
- **Paket 2: Ölçüm ve beta hazırlığı.** K6 (doğru paylaşım sayacı, kayıt süresi, geri dönüş günleri, "Kulüp yakında" sahte kapısı, "Test istatistikleri" ekranı), Y8 (dışa aktar), Y1 (kurucu kararıyla), Y5, Y7, Y11, Y12.
- **Paket 3: Cilalama ve TestFlight hazırlığı.** Y9, Y10, ORTA ve DÜŞÜK maddeler, mikrofon izni, ikon.
