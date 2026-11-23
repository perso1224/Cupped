// Expo'nun varsayılan Metro ayarı + cihaz içi model dosyası (.tflite) varlık olarak paketlensin
// (fotoğrafta kahve kontrolü, src/lib/coffeeCheckRunner.ts).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('tflite');

module.exports = config;
