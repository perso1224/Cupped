// Yerel kod parmak izine (yeni iOS/Android derlemesi gerekiyor mu?) widget dosyaları da girsin.
// targets/ (iOS widget uzantısı) ve modules/ (widget köprüsü) varsayılan kaynaklarda yok; değişince derleme tetiklensin.
/** @type {import('expo/fingerprint').Config} */
const config = {
  extraSources: [
    { type: 'dir', filePath: 'targets', reasons: ['iOS widget uzantısı'] },
    { type: 'dir', filePath: 'modules', reasons: ['widget köprü modülü'] },
  ],
};
module.exports = config;
