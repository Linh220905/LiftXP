import { Feather } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export function TrainMascot({
  mood = "ready",
  size = 84,
}: {
  mood?: "ready" | "excited" | "celebrate" | "impressed";
  size?: number;
}) {
  const colors = useColors();
  const faceSize = size * 0.58;
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size * 0.34,
          backgroundColor: colors.cobalt,
        },
      ]}
    >
      <View
        style={[
          styles.spark,
          {
            backgroundColor: colors.tint,
            width: size * 0.2,
            height: size * 0.2,
            top: size * 0.08,
            right: size * 0.07,
          },
        ]}
      >
        <Feather
          name="zap"
          size={size * 0.12}
          color={colors.primaryForeground}
        />
      </View>
      <View
        style={[
          styles.body,
          {
            width: size * 0.65,
            height: size * 0.72,
            borderRadius: size * 0.28,
            backgroundColor: colors.tint,
          },
        ]}
      >
        <View
          style={[
            styles.face,
            { width: faceSize, height: faceSize * 0.42, marginTop: size * 0.2 },
          ]}
        >
          <View
            style={[styles.eye, { backgroundColor: colors.primaryForeground }]}
          />
          <View
            style={[styles.eye, { backgroundColor: colors.primaryForeground }]}
          />
        </View>
        <View
          style={[styles.smile, { borderColor: colors.primaryForeground }]}
        />
      </View>
      {mood === "celebrate" || mood === "excited" ? (
        <>
          <View
            style={[
              styles.arm,
              styles.leftArm,
              { backgroundColor: colors.tint },
            ]}
          />
          <View
            style={[
              styles.arm,
              styles.rightArm,
              { backgroundColor: colors.tint },
            ]}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  body: { alignItems: "center", justifyContent: "flex-start" },
  face: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  eye: { width: 5, height: 8, borderRadius: 4 },
  smile: { width: 18, height: 9, borderBottomWidth: 2, borderRadius: 9 },
  spark: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 99,
    zIndex: 2,
  },
  arm: {
    width: 11,
    height: 28,
    borderRadius: 8,
    position: "absolute",
    top: "42%",
  },
  leftArm: { left: "7%", transform: [{ rotate: "-38deg" }] },
  rightArm: { right: "7%", transform: [{ rotate: "38deg" }] },
});
