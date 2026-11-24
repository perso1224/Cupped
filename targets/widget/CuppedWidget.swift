import AppIntents
import ImageIO
import SwiftUI
import WidgetKit

// Cupped ana ekran, kilit ekranı ve Kontrol Merkezi widget'ları.
// Uygulama özeti (JSON) ortak alana (App Group "group.<uygulama kimliği>") yazar (modules/cupped-widget):
// { "days": { "2026-11-24": [fincan, skorToplamı, enİyi, kafeinMg] }, "streak": 12, "streakDay": "2026-11-24",
//   "wall": "0102…" (son 182 gün, 0–3), "wallEnd": "2026-11-24",
//   "last": { "at": ISO, "score": 72, "method": "Espresso", "rating": 4, "place": "…" }, "caffeineRef": 400 }
// Son fincanın küçük fotoğrafı aynı alanda "widget-last.jpg".
// "Bugün", "bu hafta" ve duvar widget'ın kendi saatine göre hesaplanır; uygulama açılmasa da gün dönünce doğru kalır.

// MARK: - Ortak alan

enum Shared {
  static var groupId: String? {
    guard let id = Bundle.main.bundleIdentifier else { return nil }
    let parent = id.hasSuffix(".widget") ? String(id.dropLast(".widget".count)) : id
    return "group.\(parent)"
  }

  static func json() -> [String: Any] {
    guard let g = groupId,
          let raw = UserDefaults(suiteName: g)?.string(forKey: "widget"),
          let data = raw.data(using: .utf8),
          let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return [:] }
    return obj
  }

  /// Son fincanın fotoğrafı, widget belleğine sığsın diye küçültülerek okunur.
  static func lastPhoto(maxPixel: Int = 500) -> UIImage? {
    guard let g = groupId,
          let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: g) else { return nil }
    let url = dir.appendingPathComponent("widget-last.jpg")
    guard let src = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
    let opts: [CFString: Any] = [
      kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceCreateThumbnailWithTransform: true,
      kCGImageSourceThumbnailMaxPixelSize: maxPixel,
    ]
    guard let cg = CGImageSourceCreateThumbnailAtIndex(src, 0, opts as CFDictionary) else { return nil }
    return UIImage(cgImage: cg)
  }

  static var calendar: Calendar = {
    var c = Calendar(identifier: .gregorian)
    c.timeZone = .current
    return c
  }()

  static let keyFormatter: DateFormatter = {
    let f = DateFormatter()
    f.calendar = calendar
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "yyyy-MM-dd"
    return f
  }()

  static func key(_ d: Date) -> String { keyFormatter.string(from: d) }
}

// MARK: - Veri

struct LastCup {
  var at: Date
  var score: Int
  var method: String
  var rating: Int?
  var place: String?
}

struct CuppedSummary {
  var streak: Int
  var today: Int
  var week: [Bool]
  var todayIndex: Int
  var weekCups: Int
  var weekAvg: Int?
  var caffeineMg: Int
  var caffeineRef: Int
  /// Fincan Duvarı: en eskiden bugüne, gün başına 0–3. Son eleman bugün.
  var wall: [Int]
  var last: LastCup?

  static let placeholder = CuppedSummary(
    streak: 5, today: 1, week: [true, true, false, true, true, false, false], todayIndex: 4, weekCups: 6, weekAvg: 72,
    caffeineMg: 180, caffeineRef: 400,
    wall: (0..<182).map { i in [0, 1, 1, 2, 0, 1, 3][i % 7] },
    last: LastCup(at: Date().addingTimeInterval(-5400), score: 72, method: "Filtre / V60", rating: 4, place: nil))

