# Yol haritası ve ertelenen işler

Briften sonraki kararlar ve ileride yapılacak işler burada tutulur.

## Brif aşamaları (10.2)

| Aşama | Durum |
|---|---|
| (a) İskelet, tema, alt menü | ✅ |
| (b) Kamera, hızlı kayıt, yerel veri | ✅ |
| (c) Skor ve damak tipi (birim testli) | ✅ |
| (d) Paylaşım kartı | ✅ |
| (e) Geçmiş, Damak Pasaportu, haftalık/aylık rapor, seri | ✅ |
| (f) Damak Kartı ("Göster" modu) | ✅ |
| (g) Onboarding | ✅ |
| (h) Detay modu (tat notları, menşei, gram/su/öğütme, not) | ✅ |

**Kapsamdan çıkarılanlar:** Düello (QR), kurucu kararı (21 Kas 2026).

## TestFlight'a geçiş (Apple Developer hesabı alındığında)

Ne zaman: (f)(g)(h) bittiğinde ve 10-20 kişilik Expo Go denemesinden sonra (yol haritası Ay 2-3).

Hazırlık listesi:
- [~] Uygulama ikonu ve açılış ekranı: geçici ikon var (fincan izi halkaları), marka adı kesinleşince yenilenecek
- [ ] Marka adı ve handle ön araştırması (TÜRKPATENT), `src/config/brand.ts` güncellenir
- [~] Gizlilik politikası sayfası hazır: `docs/gizlilik.html` (e-posta doldurulup yayınlanacak). Mağaza metinleri: `docs/APP_STORE.md`
- [x] Kamera ve fotoğraf izin metinleri Türkçe; gereksiz mikrofon izni kaldırıldı
- [x] "Verilerimi dışa aktar" (JSON), Profil'de
- [ ] Apple Developer hesabı (kurucu alır), ardından EAS Build ile bulutta iOS derlemesi (Mac gerekmez) ve TestFlight'a gönderim
- [ ] Otomatik yayın düzeni: TestFlight sürümü de aynı EAS Update kanalından güncellenecek şekilde ayarlanır
- [ ] Tek dokunuşla doğrudan Instagram Hikayesi'ne paylaşım (Instagram Stories URL şeması). Ücretsiz bir Facebook/Meta geliştirici uygulama kimliği ve uygulamanın kendi derlemesi gerekir; Expo Go'da çalışmaz. Şimdilik iOS paylaşım menüsü kullanılıyor.

## Ertelenen özellik: Fotoğrafta kahve kontrolü (ücretsiz, cihaz içi)

**Sorun:** Kullanıcı kahve olmayan bir şeyin (ör. su şişesi) fotoğrafını çekip kahve diye kaydedebiliyor.

**Karar:** v1'de doğrulama yok (brif: "beyan bazlı, eğlence ürünü"). Hile yapmanın kazancı yok: sıralama ve ödül yok.
TestFlight betasında gerçekten sorun olursa eklenecek.

**Yöntem (API maliyeti yok):**
- Apple'ın cihaz içi görüntü sınıflandırması (Vision framework, `VNClassifyImageRequest`). İnternetsiz ve ücretsiz çalışır.
- Expo Go'da çalışmaz. Kendi derlememiz gerekir (TestFlight / EAS Build). Swift ile küçük bir yerel Expo modülü yazılır; EAS bulutta derlediği için Mac gerekmez.
- Fotoğraf çekilince etiketlere bakılır (ör. coffee, cup, mug, beverage, drink). Ayarlar `scoring.config.ts`'e eklenir: etiket listesi ve güven eşiği.

**Davranış (cezalandırmayan dil):**
- Kahveye benzemiyorsa kayıt **engellenmez**. Küçük bir uyarı çıkar: "Bu kahveye benzemiyor 🤔 Yine de kaydedeyim mi?"
- Kayda `photoCheck: 'coffee' | 'unsure' | 'skipped'` alanı eklenir. Skora etkisi yok, sadece ölçüm için (ne kadar hile yapılıyor?).
- Fotoğrafsız kayıtlar `skipped` olur.

**iOS ve Android (kurucu kararı, 21 Kas):** Uygulama dünyaya iki platformda yayınlanacak. Bu yüzden önerilen yol, iki platformda aynı çalışan tek bir cihaz içi model:
- Model ImageNet ile eğitilmiş küçük bir sınıflandırıcı olacak (örneğin MobileNet). İçinde "espresso", "coffee mug" ve "cup" sınıfları var; "water bottle" da ayrı bir sınıf, yani su şişesi ayırt edilebilir.
- TFLite ile telefonun içinde çalışacak. Ücretsiz, internetsiz, iki platformda aynı sonuç.
- Alternatif: iOS'ta Apple Vision, Android'de Google ML Kit (ikisi de ücretsiz, cihaz içi). Ama iki ayrı kod gerektirir ve sonuçlar platforma göre farklı çıkabilir.
- Expo Go'da çalışmaz; kendi derlememiz (EAS Build) gerekir. Android'de test için APK yeterli. Yayın için Google Play hesabı gerekir (tek seferlik ~25$).
- **Davranış kararı: reddetme değil, uyarı.** Yukarıdan çekilmiş latte, karanlıkta espresso ya da Türk kahvesi fincanı yanlışlıkla "kahve değil" çıkabilir. Gerçek kahvesi reddedilen kullanıcı uygulamayı bırakır.

**Ne zaman karar verilir:** TestFlight betasının ilk 2 haftasından sonra. Beta kullanıcılarının fotoğraflarında belirgin hile varsa yapılır, yoksa ertelenir.

## Sonra (veriye göre, brif 11)

Sezon/abonelik (RevenueCat), kart temaları, kafe sponsorlukları, arkadaş/sıralama (backend gerekir), widget, Apple Watch, iCloud senkronu, Instagram Stories'e doğrudan paylaşım.
