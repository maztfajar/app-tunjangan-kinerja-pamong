import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getLicenseInfo } from '@/lib/license';
import BiometricManager from '@/components/biometrics/BiometricManager';

export const metadata: Metadata = {
  title: 'Kunci Biometrik Pamong - E-Kinerja Pamong',
  description: 'Pendaftaran dan Pengelolaan Kunci Biometrik (Face ID & Sidik Jari) Pamong Kalurahan',
};

export default async function DashboardBiometrikPage() {
  const license = await getLicenseInfo();
  if (!license.isPro || !license.features?.biometrics) {
    redirect('/dashboard');
  }

  return (
    <BiometricManager
      role="PAMONG"
      roleName="Pamong / Perangkat Kalurahan"
      backUrl="/dashboard"
    />
  );
}
