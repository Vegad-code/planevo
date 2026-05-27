import WidgetKit
import SwiftUI

private let appGroup = "group.com.planevo.mobile"
private let deepLinkURL = URL(string: "planevo://dashboard")!

// MARK: - Data model

struct NextActionEntry: TimelineEntry {
    let date: Date
    let title: String
    let time: String
    let status: String   // "NOW", "UP NEXT", or ""
}

// MARK: - Timeline provider

struct NextActionProvider: TimelineProvider {
    func placeholder(in context: Context) -> NextActionEntry {
        NextActionEntry(date: Date(), title: "Review lecture notes", time: "2:00 PM", status: "UP NEXT")
    }

    func getSnapshot(in context: Context, completion: @escaping (NextActionEntry) -> Void) {
        completion(load())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NextActionEntry>) -> Void) {
        let entry = load()
        // Refresh every 15 minutes so the widget stays current
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(next)))
    }

    private func load() -> NextActionEntry {
        let d = UserDefaults(suiteName: appGroup)
        let title  = d?.string(forKey: "nextActionTitle")  ?? "No plan yet"
        let time   = d?.string(forKey: "nextActionTime")   ?? ""
        let status = d?.string(forKey: "nextActionStatus") ?? ""
        return NextActionEntry(date: Date(), title: title, time: time, status: status)
    }
}

// MARK: - Widget views

struct NextActionSmallView: View {
    var entry: NextActionEntry
    private let brand = Color(red: 0.83, green: 0.65, blue: 0.45)

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("PLANEVO")
                    .font(.system(size: 8, weight: .black))
                    .foregroundColor(brand)
                    .tracking(1.5)
                Spacer()
                if !entry.status.isEmpty {
                    Text(entry.status)
                        .font(.system(size: 8, weight: .black))
                        .foregroundColor(brand)
                        .tracking(1)
                }
            }

            Spacer()

            Text(entry.title)
                .font(.system(size: 14, weight: .black))
                .foregroundColor(.white)
                .lineLimit(3)
                .fixedSize(horizontal: false, vertical: true)

            if !entry.time.isEmpty {
                Text(entry.time)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.white.opacity(0.55))
                    .padding(.top, 4)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(Color(red: 0.09, green: 0.09, blue: 0.11))
        .widgetURL(deepLinkURL)
    }
}

struct NextActionMediumView: View {
    var entry: NextActionEntry
    private let brand = Color(red: 0.83, green: 0.65, blue: 0.45)

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            // Left accent bar
            RoundedRectangle(cornerRadius: 2)
                .fill(brand)
                .frame(width: 3)

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("PLANEVO — NEXT ACTION")
                        .font(.system(size: 8, weight: .black))
                        .foregroundColor(brand)
                        .tracking(1.5)
                    Spacer()
                    if !entry.status.isEmpty {
                        Text(entry.status)
                            .font(.system(size: 8, weight: .black))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(brand.opacity(0.15))
                            .foregroundColor(brand)
                            .clipShape(Capsule())
                    }
                }

                Text(entry.title)
                    .font(.system(size: 17, weight: .black))
                    .foregroundColor(.white)
                    .lineLimit(2)

                if !entry.time.isEmpty {
                    Text(entry.time)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white.opacity(0.55))
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(Color(red: 0.09, green: 0.09, blue: 0.11))
        .widgetURL(deepLinkURL)
    }
}

struct NextActionWidgetView: View {
    @Environment(\.widgetFamily) var family
    var entry: NextActionEntry

    var body: some View {
        switch family {
        case .systemMedium:
            NextActionMediumView(entry: entry)
        default:
            NextActionSmallView(entry: entry)
        }
    }
}

// MARK: - Widget configuration

@main
struct NextActionWidget: Widget {
    let kind = "NextActionWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NextActionProvider()) { entry in
            NextActionWidgetView(entry: entry)
        }
        .configurationDisplayName("Next Action")
        .description("Your current or upcoming Planevo task at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
