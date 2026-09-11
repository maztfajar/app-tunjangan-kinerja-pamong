'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearProgressTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (finishTimerRef.current) {
      clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }

    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
  };

  // Reset/selesaikan progress bar saat pathname atau searchParams berubah
  useEffect(() => {
    if (!isVisible) return;

    const finalizeProgress = () => {
      requestAnimationFrame(() => setProgress(100));
      finishTimerRef.current = setTimeout(() => {
        setIsVisible(false);
        setProgress(0);
        finishTimerRef.current = null;
      }, 250);
    };

    finalizeProgress();

    return () => {
      if (finishTimerRef.current) {
        clearTimeout(finishTimerRef.current);
        finishTimerRef.current = null;
      }
    };
  }, [pathname, searchParams, isVisible]);

  // Intercept semua klik pada link internal untuk respon visual instan 0ms
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Hanya tangani klik kiri biasa tanpa modifier (Ctrl, Cmd, Shift, Alt)
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

      // Cari elemen tag anchor <a> terdekat
      const anchor = (e.target as HTMLElement)?.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Abaikan hash link, tel, mailto, target blank, atau javascript:
      if (
        href.startsWith('#') ||
        href.startsWith('tel:') ||
        href.startsWith('mailto:') ||
        href.startsWith('javascript:') ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download')
      ) {
        return;
      }

      // Pastikan tujuan adalah URL internal dalam domain yang sama
      try {
        const targetUrl = new URL(anchor.href, window.location.href);
        if (targetUrl.origin !== window.location.origin) return;

        // Jika URL sama persis dengan halaman saat ini, tidak perlu progress bar
        const currentPath = window.location.pathname + window.location.search;
        const targetPath = targetUrl.pathname + targetUrl.search;
        if (currentPath === targetPath) return;

        // Mulai animasi loading seketika (0 milidetik umpan balik visual)
        clearProgressTimers();

        setIsVisible(true);
        setProgress(25);

        // Simulasi peningkatan progress bertahap sampai navigasi selesai
        timerRef.current = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 88) {
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              return 88;
            }
            // Lompatan acak alami antara 5% - 15%
            return prev + Math.floor(Math.random() * 10) + 5;
          });
        }, 150);

        // Pengaman: Jika setelah 8 detik tidak berpindah, reset otomatis
        safetyTimeoutRef.current = setTimeout(() => {
          setIsVisible((vis) => {
            if (vis) {
              clearProgressTimers();
              setProgress(0);
              return false;
            }
            return false;
          });
        }, 8000);
      } catch {
        // Abaikan parsing URL invalid
      }
    };

    document.addEventListener('click', handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener('click', handleDocumentClick, { capture: true });
      clearProgressTimers();
    };
  }, []);

  if (!isVisible && progress === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        zIndex: 999999,
        pointerEvents: 'none',
        background: 'transparent',
      }}
      aria-hidden="true"
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #4361ee 0%, #3a0ca3 60%, #06d6a0 100%)',
          boxShadow: '0 0 10px rgba(67, 97, 238, 0.7), 0 0 5px rgba(6, 214, 160, 0.5)',
          borderRadius: '0 3px 3px 0',
          transition: progress === 100 ? 'width 0.15s ease-out, opacity 0.2s ease' : 'width 0.2s cubic-bezier(0.1, 0.9, 0.2, 1)',
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
