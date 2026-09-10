// Dataset & Helper Sinkronisasi Hari Libur Nasional & Cuti Bersama Indonesia (SKB 3 Menteri)

export interface LiburItemDefinition {
  tanggal: string; // YYYY-MM-DD
  keterangan: string;
  isCutiBersama?: boolean;
}

// Data kurasi resmi SKB 3 Menteri Indonesia
export const LIBUR_NASIONAL_DEFAULT: Record<number, LiburItemDefinition[]> = {
  2024: [
    { tanggal: '2024-01-01', keterangan: 'Tahun Baru 2024 Masehi' },
    { tanggal: '2024-02-08', keterangan: 'Isra Mikraj Nabi Muhammad SAW' },
    { tanggal: '2024-02-09', keterangan: 'Cuti Bersama Tahun Baru Imlek 2575', isCutiBersama: true },
    { tanggal: '2024-02-10', keterangan: 'Tahun Baru Imlek 2575 Kongzili' },
    { tanggal: '2024-03-11', keterangan: 'Hari Suci Nyepi Tahun Baru Saka 1946' },
    { tanggal: '2024-03-12', keterangan: 'Cuti Bersama Hari Suci Nyepi', isCutiBersama: true },
    { tanggal: '2024-03-29', keterangan: 'Wafat Yesus Kristus' },
    { tanggal: '2024-03-31', keterangan: 'Hari Paskah' },
    { tanggal: '2024-04-08', keterangan: 'Cuti Bersama Hari Raya Idul Fitri 1445 H', isCutiBersama: true },
    { tanggal: '2024-04-09', keterangan: 'Cuti Bersama Hari Raya Idul Fitri 1445 H', isCutiBersama: true },
    { tanggal: '2024-04-10', keterangan: 'Hari Raya Idul Fitri 1445 H' },
    { tanggal: '2024-04-11', keterangan: 'Hari Raya Idul Fitri 1445 H' },
    { tanggal: '2024-04-12', keterangan: 'Cuti Bersama Hari Raya Idul Fitri 1445 H', isCutiBersama: true },
    { tanggal: '2024-04-15', keterangan: 'Cuti Bersama Hari Raya Idul Fitri 1445 H', isCutiBersama: true },
    { tanggal: '2024-05-01', keterangan: 'Hari Buruh Internasional' },
    { tanggal: '2024-05-09', keterangan: 'Kenaikan Yesus Kristus' },
    { tanggal: '2024-05-10', keterangan: 'Cuti Bersama Kenaikan Yesus Kristus', isCutiBersama: true },
    { tanggal: '2024-05-23', keterangan: 'Hari Raya Waisak 2568 BE' },
    { tanggal: '2024-05-24', keterangan: 'Cuti Bersama Hari Raya Waisak', isCutiBersama: true },
    { tanggal: '2024-06-01', keterangan: 'Hari Lahir Pancasila' },
    { tanggal: '2024-06-17', keterangan: 'Hari Raya Idul Adha 1445 H' },
    { tanggal: '2024-06-18', keterangan: 'Cuti Bersama Hari Raya Idul Adha', isCutiBersama: true },
    { tanggal: '2024-07-07', keterangan: 'Tahun Baru Islam 1446 H' },
    { tanggal: '2024-08-17', keterangan: 'Hari Kemerdekaan Republik Indonesia' },
    { tanggal: '2024-09-16', keterangan: 'Maulid Nabi Muhammad SAW' },
    { tanggal: '2024-12-25', keterangan: 'Kelahiran Yesus Kristus (Hari Raya Natal)' },
    { tanggal: '2024-12-26', keterangan: 'Cuti Bersama Hari Raya Natal', isCutiBersama: true },
  ],
  2025: [
    { tanggal: '2025-01-01', keterangan: 'Tahun Baru 2025 Masehi' },
    { tanggal: '2025-01-27', keterangan: 'Isra Mikraj Nabi Muhammad SAW' },
    { tanggal: '2025-01-28', keterangan: 'Cuti Bersama Tahun Baru Imlek 2576 Kongzili', isCutiBersama: true },
    { tanggal: '2025-01-29', keterangan: 'Tahun Baru Imlek 2576 Kongzili' },
    { tanggal: '2025-03-28', keterangan: 'Cuti Bersama Hari Suci Nyepi', isCutiBersama: true },
    { tanggal: '2025-03-29', keterangan: 'Hari Suci Nyepi (Tahun Baru Saka 1947)' },
    { tanggal: '2025-03-31', keterangan: 'Hari Raya Idul Fitri 1446 H' },
    { tanggal: '2025-04-01', keterangan: 'Hari Raya Idul Fitri 1446 H' },
    { tanggal: '2025-04-02', keterangan: 'Cuti Bersama Hari Raya Idul Fitri 1446 H', isCutiBersama: true },
    { tanggal: '2025-04-03', keterangan: 'Cuti Bersama Hari Raya Idul Fitri 1446 H', isCutiBersama: true },
    { tanggal: '2025-04-04', keterangan: 'Cuti Bersama Hari Raya Idul Fitri 1446 H', isCutiBersama: true },
    { tanggal: '2025-04-07', keterangan: 'Cuti Bersama Hari Raya Idul Fitri 1446 H', isCutiBersama: true },
    { tanggal: '2025-04-18', keterangan: 'Wafat Yesus Kristus' },
    { tanggal: '2025-04-20', keterangan: 'Hari Kebangkitan Yesus Kristus (Paskah)' },
    { tanggal: '2025-05-01', keterangan: 'Hari Buruh Internasional' },
    { tanggal: '2025-05-12', keterangan: 'Hari Raya Waisak 2569 BE' },
    { tanggal: '2025-05-13', keterangan: 'Cuti Bersama Hari Raya Waisak', isCutiBersama: true },
    { tanggal: '2025-05-29', keterangan: 'Kenaikan Yesus Kristus' },
    { tanggal: '2025-05-30', keterangan: 'Cuti Bersama Kenaikan Yesus Kristus', isCutiBersama: true },
    { tanggal: '2025-06-01', keterangan: 'Hari Lahir Pancasila' },
    { tanggal: '2025-06-06', keterangan: 'Hari Raya Idul Adha 1446 H' },
    { tanggal: '2025-06-09', keterangan: 'Cuti Bersama Hari Raya Idul Adha', isCutiBersama: true },
    { tanggal: '2025-06-27', keterangan: '1 Muharram / Tahun Baru Islam 1447 H' },
    { tanggal: '2025-08-17', keterangan: 'Proklamasi Kemerdekaan RI ke-80' },
    { tanggal: '2025-09-05', keterangan: 'Maulid Nabi Muhammad SAW' },
    { tanggal: '2025-12-25', keterangan: 'Kelahiran Yesus Kristus (Hari Raya Natal)' },
    { tanggal: '2025-12-26', keterangan: 'Cuti Bersama Hari Raya Natal', isCutiBersama: true },
  ],
  2026: [
    { tanggal: '2026-01-01', keterangan: 'Tahun Baru 2026 Masehi' },
    { tanggal: '2026-01-16', keterangan: 'Isra Mikraj Nabi Muhammad SAW' },
    { tanggal: '2026-02-16', keterangan: 'Cuti Bersama Tahun Baru Imlek 2577', isCutiBersama: true },
    { tanggal: '2026-02-17', keterangan: 'Tahun Baru Imlek 2577 Kongzili' },
    { tanggal: '2026-03-19', keterangan: 'Hari Suci Nyepi (Tahun Baru Saka 1948)' },
    { tanggal: '2026-03-20', keterangan: 'Hari Raya Idul Fitri 1447 H' },
    { tanggal: '2026-03-21', keterangan: 'Hari Raya Idul Fitri 1447 H' },
    { tanggal: '2026-03-23', keterangan: 'Cuti Bersama Hari Raya Idul Fitri 1447 H', isCutiBersama: true },
    { tanggal: '2026-03-24', keterangan: 'Cuti Bersama Hari Raya Idul Fitri 1447 H', isCutiBersama: true },
    { tanggal: '2026-04-03', keterangan: 'Wafat Yesus Kristus' },
    { tanggal: '2026-04-05', keterangan: 'Hari Paskah' },
    { tanggal: '2026-05-01', keterangan: 'Hari Buruh Internasional' },
    { tanggal: '2026-05-14', keterangan: 'Kenaikan Yesus Kristus' },
    { tanggal: '2026-05-15', keterangan: 'Cuti Bersama Kenaikan Yesus Kristus', isCutiBersama: true },
    { tanggal: '2026-05-27', keterangan: 'Hari Raya Idul Adha 1447 H' },
    { tanggal: '2026-05-28', keterangan: 'Cuti Bersama Hari Raya Idul Adha', isCutiBersama: true },
    { tanggal: '2026-05-31', keterangan: 'Hari Raya Waisak 2570 BE' },
    { tanggal: '2026-06-01', keterangan: 'Hari Lahir Pancasila' },
    { tanggal: '2026-06-16', keterangan: '1 Muharram / Tahun Baru Islam 1448 H' },
    { tanggal: '2026-08-17', keterangan: 'Hari Kemerdekaan Republik Indonesia' },
    { tanggal: '2026-08-25', keterangan: 'Maulid Nabi Muhammad SAW' },
    { tanggal: '2026-12-25', keterangan: 'Kelahiran Yesus Kristus (Hari Raya Natal)' },
    { tanggal: '2026-12-26', keterangan: 'Cuti Bersama Hari Raya Natal', isCutiBersama: true },
  ],
  2027: [
    { tanggal: '2027-01-01', keterangan: 'Tahun Baru 2027 Masehi' },
    { tanggal: '2027-01-06', keterangan: 'Isra Mikraj Nabi Muhammad SAW' },
    { tanggal: '2027-02-06', keterangan: 'Tahun Baru Imlek 2578 Kongzili' },
    { tanggal: '2027-03-09', keterangan: 'Hari Suci Nyepi (Tahun Baru Saka 1949)' },
    { tanggal: '2027-03-10', keterangan: 'Hari Raya Idul Fitri 1448 H' },
    { tanggal: '2027-03-11', keterangan: 'Hari Raya Idul Fitri 1448 H' },
    { tanggal: '2027-03-12', keterangan: 'Cuti Bersama Hari Raya Idul Fitri 1448 H', isCutiBersama: true },
    { tanggal: '2027-03-26', keterangan: 'Wafat Yesus Kristus' },
    { tanggal: '2027-03-28', keterangan: 'Hari Paskah' },
    { tanggal: '2027-05-01', keterangan: 'Hari Buruh Internasional' },
    { tanggal: '2027-05-06', keterangan: 'Kenaikan Yesus Kristus' },
    { tanggal: '2027-05-16', keterangan: 'Hari Raya Idul Adha 1448 H' },
    { tanggal: '2027-05-20', keterangan: 'Hari Raya Waisak 2571 BE' },
    { tanggal: '2027-06-01', keterangan: 'Hari Lahir Pancasila' },
    { tanggal: '2027-06-06', keterangan: '1 Muharram / Tahun Baru Islam 1449 H' },
    { tanggal: '2027-08-17', keterangan: 'Hari Kemerdekaan Republik Indonesia' },
    { tanggal: '2027-08-14', keterangan: 'Maulid Nabi Muhammad SAW' },
    { tanggal: '2027-12-25', keterangan: 'Kelahiran Yesus Kristus (Hari Raya Natal)' },
  ],
};

// Ambil daftar libur nasional secara dinamis (coba online API, fallback offline dataset)
export async function fetchLiburNasional(tahun: number): Promise<LiburItemDefinition[]> {
  // Coba fetch dari API publik dengan timeout 3 detik
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://dayoffapi.vercel.app/api?year=${tahun}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Aplikasi-Pamong/1.0' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: { tanggal: string; keterangan: string; is_cuti: boolean }) => ({
          tanggal: item.tanggal,
          keterangan: item.keterangan,
          isCutiBersama: !!item.is_cuti,
        }));
      }
    }
  } catch {
    // Online fetch gagal / offline, lanjut ke fallback kurasi
  }

  // Fallback ke dataset kurasi
  return LIBUR_NASIONAL_DEFAULT[tahun] || [];
}
