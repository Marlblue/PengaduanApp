import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaWrapper } from "../../../components/SafeAreaWrapper";
import { Colors } from "../../../constants/Colors";
import { useAuth } from "../../../hooks/useAuth";
import { supabase } from "../../../lib/supabase";
import { formatDate, getStatusColor, getStatusText } from "../../../lib/utils";
import { Aspirasi, AspirasiStatus } from "../../../types/database.types";

export default function AspirasiListScreen() {
  const { user } = useAuth();
  const [aspirasi, setAspirasi] = useState<Aspirasi[]>([]);
  const [filteredAspirasi, setFilteredAspirasi] = useState<Aspirasi[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<AspirasiStatus | "all">(
    "all"
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAspirasi = async () => {
    try {
      let query = supabase
        .from("aspirasi")
        .select(
          `
          *,
          profiles:user_id(full_name, email)
        `
        )
        .order("created_at", { ascending: false });

      // Filter untuk masyarakat hanya melihat aspirasi mereka sendiri
      if (user?.role === "masyarakat") {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setAspirasi(data || []);
      applyFilter(data || [], selectedStatus);
    } catch (error) {
      console.error("Error fetching aspirasi:", error);
      Alert.alert("Error", "Gagal memuat data aspirasi");
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = (data: Aspirasi[], status: AspirasiStatus | "all") => {
    if (status === "all") {
      setFilteredAspirasi(data);
    } else {
      setFilteredAspirasi(data.filter((item) => item.status === status));
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAspirasi();
    }, [])
  );

  useEffect(() => {
    applyFilter(aspirasi, selectedStatus);
  }, [selectedStatus]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAspirasi();
    setRefreshing(false);
  };

  const statusFilters: { value: AspirasiStatus | "all"; label: string }[] = [
    { value: "all", label: "Semua" },
    { value: "pending", label: "Menunggu" },
    { value: "disetujui", label: "Disetujui" },
    { value: "ditolak", label: "Ditolak" },
  ];

  const canCreate = user?.role === "masyarakat";
  const canEdit = user?.role === "admin";

  if (loading) {
    return (
      <SafeAreaWrapper>
        <View style={styles.centerContainer}>
          <Text>Memuat data...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <ScrollView>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Daftar Aspirasi</Text>
            {canCreate && (
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push("/aspirasi/create")}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.createButtonText}>Buat Baru</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Status Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
          >
            {statusFilters.map((filter) => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterButton,
                  selectedStatus === filter.value && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedStatus(filter.value)}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedStatus === filter.value && styles.filterTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView
            style={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {filteredAspirasi.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="chatbubble-outline"
                  size={64}
                  color={Colors.textLight}
                />
                <Text style={styles.emptyText}>
                  {selectedStatus === "all"
                    ? "Belum ada aspirasi"
                    : `Tidak ada aspirasi dengan status ${getStatusText(
                        selectedStatus
                      ).toLowerCase()}`}
                </Text>
              </View>
            ) : (
              filteredAspirasi.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  onPress={() => router.push(`/aspirasi/${item.id}`)}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {item.judul}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(item.status) },
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {getStatusText(item.status)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.cardCategory}>{item.kategori}</Text>

                    <Text style={styles.cardDescription} numberOfLines={3}>
                      {item.deskripsi}
                    </Text>

                    <View style={styles.cardFooter}>
                      <Text style={styles.cardDate}>
                        {formatDate(item.created_at)}
                      </Text>
                      {user?.role !== "masyarakat" && (
                        <Text style={styles.cardUser}>
                          oleh{" "}
                          {item.profiles?.full_name || item.profiles?.email}
                        </Text>
                      )}
                    </View>

                    {item.tanggapan && (
                      <View style={styles.tanggapanPreview}>
                        <Text style={styles.tanggapanLabel}>Tanggapan:</Text>
                        <Text style={styles.tanggapanText} numberOfLines={2}>
                          {item.tanggapan}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.border,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    color: Colors.textLight,
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#fff",
  },
  listContainer: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    color: Colors.textLight,
    textAlign: "center",
    fontSize: 16,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 12,
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
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  cardCategory: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "500",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  cardUser: {
    fontSize: 12,
    color: Colors.textLight,
    fontStyle: "italic",
  },
  tanggapanPreview: {
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  tanggapanLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  tanggapanText: {
    fontSize: 12,
    color: Colors.text,
    lineHeight: 16,
  },
});
