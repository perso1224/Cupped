import ExpoModulesCore
import WidgetKit

/// Uygulama → widget: özet (JSON) ve son fincanın küçük fotoğrafı ortak alana (App Group) yazılır, widget'lar yenilenir.
public class CuppedWidgetModule: Module {
  private static var groupId: String? {
    Bundle.main.bundleIdentifier.map { "group.\($0)" }
  }

  public func definition() -> ModuleDefinition {
    Name("CuppedWidget")

    Function("setData") { (json: String) -> Bool in
      guard let id = Self.groupId, let defaults = UserDefaults(suiteName: id) else { return false }
      defaults.set(json, forKey: "widget")
      WidgetCenter.shared.reloadAllTimelines()
      return true
    }

    // Son fincanın küçük fotoğrafı (yoksa nil: eski fotoğraf silinir). Widget bunu ortak alandan okur.
    Function("setImage") { (uri: String?) -> Bool in
      guard let id = Self.groupId,
            let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: id) else { return false }
      let dest = dir.appendingPathComponent("widget-last.jpg")
      try? FileManager.default.removeItem(at: dest)
      guard let uri = uri, let src = URL(string: uri), src.isFileURL else { return true }
      do {
        try FileManager.default.copyItem(at: src, to: dest)
        return true
      } catch {
        return false
      }
    }
  }
}
