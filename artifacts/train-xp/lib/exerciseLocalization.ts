import type { SupportedLocale } from "./i18n/types";

export interface ExerciseNameLike {
  name: string;
  name_vi?: string;
}

/**
 * Returns localized display name for an exercise.
 * Falls back to English name if name_vi is not available or locale is English.
 */
export function getExerciseDisplayName(
  exercise?: ExerciseNameLike | null,
  locale: SupportedLocale = "vi",
): string {
  if (!exercise) return "";
  if (locale === "vi" && exercise.name_vi) {
    return exercise.name_vi;
  }
  return exercise.name;
}

/**
 * Returns secondary/subtitle name for an exercise.
 */
export function getExerciseSecondaryName(
  exercise?: ExerciseNameLike | null,
  locale: SupportedLocale = "vi",
): string {
  if (!exercise) return "";
  if (locale === "vi" && exercise.name_vi) {
    return `${exercise.name} · `;
  }
  return "";
}
