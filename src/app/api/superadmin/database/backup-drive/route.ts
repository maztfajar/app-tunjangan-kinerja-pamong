import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getLicenseInfo } from '@/lib/license';
import { performGoogleDriveBackup } from '@/lib/backup';

export async function POST() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const license = await getLicenseInfo();
    if (!license.features.backupRestore) {
      return NextResponse.json(
        { error: 'Fitur Backup Cloud hanya tersedia pada lisensi PRO.' },
        { status: 403 }
      );
    }

    const settings = await prisma.appSettings.findUnique({
      where: { id: 'default' },
    });

    if (
      !settings?.gdriveClientId ||
      !settings?.gdriveClientSecret ||
      !settings?.gdriveRefreshToken
    ) {
      return NextResponse.json(
        {
          error:
            'Kredensial Google Drive belum lengkap. Silakan atur Client ID, Client Secret, dan Refresh Token terlebih dahulu.',
        },
        { status: 400 }
      );
    }

    const result = await performGoogleDriveBackup(
      {
        clientId: settings.gdriveClientId,
        clientSecret: settings.gdriveClientSecret,
        refreshToken: settings.gdriveRefreshToken,
        folderId: settings.gdriveFolderId || undefined,
      },
      settings.backupRetentionDays || 7
    );

    return NextResponse.json({
      success: true,
      message: `Backup berhasil diunggah ke Google Drive! File: ${result.fileName}`,
      fileName: result.fileName,
      fileId: result.fileId,
      fileUrl: result.fileUrl,
      prunedCount: result.prunedCount,
    });
  } catch (err: unknown) {
    console.error('Backup to Google Drive error:', err);

    // Rekam kegagalan di AppSettings
    try {
      await prisma.appSettings.update({
        where: { id: 'default' },
        data: {
          lastBackupStatus: `Gagal: ${(err as Error).message || 'Terjadi kesalahan'}`,
        },
      });
    } catch {}

    return NextResponse.json(
      { error: (err as Error).message || 'Gagal memproses backup ke Google Drive' },
      { status: 500 }
    );
  }
}
