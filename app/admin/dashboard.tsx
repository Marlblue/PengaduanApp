import { Ionicons } from "@expo/vector-icons";
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
import { getStatusColor } from "../../lib/utils";

interface DashboardStats {
  totalPengaduan: number;
  totalAspirasi: number;
  totalUsers: number;
  pengaduanByStatus: {
    pending: number;
    diproses: number;
    selesai: number;
    ditolak: number;
  };
  aspirasiByStatus: {
    pending: number;
    disetujui: number;
    ditolak: number;
  };
  recentPengaduan: any[];
}

export default function AdminDashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalPengaduan: 0,
    totalAspirasi: 0,
    totalUsers: 0,
    pengaduanByStatus: { pending: 0, diproses: 0, selesai: 0, ditolak: 0 },
    aspirasiByStatus: { pending: 0, disetujui: 0, ditolak: 0 },
    recentPengaduan: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    if (!user || user.role !== "admin") return;

    try {
      // Fetch all data in parallel
      const [pengaduanData, aspirasiData, usersData, recentPengaduanData] =
        await Promise.all([
          supabase.from("pengaduan").select("*"),
          supabase.from("aspirasi").select("*"),
          supabase.from("profiles").select("*"),
          supabase
            .from("pengaduan")
            .select("*, profiles:user_id(full_name)")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

      const pengaduan = pengaduanData.data || [];
      const aspirasi = aspirasiData.data || [];
      const users = usersData.data || [];

      setStats({
        totalPengaduan: pengaduan.length,
        totalAspirasi: aspirasi.length,
        totalUsers: users.length,
        pengaduanByStatus: {
          pending: pengaduan.filter((p) => p.status === "pending").length,
          diproses: pengaduan.filter((p) => p.status === "diproses").length,
          selesai: pengaduan.filter((p) => p.status === "selesai").length,
          ditolak: pengaduan.filter((p) => p.status === "ditolak").length,
        },
        aspirasiByStatus: {
          pending: aspirasi.filter((a) => a.status === "pending").length,
          disetujui: aspirasi.filter((a) => a.status === "disetujui").length,
          ditolak: aspirasi.filter((a) => a.status === "ditolak").length,
        },
        recentPengaduan: recentPengaduanData.data || [],
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  if (user?.role !== "admin") {
    return (
      <SafeAreaWrapper>
        <View style={styles.centerContainer}>
          <Text>Hanya admin yang dapat mengakses halaman ini.</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

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
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Overview sistem pengaduan</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="document-text" size={24} color={Colors.primary} />
            <Text style={styles.statNumber}>{stats.totalPengaduan}</Text>
            <Text style={styles.statLabel}>Total Pengaduan</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="chatbubble" size={24} color={Colors.primary} />
            <Text style={styles.statNumber}>{stats.totalAspirasi}</Text>
            <Text style={styles.statLabel}>Total Aspirasi</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color={Colors.primary} />
            <Text style={styles.statNumber}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Total Pengguna</Text>
          </View>
        </View>

        {/* Status Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status Pengaduan</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor("pending") },
                ]}
              />
              <Text style={styles.statusCount}>
                {stats.pengaduanByStatus.pending}
              </Text>
              <Text style={styles.statusLabel}>Pending</Text>
            </View>
            <View style={styles.statusItem}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor("diproses") },
                ]}
              />
              <Text style={styles.statusCount}>
                {stats.pengaduanByStatus.diproses}
              </Text>
              <Text style={styles.statusLabel}>Diproses</Text>
            </View>
            <View style={styles.statusItem}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor("selesai") },
                ]}
              />
              <Text style={styles.statusCount}>
                {stats.pengaduanByStatus.selesai}
              </Text>
              <Text style={styles.statusLabel}>Selesai</Text>
            </View>
            <View style={styles.statusItem}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor("ditolak") },
                ]}
              />
              <Text style={styles.statusCount}>
                {stats.pengaduanByStatus.ditolak}
              </Text>
              <Text style={styles.statusLabel}>Ditolak</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push("/(tabs)/pengaduan")}
            >
              <Ionicons name="list" size={24} color={Colors.primary} />
              <Text style={styles.actionText}>Kelola Pengaduan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push("/(tabs)/aspirasi")}
            >
              <Ionicons
                name="chatbubble-ellipses"
                size={24}
                color={Colors.primary}
              />
              <Text style={styles.actionText}>Kelola Aspirasi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push("/admin/users")}
            >
              <Ionicons name="people" size={24} color={Colors.primary} />
              <Text style={styles.actionText}>Kelola User</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Pengaduan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pengaduan Terbaru</Text>
          {stats.recentPengaduan.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.recentItem}
              onPress={() => router.push(`/pengaduan/${item.id}`)}
            >
              <Text style={styles.recentTitle} numberOfLines={1}>
                {item.judul}
              </Text>
              <Text style={styles.recentUser}>
                oleh {item.profiles?.full_name || "User"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textLight,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: "center",
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
    marginBottom: 16,
  },
  statusGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusItem: {
    alignItems: "center",
    flex: 1,
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusCount: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  actionsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: "500",
    marginTop: 8,
    textAlign: "center",
  },
  recentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  recentTitle: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    marginRight: 12,
  },
  recentUser: {
    fontSize: 12,
    color: Colors.textLight,
  },
});
