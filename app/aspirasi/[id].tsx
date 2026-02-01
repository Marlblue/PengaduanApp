import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaWrapper } from "../../components/SafeAreaWrapper";
import { Colors } from "../../constants/Colors";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import { formatDate, getStatusColor, getStatusText } from "../../lib/utils";
import { Aspirasi, Profile } from "../../types/database.types";

interface AspirasiWithDetails extends Aspirasi {
  profiles: Profile;
}

export default function AspirasiDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [aspirasi, setAspirasi] = useState<AspirasiWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAspirasi = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("aspirasi")
        .select(
          `
          *,
          profiles:user_id(*)
        `
        )
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      setAspirasi(data);
    } catch (error) {
      console.error("Error fetching aspirasi:", error);
      Alert.alert("Error", "Gagal memuat detail aspirasi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchAspirasi();
    }
  }, [id]);

  const canEdit = user?.role === "admin";

  if (loading) {
    return (
      <SafeAreaWrapper>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaWrapper>
    );
  }

  if (!aspirasi) {
    return (
      <SafeAreaWrapper>
        <View style={styles.centerContainer}>
          <Text>Aspirasi tidak ditemukan</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header dengan judul dan status */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{aspirasi.judul}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(aspirasi.status) },
              ]}
            >
              <Text style={styles.statusText}>
                {getStatusText(aspirasi.status)}
              </Text>
            </View>
          </View>

          <Text style={styles.category}>{aspirasi.kategori}</Text>
          <Text style={styles.date}>{formatDate(aspirasi.created_at)}</Text>
        </View>

        {/* Informasi Pengaju */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Pengaju</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Nama</Text>
              <Text style={styles.infoValue}>
                {aspirasi.profiles?.full_name || aspirasi.profiles?.email}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{aspirasi.profiles?.email}</Text>
            </View>
            {aspirasi.profiles?.phone && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Telepon</Text>
                <Text style={styles.infoValue}>{aspirasi.profiles.phone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Deskripsi Aspirasi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deskripsi Aspirasi</Text>
          <Text style={styles.description}>{aspirasi.deskripsi}</Text>
        </View>

        {/* Tanggapan Admin */}
        {aspirasi.tanggapan && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tanggapan</Text>
            <View style={styles.tanggapanContainer}>
              <View style={styles.tanggapanHeader}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={Colors.success}
                />
                <Text style={styles.tanggapanTitle}>Tanggapan dari Admin</Text>
              </View>
              <Text style={styles.tanggapanText}>{aspirasi.tanggapan}</Text>
            </View>
          </View>
        )}

        {/* Timeline Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status Aspirasi</Text>
          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Diajukan</Text>
                <Text style={styles.timelineDate}>
                  {formatDate(aspirasi.created_at)}
                </Text>
                <Text style={styles.timelineDescription}>
                  Aspirasi telah diajukan dan menunggu review admin
                </Text>
              </View>
            </View>

            {aspirasi.status !== "pending" && (
              <View style={styles.timelineItem}>
                <View
                  style={[
                    styles.timelineDot,
                    { backgroundColor: getStatusColor(aspirasi.status) },
                  ]}
                />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>
                    {getStatusText(aspirasi.status)}
                  </Text>
                  <Text style={styles.timelineDate}>
                    {aspirasi.tanggapan ? "Telah ditanggapi" : "Diproses"}
                  </Text>
                  {aspirasi.tanggapan && (
                    <Text style={styles.timelineDescription}>
                      {aspirasi.tanggapan}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        {canEdit && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push(`/aspirasi/update/${aspirasi.id}`)}
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text style={styles.editButtonText}>Update Status</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  category: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: "500",
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    color: Colors.textLight,
  },
  section: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 12,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textLight,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },
  description: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  tanggapanContainer: {
    padding: 16,
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  tanggapanHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  tanggapanTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  tanggapanText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  timeline: {
    gap: 16,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 18,
  },
  actions: {
    marginBottom: 24,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
