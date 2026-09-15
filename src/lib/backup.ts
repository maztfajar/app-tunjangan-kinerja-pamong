import { prisma } from '@/lib/prisma';
import { uploadBackupToDrive, pruneOldBackups, GDriveConfig } from '@/lib/gdrive';

/**
 * Mengambil seluruh data aplikasi untuk keperluan backup JSON
 */
export async function exportDatabaseToJson(): Promise<string> {
  const [
    users,
    masterJabatan,
    masterUnitKerja,
    presensi,
    aktifitas,
    laporan,
    laporanKinerja,
    agenda,
    hariLibur,
    appSettings,
    jamKerja,
    tasks,
    kegiatanJabatan,
    rencanaKegiatan,
    outputKegiatan,
    biometricCredential,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.masterJabatan.findMany(),
    prisma.masterUnitKerja.findMany(),
    prisma.presensi.findMany(),
    prisma.aktifitas.findMany(),
    prisma.laporan.findMany(),
    prisma.laporanKinerja.findMany(),
    prisma.agenda.findMany(),
    prisma.hariLibur.findMany(),
    prisma.appSettings.findUnique({ where: { id: 'default' } }),
    prisma.jamKerja.findMany(),
    prisma.task.findMany(),
    prisma.kegiatanJabatan.findMany(),
    prisma.rencanaKegiatan.findMany(),
    prisma.outputKegiatan.findMany(),
    prisma.biometricCredential.findMany(),
  ]);

  const payload = {
    users,
    masterJabatan,
    masterUnitKerja,
    presensi,
    aktifitas,
    laporan,
    laporanKinerja,
    agenda,
    hariLibur,
    appSettings,
    jamKerja,
    tasks,
    kegiatanJabatan,
    rencanaKegiatan,
    outputKegiatan,
    biometricCredential,
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Menjalankan proses backup ke Google Drive dan meretensi maksimal 7 data terakhir
 */
export async function performGoogleDriveBackup(config: GDriveConfig, maxKeep: number = 7) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const fileName = `ekinerja-backup-${dateStr}.json`;

  // 1. Ekspor data ke JSON
  const jsonContent = await exportDatabaseToJson();

  // 2. Unggah ke Google Drive
  const uploadResult = await uploadBackupToDrive({
    config,
    fileName,
    jsonContent,
  });

  // 3. Pangkas file lama (retensi 7 hari / 7 file terakhir)
  const pruneResult = await pruneOldBackups({
    config,
    maxKeep,
  });

  // 4. Perbarui status di AppSettings
  try {
    await prisma.appSettings.update({
      where: { id: 'default' },
      data: {
        lastBackupAt: now,
        lastBackupStatus: `Sukses (${pruneResult.deletedCount} file lama dibersihkan)`,
        lastBackupFileName: fileName,
        lastBackupFileUrl: uploadResult.webViewLink || `https://drive.google.com/file/d/${uploadResult.fileId}/view`,
      },
    });
  } catch (dbErr) {
    console.warn('[backup] Peringatan update AppSettings status backup:', dbErr);
  }

  return {
    success: true,
    fileName,
    fileId: uploadResult.fileId,
    fileUrl: uploadResult.webViewLink,
    prunedCount: pruneResult.deletedCount,
  };
}
