import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Text, TextInput } from "./AppTypography";
import type { RoutineExercise, UnitSystem } from "@/context/AppState";
import { displayWeightToKg, formatWeight, weightUnitLabel } from "@/lib/units";
import { parseDecimal } from "@/lib/input";
import { useI18n } from "@/lib/i18n";

export function RoutinePrescriptionEditor({
  exercise,
  unit,
  onChange,
  onValidityChange,
}: {
  exercise: RoutineExercise;
  unit: UnitSystem;
  onChange: (updates: Partial<RoutineExercise>) => void;
  onValidityChange: (valid: boolean) => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState({
    sets: String(exercise.sets),
    reps: String(exercise.reps),
    weight: formatWeight(exercise.targetWeight ?? 0, unit),
    rir: exercise.rir === undefined ? "" : String(exercise.rir),
  });
  const change = (key: keyof typeof draft, raw: string) => {
    const next = { ...draft, [key]: raw };
    setDraft(next);
    const sets = parseDecimal(next.sets),
      reps = parseDecimal(next.reps),
      weight = parseDecimal(next.weight);
    const rir = next.rir.trim() === "" ? undefined : parseDecimal(next.rir);
    const valid =
      sets !== null &&
      Number.isInteger(sets) &&
      sets >= 1 &&
      sets <= 20 &&
      reps !== null &&
      Number.isInteger(reps) &&
      reps >= 1 &&
      reps <= 36 &&
      weight !== null &&
      weight >= 0 &&
      displayWeightToKg(weight, unit) <= 1000 &&
      (rir === undefined ||
        (rir !== null && Number.isInteger(rir) && rir >= 0 && rir <= 10));
    onValidityChange(valid);
    if (valid)
      onChange({
        sets: sets!,
        reps: reps!,
        targetReps: reps!,
        targetWeight: displayWeightToKg(weight!, unit),
        rir: rir as number | undefined,
      });
  };
  const fields = [
    ["sets", t.common.sets],
    ["reps", t.common.reps],
    ["weight", weightUnitLabel(unit)],
    ["rir", t.common.rir],
  ] as const;
  return (
    <View style={styles.wrap}>
      {fields.map(([key, label]) => (
        <View key={key} style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            value={draft[key]}
            onChangeText={(raw) => change(key, raw)}
            keyboardType={key === "weight" ? "decimal-pad" : "number-pad"}
            accessibilityLabel={label}
            placeholder={key === "rir" ? "—" : undefined}
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 10 },
  field: { flexBasis: "45%", flexGrow: 1, gap: 4 },
  label: { color: "#94A3B8", fontSize: 12 },
  input: {
    minHeight: 48,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#162032",
    color: "#FFF",
    fontSize: 15,
  },
});
