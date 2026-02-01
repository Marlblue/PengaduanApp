import { Alert } from "react-native";

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public userMessage?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const handleError = (error: any, customMessage?: string) => {
  console.error("Application Error:", error);

  let message = customMessage || "Terjadi kesalahan. Silakan coba lagi.";

  if (error instanceof AppError) {
    message = error.userMessage || error.message;
  } else if (error.message) {
    // Supabase errors
    if (error.message.includes("Network request failed")) {
      message = "Koneksi internet terputus. Periksa koneksi Anda.";
    } else if (error.message.includes("JWT")) {
      message = "Sesi telah berakhir. Silakan login kembali.";
    } else if (error.message.includes("storage")) {
      message = "Gagal mengupload file. Silakan coba lagi.";
    }
  }

  Alert.alert("Error", message);
};

export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  customMessage?: string
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    handleError(error, customMessage);
    return null;
  }
};
