import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getLicenseInfo } from '@/lib/license';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tahun = searchParams.get('tahun');
    const bulan = searchParams.get('bulan');

    const where: Record<string, unknown> = {};

    if (tahun && bulan) {
      const y = Number(tahun);
      const m = Number(bulan);
      const mStr = String(m).padStart(2, '0');
      const nextM = m === 12 ? '01' : String(m + 1).padStart(2, '0');
      const nextY = m === 12 ? y + 1 : y;

      where.tanggal = {
        gte: new Date(`${y}-${mStr}-01T00:00:00.000Z`),
        lt: new Date(`${nextY}-${nextM}-01T00:00:00.000Z`),
      };
    } else if (tahun) {
      const y = Number(tahun);
      where.tanggal = {
        gte: new Date(`${y}-01-01T00:00:00.000Z`),
        lt: new Date(`${y + 1}-01-01T00:00:00.000Z`),
      };
    }

    const rawList = await prisma.hariLibur.findMany({
      where,
      orderBy: { tanggal: 'asc' },
    });

    const hariLibur = rawList.map((item) => {
      // Dapatkan tanggalKey 'YYYY-MM-DD' secara aman
      const key = item.tanggal.toISOString().slice(0, 10);
      return {
        ...item,
        tanggalKey: key,
      };
    });

    return NextResponse.json({ hariLibur });
  } catch (error) {
    console.error('Get hari libur error:', error);
    return NextResponse.json({ error: 'Server error', details: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const license = await getLicenseInfo();
    if (!license.features.holidayCalendar) {
      return NextResponse.json({ error: 'Fitur Kalender Hari Libur hanya tersedia pada lisensi PRO.' }, { status: 403 });
    }

    const { tanggal, keterangan, sumber, isLibur } = await request.json();
    if (!tanggal || !keterangan) {
      return NextResponse.json({ error: 'Tanggal dan keterangan wajib diisi' }, { status: 400 });
    }

    // Normalisasi tanggal format YYYY-MM-DD ke 12:00 UTC
    const cleanDate = tanggal.slice(0, 10);
    const tgl = new Date(`${cleanDate}T12:00:00.000Z`);
    const startRange = new Date(`${cleanDate}T00:00:00.000Z`);
    const endRange = new Date(`${cleanDate}T23:59:59.999Z`);

    const existing = await prisma.hariLibur.findFirst({
      where: {
        tanggal: { gte: startRange, lte: endRange },
      },
    });

    if (existing) {
      return NextResponse.json({ error: `Tanggal ${cleanDate} sudah terdaftar: "${existing.keterangan}"` }, { status: 400 });
    }

    const item = await prisma.hariLibur.create({
      data: {
        tanggal: tgl,
        keterangan: keterangan.trim(),
        sumber: sumber || 'manual',
        isLibur: isLibur !== undefined ? Boolean(isLibur) : true,
        dibuatOleh: session.userId,
      },
    });

    return NextResponse.json({
      success: true,
      hariLibur: {
        ...item,
        tanggalKey: cleanDate,
      },
    });
  } catch (error) {
    console.error('Post hari libur error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan data hari libur', details: String(error) }, { status: 500 });
  }
}

// PATCH: Toggle status libur (Ganti Libur <-> Hari Masuk) atau edit keterangan
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const license = await getLicenseInfo();
    if (!license.features.holidayCalendar) {
      return NextResponse.json({ error: 'Fitur Kalender Hari Libur hanya tersedia pada lisensi PRO.' }, { status: 403 });
    }

    const { id, isLibur, keterangan } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    }

    const dataToUpdate: Record<string, unknown> = {};
    if (isLibur !== undefined) dataToUpdate.isLibur = Boolean(isLibur);
    if (keterangan !== undefined) dataToUpdate.keterangan = String(keterangan).trim();

    const updated = await prisma.hariLibur.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      hariLibur: {
        ...updated,
        tanggalKey: updated.tanggal.toISOString().slice(0, 10),
      },
    });
  } catch (error) {
    console.error('Patch hari libur error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui status hari libur', details: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const license = await getLicenseInfo();
    if (!license.features.holidayCalendar) {
      return NextResponse.json({ error: 'Fitur Kalender Hari Libur hanya tersedia pada lisensi PRO.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const tanggal = searchParams.get('tanggal');

    if (!id && !tanggal) {
      return NextResponse.json({ error: 'ID atau tanggal diperlukan' }, { status: 400 });
    }

    if (id) {
      await prisma.hariLibur.delete({ where: { id } });
    } else if (tanggal) {
      const cleanDate = tanggal.slice(0, 10);
      const startRange = new Date(`${cleanDate}T00:00:00.000Z`);
      const endRange = new Date(`${cleanDate}T23:59:59.999Z`);
      await prisma.hariLibur.deleteMany({
        where: {
          tanggal: { gte: startRange, lte: endRange },
        },
      });
    }

    return NextResponse.json({ success: true, message: 'Data penetapan berhasil dihapus dan dibersihkan' });
  } catch (error) {
    console.error('Delete hari libur error:', error);
    return NextResponse.json({ error: 'Gagal menghapus data hari libur', details: String(error) }, { status: 500 });
  }
}
