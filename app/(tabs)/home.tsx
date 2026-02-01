import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  RefreshControl,
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
import { getRoleColor, getRoleText } from "../../lib/utils";

interface Stats {
  totalPengaduan: number;
  totalAspirasi: number;
  pendingPengaduan: number;
  diprosesPengaduan: number;
  selesaiPengaduan: number;
  ditolakPengaduan: number;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalPengaduan: 0,
    totalAspirasi: 0,
    pendingPengaduan: 0,
    diprosesPengaduan: 0,
    selesaiPengaduan: 0,
    ditolakPengaduan: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Fetch stats berdasarkan role
      if (user.role === "masyarakat") {
        // Stats untuk masyarakat
        const { data: pengaduan, error: pengaduanError } = await supabase
          .from("pengaduan")
          .select("*")
          .eq("user_id", user.id);

        const { data: aspirasi, error: aspirasiError } = await supabase
          .from("aspirasi")
          .select("*")
          .eq("user_id", user.id);

        if (!pengaduanError && !aspirasiError) {
          setStats({
            totalPengaduan: pengaduan?.length || 0,
            totalAspirasi: aspirasi?.length || 0,
            pendingPengaduan:
              pengaduan?.filter((p) => p.status === "pending").length || 0,
            diprosesPengaduan:
              pengaduan?.filter((p) => p.status === "diproses").length || 0,
            selesaiPengaduan:
              pengaduan?.filter((p) => p.status === "selesai").length || 0,
            ditolakPengaduan:
              pengaduan?.filter((p) => p.status === "ditolak").length || 0,
          });
        }
      } else {
        // Stats untuk petugas/admin
        const { data: pengaduan, error: pengaduanError } = await supabase
          .from("pengaduan")
          .select("*");

        const { data: aspirasi, error: aspirasiError } = await supabase
          .from("aspirasi")
          .select("*");

        if (!pengaduanError && !aspirasiError) {
          setStats({
            totalPengaduan: pengaduan?.length || 0,
            totalAspirasi: aspirasi?.length || 0,
            pendingPengaduan:
              pengaduan?.filter((p) => p.status === "pending").length || 0,
            diprosesPengaduan:
              pengaduan?.filter((p) => p.status === "diproses").length || 0,
            selesaiPengaduan:
              pengaduan?.filter((p) => p.status === "selesai").length || 0,
            ditolakPengaduan:
              pengaduan?.filter((p) => p.status === "ditolak").length || 0,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  // Di dalam komponen HomeScreen, perbaiki bagian actions
  const renderActions = () => {
    const isMasyarakat = user?.role === "masyarakat";
    const isPetugas = user?.role === "petugas";
    const isAdmin = user?.role === "admin";

    return (
      <View style={styles.actions}>
        {/* Hanya masyarakat yang bisa buat pengaduan */}
        {isMasyarakat && (
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/pengaduan/create")}
          >
            <Text style={styles.actionTitle}>Buat Pengaduan</Text>
            <Text style={styles.actionDescription}>
              Laporkan masalah atau keluhan Anda dengan foto dan lokasi
            </Text>
          </TouchableOpacity>
        )}

        {/* Hanya masyarakat yang bisa buat aspirasi */}
        {isMasyarakat && (
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/aspirasi/create")}
          >
            <Text style={styles.actionTitle}>Sampaikan Aspirasi</Text>
            <Text style={styles.actionDescription}>
              Berikan saran dan masukan untuk kemajuan bersama
            </Text>
          </TouchableOpacity>
        )}

        {/* Petugas dan Admin bisa kelola pengaduan */}
        {(isPetugas || isAdmin) && (
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(tabs)/pengaduan")}
          >
            <Text style={styles.actionTitle}>Kelola Pengaduan</Text>
            <Text style={styles.actionDescription}>
              Lihat dan kelola semua pengaduan masyarakat
            </Text>
          </TouchableOpacity>
        )}

        {/* Hanya Admin yang bisa kelola aspirasi */}
        {isAdmin && (
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(tabs)/aspirasi")}
          >
            <Text style={styles.actionTitle}>Kelola Aspirasi</Text>
            <Text style={styles.actionDescription}>
              Lihat dan tanggapi aspirasi dari masyarakat
            </Text>
          </TouchableOpacity>
        )}

        {/* Admin dashboard khusus admin */}
        {isAdmin && (
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/admin/dashboard")}
          >
            <Text style={styles.actionTitle}>Dashboard Admin</Text>
            <Text style={styles.actionDescription}>
              Lihat statistik lengkap dan kelola sistem
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderStats = () => {
    if (user?.role === "masyarakat") {
      return (
        <View style={styles.stats}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalPengaduan}</Text>
            <Text style={styles.statLabel}>Total Pengaduan</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalAspirasi}</Text>
            <Text style={styles.statLabel}>Total Aspirasi</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalPengaduan}</Text>
          <Text style={styles.statLabel}>Total Pengaduan</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.pendingPengaduan}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.diprosesPengaduan}</Text>
          <Text style={styles.statLabel}>Diproses</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.selesaiPengaduan}</Text>
          <Text style={styles.statLabel}>Selesai</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaWrapper>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.welcome}>Selamat Datang</Text>
          <Text style={styles.name}>{user?.full_name || "Pengguna"}</Text>
          <View
            style={[
              styles.roleBadge,
              { backgroundColor: getRoleColor(user?.role || "") },
            ]}
          >
            <Text style={styles.roleText}>{getRoleText(user?.role || "")}</Text>
          </View>
        </View>
        {renderStats()}
        {renderActions()}
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  welcome: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    color: Colors.textLight,
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    width: "48%",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: "center",
  },
  actions: {
    gap: 16,
  },
  actionCard: {
    backgroundColor: Colors.card,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.primary,
    marginBottom: 8,
  },
  actionDescription: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
  },
});
