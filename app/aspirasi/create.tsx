import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { supabase } from "../../lib/supabase";
import { AspirasiKategori } from "../../types/database.types";

const KATEGORI_ASPIRASI: { value: AspirasiKategori; label: string }[] = [
  { value: "Pembangunan", label: "Pembangunan" },
  { value: "Layanan Publik", label: "Layanan Publik" },
  { value: "Kebijakan", label: "Kebijakan" },
  { value: "Ekonomi", label: "Ekonomi" },
  { value: "Sosial", label: "Sosial" },
  { value: "Lainnya", label: "Lainnya" },
];

export default function CreateAspirasiScreen() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    judul: "",
    kategori: "" as AspirasiKategori,
    deskripsi: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.judul || !form.kategori || !form.deskripsi) {
      Alert.alert("Error", "Harap isi semua field yang wajib");
      return;
    }

    if (form.deskripsi.length < 10) {
      Alert.alert("Error", "Deskripsi aspirasi minimal 10 karakter");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("aspirasi").insert({
        user_id: user?.id,
        judul: form.judul,
        kategori: form.kategori,
        deskripsi: form.deskripsi,
        status: "pending",
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        "Sukses",
        "Aspirasi berhasil disampaikan dan sedang menunggu review",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error("Error creating aspirasi:", error);
      Alert.alert("Error", "Gagal menyampaikan aspirasi. Silakan coba lagi.");
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
            <Text style={styles.title}>Sampaikan Aspirasi</Text>
            <Text style={styles.subtitle}>
              Berikan saran dan masukan untuk kemajuan bersama
            </Text>
          </View>

          <View style={styles.form}>
            {/* Judul */}
            <View style={styles.field}>
              <Text style={styles.label}>Judul Aspirasi *</Text>
              <TextInput
                style={styles.input}
                placeholder="Masukkan judul aspirasi"
                value={form.judul}
                onChangeText={(value) => handleChange("judul", value)}
              />
            </View>

            {/* Kategori */}
            <View style={styles.field}>
              <Text style={styles.label}>Kategori *</Text>
              <View style={styles.kategoriContainer}>
                {KATEGORI_ASPIRASI.map((kategori) => (
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
              <Text style={styles.label}>Deskripsi Aspirasi *</Text>
              <Text style={styles.helperText}>
                Jelaskan secara detail aspirasi Anda minimal 10 karakter
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Jelaskan detail aspirasi Anda... (minimal 10 karakter)"
                value={form.deskripsi}
                onChangeText={(value) => handleChange("deskripsi", value)}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>
                {form.deskripsi.length} karakter
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (loading ||
                  !form.judul ||
                  !form.kategori ||
                  form.deskripsi.length < 10) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={
                loading ||
                !form.judul ||
                !form.kategori ||
                form.deskripsi.length < 10
              }
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Sampaikan Aspirasi</Text>
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
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: "right",
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
