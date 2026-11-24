import SwiftUI
import WidgetKit

// Cupped ana ekran ve kilit ekranı widget'ları.
// Uygulama özeti (JSON) ortak alana (App Group "group.<uygulama kimliği>") yazar:
// { "days": { "2026-11-24": [fincan, skorToplamı, enİyi] }, "streak": 12, "streakDay": "2026-11-24" }
// "Bugün" ve "bu hafta" widget'ın kendi saatine göre hesaplanır; uygulama açılmasa da gün dönünce doğru görünür.

// MARK: - Veri

struct CuppedSummary {
  var streak: Int
  var today: Int
  var week: [Bool]
  var todayIndex: Int
  var weekCups: Int
  var weekAvg: Int?

  static let placeholder = CuppedSummary(
    streak: 5, today: 1, week: [true, true, false, true, true, false, false], todayIndex: 4, weekCups: 6, weekAvg: 72)

  static func load(now: Date = Date()) -> CuppedSummary {
    var days: [String: [Int]] = [:]
    var streak = 0
    var streakDay = ""
    if let group = appGroup(),
       let raw = UserDefaults(suiteName: group)?.string(forKey: "widget"),
       let data = raw.data(using: .utf8),
       let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
      if let d = obj["days"] as? [String: [Any]] {
        for (k, v) in d { days[k] = v.compactMap { ($0 as? NSNumber)?.intValue } }
      }
      streak = (obj["streak"] as? NSNumber)?.intValue ?? 0
      streakDay = obj["streakDay"] as? String ?? ""
    }

    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = .current
    let fmt = DateFormatter()
    fmt.calendar = cal
    fmt.locale = Locale(identifier: "en_US_POSIX")
    fmt.dateFormat = "yyyy-MM-dd"
    let key = { (d: Date) in fmt.string(from: d) }

    let todayKey = key(now)
    let yesterdayKey = key(cal.date(byAdding: .day, value: -1, to: now) ?? now)
    let liveStreak = (streakDay == todayKey || streakDay == yesterdayKey) ? streak : 0
    let today = days[todayKey]?.first ?? 0

    // Pazartesi başlayan hafta (weekday: Pazar = 1)
    let todayIndex = (cal.component(.weekday, from: now) + 5) % 7
    let monday = cal.date(byAdding: .day, value: -todayIndex, to: now) ?? now
    var week = [Bool](repeating: false, count: 7)
    var cups = 0
    var sum = 0
    for i in 0..<7 {
      guard let d = cal.date(byAdding: .day, value: i, to: monday), let v = days[key(d)], let n = v.first, n > 0 else { continue }
      week[i] = true
      cups += n
      sum += v.count > 1 ? v[1] : 0
    }
    let avg: Int? = cups > 0 ? Int((Double(sum) / Double(cups)).rounded()) : nil
    return CuppedSummary(streak: liveStreak, today: today, week: week, todayIndex: todayIndex, weekCups: cups, weekAvg: avg)
  }

  /// Uzantının kimliği "<uygulama>.widget": ortak alan "group.<uygulama>".
  private static func appGroup() -> String? {
    guard let id = Bundle.main.bundleIdentifier else { return nil }
    let parent = id.hasSuffix(".widget") ? String(id.dropLast(".widget".count)) : id
    return "group.\(parent)"
  }
}

struct CuppedEntry: TimelineEntry {
  let date: Date
  let summary: CuppedSummary
}

struct CuppedProvider: TimelineProvider {
  func placeholder(in context: Context) -> CuppedEntry {
    CuppedEntry(date: Date(), summary: .placeholder)
  }

  func getSnapshot(in context: Context, completion: @escaping (CuppedEntry) -> Void) {
    completion(CuppedEntry(date: Date(), summary: context.isPreview ? .placeholder : .load()))
  }

  // Şimdi + gece yarısı (gün dönünce "bugün" ve seri yeniden hesaplanır). Uygulama her kayıtta ayrıca yeniler.
  func getTimeline(in context: Context, completion: @escaping (Timeline<CuppedEntry>) -> Void) {
    let now = Date()
    let cal = Calendar.current
    let midnight = cal.startOfDay(for: cal.date(byAdding: .day, value: 1, to: now) ?? now)
    let entries = [
      CuppedEntry(date: now, summary: .load(now: now)),
      CuppedEntry(date: midnight, summary: .load(now: midnight.addingTimeInterval(1))),
    ]
    completion(Timeline(entries: entries, policy: .after(midnight.addingTimeInterval(60))))
  }
}

// MARK: - Renkler

extension Color {
  static let cuppedAccent = Color(red: 0xD9 / 255, green: 0x8B / 255, blue: 0x2B / 255)
  static let cuppedBg = Color(UIColor { $0.userInterfaceStyle == .dark
    ? UIColor(red: 0x24 / 255, green: 0x1C / 255, blue: 0x17 / 255, alpha: 1)
    : UIColor.white })
  static let cuppedText = Color(UIColor { $0.userInterfaceStyle == .dark
    ? UIColor(red: 0xF5 / 255, green: 0xEE / 255, blue: 0xE8 / 255, alpha: 1)
    : UIColor(red: 0x1C / 255, green: 0x16 / 255, blue: 0x13 / 255, alpha: 1) })
  static let cuppedEmpty = Color(UIColor { $0.userInterfaceStyle == .dark
    ? UIColor(red: 0x3A / 255, green: 0x2F / 255, blue: 0x28 / 255, alpha: 1)
    : UIColor(red: 0xEF / 255, green: 0xE8 / 255, blue: 0xE1 / 255, alpha: 1) })
}

