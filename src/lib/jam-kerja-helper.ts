// ==============================================================================
// Helper Jadwal Kerja Efektif (Senin - Kamis vs Jumat Khusus)
// ==============================================================================

export interface JamKerjaLike {
  jamMasuk?: string | null;
  jamPulang?: string | null;
  toleransiSebelumMasuk?: number | null;
  toleransiKeterlambatan?: number | null;
  toleransiPulang?: number | null;
  durasiKerjaMenit?: number | null;
  isJumatKhusus?: boolean | null;
  jamMasukJumat?: string | null;
  jamPulangJumat?: string | null;
  durasiKerjaJumatMenit?: number | null;
}

export interface EffectiveJamKerja {
  isFriday: boolean;
  useFriday: boolean;
  dayLabel: string;
  jamMasuk: string;
  jamPulang: string;
  durasiKerjaMenit: number;
  toleransiSebelumMasuk: number;
  toleransiKeterlambatan: number;
  toleransiPulang: number;
}

/**
 * Mendapatkan jadwal jam kerja efektif untuk tanggal tertentu.
 * Jika hari Jumat dan isJumatKhusus aktif, otomatis memakai jadwal khusus hari Jumat.
 */
export function getEffectiveJamKerja(
  jamKerja?: JamKerjaLike | null,
  date: Date = new Date()
): EffectiveJamKerja {
  const isFriday = date.getDay() === 5;
  const isJumatKhusus = jamKerja?.isJumatKhusus ?? true;
  const useFriday = isFriday && isJumatKhusus;

  const jamMasuk = useFriday && jamKerja?.jamMasukJumat
    ? jamKerja.jamMasukJumat
    : (jamKerja?.jamMasuk || '07:30');

  const jamPulang = useFriday && jamKerja?.jamPulangJumat
    ? jamPulangJumatValid(jamKerja.jamPulangJumat)
    : (jamKerja?.jamPulang || '15:45');

  const durasiKerjaMenit = useFriday && jamKerja?.durasiKerjaJumatMenit
    ? Number(jamKerja.durasiKerjaJumatMenit)
    : (jamKerja?.durasiKerjaMenit ? Number(jamKerja.durasiKerjaMenit) : 495);

  const toleransiSebelumMasuk = jamKerja?.toleransiSebelumMasuk !== undefined && jamKerja?.toleransiSebelumMasuk !== null
    ? Number(jamKerja.toleransiSebelumMasuk)
    : 30;

  const toleransiKeterlambatan = jamKerja?.toleransiKeterlambatan !== undefined && jamKerja?.toleransiKeterlambatan !== null
    ? Number(jamKerja.toleransiKeterlambatan)
    : 15;

  const toleransiPulang = jamKerja?.toleransiPulang !== undefined && jamKerja?.toleransiPulang !== null
    ? Number(jamKerja.toleransiPulang)
    : 120;

  return {
    isFriday,
    useFriday,
    dayLabel: isFriday ? 'Jumat (Khusus)' : 'Senin - Kamis',
    jamMasuk,
    jamPulang,
    durasiKerjaMenit,
    toleransiSebelumMasuk,
    toleransiKeterlambatan,
    toleransiPulang,
  };
}

function jamPulangJumatValid(val: string): string {
  if (!val || !val.includes(':')) return '15:30';
  return val;
}

/**
 * Helper parse "HH:MM" menjadi { hour, minute }
 */
export function parseJamMenit(timeStr: string): { hour: number; minute: number } {
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  return { hour: isNaN(h) ? 0 : h, minute: isNaN(m) ? 0 : m };
}

/**
 * Menghitung waktu batas buka absensi (Date)
 */
export function getBatasBukaDate(baseDate: Date, effective: EffectiveJamKerja): Date {
  const { hour, minute } = parseJamMenit(effective.jamMasuk);
  const jamMasukDate = new Date(baseDate);
  jamMasukDate.setHours(hour, minute, 0, 0);
  return new Date(jamMasukDate.getTime() - effective.toleransiSebelumMasuk * 60000);
}

/**
 * Menghitung waktu batas tutup absensi (Date)
 */
export function getBatasTutupDate(baseDate: Date, effective: EffectiveJamKerja): Date {
  const { hour, minute } = parseJamMenit(effective.jamPulang);
  const jamPulangDate = new Date(baseDate);
  jamPulangDate.setHours(hour, minute, 0, 0);
  return new Date(jamPulangDate.getTime() + effective.toleransiPulang * 60000);
}
