/**
 * Helper Service Integrasi Google Drive API v3 (OAuth2)
 * Menggunakan native fetch tanpa dependensi eksternal tambahan.
 */

export interface GDriveConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  folderId?: string;
}

/**
 * Mendapatkan access token baru dari Google menggunakan refresh token
 */
export async function getGoogleAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId.trim(),
      client_secret: clientSecret.trim(),
      refresh_token: refreshToken.trim(),
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error_description || err.error || `HTTP ${res.status}`;
    throw new Error(`Google OAuth2 Error: ${msg}. Periksa Client ID, Client Secret, dan Refresh Token.`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error('Google OAuth2 tidak mengembalikan access_token.');
  }

  return data.access_token;
}

/**
 * Menguji koneksi kredensial OAuth2 Google Drive & memeriksa akses Folder
 */
export async function testGoogleDriveConnection(config: GDriveConfig): Promise<{
  success: boolean;
  message: string;
  folderName?: string;
}> {
  const accessToken = await getGoogleAccessToken(
    config.clientId,
    config.clientSecret,
    config.refreshToken
  );

  if (config.folderId && config.folderId.trim()) {
    const folderRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        config.folderId.trim()
      )}?fields=id,name,mimeType,trashed`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!folderRes.ok) {
      throw new Error(
        `Folder ID "${config.folderId}" tidak ditemukan atau tidak dapat diakses (HTTP ${folderRes.status}). Pastikan Folder ID benar dan dibagikan dengan akun Google Anda.`
      );
    }

    const folderData = await folderRes.json();
    if (folderData.trashed) {
      throw new Error(`Folder "${folderData.name}" berada di Sampah (Trash) Google Drive.`);
    }

    return {
      success: true,
      message: `Berhasil terhubung ke Google Drive! Target folder: "${folderData.name}".`,
      folderName: folderData.name,
    };
  }

  // Jika tanpa folderId, cek akun Drive
  const aboutRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!aboutRes.ok) {
    throw new Error(`Koneksi ke Google Drive gagal (HTTP ${aboutRes.status}).`);
  }

  const aboutData = await aboutRes.json();
  const userName = aboutData.user?.displayName || aboutData.user?.emailAddress || 'Google User';

  return {
    success: true,
    message: `Berhasil terhubung ke Google Drive akun "${userName}" (Akan disimpan di root drive).`,
  };
}

/**
 * Mengunggah berkas JSON Backup ke Google Drive
 */
export async function uploadBackupToDrive({
  config,
  fileName,
  jsonContent,
}: {
  config: GDriveConfig;
  fileName: string;
  jsonContent: string;
}): Promise<{
  fileId: string;
  fileName: string;
  webViewLink?: string;
  size?: string;
}> {
  const accessToken = await getGoogleAccessToken(
    config.clientId,
    config.clientSecret,
    config.refreshToken
  );

  const metadata: Record<string, unknown> = {
    name: fileName,
    mimeType: 'application/json',
    description: 'Backup Database Otomatis E-Kinerja Pamong Kapanewon Pengasih',
  };

  if (config.folderId && config.folderId.trim()) {
    metadata.parents = [config.folderId.trim()];
  }

  const boundary = '-------GoogleDriveBackupBoundary' + Date.now();
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    jsonContent +
    closeDelimiter;

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size,createdTime',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    const msg = err.error?.message || `HTTP ${uploadRes.status}`;
    throw new Error(`Gagal mengunggah file backup ke Google Drive: ${msg}`);
  }

  const resData = await uploadRes.json();
  return {
    fileId: resData.id,
    fileName: resData.name,
    webViewLink: resData.webViewLink || `https://drive.google.com/file/d/${resData.id}/view`,
    size: resData.size,
  };
}

/**
 * Otomatis menghapus file backup lama agar maksimal hanya 7 file terakhir yang disimpan
 * Memenuhi syarat: retensi maksimal 7 data (7 hari) terakhir.
 */
export async function pruneOldBackups({
  config,
  maxKeep = 7,
}: {
  config: GDriveConfig;
  maxKeep?: number;
}): Promise<{ totalFound: number; deletedCount: number }> {
  try {
    const accessToken = await getGoogleAccessToken(
      config.clientId,
      config.clientSecret,
      config.refreshToken
    );

    let query = `name contains 'ekinerja-backup-' and mimeType = 'application/json' and trashed = false`;
    if (config.folderId && config.folderId.trim()) {
      query += ` and '${config.folderId.trim()}' in parents`;
    }

    const listUrl = new URL('https://www.googleapis.com/drive/v3/files');
    listUrl.searchParams.set('q', query);
    listUrl.searchParams.set('fields', 'files(id, name, createdTime)');
    listUrl.searchParams.set('orderBy', 'createdTime desc');
    listUrl.searchParams.set('pageSize', '100');

    const listRes = await fetch(listUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listRes.ok) {
      console.warn('[gdrive] Gagal query daftar backup lama:', await listRes.text());
      return { totalFound: 0, deletedCount: 0 };
    }

    const data = await listRes.json();
    const files = (data.files || []) as Array<{ id: string; name: string; createdTime: string }>;

    let deletedCount = 0;
    // Jika jumlah file melebihi batas simpan (misal 7), hapus yang tertua
    if (files.length > maxKeep) {
      const filesToDelete = files.slice(maxKeep);
      for (const f of filesToDelete) {
        try {
          const delRes = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (delRes.ok) {
            deletedCount++;
          }
        } catch (delErr) {
          console.warn(`[gdrive] Gagal menghapus file lama ${f.name} (${f.id}):`, delErr);
        }
      }
    }

    return { totalFound: files.length, deletedCount };
  } catch (err) {
    console.warn('[gdrive] Peringatan saat pembersihan backup lama:', err);
    return { totalFound: 0, deletedCount: 0 };
  }
}
