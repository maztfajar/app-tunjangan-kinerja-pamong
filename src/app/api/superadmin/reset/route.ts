import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Fitur reset database hanya dapat diakses oleh Super Admin.' }, { status: 403 });
    }

    const {
      resetPresensi,
      resetLaporan,
      resetAktifitas,
      resetAgenda,
      confirmKey,
      timeRangeMode,
      tahun,
      bulan,
      startDate,
      endDate,
      harianDate,
    } = await request.json();

    if (confirmKey !== 'HAPUS DATA') {
      return NextResponse.json(
        { error: 'Kata kunci konfirmasi tidak valid. Harap ketik "HAPUS DATA" untuk melanjutkan tindakan ini.' },
        { status: 400 }
      );
    }

    const { parseTimeRange, buildWhereClause } = await import('@/lib/dateRange');
    const parsedRange = parseTimeRange({
      timeRangeMode,
      tahun,
      bulan,
      startDate,
      endDate,
      harianDate,
    });
    const whereClauses = buildWhereClause(parsedRange);

    const results: Record<string, number> = {};

    await prisma.$transaction(async (tx) => {
      if (resetPresensi) {
        const delPresensi = await tx.presensi.deleteMany({
          where: whereClauses.presensi,
        });
        results.presensi = delPresensi.count;
      }

      if (resetLaporan) {
        const delLaporan = await tx.laporan.deleteMany({
          where: whereClauses.laporan,
        });
        results.laporan = delLaporan.count;
      }

      if (resetAktifitas) {
        const delAktifitas = await tx.aktifitas.deleteMany({
          where: whereClauses.aktifitas,
        });
        results.aktifitas = delAktifitas.count;
      }



      if (resetAgenda) {
        const delAgenda = await tx.agenda.deleteMany({
          where: whereClauses.agenda,
        });
        results.agenda = delAgenda.count;
      }
    });

    return NextResponse.json({
      success: true,
      message: `Proses pembersihan database berhasil dieksekusi untuk ${parsedRange.description}.`,
      rangeDescription: parsedRange.description,
      deletedCounts: results,
    });
  } catch (error) {
    console.error('Reset database error:', error);
    return NextResponse.json({ error: 'Terjadi kegagalan saat mereset database.' }, { status: 500 });
  }
}
