import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/auth/biometric/check
 * Memeriksa apakah akun yang sedang login sudah memiliki kredensial biometrik
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await prisma.biometricCredential.count({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      registered: count > 0,
      hasBiometric: count > 0,
      count,
    });
  } catch (error) {
    console.error('Error check biometric:', error);
    return NextResponse.json({ error: 'Gagal memeriksa status biometrik' }, { status: 500 });
  }
}

/**
 * DELETE /api/auth/biometric/check
 * Menghapus seluruh kredensial biometrik milik akun yang sedang login
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.biometricCredential.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Kunci biometrik berhasil dinonaktifkan.',
    });
  } catch (error) {
    console.error('Error delete biometric:', error);
    return NextResponse.json({ error: 'Gagal menonaktifkan biometrik' }, { status: 500 });
  }
}
