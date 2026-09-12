import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getLicenseInfo } from '@/lib/license';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const license = await getLicenseInfo();
    if (!license.features.suket) {
      return NextResponse.json({ error: 'Fitur Pengajuan Suket hanya tersedia pada lisensi PRO.' }, { status: 403 });
    }

    const { tanggal, jenisSuket, keterangan, tipeSuket } = await request.json();

    if (!tanggal) {
      return NextResponse.json({ error: 'Tanggal wajib diisi' }, { status: 400 });
    }
    if (!jenisSuket || jenisSuket === 'Pilih jenis Suket') {
      return NextResponse.json({ error: 'Jenis suket wajib dipilih' }, { status: 400 });
    }
    if (!keterangan || !keterangan.trim()) {
      return NextResponse.json({ error: 'Keterangan alasan wajib diisi' }, { status: 400 });
    }

    // Hitung rentang hari dari tanggal yang dipilih (00:00:00 sampai 23:59:59)
    const baseDate = new Date(tanggal);
    const startOfDay = new Date(baseDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(baseDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Cari presensi yang sudah ada pada hari tersebut untuk user ini
    let presensi = await prisma.presensi.findFirst({
      where: {
        userId: session.userId,
        tanggal: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const suketData = {
      jenisSuket,
      tipeSuket: tipeSuket || 'presensi',
      alasan: keterangan.trim(),
      status: 'Diajukan',
      tanggalPengajuan: new Date().toISOString(),
    };

    const suketJson = JSON.stringify(suketData);

    if (presensi) {
      presensi = await prisma.presensi.update({
        where: { id: presensi.id },
        data: {
          suket: suketJson,
        },
      });
    } else {
      presensi = await prisma.presensi.create({
        data: {
          userId: session.userId,
          tanggal: startOfDay,
          keterangan: `Suket: ${jenisSuket}`,
          suket: suketJson,
          lokasiTugas: 'Kantor',
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Surat keterangan (Suket) berhasil diajukan.',
      presensi,
    });
  } catch (error) {
    console.error('Error ajukan suket:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server saat memproses suket' }, { status: 500 });
  }
}
