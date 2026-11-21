# Cupped — Gece Çalışması Raporu (21–22 Kasım 2026)

## 1. Başlangıç durumu
- Expo SDK 58 / React Native 0.88, Expo Router, AsyncStorage, sunucu yok. Yayın: GitHub Actions → EAS Update (preview kanalı).
- Gece başında **gönderilmemiş büyük bir düzeltme paketi** vardı (gezinme, "animasyonları azalt", ayarlar). Önce doğrulandı (tsc, lint, 84 test) ve gönderildi.
- Önceki denetimler gezinme, arayüz tutarlılığı ve ayarlar ekranını kapsamıştı. Bu gece veri, mantık, performans, güvenlik ve erişilebilirlik incelendi.

## 2. Tespit edilen sorunlar (öncelik)
| Öncelik | Sorun |
|---|---|
| P1 | Ana veri bozuksa ve yedek yoksa liste boş listeyle **üzerine yazılabiliyordu** (veri kaybı) |
| P1 | Okunamayan tek tek kayıtlar bir sonraki kayıtta **kalıcı olarak siliniyordu** |
| P1 | Ekranlar veri okurken "onarım" yazması yapabiliyordu → aynı anda kaydedilen yeni fincan ezilebilirdi |
| P1 | Kayıtlı fincan **düzenlenemiyordu** (yanlış yöntem/mekan seçilirse tek çare silmekti) |
| P2 | Yedekten geri yüklemede tarih biçimi, tat notları, tarif sayıları doğrulanmıyordu (sıralama/oran "1:NaN" hataları) |
| P2 | Hatırlatıcı yalnızca uygulama açılınca kuruluyordu → bir gün açılmazsa **bir daha hiç gelmiyordu** |
| P2 | "Yeni mekan" skorda zincir şubelerini tek sayıyor, hedef/pasaport/rozette ayrı sayıyordu (tutarsızlık); Latin dışı mekan adları hiç sayılmıyordu |
| P2 | Bazı işlemlerde yakalanmamış hata: tanıtımın kaydı (takılı kalma), "Tüm verileri sil", galeri açma |
| P2 | Büyük galeri fotoğrafı iki kez tam çözülüyordu (bellek sıçraması) |
| P3 | iPhone SE'de Ayarlar'da "20:30" → "20…" kesiliyordu; test istatistiklerinde satır ekran dışına taşıyordu |
| P3 | VoiceOver: düğmeler "düğme" olarak okunmuyordu, seçili çipler belirtilmiyordu, deklanşör etiketsizdi |
| P3 | Ayarlar kaydedilmeden ekrana yansıyordu; eski dışa aktarma dosyaları önbellekte birikiyordu; UTC+12/13'te gün sayımı 1 kayabiliyordu |

## 3. Düzeltilen hatalar
Yukarıdaki tüm maddeler düzeltildi. Ayrıntılar:
- **Veri güvenliği (storage.ts, entries.ts):** yedek yoksa yazma iptal; atlanan kayıtlar varsa ham veri yazmadan önce `.corrupt.*` anahtarına saklanır; `loadEntries` artık salt okunur, onarım sadece sıralı yazma kuyruğunda.
- **İçe aktarma:** tarih ISO-UTC'ye çevrilir; tat notu ve öğütüm beyaz listesi; tarif sayıları pozitif sayı olmalı; metinler kırpılır (ad 80, not 500); en fazla 20.000 kayıt.
- **Hatırlatıcı:** ilk hatırlatmanın ardından 6 gün daha kurulur; her açılışta yeniden hesaplanır (uygulama açılmasa da 1 hafta gelir).
- **Mekan kimliği:** tek `placeKey` fonksiyonu; skor, haftalık hedef, pasaport ve rozetler aynı sayar. Pasaportta zincir şubeleri "Starbucks" olarak tek damgada.
- **Hata yönetimi:** ilgili yerlere try/catch + Türkçe uyarı; tanıtımda kayıt başarısızsa tekrar denenebilir.
- **Erişilebilirlik:** `PressScale` varsayılan `button` rolü + `disabled` durumu; çip/seçenek `selected`; anahtarlar ve deklanşör etiketli.
- **Küçük ekran:** liste satırında kısa değerler hiç kısalmaz; fincan detayında skor parçaları tek satır.

- **Bağımsız kod incelemesi (gecenin değişiklikleri):** 6 bulgu → hepsi düzeltildi: metin kutularına uzunluk sınırı (kaydettiğin not sonradan kırpılmasın); bilinmeyen tat notu atılırsa ham veri saklanır; düzenlemede yeni fotoğraf yüklenene kadar Paylaş kilitli, değişmeyen kart yeniden çizilmez; yedek yokken bozuk veri durumunda kullanıcı kilitlenmez (bozuk veri ayrı saklanır, boş listeyle devam); kaydedilemeyen düzenlemenin yeni fotoğrafı silinir; düzenlemede fotoğraf adımında Kapat → forma döner.