  static func load(now: Date = Date()) -> CuppedSummary {
    let obj = Shared.json()
    var days: [String: [Int]] = [:]
    if let d = obj["days"] as? [String: [Any]] {
      for (k, v) in d { days[k] = v.compactMap { ($0 as? NSNumber)?.intValue } }
    }
    let streak = (obj["streak"] as? NSNumber)?.intValue ?? 0
    let streakDay = obj["streakDay"] as? String ?? ""
    let cal = Shared.calendar
    let key = Shared.key

    let todayKey = key(now)
    let yesterdayKey = key(cal.date(byAdding: .day, value: -1, to: now) ?? now)
    let liveStreak = (streakDay == todayKey || streakDay == yesterdayKey) ? streak : 0
    let todayRow = days[todayKey] ?? []
    let today = todayRow.first ?? 0
    let caffeine = todayRow.count > 3 ? todayRow[3] : 0

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

    // Duvar: kayıt wallEnd gününde biter; o günden bu yana geçen günler boş (uygulama açılmadıysa fincan da yok)
    var wall = [Int](repeating: 0, count: 182)
    if let w = obj["wall"] as? String, let endKey = obj["wallEnd"] as? String, let end = Shared.keyFormatter.date(from: endKey) {
      let gap = max(0, cal.dateComponents([.day], from: cal.startOfDay(for: end), to: cal.startOfDay(for: now)).day ?? 0)
      let digits = w.compactMap { $0.wholeNumberValue }
      for (i, v) in digits.enumerated() {
        let pos = i - gap - (digits.count - wall.count)
        if pos >= 0 && pos < wall.count { wall[pos] = v }
      }
    }

    var last: LastCup?
    if let l = obj["last"] as? [String: Any], let atStr = l["at"] as? String {
      let iso = ISO8601DateFormatter()
      iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
      if let at = iso.date(from: atStr) ?? ISO8601DateFormatter().date(from: atStr) {
        last = LastCup(
          at: at,
          score: (l["score"] as? NSNumber)?.intValue ?? 0,
          method: l["method"] as? String ?? "",
          rating: (l["rating"] as? NSNumber)?.intValue,
          place: l["place"] as? String)
      }
    }

    return CuppedSummary(
      streak: liveStreak, today: today, week: week, todayIndex: todayIndex, weekCups: cups, weekAvg: avg,
      caffeineMg: caffeine, caffeineRef: (obj["caffeineRef"] as? NSNumber)?.intValue ?? 400,
      wall: wall, last: last)
  }
}

struct CuppedEntry: TimelineEntry {
  let date: Date
  let summary: CuppedSummary
  var photo: UIImage? = nil
}

struct CuppedProvider: TimelineProvider {
  var withPhoto = false

  func placeholder(in context: Context) -> CuppedEntry {
    CuppedEntry(date: Date(), summary: .placeholder)
  }

  func getSnapshot(in context: Context, completion: @escaping (CuppedEntry) -> Void) {
    if context.isPreview {
      completion(CuppedEntry(date: Date(), summary: .placeholder))
    } else {
      completion(CuppedEntry(date: Date(), summary: .load(), photo: withPhoto ? Shared.lastPhoto() : nil))
    }
  }

  // Şimdi + gece yarısı (gün dönünce "bugün", seri ve duvar yeniden hesaplanır). Uygulama her kayıtta ayrıca yeniler.
  func getTimeline(in context: Context, completion: @escaping (Timeline<CuppedEntry>) -> Void) {
    let now = Date()
    let cal = Calendar.current
    let midnight = cal.startOfDay(for: cal.date(byAdding: .day, value: 1, to: now) ?? now)
    let photo = withPhoto ? Shared.lastPhoto() : nil
    let entries = [
      CuppedEntry(date: now, summary: .load(now: now), photo: photo),
      CuppedEntry(date: midnight, summary: .load(now: midnight.addingTimeInterval(1)), photo: photo),
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
  static let cuppedWarn = Color(red: 0xC2 / 255, green: 0x4A / 255, blue: 0x2E / 255)
}

private let newCupURL = URL(string: "cupped://new")!
private let homeURL = URL(string: "cupped:///")!
private let wallURL = URL(string: "cupped:///wall")!
private let dayLetters = ["P", "S", "Ç", "P", "C", "C", "P"]

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

// MARK: - Ortak parçalar

/// Cupped logosu: iki halka ve ortada nokta (uygulama simgesindeki gibi). Kodla çizilir; kilit ekranında sistem renklendirir.
struct LogoMark: View {
  var color: Color = .cuppedAccent
  var dot: Color = .cuppedText

  var body: some View {
    GeometryReader { g in
      let s = min(g.size.width, g.size.height)
      ZStack {
        Circle().strokeBorder(color, lineWidth: s * 0.1)
        Circle().strokeBorder(color, lineWidth: s * 0.08).frame(width: s * 0.64, height: s * 0.64)
        Circle().fill(dot).frame(width: s * 0.26, height: s * 0.26)
      }
      .frame(width: s, height: s)
      .position(x: g.size.width / 2, y: g.size.height / 2)
    }
  }
}

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

// MARK: - 1) Seri ve hafta (küçük, orta, kilit ekranı)

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

struct CuppedWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "CuppedWidget", provider: CuppedProvider()) { entry in
      CuppedWidgetView(entry: entry)
    }
    .configurationDisplayName("Seri ve hafta")
    .description("Serin, bugünkü fincanların ve haftan. + ile hızlı ekle.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
  }
}

