'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface MapPickerProps {
  latitude: number;
  longitude: number;
  radius: number;
  onMapClick?: (lat: number, lng: number) => void;
  interactive?: boolean;
  showUserPosition?: boolean;
  userLat?: number;
  userLng?: number;
}

// =====================================================
// DEFINISI & KONFIGURASI CDN LEAFLET
// Kompatibel 100% untuk:
// - Localhost dev server
// - Cloudflare Tunnel (bebas AMD / webpack hanging)
// - Production hosting (Vercel, VPS, Nginx, Docker)
// - Smartphone browser (iOS Safari, Android Chrome)
// =====================================================
const LEAFLET_VER = '1.9.4';
const CDN_CSS = '/leaflet/leaflet.css';

const CDN_SOURCES = [
  '/leaflet/leaflet.js',
  `https://unpkg.com/leaflet@${LEAFLET_VER}/dist/leaflet.js`,
  `https://cdnjs.cloudflare.com/ajax/libs/leaflet/${LEAFLET_VER}/leaflet.js`,
  `https://cdn.jsdelivr.net/npm/leaflet@${LEAFLET_VER}/dist/leaflet.js`,
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeafletLib = any;

/** Inject Leaflet CSS jika belum tersedia secara global */
function injectLeafletCSS(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('__leaflet_cdn_css')) return;
  const link = document.createElement('link');
  link.id = '__leaflet_cdn_css';
  link.rel = 'stylesheet';
  link.href = CDN_CSS;
  link.crossOrigin = '';
  document.head.appendChild(link);
}

/**
 * Muat script Leaflet dengan masking window.define.amd.
 * Next.js Turbopack dev mendefinisikan window.define.amd, yang menyebabkan Leaflet UMD
 * mendaftar sebagai modul AMD anonim alih-alih mengekspor ke window.L.
 * Masking amd property menjamin Leaflet selalu terpasang ke window.L.
 */
function loadLeafletFromCDN(url: string, timeoutMs = 8000): Promise<LeafletLib> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Window not available'));

    const win = window as LeafletLib;
    if (win.L && (win.L.map || typeof win.L.map === 'function')) return resolve(win.L);
    if (win.leaflet && (win.leaflet.map || typeof win.leaflet.map === 'function')) {
      win.L = win.leaflet;
      return resolve(win.L);
    }

    // Bersihkan script lama jika ada
    const existing = document.querySelector(`script[data-leaflet-url="${url}"]`);
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    // Masking window.define sementara saat script dievaluasi
    const oldDefine = (win as any).define;
    let defineOverridden = false;
    if (typeof (win as any).define !== 'undefined') {
      try {
        (win as any).define = undefined;
        defineOverridden = true;
      } catch {
        /* ignore */
      }
    }

    let defineRestored = false;
    const restoreDefine = () => {
      if (defineRestored) return;
      defineRestored = true;
      if (defineOverridden) {
        try {
          (win as any).define = oldDefine;
        } catch {
          /* ignore */
        }
      }
    };

    const script = document.createElement('script');
    script.src = url;
    script.setAttribute('data-leaflet-url', url);
    script.crossOrigin = 'anonymous';
    script.async = true;

    const timer = setTimeout(() => {
      restoreDefine();
      if (script.parentNode) script.parentNode.removeChild(script);
      reject(new Error(`Timeout (${timeoutMs}ms) memuat Leaflet dari: ${url}`));
    }, timeoutMs);

    script.onload = () => {
      clearTimeout(timer);
      restoreDefine();

      const L = win.L || win.leaflet;
      if (L && (L.map || typeof L.map === 'function')) {
        win.L = L;
        resolve(L);
      } else {
        reject(new Error(`Script termuat dari ${url} namun window.L belum terdefinisi`));
      }
    };

    script.onerror = () => {
      clearTimeout(timer);
      restoreDefine();
      if (script.parentNode) script.parentNode.removeChild(script);
      reject(new Error(`Gagal memuat script Leaflet dari: ${url}`));
    };

    document.head.appendChild(script);
  });
}

/** Singleton promise untuk memuat Leaflet secara aman */
let leafletPromise: Promise<LeafletLib> | null = null;

