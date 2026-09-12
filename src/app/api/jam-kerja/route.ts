import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const jamKerja = await prisma.jamKerja.findFirst();
    return NextResponse.json({ jamKerja });
  } catch (error) {
    console.error('Get jam kerja error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const {
      jamMasuk,
      jamPulang,
      toleransiSebelumMasuk,
      toleransiKeterlambatan,
      toleransiPulang,
      durasiKerjaMenit,
      isJumatKhusus,
      jamMasukJumat,
      jamPulangJumat,
      durasiKerjaJumatMenit,
    } = await request.json();

    const existing = await prisma.jamKerja.findFirst();
    const data: Record<string, unknown> = {};

    if (jamMasuk !== undefined) data.jamMasuk = jamMasuk;
    if (jamPulang !== undefined) data.jamPulang = jamPulang;
    if (toleransiSebelumMasuk !== undefined) data.toleransiSebelumMasuk = Number(toleransiSebelumMasuk);
    if (toleransiKeterlambatan !== undefined) data.toleransiKeterlambatan = Number(toleransiKeterlambatan);
    if (toleransiPulang !== undefined) data.toleransiPulang = Number(toleransiPulang);
    if (durasiKerjaMenit !== undefined) data.durasiKerjaMenit = Number(durasiKerjaMenit);

    // Pengaturan Khusus Hari Jumat
    if (isJumatKhusus !== undefined) data.isJumatKhusus = Boolean(isJumatKhusus);
    if (jamMasukJumat !== undefined) data.jamMasukJumat = jamMasukJumat;
    if (jamPulangJumat !== undefined) data.jamPulangJumat = jamPulangJumat;
    if (durasiKerjaJumatMenit !== undefined) data.durasiKerjaJumatMenit = Number(durasiKerjaJumatMenit);

    let jamKerja;
    if (existing) {
      jamKerja = await prisma.jamKerja.update({
        where: { id: existing.id },
        data,
      });
    } else {
      jamKerja = await prisma.jamKerja.create({
        data: data as {
          jamMasuk: string;
          jamPulang: string;
          toleransiSebelumMasuk: number;
          toleransiKeterlambatan: number;
          toleransiPulang: number;
          durasiKerjaMenit: number;
          isJumatKhusus: boolean;
          jamMasukJumat: string;
          jamPulangJumat: string;
          durasiKerjaJumatMenit: number;
        },
      });
    }
    return NextResponse.json({ success: true, jamKerja });
  } catch (error) {
    console.error('Post jam kerja error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
