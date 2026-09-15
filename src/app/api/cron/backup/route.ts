import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLicenseInfo } from '@/lib/license';
import { performGoogleDriveBackup } from '@/lib/backup';

async function handleCronBackup(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const querySecret = url.searchParams.get('secret');
    const headerSecret = req.headers.get('x-cron-secret');
    const authHeader = req.headers.get('authorization');
    const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const providedSecret = querySecret || headerSecret || bearerSecret;

    // Ambil konfigurasi AppSettings
    const settings = await prisma.appSettings.findUnique({
      where: { id: 'default' },
    });

    const expectedSecret =
      settings?.gdriveCronSecret || process.env.CRON_SECRET || 'backup-secret-key';

    if (!providedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized. Secret key tidak valid.' },
        { status: 401 }
      );
    }

    // Periksa status Lisensi PRO
    const license = await getLicenseInfo();
    if (!license.features.backupRestore) {
      return NextResponse.json({
        success: false,
        status: 'skipped',
        message: 'Auto-Backup hanya aktif pada lisensi PRO.',
      });
    }

    // Jika user belum mengisi Client ID & Client Secret Google Drive:
    // Tidak error dan tidak mengganggu sistem.
    if (
      !settings?.gdriveClientId ||
      !settings?.gdriveClientSecret ||
      !settings?.gdriveRefreshToken
    ) {
      return NextResponse.json({
        success: true,
        status: 'skipped',
        message:
          'Kredensial Google Drive belum dikonfigurasi. Proses auto-backup dilewati secara aman.',
      });
    }

    // Jalankan pencadangan JSON dan pemangkasan 7 file terakhir
    const retention = settings.backupRetentionDays || 7;
    const result = await performGoogleDriveBackup(
      {
        clientId: settings.gdriveClientId,
        clientSecret: settings.gdriveClientSecret,
        refreshToken: settings.gdriveRefreshToken,
        folderId: settings.gdriveFolderId || undefined,
      },
      retention
    );

    return NextResponse.json({
      success: true,
      status: 'completed',
      message: `Pencadangan harian berhasil! File: ${result.fileName}`,
      timestamp: new Date().toISOString(),
      fileName: result.fileName,
      fileUrl: result.fileUrl,
      prunedFilesCount: result.prunedCount,
    });
  } catch (err: unknown) {
    console.error('[cron-backup] Error saat menjalankan auto-backup cron:', err);
    try {
      await prisma.appSettings.update({
        where: { id: 'default' },
        data: {
          lastBackupStatus: `Gagal Otomatis: ${(err as Error).message || 'Terjadi kesalahan'}`,
        },
      });
    } catch {}

    return NextResponse.json(
      {
        success: false,
        status: 'error',
        error: (err as Error).message || 'Terjadi kesalahan saat memproses auto-backup',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleCronBackup(req);
}

export async function POST(req: NextRequest) {
  return handleCronBackup(req);
}
