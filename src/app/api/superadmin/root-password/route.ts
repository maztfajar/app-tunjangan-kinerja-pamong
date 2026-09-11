import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Path ke file .env di root project
const ENV_PATH = resolve(process.cwd(), '.env');

function readEnv(): Record<string, string> {
  try {
    const content = readFileSync(ENV_PATH, 'utf-8');
    const result: Record<string, string> = {};
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      result[key] = val;
    }
    return result;
  } catch {
    return {};
  }
}

function writeEnvKey(key: string, value: string) {
  let content = readFileSync(ENV_PATH, 'utf-8');
  const regex = new RegExp(`^(${key}=).*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}="${value}"`);
  } else {
    content += `\n${key}="${value}"\n`;
  }
  writeFileSync(ENV_PATH, content, 'utf-8');
}

/**
 * GET /api/superadmin/root-password
 * Kembalikan username root saat ini (tanpa password)
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const env = readEnv();
    return NextResponse.json({
      username: env['SUPERADMIN_USER'] || 'root',
    });
  } catch (error) {
    console.error('Get root-password error:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

/**
 * POST /api/superadmin/root-password
 * Body: { currentPassword, newUsername?, newPassword, confirmPassword }
 * Mengubah SUPERADMIN_USER dan/atau SUPERADMIN_PASS di .env
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const { currentPassword, newUsername, newPassword, confirmPassword } = await request.json();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'Semua kolom wajib diisi.' }, { status: 400 });
    }

    // Verifikasi password lama
    const env = readEnv();
    const storedPass = env['SUPERADMIN_PASS'] || 'root';
    if (currentPassword !== storedPass) {
      return NextResponse.json({ error: 'Password lama tidak cocok.' }, { status: 401 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Password baru dan konfirmasi tidak sama.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password baru minimal 6 karakter.' }, { status: 400 });
    }

    // Update .env
    writeEnvKey('SUPERADMIN_PASS', newPassword);
    if (newUsername && newUsername.trim().length >= 3) {
      writeEnvKey('SUPERADMIN_USER', newUsername.trim());
    }

    return NextResponse.json({
      success: true,
      message: 'Password root berhasil diperbarui. Gunakan password baru untuk login berikutnya.',
    });
  } catch (error) {
    console.error('Change root-password error:', error);
    return NextResponse.json({ error: 'Server error saat mengubah password.' }, { status: 500 });
  }
}
