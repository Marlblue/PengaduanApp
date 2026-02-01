import React from "react";
import { StyleSheet, View } from "react-native";
import { Colors } from "../constants/Colors";

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = "100%",
  height = 20,
  borderRadius = 4,
  style,
}) => {
  return (
    <View style={[styles.skeleton, { width, height, borderRadius }, style]} />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <View style={styles.cardSkeleton}>
      <SkeletonLoader height={160} borderRadius={0} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <SkeletonLoader width="70%" height={20} />
          <SkeletonLoader width={60} height={24} />
        </View>
        <SkeletonLoader width="40%" height={16} style={styles.spacing} />
        <SkeletonLoader height={16} style={styles.spacing} />
        <SkeletonLoader height={16} width="80%" style={styles.spacing} />
        <View style={styles.cardFooter}>
          <SkeletonLoader width={100} height={14} />
          <SkeletonLoader width={80} height={14} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.border,
  },
  cardSkeleton: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  spacing: {
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
});
