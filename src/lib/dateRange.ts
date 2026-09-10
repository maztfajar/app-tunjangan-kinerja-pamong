export type TimeRangeMode = 'ALL' | 'TAHUN' | 'BULAN' | 'MINGGU' | 'HARIAN';

export interface TimeRangeParams {
  timeRangeMode?: TimeRangeMode;
  tahun?: string | number;
  bulan?: string; // format "YYYY-MM"
  startDate?: string; // format "YYYY-MM-DD"
  endDate?: string; // format "YYYY-MM-DD"
  harianDate?: string; // format "YYYY-MM-DD"
}

export interface ParsedTimeRange {
  mode: TimeRangeMode;
  start?: Date;
  end?: Date;
  bulanStr?: string;
  tahunStr?: string;
  description: string;
}

export function parseTimeRange(params: TimeRangeParams): ParsedTimeRange {
  const mode = params.timeRangeMode || 'ALL';

  if (mode === 'ALL') {
    return {
      mode: 'ALL',
      description: 'Semua Riwayat Data (Seluruh Waktu)',
    };
  }

  const now = new Date();
  const currentYear = now.getFullYear();

  if (mode === 'TAHUN') {
    const y = parseInt(String(params.tahun || currentYear), 10);
    const tahunStr = String(y);
    const start = new Date(`${y}-01-01T00:00:00.000+07:00`);
    const end = new Date(`${y}-12-31T23:59:59.999+07:00`);
    return {
      mode: 'TAHUN',
      start,
      end,
      tahunStr,
      description: `Tahun ${y}`,
    };
  }

  if (mode === 'BULAN') {
    const b = params.bulan || `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [y, m] = b.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const start = new Date(`${b}-01T00:00:00.000+07:00`);
    const end = new Date(`${b}-${String(lastDay).padStart(2, '0')}T23:59:59.999+07:00`);

    const namaBulan = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ][m - 1] || b;

    return {
      mode: 'BULAN',
      start,
      end,
      bulanStr: b,
      tahunStr: String(y),
      description: `Bulan ${namaBulan} ${y}`,
    };
  }

  if (mode === 'MINGGU') {
    const s = params.startDate || now.toISOString().slice(0, 10);
    const e = params.endDate || s;
    const start = new Date(`${s}T00:00:00.000+07:00`);
    const end = new Date(`${e}T23:59:59.999+07:00`);
    return {
      mode: 'MINGGU',
      start,
      end,
      description: `Rentang ${s} s/d ${e}`,
    };
  }

  if (mode === 'HARIAN') {
    const d = params.harianDate || now.toISOString().slice(0, 10);
    const start = new Date(`${d}T00:00:00.000+07:00`);
    const end = new Date(`${d}T23:59:59.999+07:00`);
    return {
      mode: 'HARIAN',
      start,
      end,
      description: `Tanggal ${d}`,
    };
  }

  return {
    mode: 'ALL',
    description: 'Semua Riwayat Data (Seluruh Waktu)',
  };
}

export function buildWhereClause(parsed: ParsedTimeRange) {
  if (parsed.mode === 'ALL' || !parsed.start || !parsed.end) {
    return {
      presensi: {},
      laporan: {},
      aktifitas: {},
      tasks: {},
      agenda: {},
    };
  }

  const { start, end, bulanStr, tahunStr, mode } = parsed;

  const presensiWhere = {
    tanggal: { gte: start, lte: end },
  };

  let laporanWhere: Record<string, unknown> = {};
  if (mode === 'BULAN' && bulanStr) {
    laporanWhere = {
      OR: [
        { bulan: bulanStr },
        { createdAt: { gte: start, lte: end } },
      ],
    };
  } else if (mode === 'TAHUN' && tahunStr) {
    laporanWhere = {
      OR: [
        { bulan: { startsWith: `${tahunStr}-` } },
        { createdAt: { gte: start, lte: end } },
      ],
    };
  } else {
    laporanWhere = {
      createdAt: { gte: start, lte: end },
    };
  }

  const aktifitasWhere = {
    createdAt: { gte: start, lte: end },
  };

  const tasksWhere = {
    OR: [
      { waktu: { gte: start, lte: end } },
      { createdAt: { gte: start, lte: end } },
    ],
  };

  const agendaWhere = {
    tanggal: { gte: start, lte: end },
  };

  return {
    presensi: presensiWhere,
    laporan: laporanWhere,
    aktifitas: aktifitasWhere,
    tasks: tasksWhere,
    agenda: agendaWhere,
  };
}
