import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';
import { getLicenseInfo } from '@/lib/license';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pegawai = await prisma.user.findMany({
      where: { role: 'PEGAWAI' },
      select: {
        id: true,
        nip: true,
        nama: true,
        jabatan: true,
        unitKerja: true,
        createdAt: true,
      },
      orderBy: { nama: 'asc' },
    });

    return NextResponse.json({ pegawai });
  } catch (error) {
    console.error('Get pegawai error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { nip, nama, jabatan, unitKerja, password } = await request.json();

    if (!nip || !nama || !password) {
      return NextResponse.json(
        { error: 'Username, nama, dan password wajib diisi' },
        { status: 400 }
      );
    }

    // Cek Username sudah ada
    const existing = await prisma.user.findUnique({ where: { nip } });
    if (existing) {
      return NextResponse.json(
        { error: 'Username sudah terdaftar' },
        { status: 400 }
      );
    }

    // Cek batas kuota pegawai (maksimal 50 di versi standar)
    const license = await getLicenseInfo();
    if (!license.features.unlimitedUsers) {
      const currentPegawaiCount = await prisma.user.count({
        where: { role: 'PEGAWAI' },
      });
      const maxLimit = license.maxUsers > 0 ? license.maxUsers : 50;
      if (currentPegawaiCount >= maxLimit) {
        return NextResponse.json(
          {
            error: `Batas kuota pegawai (${maxLimit} orang) telah tercapai. Hubungi administrator/pengembang untuk meningkatkan kapasitas sistem.`,
          },
          { status: 403 }
        );
      }
    }

    const hashedPassword = await hashPassword(password);
    const pegawai = await prisma.user.create({
      data: {
        nip,
        nama,
        jabatan,
        unitKerja,
        password: hashedPassword,
        role: 'PEGAWAI',
      },
    });

    return NextResponse.json({
      success: true,
      pegawai: {
        id: pegawai.id,
        nip: pegawai.nip,
        nama: pegawai.nama,
        jabatan: pegawai.jabatan,
        unitKerja: pegawai.unitKerja,
      },
    });
  } catch (error) {
    console.error('Create pegawai error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
