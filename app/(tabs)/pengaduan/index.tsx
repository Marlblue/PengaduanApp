import { SearchBar } from "@/components/SearchBar";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
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
import {
  Pengaduan,
  PengaduanKategori,
  PengaduanStatus,
} from "../../../types/database.types";

export default function PengaduanListScreen() {
  const { user } = useAuth();
  const [pengaduan, setPengaduan] = useState<Pengaduan[]>([]);
  const [filteredPengaduan, setFilteredPengaduan] = useState<Pengaduan[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<PengaduanStatus | "all">(
    "all"
  );
  const [selectedKategori, setSelectedKategori] = useState<
    PengaduanKategori | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const canCreatePengaduan = user?.role === "masyarakat";

  // ✅ PERBAIKAN 1: Wrap dengan useCallback untuk mencegah infinite loop
  const fetchPengaduan = useCallback(async () => {
    if (!user) return;

    try {
      let query = supabase
        .from("pengaduan")
        .select(
          `
          *,
          profiles:user_id(full_name, email)
        `
        )
        .order("created_at", { ascending: false });

      if (user.role === "masyarakat") {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setPengaduan(data || []);
    } catch (error) {
      console.error("Error fetching pengaduan:", error);
      Alert.alert("Error", "Gagal memuat data pengaduan");
    } finally {
      setLoading(false);
    }
  }, [user]); // Hanya dibuat ulang kalau user berubah

  // ✅ PERBAIKAN 2: Pisahkan logic filtering ke fungsi terpisah
  const applyFilters = useCallback(
    (
      data: Pengaduan[],
      status: PengaduanStatus | "all",
      kategori: PengaduanKategori | "all",
      query: string,
      order: "newest" | "oldest"
    ) => {
      let filtered = data;

      // Filter by status
      if (status !== "all") {
        filtered = filtered.filter((item) => item.status === status);
      }

      // Filter by kategori
      if (kategori !== "all") {
        filtered = filtered.filter((item) => item.kategori === kategori);
      }

      // Filter by search query
      if (query) {
        const lowerQuery = query.toLowerCase();
        filtered = filtered.filter(
          (item) =>
            item.judul.toLowerCase().includes(lowerQuery) ||
            item.deskripsi.toLowerCase().includes(lowerQuery) ||
            item.kategori.toLowerCase().includes(lowerQuery)
        );
      }

      // Sort
      filtered = [...filtered].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return order === "newest" ? dateB - dateA : dateA - dateB;
      });

      setFilteredPengaduan(filtered);
    },
    []
  );

  // Initial fetch saat user berubah
  useEffect(() => {
    fetchPengaduan();
  }, [fetchPengaduan]);

  // ✅ PERBAIKAN 3: Gunakan useCallback dengan dependency yang benar
  useFocusEffect(
    useCallback(() => {
      fetchPengaduan();
    }, [fetchPengaduan])
  );

  // Apply filters setiap kali ada perubahan
  useEffect(() => {
    applyFilters(
      pengaduan,
      selectedStatus,
      selectedKategori,
      searchQuery,
      sortOrder
    );
  }, [
    selectedStatus,
    selectedKategori,
    searchQuery,
    sortOrder,
    pengaduan,
    applyFilters,
  ]);

  // ✅ PERBAIKAN 4: Implementasi pull-to-refresh dengan benar
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPengaduan();
    setRefreshing(false);
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  const statusFilters: { value: PengaduanStatus | "all"; label: string }[] = [
    { value: "all", label: "Semua" },
    { value: "pending", label: "Menunggu" },
    { value: "diproses", label: "Diproses" },
    { value: "selesai", label: "Selesai" },
    { value: "ditolak", label: "Ditolak" },
  ];

  const kategoriFilters: { value: PengaduanKategori | "all"; label: string }[] =
    [
      { value: "all", label: "Semua Kategori" },
      { value: "Infrastruktur", label: "Infrastruktur" },
      { value: "Kebersihan", label: "Kebersihan" },
      { value: "Keamanan", label: "Keamanan" },
      { value: "Kesehatan", label: "Kesehatan" },
      { value: "Pendidikan", label: "Pendidikan" },
      { value: "Lainnya", label: "Lainnya" },
    ];

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
      {/* ✅ PERBAIKAN 5: Tambahkan RefreshControl untuk pull-to-refresh */}
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Daftar Pengaduan</Text>
            {canCreatePengaduan && (
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push("/pengaduan/create")}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.createButtonText}>Buat Baru</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search Bar */}
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari pengaduan..."
            onClear={clearSearch}
          />

          {/* Sort Options */}
          <View style={styles.sortContainer}>
            <Text style={styles.sortLabel}>Urutkan:</Text>
            <TouchableOpacity
              style={[
                styles.sortButton,
                sortOrder === "newest" && styles.sortButtonActive,
              ]}
              onPress={() => setSortOrder("newest")}
            >
              <Text
                style={[
                  styles.sortText,
                  sortOrder === "newest" && styles.sortTextActive,
                ]}
              >
                Terbaru
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sortButton,
                sortOrder === "oldest" && styles.sortButtonActive,
              ]}
              onPress={() => setSortOrder("oldest")}
            >
              <Text
                style={[
                  styles.sortText,
                  sortOrder === "oldest" && styles.sortTextActive,
                ]}
              >
                Terlama
              </Text>
            </TouchableOpacity>
          </View>

          {/* Kategori Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
          >
            {kategoriFilters.map((filter) => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterButton,
                  selectedKategori === filter.value &&
                    styles.filterButtonActive,
                ]}
                onPress={() => setSelectedKategori(filter.value)}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedKategori === filter.value &&
                      styles.filterTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

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

          {/* Results Count */}
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsText}>
              {filteredPengaduan.length} pengaduan ditemukan
            </Text>
          </View>

          {filteredPengaduan.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="document-text-outline"
                size={64}
                color={Colors.textLight}
              />
              <Text style={styles.emptyText}>
                {searchQuery
                  ? "Tidak ada pengaduan yang cocok dengan pencarian"
                  : selectedStatus === "all" && selectedKategori === "all"
                  ? "Belum ada pengaduan"
                  : `Tidak ada pengaduan dengan filter yang dipilih`}
              </Text>
            </View>
          ) : (
            filteredPengaduan.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => router.push(`/pengaduan/${item.id}`)}
              >
                {item.foto_url && (
                  <Image
                    source={{ uri: item.foto_url }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                )}
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

                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {item.deskripsi}
                  </Text>

                  <View style={styles.cardFooter}>
                    <Text style={styles.cardDate}>
                      {formatDate(item.created_at)}
                    </Text>
                    {user?.role !== "masyarakat" && (
                      <Text style={styles.cardUser}>
                        oleh {item.profiles?.full_name || item.profiles?.email}
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
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
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: 160,
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
  sortContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sortLabel: {
    fontSize: 14,
    color: Colors.textLight,
    marginRight: 12,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.border,
    marginRight: 8,
  },
  sortButtonActive: {
    backgroundColor: Colors.primary,
  },
  sortText: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: "500",
  },
  sortTextActive: {
    color: "#fff",
  },
  resultsContainer: {
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 14,
    color: Colors.textLight,
    fontStyle: "italic",
  },
});
