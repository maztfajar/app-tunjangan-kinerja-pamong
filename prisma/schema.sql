-- ==============================================================================
-- SCHEMA.SQL - Skrip Pembuatan Tabel Database PostgreSQL untuk Web Hosting
-- Kompatibel dengan: PostgreSQL cPanel, Supabase, Neon.tech, RDS, VPS Ubuntu, dll.
-- Aman dijalankan berulang kali (Idempotent: IF NOT EXISTS)
-- ==============================================================================

-- 1. Create Schema
CREATE SCHEMA IF NOT EXISTS "public";

-- 2. Create Enum Role
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'ADMIN', 'PEGAWAI');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. CreateTable User
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "nip" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "jabatan" TEXT,
    "unitKerja" TEXT,
    "role" "Role" NOT NULL DEFAULT 'PEGAWAI',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- 4. CreateTable LokasiKantor
CREATE TABLE IF NOT EXISTS "LokasiKantor" (
    "id" TEXT NOT NULL,
    "namaLokasi" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radius" INTEGER NOT NULL DEFAULT 100,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LokasiKantor_pkey" PRIMARY KEY ("id")
);

-- 5. CreateTable JamKerja
CREATE TABLE IF NOT EXISTS "JamKerja" (
    "id" TEXT NOT NULL,
    "jamMasuk" TEXT NOT NULL DEFAULT '07:30',
    "jamPulang" TEXT NOT NULL DEFAULT '15:45',
    "toleransiSebelumMasuk" INTEGER NOT NULL DEFAULT 30,
    "toleransiKeterlambatan" INTEGER NOT NULL DEFAULT 15,
    "toleransiPulang" INTEGER NOT NULL DEFAULT 120,
    "durasiKerjaMenit" INTEGER NOT NULL DEFAULT 495,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JamKerja_pkey" PRIMARY KEY ("id")
);

-- 6. CreateTable Presensi
CREATE TABLE IF NOT EXISTS "Presensi" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jamMasuk" TIMESTAMP(3),
    "jamPulang" TIMESTAMP(3),
    "latMasuk" DOUBLE PRECISION,
    "lngMasuk" DOUBLE PRECISION,
    "latPulang" DOUBLE PRECISION,
    "lngPulang" DOUBLE PRECISION,
    "statusMasuk" TEXT,
    "keterlambatan" INTEGER,
    "mendahului" INTEGER,
    "persenTerlambat" DOUBLE PRECISION,
    "persenMendahului" DOUBLE PRECISION,
    "targetJamPulang" TIMESTAMP(3),
    "durasiKerjaMenit" INTEGER,
    "persentaseHarian" DOUBLE PRECISION,
    "keterangan" TEXT,
    "lokasiTugas" TEXT,
    "suket" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Presensi_pkey" PRIMARY KEY ("id")
);

-- 7. CreateTable Aktifitas
CREATE TABLE IF NOT EXISTS "Aktifitas" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "foto" TEXT,
    "lokasi" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aktifitas_pkey" PRIMARY KEY ("id")
);

-- 8. CreateTable Task
CREATE TABLE IF NOT EXISTS "Task" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pemberiTugas" TEXT NOT NULL,
    "hal" TEXT NOT NULL,
    "keterangan" TEXT,
    "lokasi" TEXT,
    "waktu" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Belum Dikerjakan',
    "aktifitasId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- 9. CreateTable Laporan
CREATE TABLE IF NOT EXISTS "Laporan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bulan" TEXT NOT NULL,
    "rencana" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "capaian" INTEGER NOT NULL,
    "satuan" TEXT NOT NULL,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Laporan_pkey" PRIMARY KEY ("id")
);

-- 10. CreateTable Agenda
CREATE TABLE IF NOT EXISTS "Agenda" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "lokasi" TEXT,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agenda_pkey" PRIMARY KEY ("id")
);

