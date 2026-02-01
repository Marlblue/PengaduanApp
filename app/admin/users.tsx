import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { formatDate } from "../../lib/utils";
import { Profile, UserRole } from "../../types/database.types";

export default function AdminUsersScreen() {
  const { user } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole | "all">("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!user || user.role !== "admin") return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setUsers(data || []);
      applyFilter(data || [], selectedRole);
    } catch (error) {
      console.error("Error fetching users:", error);
      Alert.alert("Error", "Gagal memuat data pengguna");
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = (data: Profile[], role: UserRole | "all") => {
    if (role === "all") {
      setFilteredUsers(data);
    } else {
      setFilteredUsers(data.filter((item) => item.role === role));
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user]);

  useEffect(() => {
    applyFilter(users, selectedRole);
  }, [selectedRole, users]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    if (!user || user.role !== "admin") return;

    setUpdatingUser(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

      if (error) {
        throw error;
      }

      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      Alert.alert(
        "Sukses",
        `Role berhasil diubah menjadi ${getRoleText(newRole)}`
      );
    } catch (error) {
      console.error("Error updating user role:", error);
      Alert.alert("Error", "Gagal mengubah role pengguna");
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleRoleChange = (
    userId: string,
    currentRole: UserRole,
    newRole: UserRole
  ) => {
    if (currentRole === newRole) return;

    Alert.alert(
      "Konfirmasi Ubah Role",
      `Ubah role pengguna menjadi "${getRoleText(newRole)}"?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ubah",
          style: "default",
          onPress: () => updateUserRole(userId, newRole),
        },
      ]
    );
  };

  const getRoleText = (role: UserRole): string => {
    switch (role) {
      case "masyarakat":
        return "Masyarakat";
      case "petugas":
        return "Petugas";
      case "admin":
        return "Admin";
      default:
        return role;
    }
  };

  const getRoleColor = (role: UserRole): string => {
    switch (role) {
      case "masyarakat":
        return Colors.primary;
      case "petugas":
        return Colors.warning;
      case "admin":
        return Colors.success;
      default:
        return Colors.textLight;
    }
  };

  const roleFilters: { value: UserRole | "all"; label: string }[] = [
    { value: "all", label: "Semua" },
    { value: "masyarakat", label: "Masyarakat" },
    { value: "petugas", label: "Petugas" },
    { value: "admin", label: "Admin" },
  ];

  if (user?.role !== "admin") {
    return (
      <SafeAreaWrapper>
        <View style={styles.centerContainer}>
          <Text style={styles.accessDeniedText}>
            Akses ditolak. Hanya admin yang dapat mengakses halaman ini.
          </Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  if (loading) {
    return (
      <SafeAreaWrapper>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Kelola Pengguna</Text>
          <Text style={styles.subtitle}>
            Kelola role dan data pengguna sistem
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {users.filter((u) => u.role === "masyarakat").length}
            </Text>
            <Text style={styles.statLabel}>Masyarakat</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {users.filter((u) => u.role === "petugas").length}
            </Text>
            <Text style={styles.statLabel}>Petugas</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {users.filter((u) => u.role === "admin").length}
            </Text>
            <Text style={styles.statLabel}>Admin</Text>
          </View>
        </View>

        {/* Role Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {roleFilters.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterButton,
                selectedRole === filter.value && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedRole(filter.value)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedRole === filter.value && styles.filterTextActive,
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
            {filteredUsers.length} pengguna ditemukan
          </Text>
        </View>

        <ScrollView
          style={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="people-outline"
                size={64}
                color={Colors.textLight}
              />
              <Text style={styles.emptyText}>
                {selectedRole === "all"
                  ? "Belum ada pengguna"
                  : `Tidak ada pengguna dengan role ${getRoleText(
                      selectedRole as UserRole
                    ).toLowerCase()}`}
              </Text>
            </View>
          ) : (
            filteredUsers.map((userItem) => (
              <View key={userItem.id} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.avatarText}>
                      {userItem.full_name?.charAt(0) ||
                        userItem.email?.charAt(0) ||
                        "U"}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                      {userItem.full_name || "Tidak ada nama"}
                    </Text>
                    <Text style={styles.userEmail}>{userItem.email}</Text>
                    {userItem.phone && (
                      <Text style={styles.userPhone}>{userItem.phone}</Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.roleBadge,
                      { backgroundColor: getRoleColor(userItem.role) },
                    ]}
                  >
                    <Text style={styles.roleText}>
                      {getRoleText(userItem.role)}
                    </Text>
                  </View>
                </View>

                <View style={styles.userMeta}>
                  <Text style={styles.metaText}>
                    Bergabung: {formatDate(userItem.created_at)}
                  </Text>
                  <Text style={styles.metaText}>
                    ID: {userItem.id.substring(0, 8)}...
                  </Text>
                </View>

                {/* Role Actions */}
                <View style={styles.roleActions}>
                  <Text style={styles.roleLabel}>Ubah Role:</Text>
                  <View style={styles.roleButtons}>
                    {(["masyarakat", "petugas", "admin"] as UserRole[]).map(
                      (role) => (
                        <TouchableOpacity
                          key={role}
                          style={[
                            styles.roleButton,
                            userItem.role === role && styles.roleButtonActive,
                            updatingUser === userItem.id &&
                              styles.roleButtonDisabled,
                          ]}
                          onPress={() =>
                            handleRoleChange(userItem.id, userItem.role, role)
                          }
                          disabled={
                            userItem.role === role ||
                            updatingUser === userItem.id
                          }
                        >
                          {updatingUser === userItem.id ? (
                            <ActivityIndicator
                              size="small"
                              color={
                                userItem.role === role ? "#fff" : Colors.primary
                              }
                            />
                          ) : (
                            <Text
                              style={[
                                styles.roleButtonText,
                                userItem.role === role &&
                                  styles.roleButtonTextActive,
                              ]}
                            >
                              {getRoleText(role)}
                            </Text>
                          )}
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
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
    padding: 20,
  },
  accessDeniedText: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: "center",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textLight,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
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
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: "center",
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
  resultsContainer: {
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 14,
    color: Colors.textLight,
    fontStyle: "italic",
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
  userCard: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: Colors.textLight,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  userMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  roleActions: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  roleButtons: {
    flexDirection: "row",
    gap: 8,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  roleButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  roleButtonDisabled: {
    opacity: 0.6,
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.text,
  },
  roleButtonTextActive: {
    color: "#fff",
  },
  userStats: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statItemText: {
    fontSize: 12,
    color: Colors.textLight,
  },
});