private let newCupURL = URL(string: "cupped://new")!
private let homeURL = URL(string: "cupped:///")!
private let dayLetters = ["P", "S", "Ç", "P", "C", "C", "P"]

// MARK: - Görünümler

struct StreakBlock: View {
  let s: CuppedSummary

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      HStack(alignment: .firstTextBaseline, spacing: 2) {
        Text("🔥").font(.system(size: 20))
        Text("\(s.streak)")
          .font(.system(size: 36, weight: .bold, design: .serif))
          .foregroundColor(.cuppedAccent)
          .widgetAccentable()
          .minimumScaleFactor(0.6)
          .lineLimit(1)
      }
      Text(s.streak > 0 ? "günlük seri" : "seri başlat")
        .font(.footnote)
        .foregroundColor(.secondary)
      Spacer(minLength: 4)
      Text(s.today > 0 ? "Bugün \(s.today) fincan" : "Bugün henüz fincan yok")
        .font(.footnote.weight(.semibold))
        .foregroundColor(.cuppedText)
        .lineLimit(2)
        .minimumScaleFactor(0.8)
    }
  }
}

struct AddButton: View {
  var body: some View {
    Image(systemName: "plus")
      .font(.system(size: 16, weight: .bold))
      .foregroundColor(.white)
      .frame(width: 32, height: 32)
      .background(Circle().fill(Color.cuppedAccent))
      .widgetAccentable()
      .accessibilityLabel("Yeni fincan ekle")
  }
}

struct WeekStamps: View {
  let s: CuppedSummary

  var body: some View {
    HStack(spacing: 0) {
      ForEach(0..<7, id: \.self) { i in
        VStack(spacing: 4) {
          Text(dayLetters[i])
            .font(.caption2.weight(i == s.todayIndex ? .bold : .regular))
            .foregroundColor(.secondary)
          ZStack {
            Circle().fill(s.week[i] ? Color.cuppedAccent : Color.cuppedEmpty)
            if i == s.todayIndex && !s.week[i] {
              Circle().strokeBorder(Color.cuppedAccent, lineWidth: 2)
            }
            if s.week[i] {
              Image(systemName: "checkmark").font(.system(size: 10, weight: .bold)).foregroundColor(.white)
            }
          }
          .frame(width: 22, height: 22)
          .widgetAccentable(s.week[i])
        }
        .frame(maxWidth: .infinity)
      }
    }
  }
}

struct CuppedWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: CuppedEntry

  var body: some View {
    let s = entry.summary
    switch family {
    case .accessoryCircular:
      ZStack {
        AccessoryWidgetBackground()
        VStack(spacing: 0) {
          Image(systemName: "flame.fill").font(.system(size: 12))
          Text("\(s.streak)").font(.system(size: 20, weight: .bold, design: .rounded))
        }
      }
      .widgetURL(newCupURL)
      .accessibilityLabel("\(s.streak) günlük seri")
      .cuppedBackground(accessory: true)
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 1) {
        Label("\(s.streak) günlük seri", systemImage: "flame.fill").font(.headline)
        Text(s.today > 0 ? "Bugün \(s.today) fincan" : "Bugün henüz fincan yok").font(.caption)
        Text(s.weekCups > 0 ? "Bu hafta \(s.weekCups) fincan" : "Bu hafta henüz yok").font(.caption).foregroundColor(.secondary)
      }
      .widgetURL(newCupURL)
      .cuppedBackground(accessory: true)
    case .accessoryInline:
      Label("\(s.streak) gün seri · bugün \(s.today) fincan", systemImage: "flame.fill")
        .widgetURL(newCupURL)
        .cuppedBackground(accessory: true)
    case .systemMedium:
      ZStack(alignment: .topTrailing) {
        HStack(alignment: .top, spacing: 16) {
          StreakBlock(s: s)
          VStack(alignment: .trailing, spacing: 0) {
            Spacer(minLength: 40)
            WeekStamps(s: s)
            Spacer(minLength: 6)
            Text(s.weekCups > 0 ? "Bu hafta \(s.weekCups) fincan · ort. \(s.weekAvg ?? 0)" : "Bu hafta henüz fincan yok")
              .font(.caption)
              .foregroundColor(.secondary)
              .lineLimit(1)
              .minimumScaleFactor(0.8)
          }
        }
        Link(destination: newCupURL) { AddButton() }
      }
      .widgetURL(homeURL)
      .cuppedBackground()
    default:
      // Küçük: tamamına dokununca yeni fincan
      ZStack(alignment: .topTrailing) {
        StreakBlock(s: s).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        AddButton()
      }
      .widgetURL(newCupURL)
      .cuppedBackground()
    }
  }
}

extension View {
  /// iOS 17+: sistem arka planı (StandBy, iOS 26 cam/renkli görünümlerde sistem uyarlar). Öncesi: düz kart rengi.
  /// Kilit ekranı (accessory) widget'larında arka plan saydam kalır.
  @ViewBuilder func cuppedBackground(accessory: Bool = false) -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      self.containerBackground(for: .widget) { accessory ? Color.clear : Color.cuppedBg }
    } else if accessory {
      self
    } else {
      self.padding().background(Color.cuppedBg)
    }
  }
}

struct CuppedWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "CuppedWidget", provider: CuppedProvider()) { entry in
      CuppedWidgetView(entry: entry)
    }
    .configurationDisplayName("Cupped")
    .description("Serin, bugünkü fincanların ve haftan. + ile hızlı ekle.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
  }
}

@main
struct CuppedWidgetBundle: WidgetBundle {
  var body: some Widget {
    CuppedWidget()
  }
}
