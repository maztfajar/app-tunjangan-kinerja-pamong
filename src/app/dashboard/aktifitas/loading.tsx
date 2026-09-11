export default function AktifitasLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="skeleton-box" style={{ height: '28px', width: '220px', borderRadius: '8px' }} />
        <div className="skeleton-box" style={{ height: '16px', width: '300px', borderRadius: '6px' }} />
      </div>

      {/* Form area skeleton */}
      <div style={{ background: 'var(--sk-card-bg)', border: '1px solid var(--sk-border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="skeleton-box" style={{ height: '14px', width: '120px', borderRadius: '4px' }} />
        <div className="skeleton-box" style={{ height: '80px', borderRadius: '10px' }} />
        <div className="skeleton-box" style={{ height: '44px', borderRadius: '10px' }} />
      </div>

      {/* List items skeleton */}
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{ background: 'var(--sk-card-bg)', border: '1px solid var(--sk-border)', borderRadius: '14px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div className="skeleton-box" style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="skeleton-box" style={{ height: '14px', width: '70%', borderRadius: '4px' }} />
            <div className="skeleton-box" style={{ height: '12px', width: '40%', borderRadius: '4px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
