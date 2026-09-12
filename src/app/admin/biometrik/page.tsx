import React from 'react';
import type { Metadata } from 'next';
import BiometricManager from '@/components/biometrics/BiometricManager';

export const metadata: Metadata = {
  title: 'Kunci Biometrik Admin - E-Kinerja Pamong',
  description: 'Pendaftaran dan Pengelolaan Kunci Biometrik (Face ID & Sidik Jari) Administrator Kalurahan',
};

export default function AdminBiometrikPage() {
  return (
    <BiometricManager
      role="ADMIN"
      roleName="Administrator Kalurahan"
      backUrl="/admin"
    />
  );
}
