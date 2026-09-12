import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getLicenseInfo } from '@/lib/license';
import BiometricManager from '@/components/biometrics/BiometricManager';

export const metadata: Metadata = {
  title: 'Kunci Biometrik Admin - E-Kinerja Pamong',
  description: 'Pendaftaran dan Pengelolaan Kunci Biometrik (Face ID & Sidik Jari) Administrator Kalurahan',
};

export default async function AdminBiometrikPage() {
  const license = await getLicenseInfo();
  if (!license.isPro || !license.features?.biometrics) {
    redirect('/admin');
  }

  return (
    <BiometricManager
      role="ADMIN"
      roleName="Administrator Kalurahan"
      backUrl="/admin"
    />
  );
}
