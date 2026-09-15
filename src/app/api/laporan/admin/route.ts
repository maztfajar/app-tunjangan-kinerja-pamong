import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const bulan = searchParams.get('bulan'); // format: YYYY-MM

    // JIKA TIDAK ADA userId -> KEMBALIKAN DATA REKAPITULASI SELURUH PEGAWAI
    if (!userId) {
      // 1. Ambil seluruh data pegawai aktif
      const pegawaiList = await prisma.user.findMany({
        where: { role: 'PEGAWAI' },
        select: {
          id: true,
          username: true,
          nama: true,
          jabatan: true,
          unitKerja: true,
        },
        orderBy: { nama: 'asc' },
      });

      // 2. Query filter periode jika ada parameter bulan
      const whereCondition: {
        periode?: { gte: Date; lte: Date };
      } = {};

      if (bulan && bulan !== 'all' && /^\d{4}-\d{2}$/.test(bulan)) {
        const [y, m] = bulan.split('-').map(Number);
        const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
        whereCondition.periode = { gte: startDate, lte: endDate };
      }

      // 3. Ambil laporan kinerja seluruh pamong sesuai periode
      const allLaporan = await prisma.laporanKinerja.findMany({
        where: whereCondition,
        include: {
          output: {
            include: {
              rencanaKegiatan: true,
            },
          },
        },
      });

      const parseNum = (val: string | null | undefined): number => {
        if (!val) return 0;
        const n = parseFloat(String(val).replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
      };

      // 4. Hitung rekapitulasi per pegawai
      const rekapPegawai = pegawaiList.map((peg) => {
        const userReports = allLaporan.filter((l) => l.userId === peg.id);
        const totalOutput = userReports.length;

        let totalTarget = 0;
        let totalCapaian = 0;
        let sumPersen = 0;

        userReports.forEach((l) => {
          const t = parseNum(l.target);
          const c = parseNum(l.capaian);
          totalTarget += t;
          totalCapaian += c;

          if (t > 0) {
            sumPersen += Math.min(100, Math.round((c / t) * 100));
          } else if (c > 0) {
            sumPersen += 100;
          }
        });

        const progresPersen =
          totalOutput > 0 ? Math.round(sumPersen / totalOutput) : 0;

        let status = 'Belum Ada Laporan';
        if (totalOutput > 0) {
          if (progresPersen >= 100) {
            status = 'Selesai (100%)';
          } else if (progresPersen > 0) {
            status = 'Dalam Proses';
          } else {
            status = 'Belum Terealisasi';
          }
        }

        return {
          id: peg.id,
          username: peg.username,
          nip: peg.username,
          nama: peg.nama,
          jabatan: peg.jabatan,
          unitKerja: peg.unitKerja,
          totalOutput,
          totalTarget,
          totalCapaian,
          progresPersen,
          status,
        };
      });

      return NextResponse.json({
        rekap: rekapPegawai,
        bulan: bulan || 'Semua Periode',
        totalPegawai: pegawaiList.length,
      });
    }

    // JIKA ADA userId -> KEMBALIKAN DETAIL LAPORAN 1 PEGAWAI TERTENTU
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        nama: true,
        jabatan: true,
        unitKerja: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Pegawai tidak ditemukan' }, { status: 404 });
    }

    const laporanKinerja = await prisma.laporanKinerja.findMany({
      where: { userId },
      include: {
        output: {
          include: {
            rencanaKegiatan: true,
          },
        },
      },
      orderBy: [{ periode: 'desc' }, { createdAt: 'desc' }],
    });

    const laporan = laporanKinerja.map((row) => ({
      id: row.id,
      bulan: row.periode ? row.periode.toISOString().slice(0, 7) : '',
      rencana: row.output.rencanaKegiatan.rencanaKegiatan,
      output: `${row.output.kodeHuruf}. ${row.output.output}`,
      target: row.target || '',
      capaian: row.capaian || '',
      satuan: '',
      keterangan: row.keterangan || '',
      pedomanPengisian: row.output.pedomanPengisian || '',
    }));

    return NextResponse.json({
      user: user ? { ...user, nip: user.username } : null,
      laporan,
    });
  } catch (error) {
    console.error('Get admin laporan error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
