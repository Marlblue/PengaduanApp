import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
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
  Aspirasi,
  AspirasiStatus,
  Profile,
} from "../../../types/database.types";

interface AspirasiWithDetails extends Aspirasi {
  profiles: Profile;
}

// Definisikan alur status yang diperbolehkan untuk aspirasi
const ALLOWED_STATUS_TRANSITIONS: Record<AspirasiStatus, AspirasiStatus[]> = {
  pending: ["disetujui", "ditolak"], // Dari pending hanya bisa ke disetujui atau ditolak
  disetujui: [], // Dari disetujui TIDAK BISA diubah lagi
  ditolak: [], // Dari ditolak TIDAK BISA diubah lagi
};

const STATUS_OPTIONS: {
  value: AspirasiStatus;
  label: string;
  description: string;
}[] = [
  {
    value: "pending",
    label: "Menunggu",
    description: "Aspirasi masih menunggu review admin",
  },
  {
    value: "disetujui",
    label: "Disetujui",
    description: "Aspirasi disetujui dan akan dipertimbangkan",
  },
  {
    value: "ditolak",
    label: "Ditolak",
    description: "Aspirasi ditolak dengan alasan tertentu",
  },
];

export default function UpdateAspirasiScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [aspirasi, setAspirasi] = useState<AspirasiWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [form, setForm] = useState({
    status: "pending" as AspirasiStatus,
    tanggapan: "",
  });

  const [originalData, setOriginalData] = useState({
    status: "pending" as AspirasiStatus,
    tanggapan: "",
  });

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
      setForm({
        status: data.status,
        tanggapan: data.tanggapan || "",
      });
      setOriginalData({
        status: data.status,
        tanggapan: data.tanggapan || "",
      });
    } catch (error) {
      console.error("Error fetching aspirasi:", error);
      Alert.alert("Error", "Gagal memuat data aspirasi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchAspirasi();
    }
  }, [id]);

  // Cek apakah status sudah final (disetujui/ditolak)
  const isFinalStatus = (status: AspirasiStatus): boolean => {
    return status === "disetujui" || status === "ditolak";
  };

  // Cek apakah status bisa diubah
  const canChangeStatus = (
    currentStatus: AspirasiStatus,
    newStatus: AspirasiStatus
  ): boolean => {
    // Jika status saat ini sudah final, tidak bisa diubah
    if (isFinalStatus(currentStatus)) {
      return false;
    }

    // Cek apakah transisi diperbolehkan
    return ALLOWED_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
  };

  // Dapatkan opsi status yang diperbolehkan berdasarkan status saat ini
  const getAllowedStatusOptions = (currentStatus: AspirasiStatus) => {
    if (isFinalStatus(currentStatus)) {
      return STATUS_OPTIONS.filter((opt) => opt.value === currentStatus); // Hanya tampilkan status saat ini
    }

    const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[currentStatus];
    return STATUS_OPTIONS.filter(
      (opt) =>
        opt.value === currentStatus || allowedTransitions.includes(opt.value)
    );
  };

  // Cek apakah ada perubahan
  const hasChanges =
    form.status !== originalData.status ||
    form.tanggapan !== originalData.tanggapan;

  // Validasi form berdasarkan status
  const validateForm = (): boolean => {
    if (!hasChanges) {
      Alert.alert("Info", "Tidak ada perubahan yang disimpan");
      return false;
    }

    // Jika status sudah final, tidak boleh diubah
    if (isFinalStatus(originalData.status)) {
      Alert.alert(
        "Error",
        `Status "${getStatusText(originalData.status)}" tidak dapat diubah lagi`
      );
      return false;
    }

    // Validasi transisi status
    if (!canChangeStatus(originalData.status, form.status)) {
      Alert.alert(
        "Error",
        `Tidak dapat mengubah status dari "${getStatusText(
          originalData.status
        )}" ke "${getStatusText(form.status)}"`
      );
      return false;
    }

    // Jika status berubah dari pending, wajib ada tanggapan
    if (
      originalData.status === "pending" &&
      form.status !== "pending" &&
      !form.tanggapan.trim()
    ) {
      Alert.alert(
        "Error",
        "Harap berikan tanggapan untuk perubahan status ini"
      );
      return false;
    }

    // Jika status diubah ke disetujui atau ditolak, wajib ada tanggapan
    if (
      (form.status === "disetujui" || form.status === "ditolak") &&
      !form.tanggapan.trim()
    ) {
      Alert.alert(
        "Error",
        `Harap berikan tanggapan untuk status "${getStatusText(form.status)}"`
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!aspirasi) return;

    if (!validateForm()) {
      return;
    }

    setUpdating(true);
    try {
      const updateData: any = {
        status: form.status,
      };

      // Tambahkan tanggapan jika ada
      if (form.tanggapan.trim()) {
        updateData.tanggapan = form.tanggapan.trim();
      }

      // Jika status dikembalikan ke pending, hapus tanggapan
      if (form.status === "pending") {
        updateData.tanggapan = null;
      }

      const { error } = await supabase
        .from("aspirasi")
        .update(updateData)
        .eq("id", aspirasi.id);

      if (error) {
        throw error;
      }

      Alert.alert(
        "Sukses",
        `Status aspirasi berhasil diubah menjadi "${getStatusText(
          form.status
        )}"`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error("Error updating aspirasi:", error);
      Alert.alert("Error", "Gagal memperbarui status aspirasi");
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = (newStatus: AspirasiStatus) => {
    // Jika status saat ini sudah final, jangan izinkan perubahan
    if (isFinalStatus(originalData.status)) {
      Alert.alert(
        "Info",
        `Status "${getStatusText(originalData.status)}" tidak dapat diubah lagi`
      );
      return;
    }

    // Validasi transisi status
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

    // Reset tanggapan jika status dikembalikan ke pending
    if (newStatus === "pending") {
      setForm((prev) => ({ ...prev, tanggapan: "" }));
    }
  };

  const getStatusDescription = (status: AspirasiStatus): string => {
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

  if (!aspirasi) {
    return (
      <SafeAreaWrapper>
        <View style={styles.centerContainer}>
          <Text>Aspirasi tidak ditemukan</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  const allowedStatusOptions = getAllowedStatusOptions(aspirasi.status);
  const statusWarning = getStatusWarning();

  return (
    <SafeAreaWrapper>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Update Status Aspirasi</Text>
          <Text style={styles.subtitle}>
            Berikan tanggapan dan ubah status aspirasi
          </Text>
        </View>

        {/* Info Aspirasi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Aspirasi</Text>
          <Text style={styles.aspirasiTitle}>{aspirasi.judul}</Text>
          <Text style={styles.aspirasiCategory}>{aspirasi.kategori}</Text>
          <Text style={styles.aspirasiDescription}>{aspirasi.deskripsi}</Text>

          <View style={styles.pengajuInfo}>
            <Text style={styles.pengajuLabel}>Diajukan oleh:</Text>
            <Text style={styles.pengajuName}>
              {aspirasi.profiles?.full_name || aspirasi.profiles?.email}
            </Text>
          </View>

          <View style={styles.currentStatus}>
            <Text style={styles.currentStatusLabel}>Status Saat Ini:</Text>
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

          {/* Status Description */}
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
                  // Non-aktifkan status yang sama dengan current dan yang sudah final
                  aspirasi.status === option.value &&
                    styles.statusOptionCurrent,
                  isFinalStatus(aspirasi.status) && styles.statusOptionDisabled,
                ]}
                onPress={() => handleStatusChange(option.value)}
                disabled={
                  isFinalStatus(aspirasi.status) ||
                  aspirasi.status === option.value
                }
              >
                <View
                  style={[
                    styles.statusOptionDot,
                    { backgroundColor: getStatusColor(option.value) },
                    isFinalStatus(aspirasi.status) &&
                      styles.statusOptionDotDisabled,
                  ]}
                />
                <View style={styles.statusOptionContent}>
                  <Text
                    style={[
                      styles.statusOptionText,
                      form.status === option.value &&
                        styles.statusOptionTextActive,
                      aspirasi.status === option.value &&
                        styles.statusOptionTextCurrent,
                      isFinalStatus(aspirasi.status) &&
                        styles.statusOptionTextDisabled,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {aspirasi.status === option.value && (
                    <Text style={styles.currentIndicator}>(Saat Ini)</Text>
                  )}
                  {isFinalStatus(aspirasi.status) &&
                    option.value !== aspirasi.status && (
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
                    aspirasi.status === "pending" && styles.flowDotActive,
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
                    aspirasi.status === "disetujui" && styles.flowDotActive,
                  ]}
                />
                <Text style={styles.flowText}>Disetujui</Text>
              </View>
              <View style={styles.flowSeparator}>
                <Text style={styles.flowOr}>atau</Text>
              </View>
              <View style={styles.flowStep}>
                <View
                  style={[
                    styles.flowDot,
                    aspirasi.status === "ditolak" && styles.flowDotActive,
                  ]}
                />
                <Text style={styles.flowText}>Ditolak</Text>
              </View>
            </View>
            <Text style={styles.flowNote}>
              * Status "Disetujui" dan "Ditolak" tidak dapat diubah kembali
            </Text>
          </View>

          {/* Tanggapan */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Tanggapan {form.status !== "pending" && "*"}
            </Text>
            <Text style={styles.helperText}>
              {form.status === "disetujui" &&
                "Berikan apresiasi dan penjelasan tentang aspirasi yang disetujui"}
              {form.status === "ditolak" &&
                "Berikan alasan penolakan aspirasi dengan sopan dan jelas"}
              {form.status === "pending" &&
                "Tanggapan akan dihapus jika status dikembalikan ke pending"}
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                isFinalStatus(aspirasi.status) && styles.inputDisabled,
              ]}
              placeholder={
                isFinalStatus(aspirasi.status)
                  ? "Status sudah final, tidak dapat memberikan tanggapan..."
                  : form.status === "pending"
                  ? "Tanggapan tidak diperlukan untuk status pending..."
                  : "Tulis tanggapan Anda..."
              }
              value={form.tanggapan}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, tanggapan: value }))
              }
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={
                !isFinalStatus(aspirasi.status) && form.status !== "pending"
              }
            />
            {form.status === "pending" && !isFinalStatus(aspirasi.status) && (
              <Text style={styles.disabledNote}>
                Tanggapan tidak dapat ditambahkan untuk status pending
              </Text>
            )}
            {isFinalStatus(aspirasi.status) && (
              <Text style={styles.disabledNote}>
                Status sudah final, tidak dapat mengubah tanggapan
              </Text>
            )}
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
              (!hasChanges || updating || isFinalStatus(aspirasi.status)) &&
                styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!hasChanges || updating || isFinalStatus(aspirasi.status)}
          >
            {updating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : isFinalStatus(aspirasi.status) ? (
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

// Styles untuk aspirasi (sama dengan pengaduan dengan penyesuaian minor)
const styles = StyleSheet.create({
  // ... (sama dengan styles di UpdatePengaduanScreen)
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
  aspirasiTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  aspirasiCategory: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "500",
    marginBottom: 8,
  },
  aspirasiDescription: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  pengajuInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    padding: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 6,
  },
  pengajuLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  pengajuName: {
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
  disabledNote: {
    fontSize: 12,
    color: Colors.textLight,
    fontStyle: "italic",
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
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
