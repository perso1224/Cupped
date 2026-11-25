package expo.modules.cuppedwidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * Ana ekran widget'ları. Uygulama özetini (JSON) CuppedWidgetModule ile buraya yazar:
 * { "days": { "2026-11-24": [fincan, skorToplamı, enİyi] }, "streak": 12, "streakDay": "2026-11-24" }
 * "Bugün" ve "bu hafta" widget'ın kendi saatine göre hesaplanır; uygulama açılmasa da gün dönünce doğru görünür.
 */
object CuppedWidgets {
  const val PREFS = "cupped_widget"
  const val KEY = "widget"
  private val DAY_LETTERS = arrayOf("Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz")
  private val DAY_NAMES = arrayOf("Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar")
  private val DOT_IDS = intArrayOf(R.id.cw_dot0, R.id.cw_dot1, R.id.cw_dot2, R.id.cw_dot3, R.id.cw_dot4, R.id.cw_dot5, R.id.cw_dot6)
  private val LABEL_IDS = intArrayOf(R.id.cw_lbl0, R.id.cw_lbl1, R.id.cw_lbl2, R.id.cw_lbl3, R.id.cw_lbl4, R.id.cw_lbl5, R.id.cw_lbl6)

  private class Summary(val streak: Int, val today: Int, val week: BooleanArray, val todayIndex: Int, val weekCups: Int, val weekAvg: Int?)

  private fun key(c: Calendar): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(c.time)

  private fun summary(context: Context): Summary {
    val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)
    val obj = try { if (raw != null) JSONObject(raw) else JSONObject() } catch (e: Exception) { JSONObject() }
    val days = obj.optJSONObject("days") ?: JSONObject()
    val now = Calendar.getInstance()
    val todayKey = key(now)
    val yesterday = (now.clone() as Calendar).apply { add(Calendar.DAY_OF_YEAR, -1) }
    val streakDay = obj.optString("streakDay", "")
    val streak = if (streakDay == todayKey || streakDay == key(yesterday)) obj.optInt("streak", 0) else 0
    val today = days.optJSONArray(todayKey)?.optInt(0, 0) ?: 0

    // Pazartesi başlayan hafta
    val todayIndex = (now.get(Calendar.DAY_OF_WEEK) + 5) % 7
    val monday = (now.clone() as Calendar).apply { add(Calendar.DAY_OF_YEAR, -todayIndex) }
    val week = BooleanArray(7)
    var cups = 0
    var sum = 0
    for (i in 0 until 7) {
      val d = (monday.clone() as Calendar).apply { add(Calendar.DAY_OF_YEAR, i) }
      val v = days.optJSONArray(key(d)) ?: continue
      val n = v.optInt(0, 0)
      if (n > 0) {
        week[i] = true
        cups += n
        sum += v.optInt(1, 0)
      }
    }
    return Summary(streak, today, week, todayIndex, cups, if (cups > 0) Math.round(sum.toFloat() / cups) else null)
  }

  private fun pending(context: Context, code: Int, intent: Intent): PendingIntent =
    PendingIntent.getActivity(context, code, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

  fun render(context: Context, layout: Int, wide: Boolean): RemoteViews {
    val s = summary(context)
    val v = RemoteViews(context.packageName, layout)
    v.setTextViewText(R.id.cw_streak, s.streak.toString())
    v.setTextViewText(R.id.cw_streak_label, if (s.streak > 0) "günlük seri" else "seri başlat")
    v.setContentDescription(R.id.cw_streak, if (s.streak > 0) "${s.streak} günlük seri" else "Seri yok")
    v.setTextViewText(
      R.id.cw_today,
      if (s.today > 0) "Bugün ${s.today} fincan" else "Bugün henüz fincan yok",
    )
    if (wide) {
      for (i in 0 until 7) {
        v.setTextViewText(LABEL_IDS[i], DAY_LETTERS[i])
        val bg = when {
          s.week[i] -> R.drawable.cupped_widget_dot_done
          i == s.todayIndex -> R.drawable.cupped_widget_dot_today
          else -> R.drawable.cupped_widget_dot_empty
        }
        v.setInt(DOT_IDS[i], "setBackgroundResource", bg)
        v.setTextViewText(DOT_IDS[i], if (s.week[i]) "✓" else "")
        v.setContentDescription(DOT_IDS[i], DAY_NAMES[i] + if (s.week[i]) ": kahve var" else ": kahve yok")
      }
      v.setTextViewText(
        R.id.cw_week,
        if (s.weekCups > 0) "Bu hafta ${s.weekCups} fincan · ort. ${s.weekAvg}" else "Bu hafta henüz fincan yok",
      )
    }
    // Dokununca: widget → uygulama, "+" → yeni fincan
    context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
      v.setOnClickPendingIntent(R.id.cw_root, pending(context, 1, it))
    }
    val add = Intent(Intent.ACTION_VIEW, Uri.parse("cupped://new")).setPackage(context.packageName)
    v.setOnClickPendingIntent(R.id.cw_add, pending(context, 2, add))
    return v
  }

  fun updateAll(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    for ((cls, layout, wide) in listOf(
      Triple(CuppedStreakWidget::class.java, R.layout.cupped_widget_streak, false),
      Triple(CuppedWeekWidget::class.java, R.layout.cupped_widget_week, true),
    )) {
      val ids = manager.getAppWidgetIds(ComponentName(context, cls))
      for (id in ids) manager.updateAppWidget(id, render(context, layout, wide))
    }
  }
}

abstract class CuppedWidgetBase(private val layout: Int, private val wide: Boolean) : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    for (id in ids) manager.updateAppWidget(id, CuppedWidgets.render(context, layout, wide))
  }
}

class CuppedStreakWidget : CuppedWidgetBase(R.layout.cupped_widget_streak, false)

class CuppedWeekWidget : CuppedWidgetBase(R.layout.cupped_widget_week, true)
