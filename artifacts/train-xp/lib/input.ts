export function parseDecimal(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export function ageOn(
  year: number,
  month: string,
  day: number,
  today = new Date(),
): number | null {
  const index = MONTHS.indexOf(month);
  const born = new Date(year, index, day);
  if (
    index < 0 ||
    born.getFullYear() !== year ||
    born.getMonth() !== index ||
    born.getDate() !== day ||
    born > today
  )
    return null;
  const birthdayPassed =
    today.getMonth() > index ||
    (today.getMonth() === index && today.getDate() >= day);
  return today.getFullYear() - year - (birthdayPassed ? 0 : 1);
}
export function toggleFocus(current: string[], area: string): string[] {
  if (area === "Full body") return current.includes(area) ? [] : [area];
  const specific = current.filter((value) => value !== "Full body");
  return specific.includes(area)
    ? specific.filter((value) => value !== area)
    : [...specific, area];
}
export const MUSCLE_GROUPS: Record<string, string[]> = {
  chest: ["chest"],
  back: ["back", "lats", "traps"],
  shoulders: ["shoulders", "deltoids"],
  legs: ["legs", "quads", "quadriceps", "hamstrings", "calves", "glutes"],
  arms: ["arms", "biceps", "triceps", "forearms"],
  core: ["abs", "obliques"],
  abs: ["abs", "obliques"],
};
export function matchesMuscleGroup(muscles: string[], group: string): boolean {
  return (
    group.toLowerCase() === "all" ||
    muscles.some((m) =>
      (MUSCLE_GROUPS[group.toLowerCase()] ?? [group.toLowerCase()]).includes(
        m.toLowerCase(),
      ),
    )
  );
}
