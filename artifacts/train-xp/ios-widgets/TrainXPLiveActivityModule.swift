import Foundation
import ActivityKit
import React

@objc(TrainXPLiveActivity)
public class TrainXPLiveActivity: NSObject {

    @objc
    public static func requiresMainQueueSetup() -> Bool {
        return false
    }

    @objc
    public func hasActiveActivity(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard #available(iOS 16.1, *) else {
            resolve(false)
            return
        }
        let hasActive = Activity<WorkoutActivityAttributes>.activities.contains { $0.activityState == .active }
        resolve(hasActive)
    }

    @objc
    public func areActivitiesEnabled(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard #available(iOS 16.1, *) else {
            resolve(false)
            return
        }
        resolve(ActivityAuthorizationInfo().areActivitiesEnabled)
    }

    @objc
    public func ensureActiveActivity(
        _ data: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard #available(iOS 16.1, *) else {
            resolve(nil)
            return
        }

        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            resolve(nil)
            return
        }

        let workoutName = data["workoutName"] as? String ?? "Workout"
        let exerciseName = data["exerciseName"] as? String ?? "Exercise"
        let currentSet = data["currentSet"] as? Int ?? 1
        let totalSets = data["totalSets"] as? Int ?? 3
        let weightKg = data["weightKg"] as? Double ?? 0.0
        let reps = data["reps"] as? Int ?? 10
        let isResting = data["isResting"] as? Bool ?? false
        let totalDuration = data["totalDurationSeconds"] as? Int ?? 0
        let totalVolume = data["totalVolumeKg"] as? Double ?? 0.0

        var restEnd: Date? = nil
        if let restEndStr = data["restEndTime"] as? String {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            restEnd = formatter.date(from: restEndStr)
        }

        let contentState = WorkoutActivityAttributes.ContentState(
            exerciseName: exerciseName,
            currentSet: currentSet,
            totalSets: totalSets,
            weightKg: weightKg,
            reps: reps,
            isResting: isResting,
            restEndTime: restEnd,
            totalDurationSeconds: totalDuration,
            totalVolumeKg: totalVolume
        )

        Task {
            // Check if there is already a running active activity
            if let activeActivity = Activity<WorkoutActivityAttributes>.activities.first(where: { $0.activityState == .active }) {
                if #available(iOS 16.2, *) {
                    let content = ActivityContent(state: contentState, staleDate: nil)
                    await activeActivity.update(content)
                } else {
                    await activeActivity.update(using: contentState)
                }
                resolve(activeActivity.id)
                return
            }

            // Terminate any dead/dismissed activities before requesting new one
            for stale in Activity<WorkoutActivityAttributes>.activities {
                await stale.end(dismissalPolicy: .immediate)
            }

            // Create new Live Activity on Lock Screen
            let attributes = WorkoutActivityAttributes(workoutName: workoutName)
            do {
                let newActivity: Activity<WorkoutActivityAttributes>
                if #available(iOS 16.2, *) {
                    let content = ActivityContent(state: contentState, staleDate: nil)
                    newActivity = try Activity<WorkoutActivityAttributes>.request(
                        attributes: attributes,
                        content: content,
                        pushType: nil
                    )
                } else {
                    newActivity = try Activity<WorkoutActivityAttributes>.request(
                        attributes: attributes,
                        contentState: contentState,
                        pushType: nil
                    )
                }
                resolve(newActivity.id)
            } catch {
                reject("ACTIVITY_REQUEST_FAILED", error.localizedDescription, error)
            }
        }
    }

    @objc
    public func startActivity(
        _ data: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        ensureActiveActivity(data, resolver: resolve, rejecter: reject)
    }

    @objc
    public func updateActivity(
        _ activityId: String,
        data: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard #available(iOS 16.1, *) else {
            resolve(nil)
            return
        }

        Task {
            if let activity = Activity<WorkoutActivityAttributes>.activities.first(where: { $0.id == activityId && $0.activityState == .active }) {
                let exerciseName = data["exerciseName"] as? String ?? activity.contentState.exerciseName
                let currentSet = data["currentSet"] as? Int ?? activity.contentState.currentSet
                let totalSets = data["totalSets"] as? Int ?? activity.contentState.totalSets
                let weightKg = data["weightKg"] as? Double ?? activity.contentState.weightKg
                let reps = data["reps"] as? Int ?? activity.contentState.reps
                let isResting = data["isResting"] as? Bool ?? activity.contentState.isResting
                let totalDuration = data["totalDurationSeconds"] as? Int ?? activity.contentState.totalDurationSeconds
                let totalVolume = data["totalVolumeKg"] as? Double ?? activity.contentState.totalVolumeKg

                var restEnd: Date? = nil
                if let restEndStr = data["restEndTime"] as? String {
                    let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                    restEnd = formatter.date(from: restEndStr)
                }

                let updatedState = WorkoutActivityAttributes.ContentState(
                    exerciseName: exerciseName,
                    currentSet: currentSet,
                    totalSets: totalSets,
                    weightKg: weightKg,
                    reps: reps,
                    isResting: isResting,
                    restEndTime: restEnd,
                    totalDurationSeconds: totalDuration,
                    totalVolumeKg: totalVolume
                )

                if #available(iOS 16.2, *) {
                    let content = ActivityContent(state: updatedState, staleDate: nil)
                    await activity.update(content)
                } else {
                    await activity.update(using: updatedState)
                }
                resolve(true)
            } else {
                // User swiped activity away from lock screen -> re-create immediately!
                ensureActiveActivity(data, resolver: resolve, rejecter: reject)
            }
        }
    }

    @objc
    public func endActivity(
        _ activityId: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        endAllActivities(resolve, rejecter: reject)
    }

    @objc
    public func endAllActivities(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard #available(iOS 16.1, *) else {
            resolve(nil)
            return
        }

        Task {
            for activity in Activity<WorkoutActivityAttributes>.activities {
                await activity.end(dismissalPolicy: .immediate)
            }
            resolve(true)
        }
    }
}
