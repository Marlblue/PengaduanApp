-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Enum Types
CREATE TYPE user_role AS ENUM ('masyarakat', 'petugas', 'admin');
CREATE TYPE pengaduan_status AS ENUM ('pending', 'diproses', 'selesai', 'ditolak');
CREATE TYPE aspirasi_status AS ENUM ('pending', 'disetujui', 'ditolak');
CREATE TYPE pengaduan_kategori AS ENUM (
  'Infrastruktur', 
  'Kebersihan', 
  'Keamanan', 
  'Kesehatan', 
  'Pendidikan', 
  'Lainnya'
);
CREATE TYPE aspirasi_kategori AS ENUM (
  'Pembangunan', 
  'Layanan Publik', 
  'Kebijakan', 
  'Ekonomi', 
  'Sosial', 
  'Lainnya'
);

-- 2. Create Profiles Table (extends auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    role user_role DEFAULT 'masyarakat'::user_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 3. Create Pengaduan Table
CREATE TABLE public.pengaduan (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    judul TEXT NOT NULL,
    deskripsi TEXT NOT NULL,
    kategori pengaduan_kategori NOT NULL,
    foto_url TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    alamat TEXT,
    status pengaduan_status DEFAULT 'pending'::pengaduan_status NOT NULL,
    tanggapan TEXT,
    petugas_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Pengaduan
ALTER TABLE public.pengaduan ENABLE ROW LEVEL SECURITY;

-- Policies for Pengaduan
CREATE POLICY "Pengaduan viewable by owner and officers/admins" 
ON public.pengaduan FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('petugas', 'admin'))
);

CREATE POLICY "Users can create pengaduan" 
ON public.pengaduan FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending pengaduan" 
ON public.pengaduan FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Officers/Admins can update pengaduan" 
ON public.pengaduan FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('petugas', 'admin'))
);

-- 4. Create Aspirasi Table
CREATE TABLE public.aspirasi (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    judul TEXT NOT NULL,
    deskripsi TEXT NOT NULL,
    kategori aspirasi_kategori NOT NULL,
    status aspirasi_status DEFAULT 'pending'::aspirasi_status NOT NULL,
    tanggapan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Aspirasi
ALTER TABLE public.aspirasi ENABLE ROW LEVEL SECURITY;

-- Policies for Aspirasi
CREATE POLICY "Aspirasi viewable by everyone" 
ON public.aspirasi FOR SELECT USING (true);

CREATE POLICY "Users can create aspirasi" 
ON public.aspirasi FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending aspirasi" 
ON public.aspirasi FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Officers/Admins can update aspirasi" 
ON public.aspirasi FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('petugas', 'admin'))
);

-- 5. Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pengaduan-photos', 'pengaduan-photos', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public Access to Photos" 
ON storage.objects FOR SELECT USING ( bucket_id = 'pengaduan-photos' );

CREATE POLICY "Authenticated users can upload photos" 
ON storage.objects FOR INSERT WITH CHECK ( 
    bucket_id = 'pengaduan-photos' AND auth.role() = 'authenticated' 
);

-- 6. Trigger to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'masyarakat'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();