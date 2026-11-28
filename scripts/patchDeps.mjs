// Kurulumdan sonra (npm postinstall) bağımlılıklara küçük, davranışı değiştirmeyen düzeltmeler uygular.
// Her yama idempotent: zaten uygulanmışsa ya da kaynak değişmişse dokunmaz, sadece bilgi yazar.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const patches = [
  {
    // Xcode 26.3 (GitHub'ın Intel Mac'leri) Swift derleyicisi `nonisolated(unsafe)` işaretli işaretçiyi
    // @JavaScriptActor kapanışına geçirirken "sending 'slot' risks causing data races" hatası veriyor;
    // yeni Xcode kabul ediyor. İşaretçi, Sendable bir tamsayı olarak taşınıp kapanış içinde geri çevrilir (aynı adres).
    file: 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/Values/JavaScriptObject.swift',
    from: `    try runtime._withUnsafeGuaranteedRef { runtime in
      try JavaScriptActor.assumeIsolated {
        try encode(JavaScriptValue.Slot(slot), runtime)
      }
    }`,
    to: `    let slotAddress = UInt(bitPattern: slot)
    try runtime._withUnsafeGuaranteedRef { runtime in
      try JavaScriptActor.assumeIsolated {
        let slot = UnsafeMutablePointer<facebook.jsi.Value>(bitPattern: slotAddress)!
        try encode(JavaScriptValue.Slot(slot), runtime)
      }
    }`,
  },
  {
    // iPad'de iPhone'daki alt menünün aynısı (WhatsApp'taki gibi): Apple'ın sekme çubuğu iPad'de normalde üstte
    // durur. Sekme denetleyicisine "dar ekran" (compact) özelliği verilince iPhone'daki yüzen Liquid Glass alt menüyü
    // çizer. Yalnızca iPad'de ve iOS 17+'da; iPhone'da hiçbir şey değişmez.
    file: 'node_modules/react-native-screens/ios/tabs/host/RNSTabBarController.mm',
    from: `  if (self = [super init]) {
    _tabScreenControllers = nil;`,
    to: `  if (self = [super init]) {
    if (@available(iOS 17.0, *)) {
      if (UIDevice.currentDevice.userInterfaceIdiom == UIUserInterfaceIdiomPad) {
        self.traitOverrides.horizontalSizeClass = UIUserInterfaceSizeClassCompact;
      }
    }
    _tabScreenControllers = nil;`,
  },
];

for (const p of patches) {
  if (!existsSync(p.file)) {
    console.log(`[patchDeps] atlandı (dosya yok): ${p.file}`);
    continue;
  }
  const src = readFileSync(p.file, 'utf8');
  if (src.includes(p.to)) {
    console.log(`[patchDeps] zaten uygulanmış: ${p.file}`);
  } else if (src.includes(p.from)) {
    writeFileSync(p.file, src.replace(p.from, p.to));
    console.log(`[patchDeps] uygulandı: ${p.file}`);
  } else {
    console.log(`[patchDeps] kaynak değişmiş, uygulanmadı: ${p.file}`);
  }
}
