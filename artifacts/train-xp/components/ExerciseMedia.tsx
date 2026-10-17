import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { ExerciseMannequinHighlight } from "./ExerciseMannequinHighlight";

export function ExerciseMedia({
  uri,
  primaryMuscles,
  secondaryMuscles,
}: {
  uri?: string;
  primaryMuscles: string[];
  secondaryMuscles?: string[];
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  useEffect(() => setStatus("loading"), [uri]);

  if (!uri || status === "error") {
    return (
      <ExerciseMannequinHighlight
        primaryMuscles={primaryMuscles}
        secondaryMuscles={secondaryMuscles}
        height={180}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Image
        key={uri}
        source={{ uri }}
        contentFit="contain"
        style={styles.image}
        onLoad={() => setStatus("ready")}
        onError={() => setStatus("error")}
      />
      {status === "loading" && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#0284C7" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 195,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  loadingWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
});
