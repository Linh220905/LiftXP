import WidgetKit
import SwiftUI

@main
struct TrainXPWidgetBundle: WidgetBundle {
    var body: some Widget {
        if #available(iOS 16.1, *) {
            WorkoutLiveActivityWidget()
        }
    }
}
