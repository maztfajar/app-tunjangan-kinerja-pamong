import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hashPassword, validatePasswordStrength } from '@/lib/auth';
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
        username: true,
        nama: true,
        jabatan: true,
        unitKerja: true,
        createdAt: true,
      },
      orderBy: { nama: 'asc' },
    });

    const mappedPegawai = pegawai.map((p) => ({
      ...p,
      nip: p.username,
    }));

    return NextResponse.json({ pegawai: mappedPegawai });
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

    const body = await request.json();
    const username = String(body.username || body.nip || '').trim();
    const { nama, jabatan, unitKerja, password } = body;

    if (!username || !nama || !password) {
      return NextResponse.json(
        { error: 'Username, nama, dan password wajib diisi' },
        { status: 400 }
      );
    }

    const pwdCheck = validatePasswordStrength(password);
    if (!pwdCheck.valid) {
      return NextResponse.json({ error: pwdCheck.error }, { status: 400 });
    }

    // Cek Username sudah ada
    const existing = await prisma.user.findUnique({ where: { username } });
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
        username,
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
        username: pegawai.username,
        nip: pegawai.username,
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
