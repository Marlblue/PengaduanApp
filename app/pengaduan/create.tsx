import { Ionicons } from "@expo/vector-icons";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
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
import { useImagePicker } from "../../hooks/useImagePicker";
import { useLocation } from "../../hooks/useLocation";
import { STORAGE_BUCKETS, supabase } from "../../lib/supabase";
import { PengaduanKategori } from "../../types/database.types";

const KATEGORI_PENGADUAN: { value: PengaduanKategori; label: string }[] = [
  { value: "Infrastruktur", label: "Infrastruktur" },
  { value: "Kebersihan", label: "Kebersihan" },
  { value: "Keamanan", label: "Keamanan" },
  { value: "Kesehatan", label: "Kesehatan" },
  { value: "Pendidikan", label: "Pendidikan" },
  { value: "Lainnya", label: "Lainnya" },
];

export default function CreatePengaduanScreen() {
  const { user } = useAuth();
  const { selectedImage, pickImage, clearImage } = useImagePicker();
  const {
    currentLocation,
    loadingLocation,
    getCurrentLocation,
    clearLocation,
  } = useLocation();

  const [form, setForm] = useState({
    judul: "",
    kategori: "" as PengaduanKategori,
    deskripsi: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage) return null;

    try {
      const fileName = `${user?.id}_${Date.now()}.jpg`;
      const filePath = `${user?.id}/${fileName}`;

      // Baca file sebagai base64
      const base64 = await FileSystem.readAsStringAsync(selectedImage.uri, {
        encoding: "base64", // ← cukup string
      });

      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.PENGADUAN_PHOTOS)
        .upload(filePath, decode(base64), {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKETS.PENGADUAN_PHOTOS)
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw new Error("Gagal mengupload foto");
    }
  };

  const handleSubmit = async () => {
    if (!form.judul || !form.kategori || !form.deskripsi) {
      Alert.alert("Error", "Harap isi semua field yang wajib");
      return;
    }

    if (!selectedImage) {
      Alert.alert("Error", "Foto pengaduan wajib diambil");
      return;
    }

    if (!currentLocation) {
      Alert.alert("Error", "Lokasi wajib diambil");
      return;
    }

    setLoading(true);
    try {
      // Upload image
      const fotoUrl = await uploadImage();
      if (!fotoUrl) {
        throw new Error("Gagal mengupload foto");
      }

      // Create pengaduan
      const { error } = await supabase.from("pengaduan").insert({
        user_id: user?.id,
        judul: form.judul,
        kategori: form.kategori,
        deskripsi: form.deskripsi,
        foto_url: fotoUrl,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        alamat: currentLocation.address,
        status: "pending",
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        "Sukses",
        "Pengaduan berhasil dibuat dan sedang menunggu verifikasi",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      console.error("Error creating pengaduan:", error);
      Alert.alert("Error", "Gagal membuat pengaduan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaWrapper>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          style={styles.container}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 60 }}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Buat Pengaduan Baru</Text>
            <Text style={styles.subtitle}>
              Laporkan masalah dengan melampirkan foto dan lokasi
            </Text>
          </View>

          <View style={styles.form}>
            {/* Judul */}
            <View style={styles.field}>
              <Text style={styles.label}>Judul Pengaduan *</Text>
              <TextInput
                style={styles.input}
                placeholder="Masukkan judul pengaduan"
                value={form.judul}
                onChangeText={(value) => handleChange("judul", value)}
              />
            </View>

            {/* Kategori */}
            <View style={styles.field}>
              <Text style={styles.label}>Kategori *</Text>
              <View style={styles.kategoriContainer}>
                {KATEGORI_PENGADUAN.map((kategori) => (
                  <TouchableOpacity
                    key={kategori.value}
                    style={[
                      styles.kategoriButton,
                      form.kategori === kategori.value &&
                        styles.kategoriButtonActive,
                    ]}
                    onPress={() => handleChange("kategori", kategori.value)}
                  >
                    <Text
                      style={[
                        styles.kategoriText,
                        form.kategori === kategori.value &&
                          styles.kategoriTextActive,
                      ]}
                    >
                      {kategori.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Deskripsi */}
            <View style={styles.field}>
              <Text style={styles.label}>Deskripsi *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Jelaskan detail pengaduan Anda..."
                value={form.deskripsi}
                onChangeText={(value) => handleChange("deskripsi", value)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Foto */}
            <View style={styles.field}>
              <Text style={styles.label}>Foto Pengaduan *</Text>
              <Text style={styles.helperText}>
                Foto wajib diambil untuk bukti pengaduan
              </Text>

              {selectedImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: selectedImage.uri }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={clearImage}
                  >
                    <Ionicons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imageButtons}>
                  <TouchableOpacity
                    style={styles.imageButton}
                    onPress={() => pickImage(true)}
                  >
                    <Ionicons name="camera" size={24} color={Colors.primary} />
                    <Text style={styles.imageButtonText}>Ambil Foto</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.imageButton}
                    onPress={() => pickImage(false)}
                  >
                    <Ionicons name="images" size={24} color={Colors.primary} />
                    <Text style={styles.imageButtonText}>
                      Pilih dari Galeri
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Lokasi */}
            <View style={styles.field}>
              <Text style={styles.label}>Lokasi *</Text>
              <Text style={styles.helperText}>
                Lokasi wajib diambil untuk mengetahui titik kejadian
              </Text>

              {currentLocation ? (
                <View style={styles.locationContainer}>
                  <View style={styles.locationInfo}>
                    <Ionicons
                      name="location"
                      size={20}
                      color={Colors.primary}
                    />
                    <View style={styles.locationText}>
                      <Text style={styles.locationAddress}>
                        {currentLocation.address}
                      </Text>
                      <Text style={styles.locationCoordinates}>
                        {currentLocation.latitude.toFixed(6)},{" "}
                        {currentLocation.longitude.toFixed(6)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.removeLocationButton}
                    onPress={clearLocation}
                  >
                    <Text style={styles.removeLocationText}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.locationButton,
                    loadingLocation && styles.locationButtonDisabled,
                  ]}
                  onPress={getCurrentLocation}
                  disabled={loadingLocation}
                >
                  {loadingLocation ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="locate" size={20} color="#fff" />
                      <Text style={styles.locationButtonText}>
                        Ambil Lokasi Saat Ini
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (loading || !selectedImage || !currentLocation) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading || !selectedImage || !currentLocation}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Kirim Pengaduan</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  form: {
    gap: 20,
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
  textArea: {
    minHeight: 100,
  },
  kategoriContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  kategoriButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.border,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kategoriButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  kategoriText: {
    color: Colors.textLight,
    fontWeight: "500",
  },
  kategoriTextActive: {
    color: "#fff",
  },
  imageButtons: {
    flexDirection: "row",
    gap: 12,
  },
  imageButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: "dashed",
    borderRadius: 8,
    backgroundColor: "#f0f9ff",
  },
  imageButtonText: {
    color: Colors.primary,
    fontWeight: "600",
  },
  imagePreviewContainer: {
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  locationButtonDisabled: {
    opacity: 0.6,
  },
  locationButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  locationInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
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
  removeLocationButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  removeLocationText: {
    color: Colors.error,
    fontWeight: "500",
  },
  submitButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
