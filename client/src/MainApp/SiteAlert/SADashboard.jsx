import { useState, useMemo, useEffect, useRef } from 'react';
import useDarkMode from '../../hooks/useDarkMode';
import globeLogoDark from '../../assets/Globe_LogoW.png';
import globeLogoLight from '../../assets/Globe_LogoB.png';
import searchIcon from '../../assets/search.png';
import fileDark from '../../assets/fileDark.png';
import fileLight from '../../assets/fileLight.png';
import warningDark from '../../assets/warningDark.png';
import warningLight from '../../assets/warningLight.png';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

import * as XLSX from 'xlsx';
import { useNavigate } from "react-router-dom";
import { FixedSizeList as List, VariableSizeList } from 'react-window';
import DashboardLayout from '../../components/DashboardLayout';
import '../../styles/Dashboard_styles.css';

export default function SADashboard() {
  const [monitorFile1, setMonitorFile1] = useState(null); 
  const [monitorFile2, setMonitorFile2] = useState(null); 
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);

  const navigate = useNavigate();
  const [isDarkMode, toggleTheme] = useDarkMode();

  const [selectedRowDetails, setSelectedRowDetails] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const [activeSidebarView, setActiveSidebarView] = useState('input');

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

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

  const currentLogo = isDarkMode ? globeLogoDark : globeLogoLight;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const handleResize = () => setModalListHeight((window.innerHeight * 0.9) - 190);
    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          resolve(jsonData);
        } catch {
          reject(new Error("Failed to parse file."));
        }
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleScan = async () => {
    if (!monitorFile1 || !monitorFile2) return alert("Please upload both the NMS and SA Masterlist files.");
    setIsLoading(true);
    setResults([]);
    setSelectedRowDetails(null);

    try {
      const nmsData = await readUniversalFile(monitorFile1);
      const masterData = await readUniversalFile(monitorFile2);

      if (nmsData.length === 0 || masterData.length === 0) throw new Error("One or both files are empty or unreadable.");

      if (window.google) {
        window.google.script.run
          .withSuccessHandler((response) => {
            const res = JSON.parse(response);
            if (res.success) {
              setResults(res.data);
              if (res.data.length > 0) {
                setActiveSidebarView('analytics');
                setIsSidebarCollapsed(false); 
              }
            } else alert("Backend Error: " + res.error);
            setIsLoading(false);
          })
          .withFailureHandler((err) => {
            alert("Connection Error: " + err.message);
            setIsLoading(false);
          })
          .alertSite(JSON.stringify(nmsData), JSON.stringify(masterData)); 
      } else {
        setTimeout(() => {
          alert("Simulation: The cloud backend would process this data here.");
          setIsLoading(false);
        }, 1000);
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

    const strictHeaderOrder = [
      "Severity Rank", "Total Repetitions", "Occurrence #", "Masterlist PLA_ID", "Masterlist Site Name", ...originalNMSHeaders
    ];

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
            "Severity Rank": groupIndex + 1, "Total Repetitions": group.count, "Occurrence #": idx + 1, "Masterlist PLA_ID": group.pla || "N/A", "Masterlist Site Name": group.name || "N/A", ...formattedRawRow 
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
    XLSX.writeFile(workbook, `Raw_SiteAlerts_Drilldown_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleNavigate = (path) => {
    setIsLoading(true);
    setTimeout(() => navigate(path), 1000); 
  };

  const filteredResults = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    return results
      .filter(row => [row.pla, row.name, row.alert, row.dn].filter(Boolean).some(value => value.toString().toLowerCase().includes(term)))
      .sort((a, b) => b.count - a.count); 
  }, [results, debouncedSearch]);

  const filteredModalRows = useMemo(() => {
    if (!drillDownData) return [];
    const term = modalSearchTerm.toLowerCase();
    if (!term) return drillDownData.rawRows;
    return drillDownData.rawRows.filter(rawRow => Object.values(rawRow).some(val => String(val).toLowerCase().includes(term)));
  }, [drillDownData, modalSearchTerm]);

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

    return statsArray.map(stat => ({ ...stat, percentage: (stat.count / max) * 100 }));
  }, [results]);

  const openGraphModal = () => {
    if (expandBtnRef.current) {
      const rect = expandBtnRef.current.getBoundingClientRect();
      const originXPercent = (((rect.left + rect.width / 2) - (window.innerWidth * 0.1)) / (window.innerWidth * 0.8)) * 100;
      const originYPercent = (((rect.top + rect.height / 2) - (window.innerHeight * 0.075)) / (window.innerHeight * 0.85)) * 100;
      setGraphModalOrigin(`${originXPercent}% ${originYPercent}%`);
    }
    setIsGraphModalRendered(true);
    setTimeout(() => setIsGraphModalVisible(true), 10); 
  };

  const closeGraphModal = () => {
    setIsGraphModalVisible(false); 
    setTimeout(() => setIsGraphModalRendered(false), 350); 
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
    return Object.entries(rawRow).filter(([_, value]) => {
      if (value === null || value === undefined) return false;
      const strVal = String(value).trim();
      if (strVal === "" || strVal.toLowerCase() === "null" || strVal.toLowerCase() === "undefined") return false;
      return true;
    });
  };

  const getModalRowHeight = (index) => {
    const raw = filteredModalRows[index];
    const validEntries = getValidEntries(raw);
    const gridRows = Math.ceil(validEntries.length / 4); 
    let extraTextBuffer = 0;
    validEntries.forEach(([_, value]) => {
      const charCount = String(value).length;
      if (charCount > 50) extraTextBuffer += 50;  
      if (charCount > 100) extraTextBuffer += 70; 
    });
    return 60 + (gridRows * 90) + extraTextBuffer + 40; 
  };

  const VirtualizedRow = ({ index, style }) => {
    const row = filteredResults[index];
    let rowStyle = { ...style, display: 'flex', alignItems: 'center', padding: '0 20px', cursor: "pointer", transition: "background-color 0.2s", borderBottom: "1px solid rgba(128,128,128,0.1)", boxSizing: 'border-box', fontSize: '0.85rem' };
    const columnStyle = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '15px', boxSizing: 'border-box' };

    return (
      <div 
        style={rowStyle} 
        className="row-hover" 
        onClick={() => {
          setSelectedRowDetails(row);
          setActiveSidebarView('details'); 
          setIsSidebarCollapsed(false);    
        }}
      >
        <div style={{ ...columnStyle, width: '12%', fontWeight: 'bold', color: 'var(--text-primary)' }}>{row.pla || "N/A"}</div>
        <div style={{ ...columnStyle, width: '23%', color: '#1a73e8', fontWeight: 'bold' }}>{row.name}</div>
        <div style={{ ...columnStyle, width: '20%', fontFamily: 'ARIAL', color: 'var(--text-primary)' }}>{row.alert}</div>
        <div style={{ ...columnStyle, width: '37%', fontFamily: 'monospace', fontSize: '1rem', color: 'var(--text-secondary)' }}>{row.dn}</div>
        <div style={{ ...columnStyle, width: '8%', textAlign: 'center' }}>
           <button className="drill-down-badge" onClick={(e) => openDrillDownModal(e, row)} title="Click to view all occurrences">
             {row.count}
           </button>
        </div>
      </div>
    );
  };

  const VirtualizedModalRow = ({ index, style }) => {
    const raw = filteredModalRows[index];
    const validEntries = getValidEntries(raw);

    return (
      <div style={{ ...style, padding: '0 5px' }}>
        <div style={{ background: 'var(--bg-input)', padding: '25px', borderRadius: '12px', border: '1px solid var(--border-light)', boxSizing: 'border-box', height: 'calc(100% - 15px)' }}>
          <div style={{ color: 'var(--brand-purple)', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '15px', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>Occurrence #{index + 1}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
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
                  <div key={key} style={{ background: 'var(--bg-primary)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold', marginBottom: '6px' }}>{key}</span>
                    {displayOriginal ? (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Original: {displayOriginal}</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--brand-purple)', fontSize: '1rem', marginTop: '2px' }}>{displayShort}</span>
                      </div>
                    ) : (
                      <span style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-primary)', wordBreak: 'break-word', lineHeight: '1.4' }}>{displayShort}</span>
                    )}
                  </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

 const headerActions = (
    <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
      <button className="btn theme-toggle" onClick={toggleTheme} title="Toggle Theme" aria-label="Toggle theme">
        {isDarkMode ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="currentColor" />
            </svg>
            <span> Light</span>
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <circle cx="12" cy="12" r="3.5" fill="currentColor" />
              <g stroke="currentColor" strokeWidth="1.2">
                <path d="M12 2v2" strokeLinecap="round" />
                <path d="M12 20v2" strokeLinecap="round" />
                <path d="M4.93 4.93l1.41 1.41" strokeLinecap="round" />
                <path d="M17.66 17.66l1.41 1.41" strokeLinecap="round" />
                <path d="M2 12h2" strokeLinecap="round" />
                <path d="M20 12h2" strokeLinecap="round" />
                <path d="M4.93 19.07l1.41-1.41" strokeLinecap="round" />
                <path d="M17.66 6.34l1.41-1.41" strokeLinecap="round" />
              </g>
            </svg>
            <span> Dark</span>
          </>
        )}
      </button>

      <button className="btn primary-outline" onClick={handleExport} disabled={results.length === 0}>
        Export Raw Data
      </button>
    </div>
  );

  return (
    <DashboardLayout isLoading={isLoading} logo={currentLogo} onLogoClick={() => handleNavigate("/")} headerActions={headerActions}>
      <main className="main-layout" style={{ display: 'flex', overflow: 'hidden', transition: 'gap 0.4s cubic-bezier(0.4, 0, 0.2, 1)', gap: isSidebarCollapsed ? '0px' : '' }}>
        
        <aside className="sidebar" style={{ width: isSidebarCollapsed ? '0px' : '320px', minWidth: isSidebarCollapsed ? '0px' : '320px', overflow: 'hidden', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', borderRight: isSidebarCollapsed ? 'none' : '1px solid var(--border-light)', opacity: isSidebarCollapsed ? 0 : 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
          
            {/* 🚀 FIXED: Added outline: 'none' to all buttons! */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', flexShrink: 0, background: 'var(--bg-primary)' }}>
              <button 
                onClick={() => setActiveSidebarView('input')} 
                style={{ flex: 1, padding: '12px 0', fontSize: '0.75rem', fontWeight: 'bold', background: 'none', border: 'none', outline: 'none', borderBottom: activeSidebarView === 'input' ? '3px solid var(--brand-purple)' : '3px solid transparent', color: activeSidebarView === 'input' ? 'var(--brand-purple)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}>
                DATA INPUT
              </button>
              <button 
                onClick={() => setActiveSidebarView('analytics')} 
                disabled={results.length === 0}
                style={{ flex: 1, padding: '12px 0', fontSize: '0.75rem', fontWeight: 'bold', background: 'none', border: 'none', outline: 'none', borderBottom: activeSidebarView === 'analytics' ? '3px solid var(--brand-purple)' : '3px solid transparent', color: activeSidebarView === 'analytics' ? 'var(--brand-purple)' : 'var(--text-secondary)', cursor: results.length === 0 ? 'not-allowed' : 'pointer', opacity: results.length === 0 ? 0.4 : 1, transition: 'all 0.2s' }}>
                TOP ALARMS
              </button>
              <button 
                onClick={() => setActiveSidebarView('details')} 
                disabled={!selectedRowDetails}
                style={{ flex: 1, padding: '12px 0', fontSize: '0.75rem', fontWeight: 'bold', background: 'none', border: 'none', outline: 'none', borderBottom: activeSidebarView === 'details' ? '3px solid var(--brand-purple)' : '3px solid transparent', color: activeSidebarView === 'details' ? 'var(--brand-purple)' : 'var(--text-secondary)', cursor: !selectedRowDetails ? 'not-allowed' : 'pointer', opacity: !selectedRowDetails ? 0.4 : 1, transition: 'all 0.2s' }}>
                DETAILS
              </button>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1.5rem' }}>
              
              {activeSidebarView === 'input' && (
                <div className="data-input-section" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Site Alerts Data</h3>
                  <div className="upload-group">
                    <span className="input-label">NMS File</span>
                    <div className="file-drop-area">
                      <img src={isDarkMode ? fileDark : fileLight} className="upload-icon" alt="icon" style={{ width: '20px' }} />
                      <span className="file-msg" style={{ marginTop: '8px' }}>{monitorFile1 ? monitorFile1.name : "Drag .xlsx, .xls, or .csv"}</span>
                      <input className="file-input" type="file" accept=".csv, .xlsx, .xls" onChange={(e) => handleFileChange(e, setMonitorFile1)} />
                    </div>
                  </div>
                  <div className="upload-group" style={{ marginBottom: '20px' }}>
                    <span className="input-label">SA MASTERLIST File</span>
                    <div className="file-drop-area">
                      <img src={isDarkMode ? fileDark : fileLight} className="upload-icon" alt="icon" style={{ width: '20px' }} />
                      <span className="file-msg" style={{ marginTop: '8px' }}>{monitorFile2 ? monitorFile2.name : "Drag .xlsx, .xls, or .csv"}</span>
                      <input className="file-input" type="file" accept=".csv, .xlsx, .xls" onChange={(e) => handleFileChange(e, setMonitorFile2)} />
                    </div>
                  </div>
                  
                  <button className="btn primary-filled scan-btn full-width" onClick={handleScan} disabled={isLoading} style={{ marginTop: '10px', padding: '12px' }}>
                    <img src={searchIcon} alt="Scan" className="btn-icon" style={{ width: '16px', marginRight: '8px' }} />
                    <span>{isLoading ? "Running Alert Check..." : "Run Cloud Check"}</span>
                  </button>
                </div>
              )}

              {/* 🚀 FIXED: Added overflowX: 'hidden' to the container, and boxSizing: 'border-box' to the cards */}
              {activeSidebarView === 'analytics' && alarmStats.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Top Alarms</h3>
                    <button ref={expandBtnRef} onClick={openGraphModal} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#1a73e8', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', padding: '5px 10px', borderRadius: '4px' }}>Expand 📊</button>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', overflowX: 'hidden', paddingRight: '5px' }}>
                    {alarmStats.map((stat, i) => ( 
                      <div key={i} style={{ width: '100%', background: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px', fontWeight: 'bold' }}>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '80%', color: 'var(--text-primary)' }}>{stat.name}</span>
                          <span style={{ color: '#f02849' }}>{stat.count}</span>
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
                  
                  <div className="details-content" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-light)', borderLeft: '4px solid #f02849' }}>
                      <span className="input-label" style={{ fontSize: '0.75rem' }}>Alert Count</span>
                      <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f02849', marginTop: '5px' }}>{selectedRowDetails.count} <span style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Repetitions</span></div>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                      <span className="input-label" style={{ fontSize: '0.75rem' }}>PLA_ID</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '5px' }}>{selectedRowDetails.pla}</div>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                      <span className="input-label" style={{ fontSize: '0.75rem' }}>Site Name</span>
                      <div style={{ fontWeight: 'bold', marginTop: '5px', wordBreak: 'break-word', color: '#1a73e8', fontSize: '1rem' }}>{selectedRowDetails.name}</div>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                      <span className="input-label" style={{ fontSize: '0.75rem' }}>Alarm Text</span>
                      <div style={{ fontWeight: 'bold', marginTop: '5px', wordBreak: 'break-word', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{selectedRowDetails.alert}</div>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                      <span className="input-label" style={{ fontSize: '0.75rem' }}>Distinguished Name</span>
                      <div style={{ fontFamily: 'monospace', marginTop: '5px', wordBreak: 'break-all', fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-input)', padding: '8px', borderRadius: '4px' }}>{selectedRowDetails.dn}</div>
                    </div>
                  </div>
                </div>
              )}

            </div>
        </aside>

        <section className="content-area" style={{ position: 'relative', flex: 1, minWidth: 0, transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', marginLeft: isSidebarCollapsed ? '0px' : '', paddingLeft: isSidebarCollapsed ? '0px' : '' }}>
          <div className="output-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', transition: 'padding 0.4s ease' }}>
            
            <div className="table-toolbar" style={{ borderBottom: '1px solid var(--border-light)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <button className="sidebar-toggle-btn" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.3s ease', transform: isSidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>
                  <img src={isDarkMode ? warningDark : warningLight} alt="Alerts" style={{ width: '24px' }} />
                  <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Critical Site Alerts ({filteredResults.length})</h2>
               </div>
              <input type="text" className="search-bar" placeholder="Search ID, Name, or Alarm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} disabled={results.length === 0} />
            </div>

            <div className="output-box" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {results.length > 0 ? (
                <div className="table-wrapper" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  
                  <div style={{ display: 'flex', padding: '12px 35px 12px 20px', fontWeight: 'bold', borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', textTransform: 'uppercase', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <div style={{ width: '12%', paddingRight: '15px' }}>PLA_ID</div><div style={{ width: '23%', paddingRight: '15px', color: '#1a73e8' }}>Site Name</div><div style={{ width: '20%', paddingRight: '15px' }}>Alarm Text</div><div style={{ width: '37%', paddingRight: '15px' }}>Distinguished Name</div><div style={{ width: '8%', paddingRight: '15px', textAlign: 'center' }}>Count</div>
                  </div>
                  
                  <div style={{ flex: 1, width: '100%' }}>
                    <List height={700} itemCount={filteredResults.length} itemSize={70} width={'100%'} overscanCount={10}>
                      {VirtualizedRow}
                    </List>
                  </div>
                  
                </div>
              ) : (
                <div className="placeholder-container"><p className="placeholder-text" style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Upload NMS and SA Masterlist to scan for recursive alarms.</p></div>
              )}
            </div>

          </div>
        </section>

      </main>

      {/* THE VIRTUALIZED DRILL-DOWN MACBOOK MODAL */}
      {isDrillDownRendered && drillDownData && (
        <div className="map-modal-overlay" onClick={closeDrillDownModal} style={{ opacity: isDrillDownVisible ? 1 : 0, transition: 'opacity 0.3s ease' }}>
          <div className="map-modal-content" onClick={e => e.stopPropagation()} style={{ width: '85%', height: '90%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', borderRadius: '16px', overflow: 'hidden', transformOrigin: drillDownOrigin, transform: isDrillDownVisible ? 'scale(1) translateY(0)' : 'scale(0.05) translateY(50px)', opacity: isDrillDownVisible ? 1 : 0, transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease', boxShadow: isDrillDownVisible ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : 'none' }}>
            
            <div className="map-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--brand-gradient)', color: 'white', padding: '20px 30px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'white' }}>{drillDownData.name} ({drillDownData.pla})</h3>
                <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>{drillDownData.alert}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ background: 'white', color: '#f02849', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold' }}>{filteredModalRows.length} Occurrences</div>
                <button onClick={closeDrillDownModal} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', outline: 'none' }}>✕</button>
              </div>
            </div>
            
            <div style={{ padding: '15px 30px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>RAW NMS DATA LOG (CLEANED)</span>
              <input type="text" placeholder="Search raw logs..." value={modalSearchTerm} onChange={(e) => setModalSearchTerm(e.target.value)} style={{ padding: '8px 15px', borderRadius: '20px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', width: '250px', outline: 'none' }} />
            </div>

            <div style={{ flex: 1, padding: '20px 30px 0 30px', overflow: 'hidden' }}>
              {filteredModalRows.length > 0 ? (
                <VariableSizeList height={modalListHeight} itemCount={filteredModalRows.length} itemSize={getModalRowHeight} width="100%" overscanCount={2}>
                  {VirtualizedModalRow}
                </VariableSizeList>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No logs match your search.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* THE EXPANDED ANALYTICS GRAPH MODAL */}
      {isGraphModalRendered && (
        <div className="map-modal-overlay" onClick={closeGraphModal} style={{ opacity: isGraphModalVisible ? 1 : 0, transition: 'opacity 0.3s ease' }}>
          <div className="map-modal-content" onClick={e => e.stopPropagation()} style={{ width: '80%', height: '85%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', borderRadius: '16px', overflow: 'hidden', transformOrigin: graphModalOrigin, transform: isGraphModalVisible ? 'scale(1) translateY(0)' : 'scale(0.05) translateY(50px)', opacity: isGraphModalVisible ? 1 : 0, transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease', boxShadow: isGraphModalVisible ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : 'none' }}>
            <div className="map-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--brand-gradient)', color: 'white', padding: '20px 30px' }}>
              <div><h3 style={{ margin: 0, fontSize: '1.4rem', color: 'white' }}>Global Alarm Analytics</h3></div>
              <button onClick={closeGraphModal} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', outline: 'none' }}>✕</button>
            </div>
            <div style={{ flex: 1, padding: '30px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={alarmStats} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" horizontal={false} />
                    <XAxis type="number" stroke="var(--text-secondary)" />
                    <YAxis dataKey="name" type="category" width={250} stroke="var(--text-secondary)" tick={{fontSize: 12, fill: 'var(--text-primary)'}} />
                    <RechartsTooltip cursor={{fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}} contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px' }} itemStyle={{ color: 'var(--text-primary)' }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} animationDuration={1000}>
                      {alarmStats.map((entry, index) => (<Cell key={`cell-${index}`} fill={index === 0 ? '#f02849' : '#1a73e8'} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}