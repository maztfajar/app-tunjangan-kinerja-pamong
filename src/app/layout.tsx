import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import "./report-table.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Absensi & Tunjangan Kinerja Pamong - Kapanewon Pengasih",
  description: "Sistem Absensi Pamong berbasis GPS dengan fitur manajemen tugas, log aktifitas, dan penilaian kinerja pamong",
  applicationName: "Presensi Pamong",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Presensi Pamong",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

import { Suspense } from "react";
import NavigationProgressBar from "@/components/ui/NavigationProgressBar";
import ChunkErrorHandler from "@/components/ui/ChunkErrorHandler";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={plusJakartaSans.className} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
      </head>
      <body suppressHydrationWarning>
        <ChunkErrorHandler />
        <Suspense fallback={null}>
          <NavigationProgressBar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