function getLeaflet(): Promise<LeafletLib> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('SSR tidak mendukung Leaflet'));
  }

  const win = window as LeafletLib;
  if (win.L && (win.L.map || typeof win.L.map === 'function')) {
    return Promise.resolve(win.L);
  }

  if (leafletPromise) return leafletPromise;

  leafletPromise = (async () => {
    injectLeafletCSS();

    // 1. Cek window.L yang mungkin sudah terpasang
    if (win.L && (win.L.map || typeof win.L.map === 'function')) {
      return win.L;
    }

    // 2. Coba bundler import (Leaflet package yang terinstall di node_modules)
    try {
      const mod = await import('leaflet');
      const m = mod as any;
      const L = (m && (m.default || m.map)) ? (m.default || m) : m;
      if (L && typeof (L as any).map === 'function') {
        win.L = L;
        return L;
      }
    } catch (err) {
      console.warn('[MapPicker] Bundler import leaflet dilewati, menggunakan file script:', err);
    }

    // 3. Muat dari sumber lokal / CDN resmi dengan masking window.define
    for (const cdnUrl of CDN_SOURCES) {
      try {
        const L = await loadLeafletFromCDN(cdnUrl, 6000);
        if (L && (L.map || typeof L.map === 'function')) {
          win.L = L;
          return L;
        }
      } catch (err) {
        console.warn(`[MapPicker] Sumber Leaflet gagal (${cdnUrl}):`, (err as Error).message);
      }
    }

    throw new Error('Gagal memuat library peta Leaflet dari seluruh sumber.');
  })();

  leafletPromise.catch(() => {
    leafletPromise = null;
  });

  return leafletPromise;
}

