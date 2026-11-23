# coffee-check.tflite

- Kaynak: TensorFlow Lite hosted models, `mobilenet_v1_1.0_224_quant` (ImageNet, 1001 sınıf).
- Adres: https://storage.googleapis.com/download.tensorflow.org/models/tflite/mobilenet_v1_1.0_224_quant_and_labels.zip
- Lisans: Apache License 2.0 (© The TensorFlow Authors).
- Girdi: uint8 [1, 224, 224, 3] RGB. Çıktı: uint8 [1, 1001], ölçek 1/256.
- Kullanılan sınıf numaraları: `src/config/scoring.config.ts` → `COFFEE_CHECK`.
