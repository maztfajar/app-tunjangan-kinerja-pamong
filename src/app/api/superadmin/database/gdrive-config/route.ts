import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getLicenseInfo } from '@/lib/license';
import { testGoogleDriveConnection } from '@/lib/gdrive';

// Pastikan kolom-kolom gdrive ada di AppSettings jika migrasi belum dijalankan
async function ensureGDriveColumns() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "gdriveClientId" TEXT;
      ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "gdriveClientSecret" TEXT;
      ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "gdriveRefreshToken" TEXT;
      ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "gdriveFolderId" TEXT;
      ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "gdriveFolderName" TEXT;
      ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "gdriveCronSecret" TEXT;
      ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "lastBackupAt" TIMESTAMP;
      ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "lastBackupStatus" TEXT;
      ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "lastBackupFileName" TEXT;
      ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "lastBackupFileUrl" TEXT;
      ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "backupRetentionDays" INTEGER DEFAULT 7;
    `);
  } catch {
    // Abaikan jika SQLite atau sudah ada
  }
}

export async function GET() {
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

    await ensureGDriveColumns();

    const settings = await prisma.appSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      return NextResponse.json({ configured: false });
    }

    const hasConfig = Boolean(
      settings.gdriveClientId &&
        settings.gdriveClientSecret &&
        settings.gdriveRefreshToken
    );

    // Sensor client secret dan refresh token untuk keamanan tampilan
    const maskedSecret = settings.gdriveClientSecret
      ? settings.gdriveClientSecret.length > 8
        ? settings.gdriveClientSecret.slice(0, 4) + '••••••••' + settings.gdriveClientSecret.slice(-4)
        : '••••••••'
      : '';

    const maskedToken = settings.gdriveRefreshToken
      ? settings.gdriveRefreshToken.length > 8
        ? settings.gdriveRefreshToken.slice(0, 4) + '••••••••' + settings.gdriveRefreshToken.slice(-4)
        : '••••••••'
      : '';

    return NextResponse.json({
      configured: hasConfig,
      clientId: settings.gdriveClientId || '',
      maskedClientSecret: maskedSecret,
      maskedRefreshToken: maskedToken,
      folderId: settings.gdriveFolderId || '',
      folderName: settings.gdriveFolderName || '',
      cronSecret: settings.gdriveCronSecret || 'backup-secret-key',
      retentionDays: settings.backupRetentionDays || 7,
      lastBackupAt: settings.lastBackupAt,
      lastBackupStatus: settings.lastBackupStatus,
      lastBackupFileName: settings.lastBackupFileName,
      lastBackupFileUrl: settings.lastBackupFileUrl,
    });
  } catch (err) {
    console.error('GDrive config GET error:', err);
    return NextResponse.json({ error: 'Gagal mengambil konfigurasi Google Drive' }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

    await ensureGDriveColumns();

    const body = await req.json();
    const {
      clientId,
      clientSecret,
      refreshToken,
      folderId,
      folderName,
      cronSecret,
      retentionDays,
      testOnly,
    } = body;

    const current = await prisma.appSettings.findUnique({
      where: { id: 'default' },
    });

    // Gunakan nilai lama jika user tidak mengetik ulang secret yang disensor
    const finalClientSecret =
      clientSecret && !clientSecret.includes('••••')
        ? clientSecret.trim()
        : current?.gdriveClientSecret || '';

    const finalRefreshToken =
      refreshToken && !refreshToken.includes('••••')
        ? refreshToken.trim()
        : current?.gdriveRefreshToken || '';

    const finalClientId = (clientId || '').trim();
    const finalFolderId = (folderId || '').trim();
    const finalFolderName = (folderName || '').trim();

    // Jika user menguji koneksi atau menyimpan data konfigurasi
    if (finalClientId && finalClientSecret && finalRefreshToken) {
      const testResult = await testGoogleDriveConnection({
        clientId: finalClientId,
        clientSecret: finalClientSecret,
        refreshToken: finalRefreshToken,
        folderId: finalFolderId || undefined,
      });

      if (testOnly) {
        return NextResponse.json({
          success: true,
          message: testResult.message,
        });
      }
    } else if (testOnly) {
      return NextResponse.json(
        { error: 'Lengkapi Client ID, Client Secret, dan Refresh Token untuk menguji koneksi.' },
        { status: 400 }
      );
    }

    // Simpan ke database
    await prisma.appSettings.upsert({
      where: { id: 'default' },
      update: {
        gdriveClientId: finalClientId || null,
        gdriveClientSecret: finalClientSecret || null,
        gdriveRefreshToken: finalRefreshToken || null,
        gdriveFolderId: finalFolderId || null,
        gdriveFolderName: finalFolderName || null,
        gdriveCronSecret: (cronSecret || 'backup-secret-key').trim(),
        backupRetentionDays: Number(retentionDays) || 7,
      },
      create: {
        id: 'default',
        namaApp: 'E-KINERJA',
        gdriveClientId: finalClientId || null,
        gdriveClientSecret: finalClientSecret || null,
        gdriveRefreshToken: finalRefreshToken || null,
        gdriveFolderId: finalFolderId || null,
        gdriveFolderName: finalFolderName || null,
        gdriveCronSecret: (cronSecret || 'backup-secret-key').trim(),
        backupRetentionDays: Number(retentionDays) || 7,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Konfigurasi Google Drive berhasil disimpan.',
    });
  } catch (err: unknown) {
    console.error('GDrive config POST error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Gagal menyimpan konfigurasi Google Drive' },
      { status: 500 }
    );
  }
}
