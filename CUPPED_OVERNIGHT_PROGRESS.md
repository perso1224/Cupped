# Cupped — Gece Çalışması İlerleme Kaydı

## Tamamlanan
- [x] Önceki denetim düzeltmeleri doğrulandı (tsc, lint, 84 test) ve gönderildi (9a80315)
- [x] Yeni özellik: Fincanı düzenle (detay ekranı → Düzenle). Skor fincanın kendi tarihine göre yeniden hesaplanır; kimlik/tarih/sıra korunur; fotoğraf değişirse eskisi silinir. Web testinde doğrulandı.

## Sırada
- Veri/mantık denetimi bulguları (ajan raporu): yakalanmamış hatalar, depolama onarım yarışı, içe aktarma doğrulaması, hatırlatıcı tekrarı, mekan anahtarı tutarlılığı, performans
- [x] Veri güvenliği: bozuk ana veri + yedek yoksa boş listeyle üzerine yazma engellendi; okunamayan kayıtlar yazmadan önce ayrı saklanıyor; loadEntries salt-okunur (yarışta yeni kayıt ezilmez)
- [x] İçe aktarma: tarih ISO'ya çevrilir, tat notu/öğütüm beyaz listesi, tarif sayıları doğrulanır, metin uzunluk sınırı, 20.000 kayıt sınırı
- [x] Ayarlar önce yazılır sonra ekrana yansır
- [x] Yakalanmamış hatalar: tanıtım kaydı, tüm verileri sil, galeri, kulüp, hatırlatma cevabı
- [x] Hatırlatıcı: uygulama açılmasa da 7 gün boyunca gelir (test eklendi)
- [x] Mekan kimliği tek fonksiyon: skor, hedef, pasaport, rozet tutarlı; zincir şubeleri tek mekan; Latin dışı adlar sayılır (test eklendi)
- [x] dayIndex saat dilimi düzeltmesi (UTC+12/13)
- 91 test geçiyor, tsc + lint temiz
- [x] Erişilebilirlik: tüm dokunulabilir öğeler VoiceOver'da "düğme"; seçili durumlar (çip, seçenek) okunur; deklanşör ve anahtarlar etiketli
- [x] Liste satırları: kısa değerler (saat, sayı) artık kesilmiyor (SE'de "20:30" → "20..." sorunu); taşan uzun başlık düzeltildi
- [x] Fincan detayı: skor parçaları tek satırda (SE'de 3+1 kırılma yoktu)
- [x] Yeni: Pasaport'ta mekana/yönteme dokun → o mekanın/yöntemin fincanları + ortalama skor (web'de test edildi)
- [x] Fotoğraf küçültme: genişlik biliniyorsa görüntü bir kez çözülür (büyük galeri fotoğraflarında bellek)
- [x] Dışa aktarma: eski yedek dosyaları önbellekte birikmez
- [x] İlerleme: hiç fincan yokken "Tüm fincanlar" düğmesi gizli
- [x] Yeni: "Aynısından bir tane daha" (fincan detayı): yöntem, mekan, menşei, tarif dolu gelir → H3 kayıt hızı (web'de test edildi)
- [x] Gece değişikliklerinin bağımsız kod incelemesi: 6 bulgu, hepsi düzeltildi (giriş uzunluk sınırları, bilinmeyen tat notunda ham veri saklama, düzenlemede yeni fotoğraf yüklenene kadar paylaşım kilidi + kart animasyonu gereksiz yere baştan başlamıyor, yedek yokken kullanıcı kilitlenmiyor, başarısız düzenlemede yeni fotoğraf siliniyor, düzenlemede fotoğraf adımından forma dönüş)
