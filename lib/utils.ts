import { Colors } from "@/constants/Colors";
import { Alert } from "react-native";

export const showAlert = (title: string, message: string) => {
  Alert.alert(title, message);
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "#eab308"; // warning yellow
    case "diproses":
      return "#3b82f6"; // primary blue
    case "selesai":
      return "#22c55e"; // success green
    case "ditolak":
      return "#ef4444"; // error red
    case "disetujui":
      return "#22c55e"; // success green
    default:
      return "#64748b"; // secondary
  }
};

export const getStatusText = (status: string) => {
  switch (status) {
    case "pending":
      return "Menunggu";
    case "diproses":
      return "Diproses";
    case "selesai":
      return "Selesai";
    case "ditolak":
      return "Ditolak";
    case "disetujui":
      return "Disetujui";
    default:
      return status;
  }
};

//  🔹 TAMBAHKAN BAGIAN INI UNTUK ROLE 🔹
export const getRoleColor = (role: string) => {
  switch (role) {
    case "masyarakat":
      return Colors.primary; // atau "#3b82f6"
    case "petugas":
      return Colors.warning; // atau "#eab308"
    case "admin":
      return Colors.success; // atau "#22c55e"
    default:
      return Colors.textLight; // fallback
  }
};

export const getRoleText = (role: string) => {
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
