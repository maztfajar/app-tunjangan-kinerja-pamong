import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/auth/biometric/check
 * Memeriksa dan mengambil daftar kredensial biometrik milik akun yang sedang login
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const credentials = await prisma.biometricCredential.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        credentialId: true,
        deviceLabel: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      registered: credentials.length > 0,
      hasBiometric: credentials.length > 0,
      count: credentials.length,
      items: credentials,
    });
  } catch (error) {
    console.error('Error check biometric:', error);
    return NextResponse.json({ error: 'Gagal memeriksa status biometrik' }, { status: 500 });
  }
}

/**
 * DELETE /api/auth/biometric/check
 * Menghapus satu atau seluruh kredensial biometrik milik akun yang sedang login
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetId = req.nextUrl.searchParams.get('id');

    if (targetId) {
      await prisma.biometricCredential.deleteMany({
        where: { id: targetId, userId: user.id },
      });

      return NextResponse.json({
        success: true,
        message: 'Perangkat biometrik berhasil dihapus dari database.',
      });
    }

    await prisma.biometricCredential.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Seluruh kunci biometrik berhasil dihapus dari database.',
    });
  } catch (error) {
    console.error('Error delete biometric:', error);
    return NextResponse.json({ error: 'Gagal menghapus biometrik' }, { status: 500 });
  }
}

/**
 * PATCH /api/auth/biometric/check
 * Memperbarui nama label perangkat (misal: "Samsung Galaxy A54 Budi")
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, deviceLabel } = body;

    if (!id || !deviceLabel) {
      return NextResponse.json({ error: 'ID perangkat dan nama label wajib diisi.' }, { status: 400 });
    }

    await prisma.biometricCredential.updateMany({
      where: { id, userId: user.id },
      data: { deviceLabel: deviceLabel.trim() },
    });

    return NextResponse.json({
      success: true,
      message: 'Nama perangkat biometrik berhasil diperbarui di database.',
    });
  } catch (error) {
    console.error('Error update biometric device:', error);
    return NextResponse.json({ error: 'Gagal memperbarui nama perangkat' }, { status: 500 });
  }
}
