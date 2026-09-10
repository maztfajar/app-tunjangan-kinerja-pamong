/**
 * Menghitung jarak antara dua titik koordinat menggunakan formula Haversine
 * @returns jarak dalam meter
 */
export function hitungJarakMeter(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000; // radius bumi dalam meter
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Mengambil posisi GPS user melalui browser Geolocation API
 */
export function getGPSPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation tidak didukung oleh browser Anda'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 35000, // Ditingkatkan menjadi 35 detik agar perangkat baru leluasa menyetujui izin
      maximumAge: 5000,
    });
  });
}

/**
 * Jenis callback posisi GPS (dipakai oleh startFastGps)
 */
export interface GpsPositionCallbacks {
  onSuccess: (pos: GeolocationPosition) => void;
  onError: (err: GeolocationPositionError) => void;
}

/**
 * Mulai deteksi titik GPS dengan waktu tunggu toleran (35 detik) dioptimalkan untuk perangkat baru dan smartphone.
 *
 * Strategi multi-lapis agar titik & izin lokasi tidak ditolak prematur:
 *  - Mengaktifkan watchPosition secara paralel agar segera menyambar koordinat begitu pamong menekan tombol "Izinkan"
 *  - Memberikan timeout 35.000ms (35 detik) sehingga pamong leluasa membaca prompt izin browser
 *  - Jika satelit butuh pemanasan, fallback otomatis mengambil posisi coarse (jaringan/seluler)
 *
 * @returns fungsi untuk menghentikan pelacakan (clearWatch).
 */
export function startFastGps(
  onSuccess: GpsPositionCallbacks['onSuccess'],
  onError: GpsPositionCallbacks['onError']
): () => void {
  let watchId: number | null = null;
  let isCleanedUp = false;

  const clear = () => {
    isCleanedUp = true;
    if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        navigator.geolocation.clearWatch(watchId);
      } catch {
        /* ignore */
      }
      watchId = null;
    }
  };

  const startWatch = (opts: PositionOptions) => {
    if (isCleanedUp) return;
    try {
      if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!isCleanedUp) onSuccess(pos);
        },
        undefined,
        opts
      );
    } catch {
      /* ignore */
    }
  };

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return clear;
  }

  try {
    // 1. Mulai watchPosition akurasi tinggi dengan timeout 35s agar langsung menerima titik begitu izin disetujui
    startWatch({ enableHighAccuracy: true, timeout: 35000, maximumAge: 5000 });

    // 2. Minta koordinat dengan timeout 35 detik (sangat cukup bagi pamong di HP baru)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!isCleanedUp) {
          onSuccess(pos);
          startWatch({ enableHighAccuracy: true, timeout: 30000, maximumAge: 3000 });
        }
      },
      (err) => {
        if (isCleanedUp) return;
        if (err.code === err.PERMISSION_DENIED) {
          clear();
          onError(err);
          return;
        }

        // 3. Fallback coarse (WiFi/seluler) jika satelit membutuhkan waktu tambahan
        navigator.geolocation.getCurrentPosition(
          (coarsePos) => {
            if (!isCleanedUp) {
              onSuccess(coarsePos);
              startWatch({ enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 });
            }
          },
          (coarseErr) => {
            if (!isCleanedUp) {
              clear();
              onError(coarseErr);
            }
          },
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: false, timeout: 35000, maximumAge: 10000 }
    );
  } catch (e) {
    console.error('startFastGps exception:', e);
  }

  return clear;
}
