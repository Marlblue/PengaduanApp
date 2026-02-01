import { Link, router } from "expo-router";
import React, { useState } from "react";
import {
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
import { supabase } from "../../lib/supabase";

export default function RegisterScreen() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const phoneRegex = /^[0-9]{10,14}$/;

  const validatePhone = (phone: string): boolean => {
    return phoneRegex.test(phone);
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    if (!form.fullName || !form.email || !form.phone || !form.password) {
      Alert.alert("Error", "Harap isi semua field");
      return;
    }

    if (!validatePhone(form.phone)) {
      Alert.alert(
        "Error",
        "Format nomor telepon tidak valid. Contoh: 081234567890"
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      Alert.alert("Error", "Password dan konfirmasi password tidak cocok");
      return;
    }

    if (form.password.length < 6) {
      Alert.alert("Error", "Password minimal 6 karakter");
      return;
    }

    setLoading(true);
    try {
      // Register user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (authError) {
        Alert.alert("Error", authError.message);
        return;
      }

      if (authData.user) {
        // Update profile dengan data tambahan
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: form.fullName,
            phone: form.phone,
          })
          .eq("id", authData.user.id);

        if (profileError) {
          console.error("Error updating profile:", profileError);
        }

        Alert.alert(
          "Sukses",
          "Registrasi berhasil! Silakan login dengan akun Anda.",
          [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
        );
      }
    } catch (error) {
      Alert.alert("Error", "Terjadi kesalahan saat registrasi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaWrapper>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Daftar Akun</Text>
            <Text style={styles.subtitle}>Buat akun baru</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Nama Lengkap</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan nama lengkap"
              value={form.fullName}
              onChangeText={(value) => handleChange("fullName", value)}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan email"
              value={form.email}
              onChangeText={(value) => handleChange("email", value)}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Nomor Telepon</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan nomor telepon"
              value={form.phone}
              onChangeText={(value) => handleChange("phone", value)}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan password"
              value={form.password}
              onChangeText={(value) => handleChange("password", value)}
              secureTextEntry
            />

            <Text style={styles.label}>Konfirmasi Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Konfirmasi password"
              value={form.confirmPassword}
              onChangeText={(value) => handleChange("confirmPassword", value)}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Memproses..." : "Daftar"}
              </Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Sudah punya akun? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.linkText}>Masuk di sini</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textLight,
  },
  form: {
    backgroundColor: Colors.card,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: {
    color: Colors.textLight,
  },
  linkText: {
    color: Colors.primary,
    fontWeight: "600",
  },
});
