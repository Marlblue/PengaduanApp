// Mock data untuk testing
export const mockPengaduan = {
  id: "1",
  user_id: "user1",
  judul: "Jalan Rusak di Perumahan Sentosa",
  deskripsi: "Jalan di perumahan Sentosa berlubang dan membahayakan pengendara",
  kategori: "Infrastruktur" as const,
  foto_url: "https://example.com/photo.jpg",
  latitude: -6.2088,
  longitude: 106.8456,
  alamat: "Jl. Sentosa No. 123, Jakarta",
  status: "pending" as const,
  tanggapan: null,
  petugas_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockAspirasi = {
  id: "1",
  user_id: "user1",
  judul: "Perbaikan Fasilitum Umum",
  deskripsi: "Mohon perbaikan fasilitas umum yang sudah rusak",
  kategori: "Pembangunan" as const,
  status: "pending" as const,
  tanggapan: null,
  created_at: new Date().toISOString(),
};

// Test helper functions
export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const simulateNetworkDelay = async (
  min: number = 500,
  max: number = 2000
) => {
  const delay = Math.random() * (max - min) + min;
  await wait(delay);
};
