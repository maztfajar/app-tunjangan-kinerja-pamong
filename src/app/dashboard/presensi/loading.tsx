export default function PresensiLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="skeleton-box" style={{ height: '28px', width: '200px', borderRadius: '8px' }} />
        <div className="skeleton-box" style={{ height: '16px', width: '320px', borderRadius: '6px' }} />
      </div>

      {/* Map skeleton */}
      <div className="skeleton-box" style={{ height: '260px', borderRadius: '16px' }} />

      {/* Cards grid skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ background: 'var(--sk-card-bg)', border: '1px solid var(--sk-border)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="skeleton-box" style={{ height: '14px', width: '60%', borderRadius: '4px' }} />
            <div className="skeleton-box" style={{ height: '22px', width: '80%', borderRadius: '4px' }} />
          </div>
        ))}
      </div>

      {/* Button skeleton */}
      <div className="skeleton-box" style={{ height: '50px', borderRadius: '12px' }} />
    </div>
  );
}
