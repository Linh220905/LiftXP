import ActivityKit
import WidgetKit
import SwiftUI

private let neonCyan = Color(red: 56 / 255, green: 189 / 255, blue: 248 / 255)
private let neonBlue = Color(red: 2 / 255, green: 132 / 255, blue: 199 / 255)
private let obsidianBg = Color(red: 7 / 255, green: 11 / 255, blue: 20 / 255)
private let cardGlass = Color(red: 18 / 255, green: 26 / 255, blue: 44 / 255)

@available(iOS 16.1, *)
public struct WorkoutLiveActivityWidget: Widget {
    public init() {}

    public var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
            // MARK: - Lock Screen & StandBy Banner View
            LockScreenWorkoutBanner(context: context)
                .activityBackgroundTint(obsidianBg.opacity(0.85))
                .activitySystemActionForegroundColor(neonCyan)
        } dynamicIsland: { context in
            // MARK: - Dynamic Island View
            DynamicIsland {
                // Expanded Leading
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 6) {
                        ZStack {
                            Circle()
                                .stroke(neonCyan.opacity(0.4), lineWidth: 2)
                                .frame(width: 24, height: 24)
                            Circle()
                                .fill(neonCyan.opacity(0.2))
                                .frame(width: 14, height: 14)
                        }
                        VStack(alignment: .leading, spacing: 1) {
                            Text("HIỆP")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(.gray)
                            Text("\(context.state.currentSet)/\(context.state.totalSets)")
                                .font(.system(size: 13, weight: .heavy, design: .rounded))
                                .foregroundColor(neonCyan)
                        }
                    }
                    .padding(.leading, 4)
                }

                // Expanded Trailing
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 1) {
                        Text("THỜI GIAN")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(.gray)
                        Text(formatDuration(context.state.totalDurationSeconds))
                            .font(.system(size: 12, weight: .bold, design: .monospaced))
                            .foregroundColor(.white)
                    }
                    .padding(.trailing, 4)
                }

                // Expanded Center / Bottom
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(context.state.exerciseName)
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.white)
                                    .lineLimit(1)
                                Text("\(formatWeight(context.state.weightKg))kg × \(context.state.reps) reps")
                                    .font(.system(size: 12, weight: .medium, design: .rounded))
                                    .foregroundColor(.gray)
                            }
                            Spacer()

                            if context.state.isResting {
                                HStack(spacing: 4) {
                                    Image(systemName: "timer")
                                        .font(.system(size: 10, weight: .bold))
                                    Text("NGHỈ HIỆP")
                                        .font(.system(size: 10, weight: .black))
                                }
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.orange.opacity(0.2))
                                .foregroundColor(.orange)
                                .cornerRadius(6)
                            } else {
                                HStack(spacing: 4) {
                                    Circle()
                                        .fill(neonCyan)
                                        .frame(width: 6, height: 6)
                                    Text("ĐANG TẬP")
                                        .font(.system(size: 10, weight: .black))
                                }
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(neonCyan.opacity(0.15))
                                .foregroundColor(neonCyan)
                                .cornerRadius(6)
                            }
                        }

                        // Rest Countdown Bar (if resting)
                        if context.state.isResting, let restEndTime = context.state.restEndTime {
                            HStack {
                                Text("Nghỉ còn:")
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundColor(.gray)
                                Spacer()
                                Text(timerInterval: Date()...restEndTime, countsDown: true)
                                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                                    .foregroundColor(neonCyan)
                            }
                            .padding(.top, 2)
                        }
                    }
                    .padding(.horizontal, 4)
                    .padding(.bottom, 6)
                }
            } compactLeading: {
                // Compact Leading: Set badge or lightning icon
                HStack(spacing: 3) {
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 9))
                        .foregroundColor(neonCyan)
                    Text("S\(context.state.currentSet)")
                        .font(.system(size: 11, weight: .black, design: .rounded))
                        .foregroundColor(neonCyan)
                }
                .padding(.leading, 2)
            } compactTrailing: {
                // Compact Trailing: Rest timer or weight
                if context.state.isResting, let restEndTime = context.state.restEndTime {
                    Text(timerInterval: Date()...restEndTime, countsDown: true)
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(neonCyan)
                        .frame(width: 44)
                } else {
                    Text("\(formatWeight(context.state.weightKg))k")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(.white)
                }
            } minimal: {
                // Minimal: Circular indicator or set
                ZStack {
                    Circle()
                        .stroke(neonCyan.opacity(0.3), lineWidth: 2)
                        .frame(width: 14, height: 14)
                    Text("\(context.state.currentSet)")
                        .font(.system(size: 8, weight: .black))
                        .foregroundColor(neonCyan)
                }
            }
        }
    }
}

