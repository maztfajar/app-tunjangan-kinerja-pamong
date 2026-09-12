import React from 'react';
import type { Metadata } from 'next';
import BiometricManager from '@/components/biometrics/BiometricManager';

export const metadata: Metadata = {
  title: 'Kunci Biometrik Super Admin - E-Kinerja Pamong',
  description: 'Pendaftaran dan Pengelolaan Kunci Biometrik (Face ID & Sidik Jari) Super Administrator',
};

export default function SuperAdminBiometrikPage() {
  return (
    <BiometricManager
      role="SUPERADMIN"
      roleName="Super Administrator"
      backUrl="/superadmin"
    />
  );
}
