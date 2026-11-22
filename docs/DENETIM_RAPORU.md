# Denetim raporu (22 Kasım 2026)

Uygulama beş ajanla denetlendi: kod, görsel, hatalar, ilk kez kullanan biri, erişilebilirlik ve mağaza kuralları.
Denetimler web sürümünde ve kod okunarak yapıldı. Telefonda doğrulanması gerekenler ayrıca işaretli.

Durum: ☐ yapılacak · ☑ yapıldı · ❓ kurucu kararı gerekiyor

## A. Mağaza engelleri (göndermeden önce şart)

- ☑ **Android ikonu:** Hâlâ Expo'nun şablon ikonu duruyor. Favicon da öyle. Halkalı ikonla değiştirilmeli.
- ☑ **iPhone'da paylaşım menüsünden "Görüntüyü Kaydet" uygulamayı çökertir:** Fotoğraf kaydetme izin metni (`NSPhotoLibraryAddUsageDescription`) eksik.
- ☑ **Gizli "Test istatistikleri" ekranı (Sürüm'e 5 kez dokunma):** Mağaza sürümünde olmamalı (Apple 2.3.1). Yalnızca TestFlight derlemesinde açılan bir bayrağa bağlanmalı.
- ☑ **Güncelleme kanalı:** Mağaza sürümü, her `git push`'ta güncellenen "preview" kanalını dinliyor. Ayrı bir "production" kanalı açılmalı.
- ❓ **Gizlilik sayfası:** Yayınlanmalı. İletişim e-postası ve barındırma yeri gerekiyor.
- ☑ **"Veri Toplanmıyor" etiketi:** Çözüm: APP_STORE.md'de ihtiyatlı olarak "Cihaz Kimliği (bağlantısız, izleme yok)" beyan edildi. Ayrıntı: expo-updates her açılışta Expo sunucusuna kuruluma özel bir kimlik gönderiyor. Bu kimliğin "Cihaz Kimliği" olarak beyan edilmesi gerekebilir.

## B. Veri ve puan hataları

- ☑ **"Dün" eklenen fincan:** Sonraki fincanlar yeniden puanlanmıyor. Fincan çift ilk-keşif bonusu alıyor, ardından bir silme XP'yi düşürüyor. "Asla düşmez" kuralına aykırı.
- ☑ **Yedekten geri yükleme:** Aynı sorun var; içe aktarınca puanlar yeniden hesaplanmıyor.
- ☑ **Yeni alanların silinmesi:** Eski bir sürüm (geri alma ya da yedek paket) çalışırsa, fincanlardaki yeni alanlar (ör. yıldız) bir sonraki kayıtta kalıcı olarak silinir.
- ☑ **Performans:** 1000+ fincanda eski bir fincanı silmek ya da düzenlemek uygulamayı saniyelerce donduruyor. Ana sayfa her açılışta bütün geçmişi defalarca hesaplıyor.
- ☑ **Zincir kafeler tutarsız sayılıyor:** Bazı ekranlar şubeleri birleştiriyor, bazıları ayırıyor. Aynı ekranda iki farklı "favori mekan" görünebiliyor.
- ☑ **Fincan Duvarı afişi Ocak'ta yanlış yılı açıyor:** Geçen yılın afişine dokununca boş, yeni yılın duvarı geliyor.
- ☑ **Hatırlatma metni:** Seri zaten bozulmuşken "Serin 3 gün" diyebiliyor.
- ☑ **Damak Uyumu kodu:**
  - Arkadaşın gönderdiği mesajın tamamı yapıştırılınca kod okunmuyor.
  - Türkçe klavyedeki "İ" reddediliyor.
  - Kendi kodunu girince "%99 ruh ikizi" çıkıyor.
- ☑ **Küçük hatalar:**
  - "1.000 ml" 1 ml olarak okunuyor.
  - Latin harfi olmayan mekan adlarının hepsi tek mekan sayılıyor.
  - Hem veri hem yedek bozuksa hiç kayıt yapılamıyor.
  - "Tüm verileri sil" telefonda tema ayarını silmiyor.
  - Android'de Damak Kartı'ndan çıkınca otomatik parlaklık kilitli kalıyor.

Ek olarak yapılanlar (kod denetiminden):
- ☑ Fincanlar telefonda ayrı bir dosyada tutuluyor (Android'deki 6 MB sınırı yok).
- ☑ React Compiler artık bütün ekranları derliyor.
- ☑ Fincanlar bellekte tutuluyor.
- ☑ Liste satırlarında tam boy fotoğraf yerine küçük resim kullanılıyor.
- ☑ Yöntem ve tat listeleri tek bir yerde toplandı.
- ☑ Dolum animasyonları telefonun kendi animasyon motorunda çalışıyor.
- ☑ Rozet ve damak evrimi kutlamaları tekrarlanmıyor.

## C. Kafa karıştıranlar (kurucu kararı gerekiyor)

- ❓ **Damak tipi çok oynak:** Neredeyse her fincanda değişiyor. "Damak evrimi" kartı dakikalar içinde iki kez çıkabiliyor ve damak kodu sürekli değişiyor.
  - Öneri: İlk 5–7 fincanda "tahmin" olarak göster, belirgin farkla değişsin, evrim kartı en fazla haftada bir çıksın.
- ❓ **"Fincan Skoru" kahvenin puanı gibi duruyor ama değil:**
  - Yıldızın skora etkisi yok.
  - Aynı kafeye tekrar gitmek puanı düşürüyor.
  - Emek, Keşif, Derinlik ve Taban hiçbir yerde açıklanmıyor.
  - Öneri: Tek satırlık bir açıklama ve "?" ekle; ya da adını değiştir.
- ❓ **Aynı gün için 4 farklı sayı (85 / 71 / 76 / 73):** Ana sayfa günün en iyisini, İlerleme ortalamayı gösteriyor. Tek bir kural seçilmeli.
- ☐ **Çıkış onayındaki "Vazgeç" düğmesi fincanı siliyor:** Uygulamanın geri kalanında "Vazgeç" iptal demek. Öneri: "Çık, kaydetme" / "Düzenlemeye dön".
- ☐ **Seri kartı:** Bugün fincan eklendiği halde "Bugün de bir fincan ekle" diyor.
- ☐ **Onboarding cevapları kullanılmıyor:** Seçilen favori yöntem formda öne çıkmıyor. 3. tat seçilince ilk seçim sessizce düşüyor.
- ☐ **Tema değişince uygulama yeniden başlıyor:** Yazılan takma ad kaybolabiliyor.
- ☐ **Düzenleme ekranı:** "Ne zaman?" yok, yanlış güne eklenen fincan düzeltilemiyor.
- ☐ **Hatırlatma:** Satırın adı "Akşam hatırlatması" ama sabah saatleri de seçilebiliyor.
- ☐ **Rozet koşulları:** "Bağımsız kafe" ve "zincir" kavramları kullanıcıya açıklanmıyor.

## D. Görsel cila

- ☐ **Ayarlar:** Değerler yarıda kesiliyor ("Telefonu i…", "Yeni meka…").
- ☐ **Fincan paylaşım kartı:**
  - Uzun tip adı kesiliyor.
  - Küçük ekranda alt yazı ile slogan üst üste biniyor.
  - Stil öteki kartlarla uyumsuz (☕ emoji, düz yazı tipi).
- ☐ **Onboarding:** Uygulamanın kahve havası yok; Fraunces yazı tipi ve damga görseli kullanılmıyor.
- ☐ **Pasif düğmeler:** Soluk ve zor okunuyor.
- ☐ **Fincan listeleri:** Her satırda aynı simge var; Pasaport'taki yöntem simgeleri ve renkleri kullanılabilir.
- ☐ **Karanlık mod:**
  - Pasaport'taki espresso ve sütlü damgaları zor okunuyor.
  - Android'deki alt menü kartlarla karışıyor.
- ☐ **Fincan detayı:** Kaydırınca geri ve paylaş daireleri yazının üstüne biniyor.
- ☐ **Küçük ekran (320 px):**
  - Ana sayfa düğmeleri iki satıra kayıyor.
  - Fincan satırları çok uzun.
  - Fincan Duvarı ay etiketleri çok küçük.
- ☐ **Boş durumlar:** Geçmiş ve Pasaport çıplak görünüyor; bir "İlk fincanını ekle" düğmesi eklenebilir.
- ☐ **Fincan ekleme formu:**
  - Başlık stilleri karışık.
  - "Kahve (g)" hem etiket hem örnek metin olarak tekrar ediyor.
  - Menşei örnek metni kesiliyor.
- ☐ **İlerleme:** Ekran 4 düğmeyle bitiyor; bunlar bir listeye dönüştürülebilir.

## E. Erişilebilirlik

- ☐ **Karanlık modda turuncu düğmenin yazısı:** Okunmuyor, kontrast 2,3 (en az 4,5 gerekiyor).
- ☐ **Damak Özeti:** Ekran okuyucuyla kullanılamıyor; slaytlar kendiliğinden geçiyor ve geri gidilemiyor.
- ☐ **Ekran okuyucu eksikleri:**
  - Başlık, ilerleme çubuğu ve grafik etiketleri eksik.
  - Yazı kutularının adı okunmuyor.
- ☐ **Büyük yazı boyutu:** Sabit yükseklikli düğme ve kutularda yazı taşıyor.
- ☐ **Küçük dokunma alanları (44 pt altı):** Bölümlü seçici, paylaş düğmeleri, yıldızlar.
- ☑ **iPhone dil ayarı:** `CFBundleLocalizations: ["tr"]` yok. VoiceOver Türkçe metni İngilizce sesle okuyabilir.
- ☑ **Android izinleri:** Gereksiz iki izin var, `WRITE_SETTINGS` ve `SYSTEM_ALERT_WINDOW`.
- ☑ **Açılış ekranı:** Karanlık versiyonu yok. Android 12'de logo kenarlardan kesilebilir.

## Telefonda doğrulanacaklar

- **iPhone:**
  - Yeni fincan ekranı aşağı kaydırılarak kapatılınca onay soruluyor mu?
  - "Görüntüyü Kaydet" (düzeltmeden sonra).
  - VoiceOver ile Damak Özeti.
  - En büyük yazı boyutunda onboarding ve İlerleme.
- **Android:**
  - Yeni ikon.
  - TalkBack.
  - %200 yazı boyutu.
  - Bildirim izni reddedilince hatırlatma anahtarının davranışı.
