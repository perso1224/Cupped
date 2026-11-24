// iPhone ana ekran / kilit ekranı widget'ı (WidgetKit uzantısı) için kendi yapılandırma eklentimiz.
// targets/widget/ içindeki Swift dosyasını, Info.plist'i ve yetki dosyasını ios/CuppedWidget/ altına kopyalar,
// Xcode projesine "CuppedWidget" uzantı hedefini ekler ve uygulamaya ortak alan (App Group) yetkisini verir.
// Uygulama ile widget veriyi bu ortak alandan paylaşır (modules/cupped-widget).
const fs = require('fs');
const path = require('path');
const { withDangerousMod, withEntitlementsPlist, withXcodeProject } = require('expo/config-plugins');

const TARGET = 'CuppedWidget';
const SOURCE_DIR = path.join(__dirname, '..', 'targets', 'widget');
const FILES = ['CuppedWidget.swift', 'Info.plist', 'CuppedWidget.entitlements', 'Assets.xcassets'];
const DEPLOYMENT_TARGET = '16.4';

const groupId = (config) => `group.${config.ios.bundleIdentifier}`;

function withAppGroup(config) {
  return withEntitlementsPlist(config, (c) => {
    const key = 'com.apple.security.application-groups';
    const list = new Set(c.modResults[key] ?? []);
    list.add(groupId(c));
    c.modResults[key] = [...list];
    return c;
  });
}

function withWidgetFiles(config) {
  return withDangerousMod(config, [
    'ios',
    (c) => {
      const dest = path.join(c.modRequest.platformProjectRoot, TARGET);
      fs.mkdirSync(dest, { recursive: true });
      for (const f of FILES) {
        if (f.endsWith('.xcassets')) {
          // Görseller (logo): klasör olduğu gibi kopyalanır
          fs.rmSync(path.join(dest, f), { recursive: true, force: true });
          fs.cpSync(path.join(SOURCE_DIR, f), path.join(dest, f), { recursive: true });
          continue;
        }
        let text = fs.readFileSync(path.join(SOURCE_DIR, f), 'utf8');
        if (f.endsWith('.entitlements')) text = text.replace(/group\.[\w.-]+/, groupId(c));
        fs.writeFileSync(path.join(dest, f), text);
      }
      return c;
    },
  ]);
}

function withWidgetTarget(config) {
  return withXcodeProject(config, (c) => {
    const project = c.modResults;
    if (project.pbxTargetByName(TARGET)) return c;

    const bundleId = `${c.ios.bundleIdentifier}.widget`;
    const appName = c.modRequest.projectName;
    const objects = project.hash.project.objects;
    // Uzantı hedefleri arası bağımlılık bölümleri boş projede olmayabilir
    objects.PBXTargetDependency = objects.PBXTargetDependency ?? {};
    objects.PBXContainerItemProxy = objects.PBXContainerItemProxy ?? {};

    // Dosyalar: Xcode'da ayrı bir grup
    const group = project.addPbxGroup(FILES, TARGET, TARGET);
    const mainGroup = project.getFirstProject().firstProject.mainGroup;
    project.addToPbxGroup(group.uuid, mainGroup);

    // Hedef (uygulama içine gömülür: "Copy Files" → PlugIns; uygulamaya bağımlılık da addTarget ile eklenir)
    const target = project.addTarget(TARGET, 'app_extension', TARGET, bundleId);
    project.addBuildPhase(['CuppedWidget.swift'], 'PBXSourcesBuildPhase', 'Sources', target.uuid);
    project.addBuildPhase(['Assets.xcassets'], 'PBXResourcesBuildPhase', 'Resources', target.uuid);
    project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);
    // Uzantının sürüm/derleme numarası uygulamanınkiyle aynı olmalı (App Store şartı):
    // derlemenin sonunda uygulamanın Info.plist'inden kopyalanır.
    project.addBuildPhase([], 'PBXShellScriptBuildPhase', 'Sync version with app', target.uuid, {
      shellPath: '/bin/sh',
      shellScript: [
        `MAIN="$SRCROOT/${appName}/Info.plist"`,
        'OUT="$TARGET_BUILD_DIR/$INFOPLIST_PATH"',
        'V=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$MAIN")',
        'S=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$MAIN")',
        '/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $V" "$OUT"',
        '/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $S" "$OUT"',
      ].join('\\n'),
    });

    // Derleme ayarları
    const configs = project.pbxXCBuildConfigurationSection();
    const listId = project.pbxNativeTargetSection()[target.uuid].buildConfigurationList;
    const list = project.pbxXCConfigurationList()[listId];
    for (const { value } of list.buildConfigurations) {
      const s = configs[value].buildSettings;
      Object.assign(s, {
        INFOPLIST_FILE: `${TARGET}/Info.plist`,
        CODE_SIGN_ENTITLEMENTS: `${TARGET}/${TARGET}.entitlements`,
        PRODUCT_BUNDLE_IDENTIFIER: `"${bundleId}"`,
        IPHONEOS_DEPLOYMENT_TARGET: DEPLOYMENT_TARGET,
        TARGETED_DEVICE_FAMILY: '"1"',
        SWIFT_VERSION: '5.0',
        SDKROOT: 'iphoneos',
        MARKETING_VERSION: c.version ?? '1.0.0',
        CURRENT_PROJECT_VERSION: c.ios.buildNumber ?? '1',
        GENERATE_INFOPLIST_FILE: 'NO',
        APPLICATION_EXTENSION_API_ONLY: 'YES',
        ENABLE_USER_SCRIPT_SANDBOXING: 'NO',
        CLANG_ENABLE_MODULES: 'YES',
        SWIFT_EMIT_LOC_STRINGS: 'YES',
        CODE_SIGN_STYLE: 'Automatic',
        LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
      });
    }
    return c;
  });
}

module.exports = function withIosWidget(config) {
  return withWidgetTarget(withWidgetFiles(withAppGroup(config)));
};
