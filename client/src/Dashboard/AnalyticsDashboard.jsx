import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function AnalyticsDashboard({ data, activeFilter, onFilterChange }) {
  if (!data || data.length === 0) return null;

  const newSites = data.filter(r => r.Status === 'NEW SITE').length;
  const removed = data.filter(r => r.Status === 'REMOVED SITE').length;
  const mismatch = data.filter(r => r.Status === 'NAME MISMATCH').length;
  const unchanged = data.filter(r => r.Status === 'UNCHANGED').length;

  const chartData = [
    { name: 'New', value: newSites, color: '#28a745' },
    { name: 'Removed', value: removed, color: '#dc3545' },
    { name: 'Mismatch', value: mismatch, color: '#ffc107' },
    { name: 'Unchange', value: unchanged, color: '#5e5e5d' }
  ].filter(item => item.value > 0);

  const getCardStyle = (type, colorInfo) => {
    const isActive = activeFilter === type;
    return {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      border: isActive ? `2px solid ${colorInfo.border}` : '1px solid var(--border-color)',
      backgroundColor: isActive ? colorInfo.bg : 'var(--bg-card)',
      transform: isActive ? 'scale(1.02)' : 'scale(1)',
      boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.1)' : 'var(--shadow-card)'
    };
  };

  return (
    <div className="dashboard-container">
      <div className="chart-section">
        <h4 className="chart-title">Breakdown</h4>
        <div style={{ width: '100%', height: 130 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={5} dataKey="value">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="cards-section">
        <div className="stat-card total" onClick={() => onFilterChange('ALL')} style={getCardStyle('ALL', { border: '#007bff', bg: 'rgba(0, 123, 255, 0.1)' })}>
          <span className="stat-label">Total</span>
          <span className="stat-value">{data.length}</span>
        </div>
        <div className="stat-card new" onClick={() => onFilterChange('NEW SITE')} style={getCardStyle('NEW SITE', { border: '#28a745', bg: 'rgba(40, 167, 69, 0.1)' })}>
          <span className="stat-label">New</span>
          <span className="stat-value">{newSites}</span>
        </div>
        <div className="stat-card removed" onClick={() => onFilterChange('REMOVED SITE')} style={getCardStyle('REMOVED SITE', { border: '#dc3545', bg: 'rgba(220, 53, 69, 0.1)' })}>
          <span className="stat-label">Removed</span>
          <span className="stat-value">{removed}</span>
        </div>
        <div className="stat-card mismatch" onClick={() => onFilterChange('NAME MISMATCH')} style={getCardStyle('NAME MISMATCH', { border: '#ffc107', bg: 'rgba(255, 193, 7, 0.1)' })}>
          <span className="stat-label">Mismatch</span>
          <span className="stat-value">{mismatch}</span>
        </div>
        <div className="stat-card unchanged" onClick={() => onFilterChange('UNCHANGED')} style={getCardStyle('UNCHANGED', { border: '#3c3c3c', bg: 'rgba(137, 136, 136, 0.18)' })}>
          <span className="stat-label">Unchanged</span>
          <span className="stat-value">{unchanged}</span>
        </div>
      </div>
    </div>
  );
}