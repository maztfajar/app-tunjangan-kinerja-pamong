import React from 'react';
import type { Metadata } from 'next';
import BiometricManager from '@/components/biometrics/BiometricManager';

export const metadata: Metadata = {
  title: 'Kunci Biometrik Pamong - E-Kinerja Pamong',
  description: 'Pendaftaran dan Pengelolaan Kunci Biometrik (Face ID & Sidik Jari) Pamong Kalurahan',
};

export default function DashboardBiometrikPage() {
  return (
    <BiometricManager
      role="PAMONG"
      roleName="Pamong / Perangkat Kalurahan"
      backUrl="/dashboard"
    />
  );
}
