import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaWrapper } from "../../../components/SafeAreaWrapper";
import { Colors } from "../../../constants/Colors";
import { useAuth } from "../../../hooks/useAuth";
import { supabase } from "../../../lib/supabase";
import { getStatusColor, getStatusText } from "../../../lib/utils";
import {
  Pengaduan,
  PengaduanStatus,
  Profile,
} from "../../../types/database.types";

interface PengaduanWithDetails extends Pengaduan {
  profiles: Profile;
}

const ALLOWED_STATUS_TRANSITIONS: Record<PengaduanStatus, PengaduanStatus[]> = {
  pending: ["diproses", "ditolak"],
  diproses: ["selesai", "ditolak"],
  selesai: [],
  ditolak: [],
};

const STATUS_OPTIONS: {
  value: PengaduanStatus;
  label: string;
  description: string;
}[] = [
  {
    value: "pending",
    label: "Menunggu",
    description: "Pengaduan masih menunggu penanganan",
  },
  {
    value: "diproses",
    label: "Diproses",
    description: "Pengaduan sedang dalam proses penanganan",
  },
  {
    value: "selesai",
    label: "Selesai",
    description: "Pengaduan telah selesai ditangani",
  },
  {
    value: "ditolak",
    label: "Ditolak",
    description: "Pengaduan ditolak dengan alasan tertentu",
  },
];

