import { useMemo } from 'react';

export default function AnalyticsDashboard({ data, isDarkMode }) {
  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;
    
    const siteMap = new Map();
    data.forEach(r => {
      const key = r.baseLocation; 
      if (!siteMap.has(key)) siteMap.set(key, r.matchStatus);
    });

    const statusValues = Array.from(siteMap.values());
    return {
      total: siteMap.size,
      unchanged: statusValues.filter(s => s === 'UNCHANGED').length,
      new: statusValues.filter(s => s === 'NEW').length,
      removed: statusValues.filter(s => s === 'REMOVED').length,
      mismatch: statusValues.filter(s => s === 'MISMATCH').length,
    };
  }, [data]);

  // 🚀 THE TRIGGER: Checks if data exists to activate the 68px compact mode
  const isCompact = data && data.length > 0;

  // EMPTY STATE (Tall mode before scan)
  if (!stats || stats.total === 0) {
    return (
      <div className={`analytics-bar-card luxury-glass ${isCompact ? 'compact-mode' : ''}`} style={{ opacity: 0.6 }}>
        <div className="bar-header">
          <span className="chart-title">DELTA BREAKDOWN</span>
          <span className="chart-title" style={{ color: 'var(--text-secondary)' }}>0 SITES</span>
        </div>
        <div className="stacked-bar-wrapper">
          <div className="bar-segment" style={{ width: '100%', backgroundColor: 'var(--border-color)' }}></div>
        </div>
      </div>
    );
  }

  const getWidth = (value) => `${(value / stats.total) * 100}%`;

  return (
    <div className={`analytics-bar-card luxury-glass ${isCompact ? 'compact-mode' : ''}`}>
      <div className="bar-header">
        <span className="chart-title">DELTA BREAKDOWN</span>
      </div>
      
      <div className="stacked-bar-wrapper">
        {stats.unchanged > 0 && <div className="bar-segment unchanged" style={{ width: getWidth(stats.unchanged) }} title={`Verified: ${stats.unchanged}`}></div>}
        {stats.new > 0 && <div className="bar-segment new" style={{ width: getWidth(stats.new) }} title={`New: ${stats.new}`}></div>}
        {stats.mismatch > 0 && <div className="bar-segment mismatch" style={{ width: getWidth(stats.mismatch) }} title={`Mismatch: ${stats.mismatch}`}></div>}
        {stats.removed > 0 && <div className="bar-segment removed" style={{ width: getWidth(stats.removed) }} title={`Removed: ${stats.removed}`}></div>}
      </div>
    </div>
  );
}