export default function SuperAdminLoading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        width: '100%',
        gap: '16px',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#7c3aed',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
          Memuat Panel Super Admin...
        </p>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          Menghubungkan ke layanan konfigurasi sistem
        </p>
      </div>
    </div>
  );
}