export default function UpdatePengaduanScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [pengaduan, setPengaduan] = useState<PengaduanWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [form, setForm] = useState({
    status: "pending" as PengaduanStatus,
    tanggapan: "",
  });

  const [originalData, setOriginalData] = useState({
    status: "pending" as PengaduanStatus,
    tanggapan: "",
  });

  const fetchPengaduan = useCallback(async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("pengaduan")
        .select(`*, profiles:user_id(*)`)
        .eq("id", id)
        .single();

      if (error) throw error;

      setPengaduan(data);
      setForm({
        status: data.status,
        tanggapan: data.tanggapan || "",
      });
      setOriginalData({
        status: data.status,
        tanggapan: data.tanggapan || "",
      });
    } catch (error) {
      console.error("Error fetching pengaduan:", error);
      Alert.alert("Error", "Gagal memuat data pengaduan");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPengaduan();
  }, [fetchPengaduan]);

  const isFinalStatus = (status: PengaduanStatus): boolean => {
    return status === "selesai" || status === "ditolak";
  };

  const canChangeStatus = (
    currentStatus: PengaduanStatus,
    newStatus: PengaduanStatus
  ): boolean => {
    if (isFinalStatus(currentStatus)) return false;
    return ALLOWED_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
  };

  const getAllowedStatusOptions = (currentStatus: PengaduanStatus) => {
    if (isFinalStatus(currentStatus)) {
      return STATUS_OPTIONS.filter((opt) => opt.value === currentStatus);
    }
    const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[currentStatus];
    return STATUS_OPTIONS.filter(
      (opt) =>
        opt.value === currentStatus || allowedTransitions.includes(opt.value)
    );
  };

  const hasChanges =
    form.status !== originalData.status ||
    form.tanggapan !== originalData.tanggapan;

  const validateForm = (): boolean => {
    if (!hasChanges) {
      Alert.alert("Info", "Tidak ada perubahan yang disimpan");
      return false;
    }

    if (isFinalStatus(originalData.status)) {
      Alert.alert(
        "Error",
        `Status "${getStatusText(originalData.status)}" tidak dapat diubah lagi`
      );
      return false;
    }

    if (!canChangeStatus(originalData.status, form.status)) {
      Alert.alert(
        "Error",
        `Tidak dapat mengubah status dari "${getStatusText(
          originalData.status
        )}" ke "${getStatusText(form.status)}"`
      );
      return false;
    }

    if (
      originalData.status === "pending" &&
      form.status !== "pending" &&
      form.tanggapan.trim().length < 10
    ) {
      Alert.alert(
        "Error",
        "Tanggapan minimal 10 karakter untuk perubahan status ini"
      );
      return false;
    }

    if (
      (form.status === "selesai" || form.status === "ditolak") &&
      form.tanggapan.trim().length < 10
    ) {
      Alert.alert(
        "Error",
        `Tanggapan minimal 10 karakter untuk status "${getStatusText(
          form.status
        )}"`
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!pengaduan || !user) return;
    if (!validateForm()) return;

    setUpdating(true);
    try {
      const updateData: any = {
        status: form.status,
        updated_at: new Date().toISOString(),
        petugas_id: user.id, // ✅ SELALU update petugas ke user yang sedang update
      };

      if (form.tanggapan.trim()) {
        updateData.tanggapan = form.tanggapan.trim();
      }

      // Jika status dikembalikan ke pending, reset petugas dan tanggapan
      if (form.status === "pending") {
        updateData.petugas_id = null;
        updateData.tanggapan = null;
      }

      const { error } = await supabase
        .from("pengaduan")
        .update(updateData)
        .eq("id", pengaduan.id);

      if (error) throw error;

      Alert.alert(
        "Sukses",
        `Status pengaduan berhasil diubah menjadi "${getStatusText(
          form.status
        )}"`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error("Error updating pengaduan:", error);
      Alert.alert("Error", "Gagal memperbarui status pengaduan");
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = (newStatus: PengaduanStatus) => {
    if (isFinalStatus(originalData.status)) {
      Alert.alert(
        "Info",
        `Status "${getStatusText(originalData.status)}" tidak dapat diubah lagi`
      );
      return;
    }

    if (!canChangeStatus(originalData.status, newStatus)) {
      Alert.alert(
        "Error",
        `Tidak dapat mengubah status dari "${getStatusText(
          originalData.status
        )}" ke "${getStatusText(newStatus)}"`
      );
      return;
    }

    setForm((prev) => ({ ...prev, status: newStatus }));
    if (newStatus === "pending") {
      setForm((prev) => ({ ...prev, tanggapan: "" }));
    }
  };

  const getStatusDescription = (status: PengaduanStatus): string => {
    return (
      STATUS_OPTIONS.find((opt) => opt.value === status)?.description || ""
    );
  };

  const getStatusWarning = (): string | null => {
    if (isFinalStatus(originalData.status)) {
      return `Status sudah "${getStatusText(
        originalData.status
      )}" dan tidak dapat diubah lagi`;
    }
    return null;
  };

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

  const allowedStatusOptions = getAllowedStatusOptions(pengaduan.status);
  const statusWarning = getStatusWarning();

  return (
    <SafeAreaWrapper>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Update Status Pengaduan</Text>
          <Text style={styles.subtitle}>
            Ubah status dan berikan tanggapan untuk pengaduan ini
          </Text>
        </View>

        {/* Info Pengaduan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Pengaduan</Text>
          <Text style={styles.pengaduanTitle}>{pengaduan.judul}</Text>
          <Text style={styles.pengaduanCategory}>{pengaduan.kategori}</Text>
          <Text style={styles.pengaduanDescription}>{pengaduan.deskripsi}</Text>

          <View style={styles.userInfo}>
            <Text style={styles.userInfoLabel}>Dilaporkan oleh:</Text>
            <Text style={styles.userInfoValue}>
              {pengaduan.profiles?.full_name || pengaduan.profiles?.email}
            </Text>
          </View>

          <View style={styles.currentStatus}>
            <Text style={styles.currentStatusLabel}>Status Saat Ini:</Text>
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

          {statusWarning && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning" size={20} color={Colors.warning} />
              <Text style={styles.warningText}>{statusWarning}</Text>
            </View>
          )}
        </View>

        {/* Form Update */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Update Status</Text>

          <View style={styles.statusDescription}>
            <Text style={styles.statusDescriptionText}>
              {getStatusDescription(form.status)}
            </Text>
          </View>

          {/* Status Options */}
          <View style={styles.statusOptions}>
            {allowedStatusOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.statusOption,
                  form.status === option.value && styles.statusOptionActive,
                  pengaduan.status === option.value &&
                    styles.statusOptionCurrent,
                  isFinalStatus(pengaduan.status) &&
                    styles.statusOptionDisabled,
                ]}
                onPress={() => handleStatusChange(option.value)}
                disabled={
                  isFinalStatus(pengaduan.status) ||
                  pengaduan.status === option.value
                }
              >
                <View
                  style={[
                    styles.statusOptionDot,
                    { backgroundColor: getStatusColor(option.value) },
                    isFinalStatus(pengaduan.status) &&
                      styles.statusOptionDotDisabled,
                  ]}
                />
                <View style={styles.statusOptionContent}>
                  <Text
                    style={[
                      styles.statusOptionText,
                      form.status === option.value &&
                        styles.statusOptionTextActive,
                      pengaduan.status === option.value &&
                        styles.statusOptionTextCurrent,
                      isFinalStatus(pengaduan.status) &&
                        styles.statusOptionTextDisabled,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {pengaduan.status === option.value && (
                    <Text style={styles.currentIndicator}>(Saat Ini)</Text>
                  )}
                  {isFinalStatus(pengaduan.status) &&
                    option.value !== pengaduan.status && (
                      <Text style={styles.disabledIndicator}>
                        (Tidak tersedia)
                      </Text>
                    )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Alur Status */}
          <View style={styles.flowContainer}>
            <Text style={styles.flowTitle}>Alur Status:</Text>
            <View style={styles.flowSteps}>
              <View style={styles.flowStep}>
                <View
                  style={[
                    styles.flowDot,
                    pengaduan.status === "pending" && styles.flowDotActive,
                  ]}
                />
                <Text style={styles.flowText}>Pending</Text>
              </View>
              <View style={styles.flowArrow}>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={Colors.textLight}
                />
              </View>
              <View style={styles.flowStep}>
                <View
                  style={[
                    styles.flowDot,
                    pengaduan.status === "diproses" && styles.flowDotActive,
                  ]}
                />
                <Text style={styles.flowText}>Diproses</Text>
              </View>
              <View style={styles.flowArrow}>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={Colors.textLight}
                />
              </View>
              <View style={styles.flowStep}>
                <View
                  style={[
                    styles.flowDot,
                    pengaduan.status === "selesai" && styles.flowDotActive,
                  ]}
                />
                <Text style={styles.flowText}>Selesai</Text>
              </View>
              <View style={styles.flowSeparator}>
                <Text style={styles.flowOr}>atau</Text>
              </View>
              <View style={styles.flowStep}>
                <View
                  style={[
                    styles.flowDot,
                    pengaduan.status === "ditolak" && styles.flowDotActive,
                  ]}
                />
                <Text style={styles.flowText}>Ditolak</Text>
              </View>
            </View>
            <Text style={styles.flowNote}>
              * Status "Selesai" dan "Ditolak" tidak dapat diubah kembali
            </Text>
          </View>

          {/* Tanggapan */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Tanggapan {form.status !== "pending" && "*"}
            </Text>
            <Text style={styles.helperText}>
              {form.status === "diproses" &&
                "Berikan informasi tentang tindakan yang sedang dilakukan (min. 10 karakter)"}
              {form.status === "selesai" &&
                "Jelaskan penyelesaian yang telah dilakukan (min. 10 karakter)"}
              {form.status === "ditolak" &&
                "Berikan alasan penolakan pengaduan dengan jelas (min. 10 karakter)"}
              {form.status === "pending" &&
                "Tanggapan akan dihapus jika status dikembalikan ke pending"}
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                isFinalStatus(pengaduan.status) && styles.inputDisabled,
              ]}
              placeholder={
                isFinalStatus(pengaduan.status)
                  ? "Status sudah final, tidak dapat memberikan tanggapan..."
                  : form.status === "pending"
                  ? "Tanggapan tidak diperlukan untuk status pending..."
                  : "Tulis tanggapan Anda (minimal 10 karakter)..."
              }
              value={form.tanggapan}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, tanggapan: value }))
              }
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={
                !isFinalStatus(pengaduan.status) && form.status !== "pending"
              }
            />
            <Text style={styles.charCount}>
              {form.tanggapan.length} karakter
              {form.status !== "pending" &&
                !isFinalStatus(pengaduan.status) &&
                " (minimal 10)"}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={updating}
          >
            <Text style={styles.cancelButtonText}>Batal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!hasChanges || updating || isFinalStatus(pengaduan.status)) &&
                styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={
              !hasChanges || updating || isFinalStatus(pengaduan.status)
            }
          >
            {updating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : isFinalStatus(pengaduan.status) ? (
              <Text style={styles.submitButtonText}>Status Final</Text>
            ) : (
              <Text style={styles.submitButtonText}>Simpan Perubahan</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    marginBottom: 24,
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
  pengaduanTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  pengaduanCategory: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "500",
    marginBottom: 8,
  },
  pengaduanDescription: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    padding: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 6,
  },
  userInfoLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  userInfoValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500",
  },
  currentStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  currentStatusLabel: {
    fontSize: 14,
    color: Colors.textLight,
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
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500",
  },
  statusDescription: {
    backgroundColor: "#f0f9ff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  statusDescriptionText: {
    fontSize: 14,
    color: Colors.text,
    fontStyle: "italic",
  },
  statusOptions: {
    gap: 8,
    marginBottom: 20,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    gap: 12,
  },
  statusOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: "#f0f9ff",
  },
  statusOptionCurrent: {
    backgroundColor: "#f8fafc",
    borderColor: Colors.border,
  },
  statusOptionDisabled: {
    backgroundColor: "#f8fafc",
    borderColor: Colors.border,
    opacity: 0.6,
  },
  statusOptionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusOptionDotDisabled: {
    opacity: 0.5,
  },
  statusOptionContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusOptionText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500",
  },
  statusOptionTextActive: {
    color: Colors.primary,
  },
  statusOptionTextCurrent: {
    color: Colors.textLight,
  },
  statusOptionTextDisabled: {
    color: Colors.textLight,
  },
  currentIndicator: {
    fontSize: 12,
    color: Colors.textLight,
    fontStyle: "italic",
  },
  disabledIndicator: {
    fontSize: 10,
    color: Colors.textLight,
    fontStyle: "italic",
  },
  flowContainer: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  flowTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 12,
  },
  flowSteps: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  flowStep: {
    alignItems: "center",
    flex: 1,
  },
  flowDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.border,
    marginBottom: 4,
  },
  flowDotActive: {
    backgroundColor: Colors.primary,
  },
  flowText: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: "center",
  },
  flowArrow: {
    paddingHorizontal: 4,
  },
  flowSeparator: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  flowOr: {
    fontSize: 10,
    color: Colors.textLight,
    fontStyle: "italic",
  },
  flowNote: {
    fontSize: 10,
    color: Colors.textLight,
    fontStyle: "italic",
    textAlign: "center",
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  helperText: {
    fontSize: 14,
    color: Colors.textLight,
    fontStyle: "italic",
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  inputDisabled: {
    backgroundColor: "#f8fafc",
    borderColor: Colors.border,
    color: Colors.textLight,
  },
  textArea: {
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: "right",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#fff",
  },
  cancelButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: Colors.textLight,
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
