import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { generateWebAuthnChallenge, verifyWebAuthnChallenge } from '@/lib/webauthn';

/**
 * GET /api/auth/biometric/register
 * Mengambil parameter pendaftaran WebAuthn (challenge & info pengguna)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Silakan login terlebih dahulu.' }, { status: 401 });
    }

    const challenge = generateWebAuthnChallenge(user.id);
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost';
    const domain = host.split(':')[0];

    return NextResponse.json({
      success: true,
      options: {
        challenge,
        rp: {
          name: 'E-Kinerja Pamong Kalurahan',
          id: domain,
        },
        user: {
          id: Buffer.from(user.id).toString('base64url'),
          name: user.nip,
          displayName: user.nama,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256 (Standar Android & iPhone)
          { alg: -257, type: 'public-key' },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Biometrik bawaan fisik smartphone (Face/Fingerprint)
          userVerification: 'required',        // Wajib biometrik wajah atau sidik jari
          residentKey: 'required',             // Wajib residentKey untuk Apple Face ID / Touch ID
        },
        timeout: 60000,
        attestation: 'none',
      },
    });
  } catch (error) {
    console.error('Error biometric register challenge:', error);
    return NextResponse.json({ error: 'Gagal menyiapkan pendaftaran biometrik' }, { status: 500 });
  }
}

/**
 * POST /api/auth/biometric/register
 * Menyimpan credentialId dan publicKey biometrik ke database
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { credentialId, publicKey, challenge, deviceLabel } = body;

    if (!credentialId || !challenge) {
      return NextResponse.json({ error: 'Data kredensial tidak lengkap' }, { status: 400 });
    }

    // Validasi keaslian challenge
    const isValidChallenge = verifyWebAuthnChallenge(challenge);
    if (!isValidChallenge) {
      return NextResponse.json({ error: 'Challenge kedaluwarsa atau tidak valid. Silakan coba lagi.' }, { status: 400 });
    }

    // Simpan atau perbarui kredensial biometrik untuk pengguna ini
    const existing = await prisma.biometricCredential.findUnique({
      where: { credentialId },
    });

    if (existing) {
      await prisma.biometricCredential.update({
        where: { credentialId },
        data: {
          userId: user.id,
          publicKey: publicKey || existing.publicKey,
          deviceLabel: deviceLabel || existing.deviceLabel,
        },
      });
    } else {
      await prisma.biometricCredential.create({
        data: {
          userId: user.id,
          credentialId,
          publicKey: publicKey || '',
          deviceLabel: deviceLabel || 'Smartphone Biometrik',
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Kunci biometrik (Wajah / Sidik Jari) berhasil didaftarkan untuk perangkat ini.',
    });
  } catch (error) {
    console.error('Error save biometric credential:', error);
    return NextResponse.json({ error: 'Gagal menyimpan kredensial biometrik' }, { status: 500 });
  }
}
