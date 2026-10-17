import React, { useEffect, useState } from "react";
import { Image, View, type ImageProps } from "react-native";
import { Feather } from "@expo/vector-icons";

export function ExerciseThumbnail({
  source,
  style,
  onError,
  ...props
}: ImageProps) {
  const [failed, setFailed] = useState(false);
  const key = typeof source === "object" ? JSON.stringify(source) : source;
  useEffect(() => setFailed(false), [key]);
  return failed ? (
    <View
      style={[
        style,
        {
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#162030",
        },
      ]}
    >
      <Feather name="activity" size={24} color="#94A3B8" />
    </View>
  ) : (
    <Image
      {...props}
      source={source}
      style={style}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
