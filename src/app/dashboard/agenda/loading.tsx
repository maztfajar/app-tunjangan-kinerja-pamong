export default function AgendaLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="skeleton-box" style={{ height: '28px', width: '210px', borderRadius: '8px' }} />
        <div className="skeleton-box" style={{ height: '16px', width: '290px', borderRadius: '6px' }} />
      </div>

      {/* Calendar/filter area */}
      <div style={{ background: 'var(--sk-card-bg)', border: '1px solid var(--sk-border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="skeleton-box" style={{ height: '18px', width: '150px', borderRadius: '6px' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <div className="skeleton-box" style={{ height: '32px', width: '32px', borderRadius: '8px' }} />
            <div className="skeleton-box" style={{ height: '32px', width: '32px', borderRadius: '8px' }} />
          </div>
        </div>
        {/* Calendar grid placeholder */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
          {[...Array(35)].map((_, i) => (
            <div key={i} className="skeleton-box" style={{ height: '34px', borderRadius: '8px' }} />
          ))}
        </div>
      </div>

      {/* Agenda items */}
      {[...Array(3)].map((_, i) => (
        <div key={i} style={{ background: 'var(--sk-card-bg)', border: '1px solid var(--sk-border)', borderRadius: '14px', padding: '16px', display: 'flex', gap: '14px' }}>
          <div className="skeleton-box" style={{ width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="skeleton-box" style={{ height: '14px', width: '65%', borderRadius: '4px' }} />
            <div className="skeleton-box" style={{ height: '12px', width: '45%', borderRadius: '4px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
