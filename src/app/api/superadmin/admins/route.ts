import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Super Admin.' }, { status: 403 });
    }

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        nip: true,
        nama: true,
        jabatan: true,
        unitKerja: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ admins });
  } catch (error) {
    console.error('Get admins error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Super Admin.' }, { status: 403 });
    }

    const { nip, nama, password, jabatan, unitKerja } = await request.json();

    if (!nip || !nama || !password) {
      return NextResponse.json({ error: 'NIP/Username, Nama, dan Password wajib diisi.' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { nip: nip.trim() },
    });

    if (existing) {
      return NextResponse.json({ error: 'NIP / Username sudah terdaftar di sistem.' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const newAdmin = await prisma.user.create({
      data: {
        nip: nip.trim(),
        nama: nama.trim(),
        password: hashedPassword,
        role: 'ADMIN',
        jabatan: 'Admin',
        unitKerja: unitKerja ? unitKerja.trim() : 'Pemerintah Kalurahan',
      },
      select: {
        id: true,
        nip: true,
        nama: true,
        jabatan: true,
        unitKerja: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, admin: newAdmin });
  } catch (error) {
    console.error('Create admin error:', error);
    return NextResponse.json({ error: 'Server error saat membuat user admin.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Super Admin.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID Admin wajib disertakan.' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User tidak ditemukan.' }, { status: 404 });
    }

    if (targetUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Hanya user dengan role ADMIN yang dapat dihapus dari menu ini.' }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'User Admin berhasil dihapus.' });
  } catch (error) {
    console.error('Delete admin error:', error);
    return NextResponse.json({ error: 'Server error saat menghapus user admin.' }, { status: 500 });
  }
}