// MARK: - 2) Fincan Duvarı (orta, büyük)

struct WallGrid: View {
  let wall: [Int]
  let now: Date

  private func color(_ v: Int) -> Color {
    switch v {
    case 0: return .cuppedEmpty
    case 1: return Color.cuppedAccent.opacity(0.45)
    case 2: return Color.cuppedAccent.opacity(0.72)
    default: return .cuppedAccent
    }
  }

  var body: some View {
    GeometryReader { g in
      let gap: CGFloat = 3
      let maxWeeks = (wall.count + 6) / 7
      let cellH = (g.size.height - gap * 6) / 7
      let cellW = (g.size.width - gap * CGFloat(maxWeeks - 1)) / CGFloat(maxWeeks)
      let cell = max(4, min(cellH, max(cellW, 9)))
      let weeks = max(1, min(maxWeeks, Int((g.size.width + gap) / (cell + gap))))
      // Son sütun bu hafta (Pazartesi başlar); bugünden sonraki günler boş kalır
      let todayRow = (Shared.calendar.component(.weekday, from: now) + 5) % 7
      HStack(alignment: .top, spacing: gap) {
        ForEach(0..<weeks, id: \.self) { col in
          VStack(spacing: gap) {
            ForEach(0..<7, id: \.self) { row in
              // Bugünden kaç gün önce
              let back = (weeks - 1 - col) * 7 + (todayRow - row)
              let idx = wall.count - 1 - back
              RoundedRectangle(cornerRadius: cell * 0.25)
                .fill(back < 0 || idx < 0 ? Color.clear : color(wall[idx]))
                .frame(width: cell, height: cell)
                .widgetAccentable(back >= 0 && idx >= 0 && wall[idx] > 0)
            }
          }
        }
      }
      .frame(width: g.size.width, height: g.size.height, alignment: .trailing)
    }
  }
}

struct CuppedWallView: View {
  @Environment(\.widgetFamily) var family
  let entry: CuppedEntry

  var body: some View {
    let s = entry.summary
    let shown = family == .systemLarge ? s.wall : Array(s.wall.suffix(18 * 7))
    let activeDays = shown.filter { $0 > 0 }.count
    VStack(alignment: .leading, spacing: family == .systemLarge ? 10 : 6) {
      HStack(alignment: .firstTextBaseline) {
        Text("Fincan Duvarı")
          .font(.system(size: 15, weight: .bold, design: .serif))
          .foregroundColor(.cuppedText)
        Spacer()
        Text("🔥 \(s.streak)")
          .font(.footnote.weight(.semibold))
          .foregroundColor(.cuppedAccent)
          .widgetAccentable()
      }
      if family == .systemLarge {
        WallGrid(wall: shown, now: entry.date).frame(height: 96)
        Text("Son 6 ayda \(activeDays) gün kahve")
          .font(.caption)
          .foregroundColor(.secondary)
        Divider()
        HStack(alignment: .top, spacing: 16) {
          StreakBlock(s: s)
          VStack(alignment: .trailing, spacing: 6) {
            WeekStamps(s: s)
            Text(s.weekCups > 0 ? "Bu hafta \(s.weekCups) fincan · ort. \(s.weekAvg ?? 0)" : "Bu hafta henüz fincan yok")
              .font(.caption)
              .foregroundColor(.secondary)
              .lineLimit(1)
              .minimumScaleFactor(0.8)
          }
        }
      } else {
        WallGrid(wall: shown, now: entry.date)
        Text("\(activeDays) gün kahve")
          .font(.caption2)
          .foregroundColor(.secondary)
      }
    }
    .widgetURL(wallURL)
    .cuppedBackground()
  }
}

