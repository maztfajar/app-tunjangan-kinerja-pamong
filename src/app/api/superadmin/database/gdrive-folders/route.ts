import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getLicenseInfo } from '@/lib/license';
import { getGoogleAccessToken } from '@/lib/gdrive';

export interface DriveFolder {
  id: string;
  name: string;
  parentId?: string;
}

export async function POST(req: NextRequest) {
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

    // Ambil kredensial dari body (saat user sedang mengisi modal, sebelum disimpan)
    // atau dari database jika body tidak lengkap
    const body = await req.json().catch(() => ({}));
    let clientId = (body.clientId || '').trim();
    let clientSecret = (body.clientSecret || '').trim();
    let refreshToken = (body.refreshToken || '').trim();

    // Jika salah satu field masih masked (••••), ambil dari database
    if (!clientId || !clientSecret || !refreshToken || clientSecret.includes('••') || refreshToken.includes('••')) {
      const settings = await prisma.appSettings.findUnique({
        where: { id: 'default' },
      });
      if (!settings?.gdriveClientId || !settings?.gdriveClientSecret || !settings?.gdriveRefreshToken) {
        return NextResponse.json(
          { error: 'Lengkapi Client ID, Client Secret, dan Refresh Token terlebih dahulu.' },
          { status: 400 }
        );
      }
      clientId = clientId || settings.gdriveClientId;
      clientSecret = clientSecret.includes('••') ? settings.gdriveClientSecret : (clientSecret || settings.gdriveClientSecret);
      refreshToken = refreshToken.includes('••') ? settings.gdriveRefreshToken : (refreshToken || settings.gdriveRefreshToken);
    }

    // Dapatkan access token
    const accessToken = await getGoogleAccessToken(clientId, clientSecret, refreshToken);

    // Ambil daftar folder dari Google Drive (termasuk Shared Drives jika ada)
    // Urutkan: terbaru dibuat paling atas, max 100 folder
    const listUrl = new URL('https://www.googleapis.com/drive/v3/files');
    listUrl.searchParams.set(
      'q',
      "mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    );
    listUrl.searchParams.set('fields', 'files(id, name, parents, createdTime)');
    listUrl.searchParams.set('orderBy', 'name');
    listUrl.searchParams.set('pageSize', '100');

    const listRes = await fetch(listUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listRes.ok) {
      const errData = await listRes.json().catch(() => ({}));
      throw new Error(
        errData.error?.message || `Gagal mengambil daftar folder (HTTP ${listRes.status})`
      );
    }

    const data = await listRes.json();
    const folders: DriveFolder[] = (data.files || []).map(
      (f: { id: string; name: string; parents?: string[] }) => ({
        id: f.id,
        name: f.name,
        parentId: f.parents?.[0],
      })
    );

    return NextResponse.json({ folders });
  } catch (err: unknown) {
    console.error('[gdrive-folders] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Gagal mengambil daftar folder Google Drive' },
      { status: 500 }
    );
  }
}