// MARK: - Lock Screen Banner Component
@available(iOS 16.1, *)
private struct LockScreenWorkoutBanner: View {
    let context: ActivityViewContext<WorkoutActivityAttributes>

    var body: some View {
        VStack(spacing: 10) {
            // Header Row: App name & Routine
            HStack {
                HStack(spacing: 6) {
                    ZStack {
                        Circle()
                            .stroke(neonCyan, lineWidth: 1.5)
                            .frame(width: 18, height: 18)
                        Circle()
                            .fill(neonCyan)
                            .frame(width: 6, height: 6)
                    }
                    Text("TRAINXP")
                        .font(.system(size: 11, weight: .black, design: .rounded))
                        .foregroundColor(neonCyan)
                        .tracking(0.5)

                    Text(context.attributes.workoutName)
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.gray)
                        .lineLimit(1)
                }

                Spacer()

                HStack(spacing: 8) {
                    if context.state.totalVolumeKg > 0 {
                        HStack(spacing: 2) {
                            Text("Vol:")
                                .font(.system(size: 10))
                                .foregroundColor(.gray)
                            Text("\(Int(context.state.totalVolumeKg))kg")
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                .foregroundColor(.white)
                        }
                    }

                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 5, height: 5)
                        Text(formatDuration(context.state.totalDurationSeconds))
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(neonCyan)
                    }
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color(red: 10 / 255, green: 28 / 255, blue: 50 / 255))
                    .cornerRadius(6)
                }
            }

            // Exercise Title and Set Info
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(context.state.exerciseName)
                        .font(.system(size: 16, weight: .heavy))
                        .foregroundColor(.white)
                        .lineLimit(1)

                    HStack(spacing: 6) {
                        Text("Hiệp \(context.state.currentSet) / \(context.state.totalSets)")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(neonCyan)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(neonCyan.opacity(0.12))
                            .cornerRadius(4)

                        Text("\(formatWeight(context.state.weightKg)) kg × \(context.state.reps) reps")
                            .font(.system(size: 12, weight: .semibold, design: .monospaced))
                            .foregroundColor(Color(white: 0.9))
                    }
                }

                Spacer()

                // Circular Set Badge
                ZStack {
                    Circle()
                        .stroke(Color.white.opacity(0.1), lineWidth: 3)
                        .frame(width: 44, height: 44)
                    Circle()
                        .trim(from: 0, to: CGFloat(context.state.currentSet) / CGFloat(max(1, context.state.totalSets)))
                        .stroke(neonCyan, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                        .frame(width: 44, height: 44)
                        .rotationEffect(.degrees(-90))
                    Text("\(context.state.currentSet)/\(context.state.totalSets)")
                        .font(.system(size: 11, weight: .black, design: .monospaced))
                        .foregroundColor(neonCyan)
                }
            }

            // Bottom Dynamic Row: Active Set vs Rest Timer
            if context.state.isResting, let restEndTime = context.state.restEndTime {
                HStack {
                    HStack(spacing: 6) {
                        Image(systemName: "timer")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(neonCyan)
                        VStack(alignment: .leading, spacing: 0) {
                            Text("THỜI GIAN NGHỈ")
                                .font(.system(size: 8, weight: .bold))
                                .foregroundColor(neonCyan.opacity(0.8))
                            Text(timerInterval: Date()...restEndTime, countsDown: true)
                                .font(.system(size: 16, weight: .heavy, design: .monospaced))
                                .foregroundColor(.white)
                        }
                    }

                    Spacer()

                    Text("Hít thở đều")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.gray)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Color(red: 10 / 255, green: 28 / 255, blue: 50 / 255).opacity(0.6))
                .cornerRadius(10)
            } else {
                HStack {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(neonCyan)
                            .frame(width: 6, height: 6)
                        Text("Đang trong hiệp tập")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(neonCyan)
                    }

                    Spacer()

                    Text("Tập trung vào form chuẩn")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(.gray)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
            }
        }
        .padding(14)
        .background(cardGlass.opacity(0.75))
    }
}

// MARK: - Helpers
private func formatDuration(_ totalSeconds: Int) -> String {
    let m = totalSeconds / 60
    let s = totalSeconds % 60
    return String(format: "%02d:%02d", m, s)
}

private func formatWeight(_ weight: Double) -> String {
    if weight.truncatingRemainder(dividingBy: 1) == 0 {
        return "\(Int(weight))"
    }
    return String(format: "%.1f", weight)
}