-- 11. CreateTable HariLibur
CREATE TABLE IF NOT EXISTS "HariLibur" (
    "id" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "keterangan" TEXT NOT NULL,
    "sumber" TEXT NOT NULL DEFAULT 'manual',
    "isLibur" BOOLEAN NOT NULL DEFAULT true,
    "dibuatOleh" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HariLibur_pkey" PRIMARY KEY ("id")
);

-- 12. CreateTable AppSettings
CREATE TABLE IF NOT EXISTS "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "namaApp" TEXT NOT NULL DEFAULT 'E-KINERJA',
    "namaKantor" TEXT NOT NULL DEFAULT 'Kalurahan',
    "subJudul" TEXT NOT NULL DEFAULT 'Sistem Informasi Pamong',
    "logoUrl" TEXT,
    "kopLogoUrl" TEXT,
    "kopAksaraUrl" TEXT,
    "kopNamaPemda" TEXT DEFAULT 'Pemerintah Kabupaten Kulon Progo',
    "kopNamaInstansi" TEXT DEFAULT 'Kapanewon Pengasih',
    "kopAlamat" TEXT DEFAULT 'Jl. Pengasih No. 2, Pengasih, Kulon Progo, DIY 55652',
    "kopKontak" TEXT DEFAULT 'Telp. (0274) 773422',
    "ukuranKertas" TEXT DEFAULT 'A4',
    "posisiDokumen" TEXT DEFAULT 'portrait',
    "sembunyikanNip" BOOLEAN DEFAULT false,
    "ttdTempat" TEXT DEFAULT 'Pengasih',
    "ttdJudulKiri" TEXT DEFAULT 'Yang Membuat Laporan',
    "ttdAtasanUserId" TEXT,
    "ttdAtasanStatus" TEXT DEFAULT 'Mengetahui,',
    "ttdAtasanJabatan" TEXT DEFAULT 'Panewu Pengasih',
    "ttdAtasanNama" TEXT DEFAULT '.................................',
    "ttdAtasanNip" TEXT DEFAULT '.................................',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- 13. CreateTable MasterJabatan
CREATE TABLE IF NOT EXISTS "MasterJabatan" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kategori" TEXT DEFAULT 'Pamong',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterJabatan_pkey" PRIMARY KEY ("id")
);

-- 14. CreateTable MasterUnitKerja
CREATE TABLE IF NOT EXISTS "MasterUnitKerja" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kategori" TEXT DEFAULT 'Kalurahan',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterUnitKerja_pkey" PRIMARY KEY ("id")
);

-- 15. CreateTable KegiatanJabatan (legacy)
CREATE TABLE IF NOT EXISTS "KegiatanJabatan" (
    "id" TEXT NOT NULL,
    "jabatanId" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "rencanaKegiatan" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "pedomanPengisian" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KegiatanJabatan_pkey" PRIMARY KEY ("id")
);

-- 16. CreateTable m_rencana_kegiatan
CREATE TABLE IF NOT EXISTS "m_rencana_kegiatan" (
    "id" SERIAL NOT NULL,
    "jabatan_id" TEXT NOT NULL,
    "no_urut" INTEGER NOT NULL,
    "rencana_kegiatan" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "m_rencana_kegiatan_pkey" PRIMARY KEY ("id")
);

-- 17. CreateTable m_output_kegiatan
CREATE TABLE IF NOT EXISTS "m_output_kegiatan" (
    "id" SERIAL NOT NULL,
    "rencana_kegiatan_id" INTEGER NOT NULL,
    "kode_huruf" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "pedoman_pengisian" TEXT,
    "no_urut" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "m_output_kegiatan_pkey" PRIMARY KEY ("id")
);

-- 18. CreateTable t_laporan_kinerja
CREATE TABLE IF NOT EXISTS "t_laporan_kinerja" (
    "id" SERIAL NOT NULL,
    "output_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "periode" TIMESTAMP(3) NOT NULL,
    "target" TEXT,
    "capaian" TEXT,
    "keterangan" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t_laporan_kinerja_pkey" PRIMARY KEY ("id")
);

