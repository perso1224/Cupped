# coffee-check.tflite

- Kaynak: EfficientNet-Lite0 int8 (ImageNet, 1000 sınıf), TensorFlow/TPU deposu.
- Adres: https://storage.googleapis.com/cloud-tpu-checkpoints/efficientnet/lite/efficientnet-lite0.tar.gz (`efficientnet-lite0-int8.tflite`)
- Lisans: Apache License 2.0 (© The TensorFlow Authors).
- Girdi: uint8 [1, 224, 224, 3] RGB (ham pikseller). Çıktı: uint8 [1, 1000], ölçek 1/256.
  Kod çıktıyı 1001 sınıfa kaydırır (`toImagenet1001`), sınıf numaraları `src/config/scoring.config.ts` → `COFFEE_CHECK`.
- Neden: önceki MobileNet v1 quant, bardakta buzlu kahveyi ve uzaktan çekilen fincanı kaçırıyordu.
  Sahibin 17 gerçek fotoğrafında (7 kahve, 10 kahve olmayan) Lite0 + "kahve < 0.05 → uyarı" 16/17 doğru (kaçan: boş tabak).
