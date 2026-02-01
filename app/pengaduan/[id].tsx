import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
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
import { Pengaduan, Profile } from "../../types/database.types";

interface PengaduanWithDetails extends Pengaduan {
  profiles: Profile;
  petugas_profiles?: Profile;
}

export default function PengaduanDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [pengaduan, setPengaduan] = useState<PengaduanWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchPengaduan = useCallback(async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("pengaduan")
        .select(
          `
          *,
          profiles:user_id(*),
          petugas_profiles:petugas_id(*)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;

      setPengaduan(data);
    } catch (error) {
      console.error("Error fetching pengaduan:", error);
      Alert.alert("Error", "Gagal memuat detail pengaduan");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPengaduan();
  }, [fetchPengaduan]);

  useFocusEffect(
    useCallback(() => {
      if (!loading) fetchPengaduan();
    }, [loading, fetchPengaduan])
  );

  const openMap = () => {
    if (!pengaduan?.latitude || !pengaduan?.longitude) return;
    const url = `https://maps.google.com/?q=${pengaduan.latitude},${pengaduan.longitude}`;
    Linking.openURL(url);
  };

  const openImage = () => {
    if (!pengaduan?.foto_url) return;
    setModalVisible(true);
  };

  // Fungsi untuk cek apakah status pernah dilalui
  const hasPassedStatus = (status: string): boolean => {
    if (!pengaduan) return false;

    const statusOrder = ["pending", "diproses", "selesai"];
    const currentIndex = statusOrder.indexOf(pengaduan.status);
    const checkIndex = statusOrder.indexOf(status);

    // Jika ditolak, berarti pernah lewat pending
    if (pengaduan.status === "ditolak" && status === "pending") return true;

    return checkIndex <= currentIndex;
  };

  const canEdit = user?.role === "petugas" || user?.role === "admin";

  if (loading) {
    return (
      <SafeAreaWrapper>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaWrapper>
    );
  }

  if (!pengaduan) {
    return (
      <SafeAreaWrapper>
        <View style={styles.centerContainer}>
          <Text>Pengaduan tidak ditemukan</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{pengaduan.judul}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(pengaduan.status) },
              ]}
            >
              <Text style={styles.statusText}>
                {getStatusText(pengaduan.status)}
              </Text>
            </View>
          </View>
          <Text style={styles.category}>{pengaduan.kategori}</Text>
          <Text style={styles.date}>{formatDate(pengaduan.created_at)}</Text>
        </View>

        {/* Foto */}
        {pengaduan.foto_url && (
          <TouchableOpacity style={styles.imageContainer} onPress={openImage}>
            <Image
              source={{ uri: pengaduan.foto_url }}
              style={styles.image}
              resizeMode="cover"
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
            />
            {imageLoading && (
              <View style={styles.imageLoading}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            )}
            <View style={styles.imageOverlay}>
              <Ionicons name="expand" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
        )}

        {/* Info Pengadu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Pengadu</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Nama</Text>
              <Text style={styles.infoValue}>
                {pengaduan.profiles?.full_name || pengaduan.profiles?.email}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{pengaduan.profiles?.email}</Text>
            </View>
            {pengaduan.profiles?.phone && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Telepon</Text>
                <Text style={styles.infoValue}>{pengaduan.profiles.phone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Deskripsi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deskripsi Pengaduan</Text>
          <Text style={styles.description}>{pengaduan.deskripsi}</Text>
        </View>

        {/* Lokasi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lokasi Kejadian</Text>
          <TouchableOpacity style={styles.locationCard} onPress={openMap}>
            <Ionicons name="location" size={20} color={Colors.primary} />
            <View style={styles.locationText}>
              <Text style={styles.locationAddress}>
                {pengaduan.alamat || "Alamat tidak tersedia"}
              </Text>
              <Text style={styles.locationCoordinates}>
                {pengaduan.latitude?.toFixed(6)},{" "}
                {pengaduan.longitude?.toFixed(6)}
              </Text>
            </View>
            <Ionicons name="open-outline" size={16} color={Colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* Tanggapan Petugas */}
        {(pengaduan.petugas_profiles || pengaduan.tanggapan) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tanggapan Petugas</Text>

            {pengaduan.petugas_profiles && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Penanggung Jawab</Text>
                <Text style={styles.infoValue}>
                  {pengaduan.petugas_profiles.full_name ||
                    pengaduan.petugas_profiles.email}
                </Text>
              </View>
            )}

            {pengaduan.tanggapan && (
              <View style={styles.tanggapanContainer}>
                <Text style={styles.tanggapanLabel}>Tanggapan:</Text>
                <Text style={styles.tanggapanText}>{pengaduan.tanggapan}</Text>
              </View>
            )}

            {pengaduan.updated_at && (
              <Text style={styles.updateDate}>
                Diupdate: {formatDate(pengaduan.updated_at)}
              </Text>
            )}
          </View>
        )}

        {/* Timeline Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Riwayat Status</Text>
          <View style={styles.timeline}>
            {/* Step 1: Dibuat */}
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, styles.timelineDotCompleted]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Pengaduan Dibuat</Text>
                <Text style={styles.timelineDate}>
                  {formatDate(pengaduan.created_at)}
                </Text>
                <Text style={styles.timelineDescription}>
                  Pengaduan telah dibuat oleh{" "}
                  {pengaduan.profiles?.full_name || pengaduan.profiles?.email}
                </Text>
              </View>
            </View>

            {/* Step 2: Diproses */}
            {hasPassedStatus("diproses") && (
              <View style={styles.timelineItem}>
                <View
                  style={[
                    styles.timelineDot,
                    pengaduan.status === "diproses"
                      ? styles.timelineDotActive
                      : styles.timelineDotCompleted,
                  ]}
                />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Sedang Diproses</Text>
                  <Text style={styles.timelineDate}>
                    {pengaduan.updated_at
                      ? formatDate(pengaduan.updated_at)
                      : "-"}
                  </Text>
                  <Text style={styles.timelineDescription}>
                    Pengaduan sedang dalam proses penanganan
                  </Text>
                </View>
              </View>
            )}

            {/* Step 3: Selesai */}
            {pengaduan.status === "selesai" && (
              <View style={styles.timelineItem}>
                <View
                  style={[styles.timelineDot, styles.timelineDotCompleted]}
                />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Selesai</Text>
                  <Text style={styles.timelineDate}>
                    {pengaduan.updated_at
                      ? formatDate(pengaduan.updated_at)
                      : "-"}
                  </Text>
                  <Text style={styles.timelineDescription}>
                    Pengaduan telah selesai ditangani
                  </Text>
                </View>
              </View>
            )}

            {/* Step 3 Alt: Ditolak */}
            {pengaduan.status === "ditolak" && (
              <View style={styles.timelineItem}>
                <View
                  style={[styles.timelineDot, styles.timelineDotRejected]}
                />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Ditolak</Text>
                  <Text style={styles.timelineDate}>
                    {pengaduan.updated_at
                      ? formatDate(pengaduan.updated_at)
                      : "-"}
                  </Text>
                  <Text style={styles.timelineDescription}>
                    Pengaduan telah ditolak
                  </Text>
                </View>
              </View>
            )}

            {/* Pending */}
            {pengaduan.status === "pending" && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.timelineDotPending]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Menunggu Verifikasi</Text>
                  <Text style={styles.timelineDescription}>
                    Pengaduan sedang menunggu ditangani oleh petugas
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        {canEdit && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push(`/pengaduan/update/${pengaduan.id}`)}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.editButtonText}>Update Status</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modal Fullscreen Image */}
      {pengaduan?.foto_url && (
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalCloseArea}
              activeOpacity={1}
              onPress={() => setModalVisible(false)}
            />
            <Image
              source={{ uri: pengaduan.foto_url }}
              style={styles.fullImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
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
  imageContainer: {
    position: "relative",
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 200,
  },
  imageLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.border,
  },
  imageOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
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
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  locationText: {
    flex: 1,
  },
  locationAddress: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500",
    marginBottom: 4,
  },
  locationCoordinates: {
    fontSize: 12,
    color: Colors.textLight,
  },
  tanggapanContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  tanggapanLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  tanggapanText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  updateDate: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 8,
    fontStyle: "italic",
  },
  timeline: {
    gap: 20,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineDotCompleted: {
    backgroundColor: "#22c55e",
  },
  timelineDotActive: {
    backgroundColor: Colors.primary,
  },
  timelineDotPending: {
    backgroundColor: "#f59e0b",
  },
  timelineDotRejected: {
    backgroundColor: "#ef4444",
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
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: "80%",
  },
  modalCloseButton: {
    position: "absolute",
    top: 40,
    right: 20,
    padding: 10,
  },
  modalCloseArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
