import React from "react";
import { Redirect } from "expo-router";

// Preserve legacy links while directing them to screens backed by the user's data.
export default function LegacyScreen() {
  return <Redirect href="/(tabs)/stats" />;
}
