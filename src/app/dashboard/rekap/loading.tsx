export default function RekapLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="skeleton-box" style={{ height: '28px', width: '240px', borderRadius: '8px' }} />
        <div className="skeleton-box" style={{ height: '16px', width: '280px', borderRadius: '6px' }} />
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <div className="skeleton-box" style={{ height: '42px', flex: 1, borderRadius: '10px' }} />
        <div className="skeleton-box" style={{ height: '42px', width: '100px', borderRadius: '10px' }} />
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{ background: 'var(--sk-card-bg)', border: '1px solid var(--sk-border)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="skeleton-box" style={{ height: '12px', width: '60%', borderRadius: '4px' }} />
            <div className="skeleton-box" style={{ height: '24px', width: '50%', borderRadius: '4px' }} />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div style={{ background: 'var(--sk-card-bg)', border: '1px solid var(--sk-border)', borderRadius: '14px', overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--sk-border)', display: 'flex', gap: '12px' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton-box" style={{ height: '12px', flex: 1, borderRadius: '4px' }} />
          ))}
        </div>
        {/* Table rows */}
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ padding: '14px 16px', borderBottom: '1px solid var(--sk-border)', display: 'flex', gap: '12px', alignItems: 'center' }}>
            {[...Array(5)].map((_, j) => (
              <div key={j} className="skeleton-box" style={{ height: '14px', flex: 1, borderRadius: '4px' }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
