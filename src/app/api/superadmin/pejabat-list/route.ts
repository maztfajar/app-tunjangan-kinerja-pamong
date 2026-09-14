import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ambil semua pegawai dan admin aktif untuk opsi penandatangan atasan
    const users = await prisma.user.findMany({
      where: {
        role: { in: ['PEGAWAI', 'ADMIN'] },
      },
      select: {
        id: true,
        username: true,
        nama: true,
        jabatan: true,
        unitKerja: true,
        role: true,
      },
      orderBy: [
        { role: 'desc' }, // ADMIN dulu baru PEGAWAI
        { nama: 'asc' },
      ],
    });

    const mappedUsers = users.map((u) => ({
      ...u,
      nip: u.username,
    }));

    return NextResponse.json({ users: mappedUsers });
  } catch (error) {
    console.error('Get pejabat list error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
