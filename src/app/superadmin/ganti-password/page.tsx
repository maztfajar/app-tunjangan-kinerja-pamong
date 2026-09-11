'use client';

import { useState, useEffect } from 'react';
import { IconCheckCircle, IconInfo } from '@/components/ui/Icons';

export default function RootPasswordPage() {
  const [currentUsername, setCurrentUsername] = useState('root');
  const [form, setForm] = useState({
    currentPassword: '',
    newUsername: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    fetch('/api/superadmin/root-password')
      .then((r) => r.json())
      .then((d) => { if (d.username) setCurrentUsername(d.username); })
      .catch(() => {});

    // Pastikan form username baru tetap bersih dari autofill browser
    const timer = setTimeout(() => {
      setForm((prev) => ({ ...prev, newUsername: '' }));
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/superadmin/root-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Gagal mengubah password.' });
      } else {
        setMessage({ type: 'success', text: data.message });
        setForm({ currentPassword: '', newUsername: '', newPassword: '', confirmPassword: '' });
        if (form.newUsername.trim().length >= 3) {
          setCurrentUsername(form.newUsername.trim());
        }
      }
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan.' });
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = (pw: string) => {
    if (!pw) return null;
    if (pw.length < 6) return { label: 'Terlalu Pendek', color: '#ef4444', w: '20%' };
    if (pw.length < 8) return { label: 'Lemah', color: '#f97316', w: '40%' };
    const hasUpper = /[A-Z]/.test(pw);
    const hasNum = /[0-9]/.test(pw);
    const hasSymbol = /[^A-Za-z0-9]/.test(pw);
    const score = [hasUpper, hasNum, hasSymbol].filter(Boolean).length;
    if (score === 0) return { label: 'Sedang', color: '#eab308', w: '55%' };
    if (score === 1) return { label: 'Kuat', color: '#22c55e', w: '75%' };
    return { label: 'Sangat Kuat', color: '#10b981', w: '100%' };
  };

  const strength = passwordStrength(form.newPassword);

  return (
    <div style={{ maxWidth: '560px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '20px' }}>🔐</span>
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Ganti Password Root</h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
              Ubah kredensial login Super Admin Dashboard Root
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div style={{ background: '#f5f3ff', border: '1px solid #e9d5ff', borderRadius: '12px', padding: '14px 16px', marginBottom: '24px', display: 'flex', gap: '10px' }}>
        <span style={{ fontSize: '18px', flexShrink: 0 }}>ℹ️</span>
        <div>
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#6d28d9', margin: '0 0 4px 0' }}>Informasi Akun Saat Ini</p>
          <p style={{ fontSize: '12px', color: '#7c3aed', margin: 0 }}>
            Username aktif: <strong style={{ fontFamily: 'monospace', background: '#ede9fe', padding: '1px 6px', borderRadius: '4px' }}>{currentUsername}</strong>
          </p>
          <p style={{ fontSize: '11.5px', color: '#8b5cf6', margin: '4px 0 0 0', lineHeight: 1.4 }}>
            Perubahan password langsung memperbarui file <code>.env</code> di server. Password baru akan aktif mulai login berikutnya.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Hidden inputs to absorb aggressive browser autofill */}
        <input type="text" name="prevent_autofill_user" tabIndex={-1} aria-hidden="true" autoComplete="off" style={{ display: 'none' }} />
        <input type="password" name="prevent_autofill_pwd" tabIndex={-1} aria-hidden="true" autoComplete="off" style={{ display: 'none' }} />

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Password Lama */}
          <div>
            <label className="input-label" style={{ fontWeight: '700' }}>Password Lama (Saat Ini)</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              className="input-field"
              placeholder="Masukkan password root yang sedang aktif"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              required
              autoComplete="current-password"
            />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '2px 0' }} />

          {/* Username Baru (Opsional) */}
          <div>
            <label className="input-label" style={{ fontWeight: '700' }}>
              Username Baru{' '}
              <span style={{ fontSize: '10px', background: '#f1f5f9', color: '#64748b', padding: '1px 7px', borderRadius: '10px', fontWeight: '600', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                Opsional
              </span>
            </label>
            <input
              type="text"
              name="new_root_username_clean"
              id="new_root_username_clean"
              className="input-field"
              placeholder={`Biarkan kosong untuk tetap pakai "${currentUsername}"`}
              value={form.newUsername}
              onChange={(e) => setForm({ ...form, newUsername: e.target.value })}
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
              minLength={3}
            />
            <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
              Minimal 3 karakter. Biarkan kosong jika tidak ingin mengganti username.
            </span>
          </div>

          {/* Password Baru */}
          <div>
            <label className="input-label" style={{ fontWeight: '700' }}>Password Baru</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              className="input-field"
              placeholder="Minimal 6 karakter"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              required
              autoComplete="new-password"
              minLength={6}
            />
            {/* Strength Bar */}
            {strength && (
              <div style={{ marginTop: '6px' }}>
                <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: strength.w, background: strength.color, borderRadius: '4px', transition: 'all 0.3s ease' }} />
                </div>
                <span style={{ fontSize: '11px', color: strength.color, fontWeight: '700', marginTop: '3px', display: 'block' }}>
                  Kekuatan: {strength.label}
                </span>
              </div>
            )}
          </div>

          {/* Konfirmasi Password */}
          <div>
            <label className="input-label" style={{ fontWeight: '700' }}>Konfirmasi Password Baru</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              className="input-field"
              placeholder="Ulangi password baru"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              required
              autoComplete="new-password"
              style={{
                borderColor: form.confirmPassword && form.newPassword !== form.confirmPassword ? '#ef4444'
                  : form.confirmPassword && form.newPassword === form.confirmPassword ? '#22c55e' : undefined,
              }}
            />
            {form.confirmPassword && form.newPassword !== form.confirmPassword && (
              <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600', marginTop: '3px', display: 'block' }}>
                ✗ Password tidak sama
              </span>
            )}
            {form.confirmPassword && form.newPassword === form.confirmPassword && (
              <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: '600', marginTop: '3px', display: 'block' }}>
                ✓ Password cocok
              </span>
            )}
          </div>

          {/* Toggle Show Password */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
            <input
              type="checkbox"
              checked={showPasswords}
              onChange={(e) => setShowPasswords(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: '#7c3aed' }}
            />
            Tampilkan password
          </label>
        </div>

        {/* Feedback Message */}
        {message && (
          <div
            className="animate-fade-in"
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {message.type === 'success' ? (
              <IconCheckCircle size={18} color="#16a34a" />
            ) : (
              <IconInfo size={18} color="#dc2626" />
            )}
            <span style={{ fontSize: '13px', fontWeight: '600', color: message.type === 'success' ? '#15803d' : '#b91c1c' }}>
              {message.text}
            </span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || (!!form.confirmPassword && form.newPassword !== form.confirmPassword)}
          className="btn-primary"
          style={{
            padding: '14px 24px',
            fontSize: '15px',
            fontWeight: '700',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
            boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {loading ? (
            <>
              <div className="spinner" style={{ width: '18px', height: '18px' }} />
              <span>Menyimpan...</span>
            </>
          ) : (
            <>
              <span>🔐</span>
              <span>Simpan Password Baru</span>
            </>
          )}
        </button>
      </form>

      {/* Catatan Keamanan */}
      <div style={{ marginTop: '20px', padding: '12px 14px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: '10px', fontSize: '11.5px', color: '#713f12', lineHeight: 1.5 }}>
        ⚠️ <strong>Catatan Keamanan:</strong> Setelah mengganti password, Anda akan tetap login pada sesi ini. Password baru akan berlaku saat login berikutnya. Simpan password baru di tempat yang aman.
      </div>
    </div>
  );
}
