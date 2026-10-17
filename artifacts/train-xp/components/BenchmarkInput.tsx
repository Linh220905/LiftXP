import React, { useEffect, useRef, useState } from "react";
import { View, Pressable, ScrollView, StyleSheet } from "react-native";
import { Text, TextInput } from "./AppTypography";
import {
  displayWeightToKg,
  formatWeight,
  kgToDisplayWeight,
  weightUnitLabel,
} from "@/lib/units";
import { parseDecimal } from "@/lib/input";
import type { UnitSystem } from "@/context/AppState";
import { Feather } from "@expo/vector-icons";

export function BenchmarkInput({
  value,
  maxKg,
  unit,
  presets,
  onChange,
  onValidityChange,
}: {
  value: number;
  maxKg: number;
  unit: UnitSystem;
  presets: number[];
  onChange: (kg: number) => void;
  onValidityChange: (valid: boolean) => void;
}) {
  const [draft, setDraft] = useState(formatWeight(value, unit));
  const previousUnit = useRef(unit);
  useEffect(() => {
    const parsed = parseDecimal(draft);
    if (
      unit !== previousUnit.current ||
      (parsed !== null &&
        Math.abs(displayWeightToKg(parsed, unit) - value) > 0.1)
    ) {
      setDraft(formatWeight(value, unit));
      onValidityChange(true);
    }
    previousUnit.current = unit;
  }, [value, unit]);
  const change = (raw: string) => {
    setDraft(raw);
    const displayed = raw.trim() === "" ? 0 : parseDecimal(raw);
    const kg = displayed === null ? null : displayWeightToKg(displayed, unit);
    const valid = kg !== null && kg >= 0 && kg <= maxKg;
    onValidityChange(valid);
    if (valid) onChange(kg!);
  };
  const choose = (kg: number) => {
    const next = Math.max(0, Math.min(maxKg, kg));
    setDraft(formatWeight(next, unit));
    onChange(next);
    onValidityChange(true);
  };
  return (
    <View style={{ width: "100%", gap: 14 }}>
      <View style={styles.row}>
        <Pressable
          style={styles.button}
          accessibilityLabel="Decrease benchmark"
          onPress={() => choose(value - displayWeightToKg(2.5, unit))}
        >
          <Feather name="minus" size={20} color="#38BDF8" />
        </Pressable>
        <TextInput
          value={draft}
          onChangeText={change}
          onBlur={() => {
            if (!draft.trim()) choose(0);
          }}
          keyboardType="decimal-pad"
          selectTextOnFocus
          accessibilityLabel={`Benchmark (${weightUnitLabel(unit)})`}
          style={styles.input}
        />
        <Text style={styles.unit}>{weightUnitLabel(unit)}</Text>
        <Pressable
          style={styles.button}
          accessibilityLabel="Increase benchmark"
          onPress={() => choose(value + displayWeightToKg(2.5, unit))}
        >
          <Feather name="plus" size={20} color="#38BDF8" />
        </Pressable>
      </View>
      <Text style={styles.range}>
        0–{kgToDisplayWeight(maxKg, unit)} {weightUnitLabel(unit)}
      </Text>
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {[0, ...presets].map((kg) => (
          <Pressable key={kg} style={styles.preset} onPress={() => choose(kg)}>
            <Text style={styles.unit}>
              {formatWeight(kg, unit)} {weightUnitLabel(unit)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    color: "#FFF",
    fontSize: 32,
    textAlign: "center",
    backgroundColor: "#131926",
    borderRadius: 12,
  },
  button: {
    width: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#162032",
    borderRadius: 12,
  },
  unit: { color: "#94A3B8", fontSize: 13 },
  range: { color: "#94A3B8", textAlign: "center" },
  preset: {
    minHeight: 48,
    padding: 12,
    justifyContent: "center",
    backgroundColor: "#131926",
    borderRadius: 12,
  },
});
