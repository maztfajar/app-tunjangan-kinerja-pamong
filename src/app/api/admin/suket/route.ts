import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getLicenseInfo } from '@/lib/license';
import { getEffectiveJamKerja } from '@/lib/jam-kerja-helper';

// Helper: parse "HH:MM"
function parseTimeStr(t: string): { hour: number; minute: number } {
  const [h, m] = t.split(':').map(Number);
  return { hour: h || 0, minute: m || 0 };
}

// Helper: create a Date at specific hour:minute on a given base date
function timeOnDate(base: Date, hour: number, minute: number): Date {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// GET: Mengambil daftar suket yang berstatus 'Diajukan' untuk notifikasi admin
export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const license = await getLicenseInfo();
    if (!license.features.suket) {
      return NextResponse.json({ pendingCount: 0, items: [] });
    }

    // Ambil seluruh presensi yang memiliki field suket
    const presensiWithSuket = await prisma.presensi.findMany({
      where: {
        suket: { not: null },
      },
      include: {
        user: {
          select: { id: true, nama: true, nip: true, jabatan: true },
        },
      },
      orderBy: { tanggal: 'desc' },
    });

    // Filter yang statusnya 'Diajukan'
    const pendingList = presensiWithSuket
      .map((p) => {
        try {
          const parsed = JSON.parse(p.suket || '{}');
          if (parsed.status === 'Diajukan') {
            return {
              ...p,
              parsedSuket: parsed,
            };
          }
        } catch {}
        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json({
      pendingCount: pendingList.length,
      pendingList,
    });
  } catch (error) {
    console.error('Get admin suket error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: Menyetujui atau menolak suket pegawai
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { presensiId, action, catatanAdmin } = await request.json();

    if (!presensiId) {
      return NextResponse.json({ error: 'presensiId wajib diisi' }, { status: 400 });
    }
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action harus berupa approve atau reject' }, { status: 400 });
    }

    const presensi = await prisma.presensi.findUnique({
      where: { id: presensiId },
      include: { user: true },
    });

    if (!presensi) {
      return NextResponse.json({ error: 'Data presensi tidak ditemukan' }, { status: 404 });
    }

    let parsedSuket: Record<string, unknown> = {};
    try {
      parsedSuket = JSON.parse(presensi.suket || '{}');
    } catch {
      parsedSuket = { alasan: presensi.suket };
    }

    const baseDate = new Date(presensi.tanggal);
    const jamKerjaRaw = await prisma.jamKerja.findFirst();
    const effective = getEffectiveJamKerja(jamKerjaRaw, baseDate);
    const jamMasukStr = effective.jamMasuk;
    const jamPulangStr = effective.jamPulang;
    const durasiStandar = effective.durasiKerjaMenit;

    const masukParsed = parseTimeStr(jamMasukStr);
    const pulangParsed = parseTimeStr(jamPulangStr);

    const jamMasukStandar = timeOnDate(baseDate, masukParsed.hour, masukParsed.minute);
    const jamPulangStandar = timeOnDate(baseDate, pulangParsed.hour, pulangParsed.minute);

    if (action === 'approve') {
      // SETUJUI SUKET: Otomatis set jam masuk dan jam pulang standar, bersihkan denda keterlambatan / mendahului
      const updatedSuket = {
        ...parsedSuket,
        status: 'Disetujui',
        catatanAdmin: catatanAdmin || 'Disetujui oleh Admin',
        reviewedAt: new Date().toISOString(),
        reviewedBy: session.userId,
      };

      const updated = await prisma.presensi.update({
        where: { id: presensiId },
        data: {
          jamMasuk: jamMasukStandar,
          jamPulang: jamPulangStandar,
          statusMasuk: 'Tepat Waktu',
          keterlambatan: 0,
          persenTerlambat: 0,
          mendahului: 0,
          persenMendahului: 0,
          targetJamPulang: jamPulangStandar,
          durasiKerjaMenit: durasiStandar,
          persentaseHarian: 100,
          keterangan: `Suket Disetujui (${parsedSuket.jenisSuket || 'Izin'})`,
          suket: JSON.stringify(updatedSuket),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Suket pegawai ${presensi.user.nama} berhasil disetujui. Jam kerja otomatis disesuaikan ke jam standar.`,
        presensi: updated,
      });
    } else {
      // TOLAK SUKET: Status suket ditolak
      const updatedSuket = {
        ...parsedSuket,
        status: 'Ditolak',
        catatanAdmin: catatanAdmin || 'Ditolak oleh Admin',
        reviewedAt: new Date().toISOString(),
        reviewedBy: session.userId,
      };

      const updated = await prisma.presensi.update({
        where: { id: presensiId },
        data: {
          suket: JSON.stringify(updatedSuket),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Suket pegawai ${presensi.user.nama} telah ditolak.`,
        presensi: updated,
      });
    }
  } catch (error) {
    console.error('Review suket error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server saat memproses suket' }, { status: 500 });
  }
}
