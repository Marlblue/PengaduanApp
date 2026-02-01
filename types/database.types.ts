export type UserRole = "masyarakat" | "petugas" | "admin";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
}

export type PengaduanStatus = "pending" | "diproses" | "selesai" | "ditolak";
export type AspirasiStatus = "pending" | "disetujui" | "ditolak";
export type PengaduanKategori =
  | "Infrastruktur"
  | "Kebersihan"
  | "Keamanan"
  | "Kesehatan"
  | "Pendidikan"
  | "Lainnya";
export type AspirasiKategori =
  | "Pembangunan"
  | "Layanan Publik"
  | "Kebijakan"
  | "Ekonomi"
  | "Sosial"
  | "Lainnya";

export interface Pengaduan {
  id: string;
  user_id: string;
  judul: string;
  deskripsi: string;
  kategori: PengaduanKategori;
  foto_url: string | null;
  latitude: number | null;
  longitude: number | null;
  alamat: string | null;
  status: PengaduanStatus;
  tanggapan: string | null;
  petugas_id: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface Aspirasi {
  id: string;
  user_id: string;
  judul: string;
  deskripsi: string;
  kategori: AspirasiKategori;
  status: AspirasiStatus;
  tanggapan: string | null;
  created_at: string;
  profiles?: Profile;
}

export interface AuthState {
  user: Profile | null;
  session: any | null;
  loading: boolean;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}
