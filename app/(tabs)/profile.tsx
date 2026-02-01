import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaWrapper } from "../../components/SafeAreaWrapper";
import { Colors } from "../../constants/Colors";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import { getRoleColor } from "../../lib/utils";

interface ProfileStats {
  totalPengaduan: number;
  totalAspirasi: number;
  pengaduanByStatus: {
    pending: number;
    diproses: number;
    selesai: number;
    ditolak: number;
  };
}

export default function ProfileScreen() {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<ProfileStats>({
    totalPengaduan: 0,
    totalAspirasi: 0,
    pengaduanByStatus: { pending: 0, diproses: 0, selesai: 0, ditolak: 0 },
  });

  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    phone: user?.phone || "",
  });

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Fetch pengaduan stats
      const { data: pengaduanData, error: pengaduanError } = await supabase
        .from("pengaduan")
        .select("*")
        .eq("user_id", user.id);

      // Fetch aspirasi stats
      const { data: aspirasiData, error: aspirasiError } = await supabase
        .from("aspirasi")
        .select("*")
        .eq("user_id", user.id);

      if (!pengaduanError && !aspirasiError) {
        const pengaduan = pengaduanData || [];
        const aspirasi = aspirasiData || [];

        setStats({
          totalPengaduan: pengaduan.length,
          totalAspirasi: aspirasi.length,
          pengaduanByStatus: {
            pending: pengaduan.filter((p) => p.status === "pending").length,
            diproses: pengaduan.filter((p) => p.status === "diproses").length,
            selesai: pengaduan.filter((p) => p.status === "selesai").length,
            ditolak: pengaduan.filter((p) => p.status === "ditolak").length,
          },
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStats();
      // Update form dengan data terbaru dari user
      setForm({
        full_name: user.full_name || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const handleLogout = async () => {
    Alert.alert("Konfirmasi", "Apakah Anda yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const validatePhone = (phone: string) => {
    // Hilangkan spasi dan strip
    const clean = phone.replace(/[\s-]/g, "");

    // Format valid:
    // 08123456789
    // 628123456789
    // +628123456789
    const regex = /^(0|\+?62)[0-9]{8,13}$/;

    return regex.test(clean);
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      Alert.alert("Error", "Nama lengkap tidak boleh kosong");
      return;
    }

    if (form.phone && !validatePhone(form.phone)) {
      Alert.alert(
        "Error",
        "Format nomor telepon tidak valid. Contoh: 081234567890"
      );
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || null,
        })
        .eq("id", user?.id);

      if (error) {
        throw error;
      }

      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }

      Alert.alert("Sukses", "Profil berhasil diperbarui");
      setEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Gagal memperbarui profil");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setForm({
      full_name: user?.full_name || "",
      phone: user?.phone || "",
    });
    setEditing(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const formatPhone = (phone: string | null): string => {
    if (!phone) return "-";

    // Format: +62 812-3456-7890
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("62")) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith("0")) {
      return `+62 ${cleaned.slice(1)}`;
    }
    return phone;
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
        {/* Header Profile */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
            </Text>
          </View>
          <Text style={styles.name}>
            {editing ? (
              <TextInput
                style={styles.nameInput}
                value={form.full_name}
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, full_name: value }))
                }
                placeholder="Nama Lengkap"
                placeholderTextColor={Colors.textLight}
              />
            ) : (
              user?.full_name || "Pengguna"
            )}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleContainer}>
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: getRoleColor(user?.role || "") },
              ]}
            >
              <Text style={styles.roleText}>
                {user?.role === "masyarakat"
                  ? "Masyarakat"
                  : user?.role === "petugas"
                  ? "Petugas"
                  : "Admin"}
              </Text>
            </View>
          </View>
        </View>

        {/* Informasi Akun */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Informasi Akun</Text>
            {!editing && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setEditing(true)}
              >
                <Ionicons
                  name="create-outline"
                  size={16}
                  color={Colors.primary}
                />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Nama Lengkap</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={form.full_name}
                  onChangeText={(value) =>
                    setForm((prev) => ({ ...prev, full_name: value }))
                  }
                  placeholder="Nama Lengkap"
                />
              ) : (
                <Text style={styles.infoValue}>{user?.full_name || "-"}</Text>
              )}
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Telepon</Text>
              {editing ? (
                <View style={styles.phoneInputContainer}>
                  <TextInput
                    style={styles.phoneInput}
                    value={form.phone}
                    onChangeText={(value) =>
                      setForm((prev) => ({ ...prev, phone: value }))
                    }
                    placeholder="081234567890"
                    keyboardType="phone-pad"
                    maxLength={15}
                  />
                  {form.phone && !validatePhone(form.phone) && (
                    <Ionicons name="warning" size={16} color={Colors.error} />
                  )}
                </View>
              ) : (
                <Text style={styles.infoValue}>
                  {formatPhone(user?.phone || null)}
                </Text>
              )}
            </View>

            {editing && form.phone && !validatePhone(form.phone) && (
              <Text style={styles.phoneHelper}>
                Format: 08xx-xxxx-xxxx atau +628xx-xxxx-xxxx
              </Text>
            )}

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>
                {user?.role === "masyarakat"
                  ? "Masyarakat"
                  : user?.role === "petugas"
                  ? "Petugas"
                  : "Admin"}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Bergabung</Text>
              <Text style={styles.infoValue}>
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "-"}
              </Text>
            </View>
          </View>

          {/* Edit Actions */}
          {editing && (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.cancelEditButton}
                onPress={handleCancel}
                disabled={loading}
              >
                <Text style={styles.cancelEditText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (loading ||
                    !form.full_name.trim() ||
                    (!!form.phone && !validatePhone(form.phone))) &&
                    styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={
                  loading ||
                  !form.full_name.trim() ||
                  (!!form.phone && !validatePhone(form.phone))
                }
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Simpan</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Statistik */}
        {user?.role === "masyarakat" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statistik Saya</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Ionicons
                  name="document-text"
                  size={24}
                  color={Colors.primary}
                />
                <View style={styles.statText}>
                  <Text style={styles.statNumber}>{stats.totalPengaduan}</Text>
                  <Text style={styles.statLabel}>Total Pengaduan</Text>
                </View>
              </View>

              <View style={styles.statItem}>
                <Ionicons name="chatbubble" size={24} color={Colors.primary} />
                <View style={styles.statText}>
                  <Text style={styles.statNumber}>{stats.totalAspirasi}</Text>
                  <Text style={styles.statLabel}>Total Aspirasi</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Aplikasi Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tentang Aplikasi</Text>
          <View style={styles.appInfo}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Versi</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Developer</Text>
              <Text style={styles.infoValue}>Hilmy Hafizh</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Update Terakhir</Text>
              <Text style={styles.infoValue}>
                {new Date().toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutButtonText}>Keluar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
    padding: 20,
    backgroundColor: Colors.card,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 4,
    textAlign: "center",
  },
  nameInput: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    paddingVertical: 4,
    minWidth: 200,
    textAlign: "center",
  },
  email: {
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 8,
  },
  roleContainer: {
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f0f9ff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  editButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
  input: {
    fontSize: 14,
    color: Colors.text,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    paddingVertical: 4,
    flex: 2,
    textAlign: "right",
  },
  phoneInputContainer: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  phoneInput: {
    fontSize: 14,
    color: Colors.text,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    paddingVertical: 4,
    flex: 1,
    textAlign: "right",
    marginRight: 8,
  },
  phoneHelper: {
    fontSize: 12,
    color: Colors.error,
    fontStyle: "italic",
    marginTop: 4,
    textAlign: "right",
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelEditButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#fff",
  },
  cancelEditText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  saveButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
  },
  statText: {
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  statusBreakdown: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  statusItems: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusItemSmall: {
    alignItems: "center",
    flex: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusCount: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 2,
  },
  statusLabelSmall: {
    fontSize: 10,
    color: Colors.textLight,
    textAlign: "center",
  },
  adminStats: {
    gap: 12,
  },
  adminStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
  },
  adminStatText: {
    flex: 1,
  },
  adminStatNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 2,
  },
  adminStatLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  adminDashboardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  adminDashboardText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  appInfo: {
    gap: 12,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  logoutButtonText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: "600",
  },
});