struct CuppedWallWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "CuppedWall", provider: CuppedProvider()) { entry in
      CuppedWallView(entry: entry)
    }
    .configurationDisplayName("Fincan Duvarı")
    .description("Kahve içtiğin günler, kare kare.")
    .supportedFamilies([.systemMedium, .systemLarge])
  }
}

// MARK: - 3) Son fincanım (küçük, orta)

struct LastCupView: View {
  @Environment(\.widgetFamily) var family
  let entry: CuppedEntry

  var body: some View {
    let last = entry.summary.last
    let content = VStack(alignment: .leading, spacing: 2) {
      Spacer(minLength: 0)
      if let l = last {
        Text("\(l.score)")
          .font(.system(size: family == .systemSmall ? 40 : 46, weight: .bold, design: .serif))
          .widgetAccentable()
        Text(l.method).font(.footnote.weight(.semibold)).lineLimit(1)
        HStack(spacing: 4) {
          if let r = l.rating, r > 0 { Text(String(repeating: "★", count: min(5, r))) }
          Text(l.at, style: .relative)
          Text("önce")
        }
        .font(.caption2)
        .lineLimit(1)
        .opacity(0.85)
        if family == .systemMedium, let p = l.place, !p.isEmpty {
          Text(p).font(.caption2).lineLimit(1).opacity(0.85)
        }
      } else {
        Image(systemName: "cup.and.saucer.fill").font(.title2)
        Text("İlk fincanını ekle").font(.footnote.weight(.semibold))
      }
    }
    .foregroundColor(entry.photo != nil ? .white : .cuppedText)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)

    Group {
      if #available(iOSApplicationExtension 17.0, *) {
        content.containerBackground(for: .widget) { LastCupBackground(photo: entry.photo) }
      } else {
        content.padding().background(LastCupBackground(photo: entry.photo))
      }
    }
    .widgetURL(last == nil ? newCupURL : homeURL)
  }
}

struct LastCupBackground: View {
  let photo: UIImage?

  var body: some View {
    if let p = photo {
      ZStack {
        Image(uiImage: p).resizable().scaledToFill()
        LinearGradient(colors: [.clear, .black.opacity(0.65)], startPoint: .center, endPoint: .bottom)
      }
    } else {
      Color.cuppedBg
    }
  }
}

