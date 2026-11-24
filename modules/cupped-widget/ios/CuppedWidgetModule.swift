import ExpoModulesCore
import WidgetKit

/// Uygulama → widget: özet (JSON) ortak alana (App Group) yazılır, widget'lar yenilenir.
public class CuppedWidgetModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CuppedWidget")

    Function("setData") { (json: String) -> Bool in
      guard let id = Bundle.main.bundleIdentifier,
            let defaults = UserDefaults(suiteName: "group.\(id)") else { return false }
      defaults.set(json, forKey: "widget")
      WidgetCenter.shared.reloadAllTimelines()
      return true
    }
  }
}
