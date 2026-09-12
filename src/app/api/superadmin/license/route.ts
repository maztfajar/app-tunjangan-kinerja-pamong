import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getLicenseInfo, verifySerialNumber, invalidateLicenseCache } from '@/lib/license';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Super Admin.' }, { status: 403 });
    }

    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || undefined;
    const license = await getLicenseInfo(host);
    const userCount = await prisma.user.count({ where: { role: 'PEGAWAI' } });

    return NextResponse.json({
      license,
      userCount,
    });
  } catch (error) {
    console.error('Get license error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Super Admin.' }, { status: 403 });
    }

    const body = await request.json();
    const rawKey = body?.serialNumber?.trim();

    if (!rawKey) {
      return NextResponse.json({ error: 'Serial Number wajib diisi.' }, { status: 400 });
    }

    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || undefined;
    const verification = verifySerialNumber(rawKey, host);
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || 'Serial Number tidak valid atau format salah.' },
        { status: 400 }
      );
    }

    // Simpan ke AppSettings
    await prisma.appSettings.upsert({
      where: { id: 'default' },
      update: { serialNumber: rawKey },
      create: {
        id: 'default',
        namaApp: 'E-KINERJA',
        namaKantor: 'Kalurahan',
        subJudul: 'Sistem Informasi Pamong',
        serialNumber: rawKey,
      },
    });

    invalidateLicenseCache();
    const newLicense = await getLicenseInfo(host);

    return NextResponse.json({
      success: true,
      message: 'Serial Number berhasil diverifikasi dan diaktifkan.',
      license: newLicense,
    });
  } catch (error) {
    console.error('Save license error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan Serial Number' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Super Admin.' }, { status: 403 });
    }

    await prisma.appSettings.updateMany({
      where: { id: 'default' },
      data: { serialNumber: null },
    });

    invalidateLicenseCache();

    return NextResponse.json({
      success: true,
      message: 'Serial Number berhasil dihapus. Sistem kembali ke mode standar.',
    });
  } catch (error) {
    console.error('Delete license error:', error);
    return NextResponse.json({ error: 'Gagal mereset Serial Number' }, { status: 500 });
  }
}