struct CuppedLastCupWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "CuppedLastCup", provider: CuppedProvider(withPhoto: true)) { entry in
      LastCupView(entry: entry)
    }
    .configurationDisplayName("Son fincanım")
    .description("Son fincanının fotoğrafı ve skoru.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

// MARK: - 4) Kafein (küçük, kilit ekranı)

struct CaffeineView: View {
  @Environment(\.widgetFamily) var family
  let entry: CuppedEntry

  var body: some View {
    let s = entry.summary
    let ref = max(1, s.caffeineRef)
    let ratio = min(1.0, Double(s.caffeineMg) / Double(ref))
    let over = s.caffeineMg > ref
    switch family {
    case .accessoryCircular:
      Gauge(value: Double(min(s.caffeineMg, ref)), in: 0...Double(ref)) {
        Image(systemName: "cup.and.saucer.fill")
      } currentValueLabel: {
        Text("\(s.caffeineMg)")
      }
      .gaugeStyle(.accessoryCircular)
      .widgetURL(homeURL)
      .accessibilityLabel("Bugün \(s.caffeineMg) miligram kafein")
      .cuppedBackground(accessory: true)
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 2) {
        Label("Kafein", systemImage: "bolt.fill").font(.headline)
        Text("\(s.caffeineMg) / \(ref) mg").font(.caption)
        Gauge(value: Double(min(s.caffeineMg, ref)), in: 0...Double(ref)) { EmptyView() }
          .gaugeStyle(.accessoryLinearCapacity)
      }
      .widgetURL(homeURL)
      .cuppedBackground(accessory: true)
    default:
      VStack(alignment: .leading, spacing: 6) {
        Text("Bugün kafein").font(.footnote.weight(.semibold)).foregroundColor(.secondary)
        ZStack {
          Circle().stroke(Color.cuppedEmpty, lineWidth: 10)
          Circle()
            .trim(from: 0, to: ratio)
            .stroke(over ? Color.cuppedWarn : Color.cuppedAccent, style: StrokeStyle(lineWidth: 10, lineCap: .round))
            .rotationEffect(.degrees(-90))
            .widgetAccentable()
          VStack(spacing: 0) {
            Text("\(s.caffeineMg)").font(.system(size: 24, weight: .bold, design: .serif)).foregroundColor(.cuppedText)
            Text("mg").font(.caption2).foregroundColor(.secondary)
          }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        Text("Günlük sınır \(ref) mg").font(.caption2).foregroundColor(over ? .cuppedWarn : .secondary).lineLimit(1)
      }
      .widgetURL(homeURL)
      .cuppedBackground()
    }
  }
}

struct CuppedCaffeineWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "CuppedCaffeine", provider: CuppedProvider()) { entry in
      CaffeineView(entry: entry)
    }
    .configurationDisplayName("Kafein")
    .description("Bugün aldığın kafein ve günlük sınırın.")
    .supportedFamilies([.systemSmall, .accessoryCircular, .accessoryRectangular])
  }
}

// MARK: - 5) Logo (kilit ekranı): dokununca uygulamayı açar

struct LogoView: View {
  var body: some View {
    ZStack {
      AccessoryWidgetBackground()
      LogoMark(color: .primary, dot: .primary).padding(9).widgetAccentable()
    }
    .widgetURL(homeURL)
    .accessibilityLabel("Cupped'ı aç")
    .cuppedBackground(accessory: true)
  }
}

struct CuppedLogoWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "CuppedLogo", provider: CuppedProvider()) { _ in
      LogoView()
    }
    .configurationDisplayName("Cupped")
    .description("Dokununca Cupped açılır.")
    .supportedFamilies([.accessoryCircular])
  }
}

// MARK: - 6) Kontrol Merkezi / kilit ekranı düğmesi (iOS 18+): "Kahve ekle"

@available(iOS 18.0, *)
struct AddCupIntent: AppIntent {
  static var title: LocalizedStringResource = "Kahve ekle"
  static var description = IntentDescription("Cupped'da yeni fincan ekranını açar.")

  func perform() async throws -> some IntentResult & OpensIntent {
    .result(opensIntent: OpenURLIntent(newCupURL))
  }
}

@available(iOS 18.0, *)
struct CuppedAddControl: ControlWidget {
  var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(kind: "CuppedAddControl") {
      ControlWidgetButton(action: AddCupIntent()) {
        Label("Kahve ekle", systemImage: "cup.and.saucer.fill")
      }
    }
    .displayName("Kahve ekle")
    .description("Yeni fincan ekranını açar.")
  }
}

// MARK: - Paket

@main
struct CuppedWidgetBundle: WidgetBundle {
  var body: some Widget {
    CuppedWidget()
    CuppedWallWidget()
    CuppedLastCupWidget()
    CuppedCaffeineWidget()
    CuppedLogoWidget()
    if #available(iOS 18.0, *) {
      CuppedAddControl()
    }
  }
}