// =====================================================
// KOMPONEN UTAMA MAPPICKER
// =====================================================
export default function MapPicker({
  latitude,
  longitude,
  radius,
  onMapClick,
  interactive = true,
  showUserPosition = false,
  userLat,
  userLng,
}: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletLib>(null);
  const leafletRef = useRef<LeafletLib>(null);
  const officeMarkerRef = useRef<LeafletLib>(null);
  const radiusCircleRef = useRef<LeafletLib>(null);
  const userMarkerRef = useRef<LeafletLib>(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Icon user — lingkaran hijau ala logo GPS Google Maps
  const createUserIcon = useCallback((L: LeafletLib) => {
    return L.divIcon({
      html: `
        <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:44px;height:44px;border-radius:50%;background:rgba(34,197,94,0.25);animation:userPulseRadar 2s infinite ease-out;"></div>
          <div style="position:relative;z-index:2;width:22px;height:22px;border-radius:50%;background:#22c55e;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      className: '',
      popupAnchor: [0, -22],
    });
  }, []);

  // Icon titik kantor — pin lokasi merah ala Google Maps, ukuran kecil
  const createOfficeIcon = useCallback((L: LeafletLib) => {
    return L.divIcon({
      html: `
        <svg width="28" height="38" viewBox="0 0 28 38" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
          <path d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 24 14 24S28 23.33 28 14C28 6.27 21.73 0 14 0z" fill="#e53e3e"/>
          <circle cx="14" cy="14" r="7" fill="#fff"/>
          <circle cx="14" cy="14" r="3.5" fill="#e53e3e"/>
        </svg>
      `,
      iconSize: [28, 38],
      iconAnchor: [14, 38],
      className: '',
      popupAnchor: [0, -38],
    });
  }, []);

  // Tombol navigasi kamera
  const handleCenterUser = useCallback(() => {
    if (mapRef.current && userLat !== undefined && userLng !== undefined) {
      mapRef.current.setView([userLat, userLng], 17, { animate: true });
    }
  }, [userLat, userLng]);

  const handleCenterOffice = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.setView([latitude, longitude], 17, { animate: true });
    }
  }, [latitude, longitude]);

  // Inisialisasi Peta
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Jika peta sudah ada di ref, bersihkan dulu sebelum inisialisasi ulang
    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch {
        /* ignore */
      }
      mapRef.current = null;
    }

    setMapReady(false);
    setMapError(null);

    const init = async () => {
      try {
        const L = await getLeaflet();
        if (cancelled || !containerRef.current) return;

        leafletRef.current = L;

        // Atur default path marker bawaan jika sewaktu-waktu dipakai
        try {
          delete (L.Icon.Default.prototype as LeafletLib)._getIconUrl;
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
            iconUrl: '/leaflet/images/marker-icon.png',
            shadowUrl: '/leaflet/images/marker-shadow.png',
          });
        } catch {
          /* ignore */
        }

        const el = containerRef.current;
        if ((el as any)._leaflet_id) {
          try {
            delete (el as any)._leaflet_id;
          } catch {
            /* ignore */
          }
          try {
            el.innerHTML = '';
          } catch {
            /* ignore */
          }
        }

        // Instansiasi Leaflet map
        const map = L.map(el, {
          center: [latitude, longitude],
          zoom: 17,
          zoomControl: true,
          fadeAnimation: true,
          markerZoomAnimation: true,
          dragging: interactive,
          touchZoom: interactive,
          scrollWheelZoom: interactive,
          doubleClickZoom: interactive,
          boxZoom: false,
        });

        if (cancelled) {
          try {
            map.remove();
          } catch {
            /* ignore */
          }
          return;
        }

        // Layer Peta OpenStreetMap dengan fallback ke CartoDB Voyager
        const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        });

        let fallbackApplied = false;
        osmLayer.on('tileerror', () => {
          if (!fallbackApplied && !cancelled) {
            fallbackApplied = true;
            try {
              map.removeLayer(osmLayer);
            } catch {
              /* ignore */
            }
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
              attribution: '&copy; CartoDB Voyager',
              subdomains: 'abcd',
              maxZoom: 19,
            }).addTo(map);
          }
        });
        osmLayer.addTo(map);

        // Marker Titik Kantor
        const officeMarker = L.marker([latitude, longitude], {
          icon: createOfficeIcon(L),
        }).addTo(map);

        officeMarker.bindPopup(
          '<div style="text-align:center;font-size:13px;font-family:inherit;"><b style="color:#1e3a8a;">🏢 Titik Kantor</b><br><span style="color:#64748b;font-size:11px;">Pusat Validasi Presensi</span></div>'
        );

        // Lingkaran Radius Presensi
        const circle = L.circle([latitude, longitude], {
          radius,
          color: '#2563eb',
          weight: 2,
          opacity: 0.8,
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
          dashArray: '6, 6',
        }).addTo(map);

        // Event Klik Peta (untuk halaman Admin Pengaturan Lokasi)
        if (onMapClick && interactive) {
          map.on('click', (e: LeafletLib) => {
            onMapClick(e.latlng.lat, e.latlng.lng);
          });
        }

        // Marker Posisi Pamong (User)
        let uMarker: LeafletLib = null;
        if (showUserPosition && userLat !== undefined && userLng !== undefined) {
          uMarker = L.marker([userLat, userLng], {
            icon: createUserIcon(L),
            zIndexOffset: 1000,
          }).addTo(map);

          uMarker.bindPopup(
            '<div style="text-align:center;font-size:13px;font-family:inherit;"><b style="color:#065f46;">📍 Posisi Anda</b><br><span style="color:#10b981;font-size:11px;font-weight:600;">📡 GPS Akurat</span></div>'
          );

          try {
            map.fitBounds(L.latLngBounds([[latitude, longitude], [userLat, userLng]]), {
              padding: [40, 40],
              maxZoom: 17,
            });
          } catch {
            map.setView([userLat, userLng], 17);
          }
        }

        mapRef.current = map;
        officeMarkerRef.current = officeMarker;
        radiusCircleRef.current = circle;
        userMarkerRef.current = uMarker;
        setMapReady(true);

        // Invalidate size bertahap untuk menyesuaikan layout di smartphone dan desktop
        [50, 150, 300, 600, 1200, 2000].forEach((ms) => {
          timers.push(
            setTimeout(() => {
              if (mapRef.current && !cancelled) {
                mapRef.current.invalidateSize({ animate: false });
              }
            }, ms)
          );
        });

        // ResizeObserver agar ukuran peta dinamis bila container berubah
        let ro: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined') {
          ro = new ResizeObserver(() => {
            if (mapRef.current && !cancelled) {
              mapRef.current.invalidateSize({ animate: false });
            }
          });
          ro.observe(el);
        }

        return () => {
          if (ro) ro.disconnect();
          try {
            map.remove();
          } catch {
            /* ignore */
          }
          mapRef.current = null;
        };
      } catch (err) {
        console.error('[MapPicker] Inisialisasi peta gagal:', err);
        if (!cancelled) {
          setMapError('Peta sedang dimuat. Silakan klik Muat Ulang bila jaringan lambat.');
        }
      }
    };

    let cleanup: (() => void) | undefined;
    init().then((fn) => {
      if (cancelled) {
        if (fn) fn();
      } else {
        cleanup = fn;
      }
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      if (cleanup) cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]);

  // Update posisi kantor dan radius saat prop berubah
  useEffect(() => {
    if (!mapRef.current || !officeMarkerRef.current || !radiusCircleRef.current) return;
    officeMarkerRef.current.setLatLng([latitude, longitude]);
    radiusCircleRef.current.setLatLng([latitude, longitude]);
    radiusCircleRef.current.setRadius(radius);
  }, [latitude, longitude, radius]);

  // Update posisi user GPS secara dinamis
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const map = mapRef.current;

    if (!showUserPosition || userLat === undefined || userLng === undefined) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      return;
    }

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLat, userLng]);
    } else {
      const m = L.marker([userLat, userLng], {
        icon: createUserIcon(L),
        zIndexOffset: 1000,
      }).addTo(map);

      m.bindPopup(
        '<div style="text-align:center;font-size:13px;font-family:inherit;"><b style="color:#065f46;">📍 Posisi Anda</b><br><span style="color:#10b981;font-size:11px;font-weight:600;">📡 GPS Akurat</span></div>'
      );
      userMarkerRef.current = m;
    }

    try {
      map.invalidateSize({ animate: false });
      map.fitBounds(L.latLngBounds([[latitude, longitude], [userLat, userLng]]), {
        padding: [45, 45],
        maxZoom: 17,
      });
    } catch {
      map.setView([userLat, userLng], 17);
    }
  }, [showUserPosition, userLat, userLng, latitude, longitude, createUserIcon]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: '280px',
        position: 'relative',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: '#e2e8f0',
      }}
    >
      <style>{`
        @keyframes _mpSpin { to { transform: rotate(360deg); } }
        @keyframes userPulseRadar {
          0% { transform: scale(0.8); opacity: 0.8; }
          50% { transform: scale(1.4); opacity: 0.3; }
          100% { transform: scale(0.8); opacity: 0.8; }
        }
      `}</style>

      {/* Container Leaflet DOM */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '280px',
          position: 'relative',
          zIndex: 1,
        }}
      />

      {/* Tombol navigasi floating cepat */}
      {mapReady && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {showUserPosition && userLat !== undefined && userLng !== undefined && (
            <button
              type="button"
              onClick={handleCenterUser}
              title="Pusatkan ke Posisi Saya"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#065f46',
                fontWeight: '700',
                fontSize: '11px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              <span>👤</span> Ke Saya
            </button>
          )}
          <button
            type="button"
            onClick={handleCenterOffice}
            title="Pusatkan ke Titik Kantor"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#1e40af',
              fontWeight: '700',
              fontSize: '11px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <span>🏢</span> Ke Kantor
          </button>
        </div>
      )}

      {/* Tampilan Loading saat peta sedang diinisialisasi */}
      {!mapReady && !mapError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc',
            zIndex: 20,
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid #e2e8f0',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: '_mpSpin 0.8s linear infinite',
            }}
          />
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
            Memuat Peta Koordinat...
          </span>
        </div>
      )}

      {/* Tampilan Error & Tombol Coba Lagi */}
      {mapError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fef2f2',
            zIndex: 20,
            gap: '8px',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '28px' }}>🗺️</span>
          <span style={{ fontSize: '13px', color: '#b91c1c', fontWeight: '600' }}>
            {mapError}
          </span>
          <button
            type="button"
            onClick={() => setRetryKey((k) => k + 1)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              backgroundColor: '#ffffff',
              color: '#dc2626',
              fontWeight: '700',
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
          >
            🔄 Coba Muat Ulang
          </button>
        </div>
      )}
    </div>
  );
}