## 4. Geliştirilen özellikler
1. **Fincanı düzenle** — Fincan detayı → "Düzenle". Kayıt ekranı dolu açılır; fotoğraf değiştirilebilir. Skor, **fincanın kendi tarihindeki** geçmişe göre yeniden hesaplanır; kimlik, tarih ve listedeki sıra korunur. Fotoğraf değişirse eskisi silinir. Kaydedilmemiş değişiklikle kapatılırsa sorulur.
2. **Aynısından bir tane daha** — Fincan detayı → yöntem, mekan, menşei ve tarif dolu gelir; sadece fotoğraf çekip kaydetmek yeter. (Brifteki H3 "hızlı kayıt" hipotezine doğrudan katkı.)
3. **Pasaporttan filtre** — Pasaport'ta bir mekana ya da yönteme dokun → o mekanın/yöntemin tüm fincanları + "N fincan · ortalama X".

## 5. Yaratıcı fikirler (değerlendirildi, bilinçli olarak eklenmedi)
- Kişisel beğeni puanı (yıldız): ürün kimliğini (skor = emek/keşif) değiştirir → **senin kararın**.
- Koyu mod: tüm renk sisteminin elden geçmesi gerekir; ayrı bir iş olarak önerilir.
- React Compiler'ı açmak: performansı otomatik artırır ama cihazda test edilmeden açmak riskli; sonraki sürüm için önerilir.

## 6. Tasarım iyileştirmeleri
SE'de liste satırları, skor parçaları; boş durumda gereksiz "Tüm fincanlar" düğmesi gizlendi; pasaport damgaları dokunulabilir (basınca küçülme efekti).

## 7. Yapılan testler
- `tsc --noEmit`: temiz · `expo lint`: temiz · Vitest: **92 test geçti** (84 → 92; yeni: içe aktarma sertleştirme, hatırlatma planı, mekan kimliği, filtre).
- Web (Playwright, iPhone 14 ve SE; inceleme düzeltmelerinden sonra tekrar çalıştırıldı): düzenleme akışı (skor 55 → 70 doğru yeniden hesaplandı, sıra korundu, detay yenilendi), "aynısından" akışı, pasaport → filtreli liste, tüm ana ekranların SE görüntüleri, boş durum ekranları. Konsol hatası yok.
- EAS yayın iş akışı (GitHub Actions): gece gönderilen sürümler başarılı.

## 8. Başarısız testler
Yok. (`expo-doctor`'ın 2 kontrolü yalnızca internet erişimi olmadığı için çalışamadı; proje hatası değil.)

## 9. Çözülemeyen / doğrulanamayan
- **Gerçek iPhone'da test edilemedi** (bulut ortamı). Kamera, bildirim, fotoğraf değiştirme, VoiceOver ve titreşim yalnızca telefonda doğrulanabilir — aşağıdaki listeyi dene.
- Yedekte fotoğraflar taşınmıyor (bilinen, ekranda yazıyor). Fotoğrafları da yedeklemek ileride zip gerektirir.

## 10. Değiştirilen dosyalar
`src/app/new.tsx, history.tsx, onboarding.tsx, settings.tsx, (tabs)/index.tsx, profile.tsx, progress.tsx` · `src/components/CupDetail.tsx, List.tsx, PassportView.tsx, motion.tsx, ui.tsx` · `src/lib/storage.ts, entries.ts, reminders.ts, reminderTime.ts, progress.ts, scoring.ts, metrics.ts` + testleri · `src/i18n/tr.ts`

## 11. Tamamlanmamış görevler
- Çok uzun geçmişte (500+ fincan) "Tüm fincanlar" listesinin sanallaştırılması (FlatList) — şu an 1-3 kullanıcı için gereksiz.
- Küçük önizleme (thumbnail) dosyaları üretmek.

## 12. Sonraki adım önerileri
1. Telefonda şu testleri yap: bir fincanı **Düzenle** (yöntemi değiştir, kaydet → skor değişmeli) · **Aynısından bir tane daha** · Pasaport'ta bir mekana dokun · Ayarlar'da hatırlatma saatinin tam göründüğünü kontrol et.
2. Arkadaşlarınla 1 hafta deneyip Test istatistikleri ekranının görüntüsünü topla (H2/H3 ölçümleri).
3. Hazır hissettiğinde Apple Developer + TestFlight; ardından cihaz üstü "kahve mi?" kontrolü (YOL_HARITASI.md).
