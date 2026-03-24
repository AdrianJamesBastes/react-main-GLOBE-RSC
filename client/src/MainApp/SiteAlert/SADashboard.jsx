import { useState, useMemo, useEffect, useRef } from 'react';
import useDarkMode from '../../hooks/useDarkMode';
import useSearchDebounce from '../../hooks/useSearchDebounce';
import { processWirelessAlarms, processTransportAlarms } from '../../services/dataGrouper';

import globeLogoDark from '../../assets/Globe_LogoW.png';
import globeLogoLight from '../../assets/Globe_LogoB.png';
import searchIcon from '../../assets/search.png';
import fileDark from '../../assets/fileDark.png';
import fileLight from '../../assets/fileLight.png';
import warningDark from '../../assets/warningDark.png';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Rectangle } from 'recharts';

import * as XLSX from 'xlsx';
import { useNavigate } from "react-router-dom";
import { FixedSizeList as List, VariableSizeList } from 'react-window';
import DashboardLayout from '../../components/DashboardLayout';
import { ThemedButton, ThemedBadge } from '../../components/common';
import '../../styles/Dashboard_styles.css';

export default function SADashboard() {
  const [monitorFile1, setMonitorFile1] = useState(null); 
  const [monitorFile2, setMonitorFile2] = useState(null); 
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [dashboardMode, setDashboardMode] = useState('wireless');

  const navigate = useNavigate();
  const [isDarkMode, toggleTheme] = useDarkMode();
  const { searchTerm, setSearchTerm, debouncedTerm } = useSearchDebounce();

  const [selectedRowDetails, setSelectedRowDetails] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeSidebarView, setActiveSidebarView] = useState('input');

  const [drillDownData, setDrillDownData] = useState(null);
  const [modalSearchTerm, setModalSearchTerm] = useState(""); 
  const [isDrillDownRendered, setIsDrillDownRendered] = useState(false);
  const [isDrillDownVisible, setIsDrillDownVisible] = useState(false);
  const [drillDownOrigin, setDrillDownOrigin] = useState('50% 50%');
  const [modalListHeight, setModalListHeight] = useState(600);

  const expandBtnRef = useRef(null);
  const [isGraphModalRendered, setIsGraphModalRendered] = useState(false); 
  const [isGraphModalVisible, setIsGraphModalVisible] = useState(false);   
  const [graphModalOrigin, setGraphModalOrigin] = useState('0% 0%');                 
  const [selectedGraphAlarm, setSelectedGraphAlarm] = useState(null);

  const listContainerRef = useRef(null);
  const [mainListSize, setMainListSize] = useState({ width: '100%', height: 600 });
  const monitorFile1Ref = useRef(null);
  const monitorFile2Ref = useRef(null);

  const CHART_COLORS = ['#8a2be2', '#1a73e8', '#00bfa5', '#f0a500', '#f02849'];
  const currentLogo = isDarkMode ? globeLogoDark : globeLogoLight;

  useEffect(() => {
    const handleResize = () => setModalListHeight((window.innerHeight * 0.9) - 190);
    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!listContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setMainListSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    observer.observe(listContainerRef.current);
    return () => observer.disconnect();
  }, [results]);

  const handleModeToggle = () => {
    setDashboardMode(prev => prev === 'wireless' ? 'transport' : 'wireless');
    setResults([]);
    setSelectedRowDetails(null);
    setSearchTerm("");
    setSelectedGraphAlarm(null);
    setMonitorFile1(null);
    setMonitorFile2(null);
    setActiveSidebarView('input');
    setModalSearchTerm("");
    setDrillDownData(null);
    setIsDrillDownVisible(false);
    setIsDrillDownRendered(false);
    if (monitorFile1Ref.current) monitorFile1Ref.current.value = '';
    if (monitorFile2Ref.current) monitorFile2Ref.current.value = '';
  };

  const handleFileChange = (e, setFileState) => {
    const file = e.target.files[0];
    if (file) setFileState(file);
  };

  const readUniversalFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' }); 
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
          
          let headerRowIndex = 0;
          for (let i = 0; i < rawData.length; i++) {
            const rowValues = Object.values(rawData[i]).map(v => String(v).toUpperCase());
            if (rowValues.includes('ALARM TEXT') || rowValues.includes('NAME') || rowValues.includes('SEVERITY')) {
              headerRowIndex = i;
              break;
            }
          }

          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            range: headerRowIndex, 
            defval: "" 
          });

          resolve(jsonData);
        } catch {
          reject(new Error("Failed to parse file."));
        }
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleScan = async () => {
    if (dashboardMode === 'wireless') {
      if (!monitorFile1 || !monitorFile2) return alert("Please upload both the NMS and SA Masterlist files.");
    } else {
      if (!monitorFile1) return alert("Please upload the NMS file.");
    }
    
    setIsLoading(true);
    setResults([]);
    setSelectedRowDetails(null);

    try {
      const nmsData = await readUniversalFile(monitorFile1);
      if (nmsData.length === 0) throw new Error("NMS File is empty.");

      if (dashboardMode === 'wireless') {
        const masterData = await readUniversalFile(monitorFile2);
        const result = processWirelessAlarms(nmsData, masterData);
        if (result.success) {
          setResults(result.data);
          if (result.data.length > 0) {
            setActiveSidebarView('analytics');
            setIsSidebarCollapsed(false); 
          } else {
            alert("No matching wireless alarms found (10+ repetitions required).");
          }
        } else {
          alert("Error: " + result.error);
        }
        setIsLoading(false);
      } 
      else if (dashboardMode === 'transport') {
        const result = processTransportAlarms(nmsData);
        if (result.success) {
          // Normalize transport data to match wireless format
          const normalizedData = result.data.map(item => ({
            alert: item.alarm || "N/A",
            dn: item.li || "N/A",
            name: item.sn || "N/A",
            pla: item.severity || "N/A",
            count: item.count,
            rawRows: item.rawRows
          }));

          setResults(normalizedData);
          if (normalizedData.length > 0) {
            setActiveSidebarView('analytics');
            setIsSidebarCollapsed(false); 
          } else {
            alert("No matching transport alarms found.");
          }
        } else {
          alert("Error: " + result.error);
        }
        setIsLoading(false);
      }

    } catch (error) {
      alert("Error reading files: " + error.message);
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (results.length === 0) return alert("No data to export.");
    const flattenedData = [];
    let originalNMSHeaders = [];
    if (results[0] && results[0].rawRows && results[0].rawRows.length > 0) {
      originalNMSHeaders = Object.keys(results[0].rawRows[0]);
    }
    
    const strictHeaderOrder = dashboardMode === 'wireless' 
      ? ["Severity Rank", "Total Repetitions", "Occurrence #", "Masterlist PLA_ID", "Masterlist Site Name", ...originalNMSHeaders]
      : ["Severity Rank", "Total Repetitions", "Occurrence #", "Severity", "Site Name (Alarm Source)", "Location Info", "Alarm Name", ...originalNMSHeaders];

    results.forEach((group, groupIndex) => {
      if (group.rawRows) {
        group.rawRows.forEach((rawRow, idx) => {
          const formattedRawRow = {};
          originalNMSHeaders.forEach(key => {
            const value = rawRow[key];
            const isTimeCol = key.toLowerCase().includes('time') || key.toLowerCase().includes('date') || key.toLowerCase().includes('stamp');
            if (isTimeCol && typeof value === 'number' && value > 30000) {
              const dateObj = new Date(Math.round((value - 25569) * 86400 * 1000));
              const m = dateObj.getUTCMonth() + 1;
              const d = dateObj.getUTCDate();
              const y = dateObj.getUTCFullYear(); 
              const hh = String(dateObj.getUTCHours()).padStart(2, '0');
              const mm = String(dateObj.getUTCMinutes()).padStart(2, '0');
              const ss = String(dateObj.getUTCSeconds()).padStart(2, '0');
              formattedRawRow[key] = `${m}/${d}/${y} ${hh}:${mm}:${ss}`; 
            } else {
              formattedRawRow[key] = (value === null || value === undefined) ? "" : value;
            }
          });
          
          flattenedData.push({ 
            "Severity Rank": groupIndex + 1, 
            "Total Repetitions": group.count, 
            "Occurrence #": idx + 1, 
            [dashboardMode === 'wireless' ? "Masterlist PLA_ID" : "Severity"]: group.pla || "N/A", 
            [dashboardMode === 'wireless' ? "Masterlist Site Name" : "Site Name (Alarm Source)"]: group.name || "N/A", 
            [dashboardMode === 'wireless' ? "Distinguished Name" : "Location Info"]: group.dn || "N/A",
            [dashboardMode === 'wireless' ? "Alarm Text" : "Alarm Name"]: group.alert || "N/A",
            ...formattedRawRow 
          });
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(flattenedData, { header: strictHeaderOrder });
    const columnWidths = strictHeaderOrder.map(header => {
      let maxLength = header.length; 
      flattenedData.forEach(row => {
        const cellValue = row[header] ? row[header].toString() : "";
        if (cellValue.length > maxLength) maxLength = cellValue.length;
      });
      return { wch: Math.min(maxLength + 2, 50) }; 
    });
    worksheet['!cols'] = columnWidths;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Raw Alarms");
    XLSX.writeFile(workbook, `${dashboardMode.toUpperCase()}_SiteAlerts_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleNavigate = (path) => {
    setIsLoading(true);
    setTimeout(() => navigate(path), 1000); 
  };

  const filteredResults = useMemo(() => {
    const term = debouncedTerm.toLowerCase();
    return results
      .filter(row => [row.pla, row.name, row.alert, row.dn].filter(Boolean).some(value => value.toString().toLowerCase().includes(term)))
      .sort((a, b) => b.count - a.count); 
  }, [results, debouncedTerm]);

  const filteredModalRows = useMemo(() => {
    if (!drillDownData) return [];
    const term = modalSearchTerm.toLowerCase();
    if (!term) return drillDownData.rawRows;
    return drillDownData.rawRows.filter(rawRow => Object.values(rawRow).some(val => String(val).toLowerCase().includes(term)));
  }, [drillDownData, modalSearchTerm]);

  const totalOccurrences = useMemo(() => results.reduce((sum, row) => sum + row.count, 0), [results]);
  const uniqueSitesCount = useMemo(() => new Set(results.map(row => row.name)).size, [results]);

  const alarmStats = useMemo(() => {
    if (!results || results.length === 0) return [];
    const stats = {};
    let max = 0;
    results.forEach(row => {
      if (!stats[row.alert]) stats[row.alert] = 0;
      stats[row.alert] += row.count;
    });
    const statsArray = Object.keys(stats).map(key => {
      if (stats[key] > max) max = stats[key];
      return { name: key, count: stats[key] };
    }).sort((a, b) => b.count - a.count);

    const totalAlarms = statsArray.reduce((sum, stat) => sum + stat.count, 0);

    return statsArray.map(stat => ({ 
      ...stat, 
      percentage: (stat.count / max) * 100, 
      totalPercentage: ((stat.count / totalAlarms) * 100).toFixed(1) 
    }));
  }, [results]);

  const topSitesData = useMemo(() => {
    if (selectedGraphAlarm) {
      return results.filter(r => r.alert === selectedGraphAlarm).sort((a,b) => b.count - a.count);
    }
    return [...results].sort((a,b) => b.count - a.count).slice(0, 50); 
  }, [results, selectedGraphAlarm]);

  const openGraphModal = () => {
    if (expandBtnRef.current) {
      const rect = expandBtnRef.current.getBoundingClientRect();
      const originXPercent = (((rect.left + rect.width / 2) - (window.innerWidth * 0.1)) / (window.innerWidth * 0.8)) * 100;
      const originYPercent = (((rect.top + rect.height / 2) - (window.innerHeight * 0.075)) / (window.innerHeight * 0.85)) * 100;
      setGraphModalOrigin(`${originXPercent}% ${originYPercent}%`);
    }
    setSelectedGraphAlarm(null); 
    setIsGraphModalRendered(true);
    setTimeout(() => setIsGraphModalVisible(true), 10); 
  };

  const closeGraphModal = () => {
    setIsGraphModalVisible(false); 
    setTimeout(() => {
      setIsGraphModalRendered(false);
      setSelectedGraphAlarm(null); 
    }, 350); 
  };

  const openDrillDownModal = (e, row) => {
    e.stopPropagation(); 
    setModalSearchTerm(""); 
    setDrillDownData(row);
    const rect = e.target.getBoundingClientRect();
    const originXPercent = (((rect.left + rect.width / 2) - (window.innerWidth * 0.075)) / (window.innerWidth * 0.85)) * 100;
    const originYPercent = (((rect.top + rect.height / 2) - (window.innerHeight * 0.05)) / (window.innerHeight * 0.9)) * 100;
    setDrillDownOrigin(`${originXPercent}% ${originYPercent}%`);
    setIsDrillDownRendered(true);
    setTimeout(() => setIsDrillDownVisible(true), 10);
  };

  const closeDrillDownModal = () => {
    setIsDrillDownVisible(false);
    setTimeout(() => { setIsDrillDownRendered(false); setDrillDownData(null); }, 350);
  };

  const getValidEntries = (rawRow) => {
    return Object.entries(rawRow).filter(([, value]) => {
      if (value === null || value === undefined) return false;
      const strVal = String(value).trim();
      if (strVal === "" || strVal.toLowerCase() === "null" || strVal.toLowerCase() === "undefined") return false;
      return true;
    });
  };

  const getModalRowHeight = (index) => {
    const raw = filteredModalRows[index];
    const validEntries = getValidEntries(raw);
    const gridRows = Math.ceil(validEntries.length / 5); 
    return (gridRows * 120) + ((gridRows - 1) * 12) + 130; 
  };

  const VirtualizedRow = ({ index, style }) => {
    const row = filteredResults[index];
    let rowStyle = { ...style, display: 'flex', alignItems: 'center', padding: '0 20px', cursor: "pointer", transition: "background-color 0.2s", borderBottom: "1px solid rgba(128,128,128,0.1)", boxSizing: 'border-box', fontSize: '0.85rem' };
    const columnStyle = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '15px', boxSizing: 'border-box' };

    return (
      <div style={rowStyle} className="row-hover" onClick={() => { setSelectedRowDetails(row); setActiveSidebarView('details'); setIsSidebarCollapsed(false); }}>
        <div style={{ ...columnStyle, width: '12%', fontWeight: 'bold', color: dashboardMode === 'transport' ? 'var(--color-danger-light)' : 'var(--text-primary)' }}>
           {row.pla || "N/A"}
        </div>
        <div style={{ ...columnStyle, width: '23%', color: 'var(--color-info)', fontWeight: 'bold' }}>
           {row.name || "N/A"}
        </div>
        <div style={{ ...columnStyle, width: '20%', fontFamily: 'ARIAL', color: 'var(--text-primary)' }}>
           {row.alert || "N/A"}
        </div>
        <div style={{ ...columnStyle, width: '37%', fontFamily: 'monospace', fontSize: '1rem', color: 'var(--text-primary)' }}>
           {row.dn || "N/A"}
        </div>
        <div style={{ ...columnStyle, width: '8%', textAlign: 'center' }}>
           <ThemedBadge variant="danger" onClick={(e) => openDrillDownModal(e, row)} title="Click to view all occurrences">
             {row.count}
           </ThemedBadge>
        </div>
      </div>
    );
  };

  const VirtualizedModalRow = ({ index, style }) => {
    const raw = filteredModalRows[index];
    const validEntries = getValidEntries(raw);

    return (
      <div style={{ ...style, padding: '0 5px 20px 5px', boxSizing: 'border-box' }}>
        <div style={{ background: 'var(--bg-input)', padding: '25px', borderRadius: '12px', border: '1px solid var(--border-light)', boxSizing: 'border-box', height: '100%' }}>
          <div style={{ color: isDarkMode ? '#ffffff' : 'var(--brand-purple)', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '15px', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>
            Occurrence #{index + 1}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
            {validEntries.map(([key, value]) => {
              const isTimeCol = key.toLowerCase().includes('time') || key.toLowerCase().includes('date') || key.toLowerCase().includes('stamp');
              let displayShort = String(value);
              let displayOriginal = null;

              if (isTimeCol && typeof value === 'number' && value > 30000) {
                const dateObj = new Date(Math.round((value - 25569) * 86400 * 1000));
                const m = dateObj.getUTCMonth() + 1;
                const d = dateObj.getUTCDate();
                const y = String(dateObj.getUTCFullYear()).slice(-2); 
                const hh = String(dateObj.getUTCHours()).padStart(2, '0');
                const mm = String(dateObj.getUTCMinutes()).padStart(2, '0');
                const ss = String(dateObj.getUTCSeconds()).padStart(2, '0');
                displayOriginal = `${m}/${d}/${y} ${hh}:${mm}:${ss}`; 
                displayShort = `${m}/${d}/${y} ${hh}:${mm}`; 
              }

              return (
                  <div key={key} style={{ background: 'var(--bg-primary)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', height: '120px', boxSizing: 'border-box' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold', marginBottom: '6px', flexShrink: 0 }}>{key}</span>
                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px', WebkitMaskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)' }} className="custom-scrollbar">
                      {displayOriginal ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Original: {displayOriginal}</span>
                          <span style={{ fontWeight: 'bold', color: 'var(--brand-purple)', fontSize: '1rem', marginTop: '2px' }}>{displayShort}</span>
                        </div>
                      ) : (
                        <span style={{ fontWeight: '600', fontSize: '0.90rem', color: 'var(--text-primary)', wordBreak: 'break-word', lineHeight: '1.4' }}>{displayShort}</span>
                      )}
                    </div>
                  </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const CustomGraphTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '15px', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.6)' : '0 4px 6px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', borderBottom: '1px solid var(--border-light)', paddingBottom: '5px', fontSize: '0.9rem' }}>{data.name}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '25px', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Total Occurrences:</span>
            <span style={{ fontWeight: 'bold', color: 'var(--color-danger)' }}>{data.count}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '25px', marginTop: '5px', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Network Impact:</span>
            <span style={{ fontWeight: 'bold', color: 'var(--color-info)' }}>{data.totalPercentage}%</span>
          </div>
          <p style={{ margin: '10px 0 0 0', fontSize: '0.7rem', color: 'var(--brand-purple)', fontStyle: 'italic' }}>Click to filter table below</p>
        </div>
      );
    }
    return null;
  };

  const headerActions = (
    <div className="header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      <button className="btn theme-toggle" onClick={toggleTheme} title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px', background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.3s ease', outline: 'none' }}>
        {isDarkMode ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        )}
      </button>
      <button className="btn primary-outline" onClick={handleExport} disabled={results.length === 0} style={{ outline: 'none' }}>Export Raw Data</button>
    </div>
  );

  return (
    <DashboardLayout isLoading={isLoading} logo={currentLogo} onLogoClick={() => handleNavigate("/")} headerActions={headerActions}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(128, 128, 128, 0.3); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(128, 128, 128, 0.6); }
      `}</style>

      <main className="main-layout" style={{ display: 'flex', overflow: 'hidden', transition: 'gap 0.4s cubic-bezier(0.4, 0, 0.2, 1)', gap: isSidebarCollapsed ? '0px' : '' }}>
        <aside className="sidebar" style={{ width: isSidebarCollapsed ? '0px' : '320px', minWidth: isSidebarCollapsed ? '0px' : '320px', overflow: 'hidden', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', borderRight: isSidebarCollapsed ? 'none' : '1px solid var(--border-light)', opacity: isSidebarCollapsed ? 0 : 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', flexShrink: 0, background: 'var(--bg-primary)' }}>
              <button onClick={() => setActiveSidebarView('input')} style={{ flex: 1, padding: '12px 0', fontSize: '0.75rem', fontWeight: 'bold', background: 'none', border: 'none', outline: 'none', cursor: 'pointer', transition: 'all 0.2s', borderBottom: activeSidebarView === 'input' ? (isDarkMode ? '3px solid #ffffff' : '3px solid var(--brand-purple)') : '3px solid transparent', color: activeSidebarView === 'input' ? (isDarkMode ? '#ffffff' : 'var(--brand-purple)') : 'var(--text-secondary)' }}>DATA INPUT</button>
              <button onClick={() => setActiveSidebarView('analytics')} disabled={results.length === 0} style={{ flex: 1, padding: '12px 0', fontSize: '0.75rem', fontWeight: 'bold', background: 'none', border: 'none', outline: 'none', transition: 'all 0.2s', cursor: results.length === 0 ? 'not-allowed' : 'pointer', opacity: results.length === 0 ? 0.4 : 1, borderBottom: activeSidebarView === 'analytics' ? (isDarkMode ? '3px solid #ffffff' : '3px solid var(--brand-purple)') : '3px solid transparent', color: activeSidebarView === 'analytics' ? (isDarkMode ? '#ffffff' : 'var(--brand-purple)') : 'var(--text-secondary)' }}>TOP ALARMS</button>
              <button onClick={() => setActiveSidebarView('details')} disabled={!selectedRowDetails} style={{ flex: 1, padding: '12px 0', fontSize: '0.75rem', fontWeight: 'bold', background: 'none', border: 'none', outline: 'none', transition: 'all 0.2s', cursor: !selectedRowDetails ? 'not-allowed' : 'pointer', opacity: !selectedRowDetails ? 0.4 : 1, borderBottom: activeSidebarView === 'details' ? (isDarkMode ? '3px solid #ffffff' : '3px solid var(--brand-purple)') : '3px solid transparent', color: activeSidebarView === 'details' ? (isDarkMode ? '#ffffff' : 'var(--brand-purple)') : 'var(--text-secondary)' }}>DETAILS</button>
            </div>

            <div className="custom-scrollbar" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1.5rem' }}>
              {activeSidebarView === 'input' && (
                <div className="data-input-section" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                      {dashboardMode === 'wireless' ? 'Wireless' : 'Transport'}
                    </h3>
                    <button 
                      onClick={handleModeToggle}
                      title="Swap Dashboard Mode"
                      style={{ background: isDarkMode ? 'var(--bg-input)' : '#ffffff', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: isDarkMode ? '#ffffff' : 'var(--brand-purple)', fontSize: '0.75rem', fontWeight: 'bold', transition: 'all 0.2s', outline: 'none' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3v18"/><path d="M10 18l-3 3-3-3"/><path d="M7 3v18"/><path d="M20 6l-3-3-3 3"/></svg>
                    </button>
                  </div>

                  <div className="upload-group">
                    <span className="input-label">NMS File</span>
                    <div className="file-drop-area">
                      <img src={isDarkMode ? fileDark : fileLight} className="upload-icon" alt="icon" style={{ width: '20px' }} />
                      <span className="file-msg" style={{ marginTop: '8px' }}>{monitorFile1 ? monitorFile1.name : "Drag .xlsx, .xls, or .csv"}</span>
                      <input className="file-input" type="file" accept=".csv, .xlsx, .xls" onChange={(e) => handleFileChange(e, setMonitorFile1)} ref={monitorFile1Ref} />
                    </div>
                  </div>
                  
                  {dashboardMode === 'wireless' && (
                    <div className="upload-group" style={{ marginTop: '20px' }}>
                      <span className="input-label">SA MASTERLIST File</span>
                      <div className="file-drop-area">
                        <img src={isDarkMode ? fileDark : fileLight} className="upload-icon" alt="icon" style={{ width: '20px' }} />
                        <span className="file-msg" style={{ marginTop: '8px' }}>{monitorFile2 ? monitorFile2.name : "Drag .xlsx, .xls, or .csv"}</span>
                        <input className="file-input" type="file" accept=".csv, .xlsx, .xls" onChange={(e) => handleFileChange(e, setMonitorFile2)} ref={monitorFile2Ref} />
                      </div>
                    </div>
                  )}

                  <button className="btn primary-filled scan-btn full-width" onClick={handleScan} disabled={isLoading} style={{background: 'var(--brand-purple)', color: '#ffffff', border: 'none', marginTop: '10px', padding: '12px', outline: 'none' }}>
                    <img src={searchIcon} alt="Scan" className="btn-icon" style={{ width: '16px', marginRight: '8px' }} />
                    <span>{isLoading ? "Processing Data..." : "Scan Data"}</span>
                  </button>
                </div>
              )}

              {activeSidebarView === 'analytics' && alarmStats.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Top Alarms</h3>
                    <button ref={expandBtnRef} onClick={openGraphModal} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--color-info)', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', padding: '5px 10px', borderRadius: '4px', outline: 'none' }}>Expand 📊</button>
                  </div>
                  <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', overflowX: 'hidden', paddingRight: '5px' }}>
                    {alarmStats.map((stat, i) => ( 
                      <div key={i} style={{ width: '100%', background: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px', fontWeight: 'bold' }}>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '80%', color: 'var(--text-primary)' }}>{stat.name}</span>
                          <span style={{ color: 'var(--color-danger)' }}>{stat.count}</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${stat.percentage}%`, background: 'var(--brand-gradient)', borderRadius: '3px', transition: 'width 1s ease-out' }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSidebarView === 'details' && selectedRowDetails && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <h3 style={{ margin: 0, marginBottom: '20px', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Alert Breakdown</h3>
                  <div className="details-content custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-light)', borderLeft: '4px solid var(--color-danger)' }}>
                      <span className="input-label" style={{ fontSize: '0.75rem' }}>Alert Count</span>
                      <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--color-danger)', marginTop: '5px' }}>{selectedRowDetails.count} <span style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Repetitions</span></div>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                      <span className="input-label" style={{ fontSize: '0.75rem' }}>{dashboardMode === 'wireless' ? 'PLA_ID' : 'SEVERITY'}</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '5px' }}>
                        {selectedRowDetails.pla}
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                      <span className="input-label" style={{ fontSize: '0.75rem' }}>Site Name</span>
                      <div style={{ fontWeight: 'bold', marginTop: '5px', wordBreak: 'break-word', color: 'var(--color-info)', fontSize: '1rem' }}>
                         {selectedRowDetails.name}
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                      <span className="input-label" style={{ fontSize: '0.75rem' }}>Alarm Text</span>
                      <div style={{ fontWeight: 'bold', marginTop: '5px', wordBreak: 'break-word', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                         {selectedRowDetails.alert}
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                      <span className="input-label" style={{ fontSize: '0.75rem' }}>{dashboardMode === 'wireless' ? 'Distinguished Name' : 'Location Info'}</span>
                      <div style={{ fontFamily: 'monospace', marginTop: '5px', wordBreak: 'break-all', fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-input)', padding: '8px', borderRadius: '4px' }}>
                         {selectedRowDetails.dn}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
        </aside>

        <section className="content-area" style={{ position: 'relative', flex: 1, minWidth: 0, transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', marginLeft: isSidebarCollapsed ? '0px' : '', paddingLeft: isSidebarCollapsed ? '0px' : '' }}>
          <div className="output-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', transition: 'padding 0.4s ease' }}>
            <div className="table-toolbar" style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--brand-purple)', color: 'white' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <button className="sidebar-toggle-btn" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.3s ease', transform: isSidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>
                  <img src={warningDark} alt="Alerts" style={{ width: '24px' }} />
                  <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-inverse)' }}>
                    {dashboardMode === 'wireless' ? 'Wireless Critical Alerts' : 'Transport Critical Alerts'} ({filteredResults.length})
                  </h2>
               </div>
              {/* 🚀 FIXED: Search Bar text color adapts to Dark Mode */}
              <input type="text" className="search-bar" placeholder="Search ID, Name, or Alarm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} disabled={results.length === 0} style={{ outline: 'none' }}/>
            </div>

            <div className="output-box" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div className="table-wrapper" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', padding: '12px 35px 12px 20px', fontWeight: 'bold', borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--btn-scan-bg)', textTransform: 'uppercase', fontSize: '0.8rem', color: 'var(--text-inverse)' }}>
                  <div style={{ width: '12%', paddingRight: '15px' }}>{dashboardMode === 'wireless' ? 'PLA_ID' : 'SEVERITY'}</div>
                  <div style={{ width: '23%', paddingRight: '15px', color: 'var(--text-inverse)' }}>Site Name</div>
                  <div style={{ width: '20%', paddingRight: '15px' }}>Alarm Text</div>
                  <div style={{ width: '37%', paddingRight: '15px' }}>{dashboardMode === 'wireless' ? 'Distinguished Name' : 'Location Info'}</div>
                  <div style={{ width: '8%', paddingRight: '15px', textAlign: 'center' }}>Count</div>
                </div>
                <div ref={listContainerRef} style={{ flex: 1, width: '100%', overflow: 'hidden', position: 'relative' }}>
                  {results.length > 0 ? (
                    <List height={mainListSize.height} itemCount={filteredResults.length} itemSize={70} width={mainListSize.width} overscanCount={10} className="custom-scrollbar">
                      {VirtualizedRow}
                    </List>
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                      {[...Array(8)].map((_, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '0 20px', height: '70px', borderBottom: "1px solid rgba(128,128,128,0.05)", boxSizing: 'border-box', opacity: 0.6 }}>
                          <div style={{ width: '12%', paddingRight: '15px' }}><div style={{ height: '12px', width: '60%', background: 'var(--border-color)', borderRadius: '4px' }}></div></div>
                          <div style={{ width: '23%', paddingRight: '15px' }}><div style={{ height: '12px', width: '80%', background: 'var(--border-color)', borderRadius: '4px' }}></div></div>
                          <div style={{ width: '20%', paddingRight: '15px' }}><div style={{ height: '12px', width: '70%', background: 'var(--border-color)', borderRadius: '4px' }}></div></div>
                          <div style={{ width: '37%', paddingRight: '15px' }}><div style={{ height: '12px', width: '90%', background: 'var(--border-color)', borderRadius: '4px' }}></div></div>
                          <div style={{ width: '8%', paddingRight: '15px', display: 'flex', justifyContent: 'center' }}><div style={{ height: '24px', width: '30px', background: 'var(--border-color)', borderRadius: '12px' }}></div></div>
                        </div>
                      ))}
                      <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--bg-primary)', padding: '16px 32px', borderRadius: '30px', border: '1px solid var(--border-light)', boxShadow: isDarkMode ? '0 8px 24px rgba(0,0,0,0.6)' : '0 8px 24px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10 }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="12" y1="18" x2="12" y2="12"></line>
                          <line x1="9" y1="15" x2="15" y2="15"></line>
                        </svg>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '1rem' }}>Upload Data to Populate Table</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* THE VIRTUALIZED DRILL-DOWN MACBOOK MODAL */}
      {isDrillDownRendered && drillDownData && (
        <div className="map-modal-overlay" onClick={closeDrillDownModal} style={{ opacity: isDrillDownVisible ? 1 : 0, transition: 'opacity 0.3s ease', zIndex: 1000 }}>
          <div className="map-modal-content" onClick={e => e.stopPropagation()} style={{ width: '85%', height: '90%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', borderRadius: '16px', overflow: 'hidden', transformOrigin: drillDownOrigin, transform: isDrillDownVisible ? 'scale(1) translateY(0)' : 'scale(0.05) translateY(50px)', opacity: isDrillDownVisible ? 1 : 0, transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease', boxShadow: isDrillDownVisible ? (isDarkMode ? '0 25px 50px -12px rgba(0, 0, 0, 0.9)' : '0 25px 50px -12px rgba(0, 0, 0, 0.5)') : 'none' }}>
            <div className="map-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--brand-gradient)', color: 'white', padding: '20px 30px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'white' }}>{drillDownData.name} ({drillDownData.pla})</h3>
                <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>{drillDownData.alert}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ background: 'white', color: isDarkMode ? 'var(--color-danger)' : 'var(--color-danger)', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold' }}>{filteredModalRows.length} Occurrences</div>
                <button onClick={closeDrillDownModal} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', outline: 'none' }}>✕</button>
              </div>
            </div>
            
            <div style={{ padding: '15px 30px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>RAW NMS DATA LOG (CLEANED)</span>
              <input type="text" placeholder="Search raw logs..." value={modalSearchTerm} onChange={(e) => setModalSearchTerm(e.target.value)} style={{ padding: '8px 15px', borderRadius: '20px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', width: '250px', outline: 'none' }} />
            </div>

            <div style={{ flex: 1, padding: '20px 30px 0 30px', overflow: 'hidden' }}>
              {filteredModalRows.length > 0 ? (
                <VariableSizeList height={modalListHeight} itemCount={filteredModalRows.length} itemSize={getModalRowHeight} width="100%" overscanCount={2} className="custom-scrollbar">
                  {VirtualizedModalRow}
                </VariableSizeList>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No logs match your search.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* THE ENTERPRISE ANALYTICS MODAL */}
      {isGraphModalRendered && (
        <div className="map-modal-overlay" onClick={closeGraphModal} style={{ opacity: isGraphModalVisible ? 1 : 0, transition: 'opacity 0.3s ease', zIndex: 999 }}>
          <div className="map-modal-content" onClick={e => e.stopPropagation()} style={{ width: '80%', height: '85%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', borderRadius: '16px', overflow: 'hidden', transformOrigin: graphModalOrigin, transform: isGraphModalVisible ? 'scale(1) translateY(0)' : 'scale(0.05) translateY(50px)', opacity: isGraphModalVisible ? 1 : 0, transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease', boxShadow: isGraphModalVisible ? (isDarkMode ? '0 25px 50px -12px rgba(0, 0, 0, 0.9)' : '0 25px 50px -12px rgba(0, 0, 0, 0.5)') : 'none' }}>
            <div className="map-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--brand-gradient)', color: 'white', padding: '15px 30px' }}>
              <div><h3 style={{ margin: 0, fontSize: '1.4rem', color: 'white' }}>Enterprise Analytics Overview</h3></div>
              <button onClick={closeGraphModal} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', outline: 'none' }}>✕</button>
            </div>
            
            <div className="custom-scrollbar" style={{ flex: 1, padding: '25px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>

                <div style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)', boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Occurrences</div>
                  {/* 🚀 FIXED: Total Occurrences text is pure white in dark mode */}
                  <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: isDarkMode ? '#ffffff' : 'var(--brand-purple)', marginTop: '5px' }}>{totalOccurrences}</div>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)', boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Unique Sites Affected</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: 'var(--color-info)', marginTop: '5px' }}>{uniqueSitesCount}</div>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)', boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Unique Alarm Types</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: 'var(--brand-purple)', marginTop: '5px' }}>{alarmStats.length}</div>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)', borderTop: '4px solid var(--color-danger)', boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Most Critical Alarm</div>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--color-danger)', marginTop: '10px', wordBreak: 'break-word', lineHeight: '1.2' }}>{alarmStats[0]?.name || "N/A"}</div>
                </div>

                <div style={{ gridColumn: 'span 4', background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', height: '320px', boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-primary)' }}>Alarm Frequency (All Types)</h4>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      {/* 🚀 FIXED: The entire BarChart wrapper is clickable for filtering */}
                      <BarChart 
                        data={alarmStats} 
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }} 
                        onClick={(state) => {
                          if (state && state.activePayload && state.activePayload.length > 0) {
                            setSelectedGraphAlarm(state.activePayload[0].payload.name);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fontSize: 10}} tickFormatter={(val) => val.length > 12 ? val.substring(0,12)+'...' : val} />
                        <YAxis stroke="var(--text-secondary)" tick={{fontSize: 12}} />
                        <RechartsTooltip cursor={{fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}} content={<CustomGraphTooltip />} />
                        {/* 🚀 FIXED: activeBar allows clicking the empty space above the bar, added onClick to Bar */}
                        <Bar 
                          dataKey="count" 
                          radius={[4, 4, 0, 0]} 
                          animationDuration={1000} 
                          style={{ outline: 'none' }}
                          minPointSize={20}
                          background={{ fill: 'rgba(0,0,0,0.001)' }}
                          activeBar={<Rectangle fillOpacity={0.8} stroke="var(--brand-purple)" />}
                          onClick={(data) => {
                             if(data && data.name) setSelectedGraphAlarm(data.name);
                          }}
                        >
                          {alarmStats.map((entry, index) => (<Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p style={{ textAlign: 'center', margin: '5px 0 0 0', fontSize: '0.65rem', color: 'var(--brand-purple)', fontStyle: 'italic' }}>Click anywhere on a bar's column to filter below</p>
                </div>

                <div style={{ gridColumn: 'span 4', background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', height: '350px', boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>
                      {selectedGraphAlarm ? `Filtered: Sites Experiencing "${selectedGraphAlarm}"` : 'Most Affected Sites Overview (Top 50)'}
                    </h4>
                    {selectedGraphAlarm && (
                      <button onClick={() => setSelectedGraphAlarm(null)} style={{ padding: '6px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', outline: 'none' }}>
                        Clear Filter ✕
                      </button>
                    )}
                  </div>
                  
                  <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
                     <div style={{ display: 'flex', padding: '10px', fontWeight: 'bold', borderBottom: '2px solid var(--border-color)', color: 'var(--text-inverse)', textTransform: 'uppercase', fontSize: '0.8rem', position: 'sticky', top: 0, background: 'var(--btn-scan-bg)', zIndex: 1 }}>
                        <div style={{ width: '15%' }}>{dashboardMode === 'wireless' ? 'PLA_ID' : 'SEVERITY'}</div>
                        <div style={{ width: '25%' }}>Site Name</div>
                        <div style={{ width: '40%' }}>Alarm Text</div>
                        <div style={{ width: '20%', textAlign: 'center' }}>Repetitions</div>
                     </div>
                     {topSitesData.map((row, idx) => (
                        <div key={idx} style={{ display: 'flex', padding: '12px 10px', borderBottom: '1px solid var(--border-light)', alignItems: 'center' }}>
                           <div style={{ width: '15%', fontWeight: 'bold', color: dashboardMode === 'transport' ? 'var(--color-danger-light)' : 'var(--text-primary)', fontSize: '0.85rem' }}>
                             {row.pla}
                           </div>
                           <div style={{ width: '25%', fontWeight: 'bold', color: 'var(--color-info)', fontSize: '0.85rem' }}>
                             {row.name}
                           </div>
                           <div style={{ width: '40%', fontSize: '0.8rem', color: 'var(--text-secondary)', paddingRight: '10px' }}>
                             {row.alert}
                           </div>
                           <div style={{ width: '20%', fontWeight: 'bold', color: 'var(--color-danger)', fontSize: '1rem', textAlign: 'center' }}>{row.count}</div>
                        </div>
                     ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
