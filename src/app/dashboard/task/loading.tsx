export default function TaskLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="skeleton-box" style={{ height: '28px', width: '180px', borderRadius: '8px' }} />
        <div className="skeleton-box" style={{ height: '16px', width: '260px', borderRadius: '6px' }} />
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton-box" style={{ height: '34px', width: '90px', borderRadius: '8px' }} />
        ))}
      </div>

      {/* Task list skeleton */}
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ background: 'var(--sk-card-bg)', border: '1px solid var(--sk-border)', borderRadius: '14px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="skeleton-box" style={{ height: '14px', width: '75%', borderRadius: '4px' }} />
              <div className="skeleton-box" style={{ height: '12px', width: '50%', borderRadius: '4px' }} />
            </div>
            <div className="skeleton-box" style={{ height: '22px', width: '70px', borderRadius: '999px' }} />
          </div>
          <div className="skeleton-box" style={{ height: '12px', width: '40%', borderRadius: '4px' }} />
        </div>
      ))}
    </div>
  );
}
