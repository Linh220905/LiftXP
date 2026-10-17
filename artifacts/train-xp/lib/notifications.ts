import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { translations } from "@/lib/i18n";
import type { SupportedLocale } from "@/lib/i18n/types";

const REMINDER_PREFIX = "trainxp-workout-";
export async function cancelWorkoutReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    existing
      .filter((n) => n.identifier.startsWith(REMINDER_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export async function requestWorkoutReminders(
  days: number[],
  locale: SupportedLocale,
): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const dict = (translations[locale] || translations.vi).notifications;

  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("workout-reminders", {
      name: dict.workoutReminderChannel,
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  await cancelWorkoutReminders();
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain)
    permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return false;
  for (const day of new Set(days)) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${REMINDER_PREFIX}${day}`,
      content: {
        title: "TrainXP",
        body: dict.workoutReminderBody,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: day + 1,
        hour: 19,
        minute: 0,
        channelId: "workout-reminders",
      },
    });
  }
  return true;
}
