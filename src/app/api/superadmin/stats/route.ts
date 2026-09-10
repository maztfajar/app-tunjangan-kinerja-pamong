import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Super Admin.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const timeRangeMode = searchParams.get('timeRangeMode') || 'ALL';
    const tahun = searchParams.get('tahun') || undefined;
    const bulan = searchParams.get('bulan') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const harianDate = searchParams.get('harianDate') || undefined;

    const { parseTimeRange, buildWhereClause } = await import('@/lib/dateRange');
    const parsedRange = parseTimeRange({
      timeRangeMode: timeRangeMode as any,
      tahun,
      bulan,
      startDate,
      endDate,
      harianDate,
    });
    const whereClauses = buildWhereClause(parsedRange);

    const [
      totalAdmins,
      totalPegawai,
      totalPresensi,
      totalLaporan,
      totalAktifitas,
      totalAgenda,
      rangePresensi,
      rangeLaporan,
      rangeAktifitas,
      rangeAgenda,
      settings,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'PEGAWAI' } }),
      prisma.presensi.count(),
      prisma.laporan.count(),
      prisma.aktifitas.count(),
      prisma.agenda.count(),
      prisma.presensi.count({ where: whereClauses.presensi }),
      prisma.laporan.count({ where: whereClauses.laporan }),
      prisma.aktifitas.count({ where: whereClauses.aktifitas }),
      prisma.agenda.count({ where: whereClauses.agenda }),
      prisma.appSettings.findUnique({ where: { id: 'default' } }),
    ]);

    return NextResponse.json({
      stats: {
        totalAdmins,
        totalPegawai,
        totalPresensi,
        totalLaporan,
        totalAktifitas,
        totalAgenda,
        rangePresensi,
        rangeLaporan,
        rangeAktifitas,
        rangeAgenda,
        rangeDescription: parsedRange.description,
        isFiltered: parsedRange.mode !== 'ALL',
      },
      settings,
    });
  } catch (error) {
    console.error('Superadmin stats error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
