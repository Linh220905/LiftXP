import ActivityKit
import Foundation

public struct WorkoutActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var exerciseName: String
        public var currentSet: Int
        public var totalSets: Int
        public var weightKg: Double
        public var reps: Int
        public var isResting: Bool
        public var restEndTime: Date?
        public var totalDurationSeconds: Int
        public var totalVolumeKg: Double

        public init(
            exerciseName: String,
            currentSet: Int,
            totalSets: Int,
            weightKg: Double,
            reps: Int,
            isResting: Bool,
            restEndTime: Date? = nil,
            totalDurationSeconds: Int = 0,
            totalVolumeKg: Double = 0
        ) {
            self.exerciseName = exerciseName
            self.currentSet = currentSet
            self.totalSets = totalSets
            self.weightKg = weightKg
            self.reps = reps
            self.isResting = isResting
            self.restEndTime = restEndTime
            self.totalDurationSeconds = totalDurationSeconds
            self.totalVolumeKg = totalVolumeKg
        }
    }

    public var workoutName: String
    public var routineId: String

    public init(workoutName: String, routineId: String = "") {
        self.workoutName = workoutName
        self.routineId = routineId
    }
}
