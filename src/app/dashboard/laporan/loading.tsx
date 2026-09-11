export default function LaporanLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="skeleton-box" style={{ height: '28px', width: '260px', borderRadius: '8px' }} />
        <div className="skeleton-box" style={{ height: '16px', width: '340px', borderRadius: '6px' }} />
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ background: 'var(--sk-card-bg)', border: '1px solid var(--sk-border)', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px', minWidth: '200px', flex: 1 }}>
            <div className="skeleton-box" style={{ width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="skeleton-box" style={{ height: '12px', width: '60%', borderRadius: '4px' }} />
              <div className="skeleton-box" style={{ height: '20px', width: '50%', borderRadius: '4px' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div className="skeleton-box" style={{ height: '42px', width: '160px', borderRadius: '10px' }} />
        <div className="skeleton-box" style={{ height: '42px', width: '140px', borderRadius: '10px' }} />
        <div className="skeleton-box" style={{ height: '42px', width: '120px', borderRadius: '10px', marginLeft: 'auto' }} />
      </div>

      {/* Large table skeleton */}
      <div style={{ background: 'var(--sk-card-bg)', border: '1px solid var(--sk-border)', borderRadius: '14px', overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ padding: '16px', borderBottom: '2px solid var(--sk-border)', display: 'flex', gap: '10px' }}>
          {[48, 120, 140, 70, 70, 120, 100, 90, 50].map((w, i) => (
            <div key={i} className="skeleton-box" style={{ height: '13px', width: `${w}px`, flexShrink: 0, borderRadius: '4px' }} />
          ))}
        </div>
        {/* Table rows */}
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ padding: '18px 16px', borderBottom: '1px solid var(--sk-border)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            {[48, 120, 140, 70, 70, 120, 100, 90, 50].map((w, j) => (
              <div key={j} className="skeleton-box" style={{ height: '14px', width: `${w}px`, flexShrink: 0, borderRadius: '4px' }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
