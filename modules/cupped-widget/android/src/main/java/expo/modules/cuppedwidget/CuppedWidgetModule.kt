package expo.modules.cuppedwidget

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Uygulama → widget: özet (JSON) telefona yazılır, widget'lar yenilenir. */
class CuppedWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CuppedWidget")

    Function("setData") { json: String ->
      val context = appContext.reactContext ?: return@Function false
      context.getSharedPreferences(CuppedWidgets.PREFS, Context.MODE_PRIVATE)
        .edit().putString(CuppedWidgets.KEY, json).apply()
      CuppedWidgets.updateAll(context)
      true
    }
  }
}
