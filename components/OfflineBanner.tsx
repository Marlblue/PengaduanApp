import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../constants/Colors";

interface OfflineBannerProps {
  visible: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline" size={16} color="#fff" />
      <Text style={styles.text}>Anda sedang offline</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.error,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  text: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
});