-- 19. CreateTable BiometricCredential
CREATE TABLE IF NOT EXISTS "BiometricCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "deviceLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiometricCredential_pkey" PRIMARY KEY ("id")
);

-- ==============================================================================
-- MIGRATION UPGRADE: Menambahkan kolom baru jika tabel lama sudah ada
-- ==============================================================================
ALTER TABLE "Aktifitas" ADD COLUMN IF NOT EXISTS "lokasi" TEXT;
ALTER TABLE "Aktifitas" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Aktifitas" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "aktifitasId" TEXT;

ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "posisiDokumen" TEXT DEFAULT 'portrait';
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "sembunyikanNip" BOOLEAN DEFAULT false;
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "sembunyikanNipAtasan" BOOLEAN DEFAULT false;
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "kopAksaraUrl" TEXT;

-- ==============================================================================
-- INDEX & UNIQUE CONSTRAINTS
-- ==============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS "User_nip_key" ON "User"("nip");
CREATE UNIQUE INDEX IF NOT EXISTS "MasterJabatan_nama_key" ON "MasterJabatan"("nama");
CREATE UNIQUE INDEX IF NOT EXISTS "MasterUnitKerja_nama_key" ON "MasterUnitKerja"("nama");
CREATE UNIQUE INDEX IF NOT EXISTS "Task_aktifitasId_key" ON "Task"("aktifitasId");
CREATE UNIQUE INDEX IF NOT EXISTS "BiometricCredential_credentialId_key" ON "BiometricCredential"("credentialId");
CREATE UNIQUE INDEX IF NOT EXISTS "t_laporan_kinerja_output_id_user_id_periode_key" ON "t_laporan_kinerja"("output_id", "user_id", "periode");

CREATE INDEX IF NOT EXISTS "KegiatanJabatan_jabatanId_idx" ON "KegiatanJabatan"("jabatanId");
CREATE INDEX IF NOT EXISTS "BiometricCredential_userId_idx" ON "BiometricCredential"("userId");
CREATE INDEX IF NOT EXISTS "m_rencana_kegiatan_jabatan_id_idx" ON "m_rencana_kegiatan"("jabatan_id");
CREATE INDEX IF NOT EXISTS "m_output_kegiatan_rencana_kegiatan_id_idx" ON "m_output_kegiatan"("rencana_kegiatan_id");
CREATE INDEX IF NOT EXISTS "t_laporan_kinerja_user_id_periode_idx" ON "t_laporan_kinerja"("user_id", "periode");

-- ==============================================================================
-- FOREIGN KEYS (Aman jika sudah ada)
-- ==============================================================================
DO $$ BEGIN
    ALTER TABLE "Presensi" ADD CONSTRAINT "Presensi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_aktifitasId_fkey" FOREIGN KEY ("aktifitasId") REFERENCES "Aktifitas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Aktifitas" ADD CONSTRAINT "Aktifitas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Laporan" ADD CONSTRAINT "Laporan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "KegiatanJabatan" ADD CONSTRAINT "KegiatanJabatan_jabatanId_fkey" FOREIGN KEY ("jabatanId") REFERENCES "MasterJabatan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "m_rencana_kegiatan" ADD CONSTRAINT "m_rencana_kegiatan_jabatan_id_fkey" FOREIGN KEY ("jabatan_id") REFERENCES "MasterJabatan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "m_output_kegiatan" ADD CONSTRAINT "m_output_kegiatan_rencana_kegiatan_id_fkey" FOREIGN KEY ("rencana_kegiatan_id") REFERENCES "m_rencana_kegiatan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "t_laporan_kinerja" ADD CONSTRAINT "t_laporan_kinerja_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "t_laporan_kinerja" ADD CONSTRAINT "t_laporan_kinerja_output_id_fkey" FOREIGN KEY ("output_id") REFERENCES "m_output_kegiatan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "BiometricCredential" ADD CONSTRAINT "BiometricCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
