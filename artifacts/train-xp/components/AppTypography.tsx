import React, { forwardRef } from "react";
import {
  Text as NativeText,
  TextInput as NativeInput,
  StyleSheet,
  type TextProps,
  type TextInputProps,
} from "react-native";
import { isLoaded } from "expo-font";
import { typography } from "@/constants/typography";

function fontStyle(style: TextProps["style"]) {
  const flat = StyleSheet.flatten(style) ?? {};
  const weight =
    Number(flat.fontWeight) || (flat.fontWeight === "bold" ? 700 : 400);
  const family =
    weight >= 700
      ? typography.bold
      : weight >= 600
        ? typography.semiBold
        : weight >= 500
          ? typography.medium
          : typography.regular;
  const explicit =
    flat.fontFamily && !flat.fontFamily.startsWith("PlusJakartaSans");
  return explicit
    ? {}
    : isLoaded(family)
      ? { fontFamily: family, fontWeight: "normal" as const }
      : {};
}
export const Text = forwardRef<NativeText, TextProps>(function AppText(
  { style, ...props },
  ref,
) {
  return <NativeText {...props} ref={ref} style={[style, fontStyle(style)]} />;
});
export const TextInput = forwardRef<NativeInput, TextInputProps>(
  function AppTextInput({ style, ...props }, ref) {
    return (
      <NativeInput {...props} ref={ref} style={[style, fontStyle(style)]} />
    );
  },
);
