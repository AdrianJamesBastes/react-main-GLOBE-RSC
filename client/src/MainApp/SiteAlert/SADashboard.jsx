import { useState, useMemo } from 'react';
import useDarkMode from '../../hooks/useDarkMode';
import globeLogoDark from '../../assets/Globe_LogoW.png';
import globeLogoLight from '../../assets/Globe_LogoB.png';
import search from '../../assets/search.png';
import fileDark from '../../assets/fileDark.png';
import fileLight from '../../assets/fileLight.png';
import warningDark from '../../assets/warningDark.png';
import warningLight from '../../assets/warningLight.png';

import * as XLSX from 'xlsx';
import { useNavigate } from "react-router-dom";
import { FixedSizeList as List } from 'react-window';
import DashboardLayout from '../../components/DashboardLayout';
import '../../styles/Dashboard_styles.css';

export default function SADashboard() {
  const [monitorFile1, setMonitorFile1] = useState(null); 
  const [monitorFile2, setMonitorFile2] = useState(null); 
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);

  const navigate = useNavigate();
  const [isDarkMode, toggleTheme] = useDarkMode();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowDetails, setSelectedRowDetails] = useState(null);
  
  // 🚀 STATE: Controls the sidebar visibility
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const currentLogo = isDarkMode ? globeLogoDark : globeLogoLight;

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
          reject(new Error("Failed to parse file. Ensure it is a valid CSV or Excel file."));
        }
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const getColValue = (row, possibleNames) => {
    const keys = Object.keys(row);
    for (let pName of possibleNames) {
      const match = keys.find(k => k.trim().toUpperCase() === pName.toUpperCase());
      if (match) return row[match];
    }
    return null;
  };

  const handleScan = async () => {
    if ((!monitorFile1 || !monitorFile2) && !window.google) {
      setIsLoading(true);
      setResults([]);
      setSelectedRowDetails(null);
      
      setTimeout(() => {
        const mockAlerts = ["BASE STATION SERVICE PROBLEM", "OML FAULT", "CELL OUT OF SERVICE", "VSWR ALARM"];
        const generatedData = Array.from({ length: 45 }, (_, i) => {
          const isMRBTS = Math.random() > 0.4; 
          const alertType = mockAlerts[Math.floor(Math.random() * mockAlerts.length)];
          return {
            pla: `MIN_${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
            name: isMRBTS ? `SITENAME${i}LTE_DDN` : `SITENAME${i}BCF_DDN`,
            alert: alertType,
            dn: isMRBTS ? `PLMN-PLMN/MRBTS-${300000 + i}/EQM_R-1/APEQM_R-1/RMOD_R-${Math.floor(Math.random() * 5)}` : `PLMN-PLMN/BSC-123/BCF-${400 + i}`,
            count: Math.floor(Math.random() * 150) + 11 
          };
        });
        generatedData.sort((a, b) => b.count - a.count);
        setResults(generatedData);
        setIsLoading(false);
        // Automatically collapse sidebar to show the data!
        setIsSidebarCollapsed(true); 
      }, 600);
      
      return; 
    }

    if (!monitorFile1 || !monitorFile2) {
      return alert("Please upload both the NMS and SA Masterlist files.");
    }

    setIsLoading(true);
    setResults([]);
    setSelectedRowDetails(null);

    try {
      const nmsData = await readUniversalFile(monitorFile1);
      const masterData = await readUniversalFile(monitorFile2);

      if (nmsData.length === 0 || masterData.length === 0) {
        throw new Error("One or both files are empty or unreadable.");
      }

      const counter = {};
      nmsData.forEach(row => {
        const alarm = getColValue(row, ['ALARM TEXT', 'Alarm Text']);
        const dn = getColValue(row, ['DISTINGUISHED NAME', 'Distinguished Name']);
        if (!dn || !alarm) return;
        
        const key = `${alarm}|${dn}`;
        counter[key] = (counter[key] || 0) + 1;
      });

      const finalResults = [];
      Object.keys(counter).forEach(key => {
        const count = counter[key];
        if (count >= 10) {
          const [alarm, dn] = key.split('|');
          const upperDn = dn.toUpperCase();

          if (upperDn.includes("BCF")) {
            const cleanDn = dn.split("/").slice(0, 3).join("/").toUpperCase();
            const match = masterData.find(mRow => {
              const dn2g = getColValue(mRow, ['2G DN', '2GDN']);
              if (!dn2g) return false;
              return cleanDn.includes(String(dn2g).trim().toUpperCase()) || String(dn2g).trim().toUpperCase().includes(cleanDn);
            });
            if (match) finalResults.push({ pla: getColValue(match, ['PLA ID', 'PLA_ID']), name: getColValue(match, ['BCF NAME', 'BCF_NAME']), alert: alarm, dn: dn, count: count });
          } 
          else if (upperDn.includes("MRBTS")) {
            const cleanLTE = dn.split("/").slice(0, 2).join("/").toUpperCase();
            const match = masterData.find(mRow => {
              const mrbts = getColValue(mRow, ['MRBTS ID', 'MRBTS']);
              if (!mrbts) return false;
              return cleanLTE.includes(String(mrbts).trim().toUpperCase()) || String(mrbts).trim().toUpperCase().includes(cleanLTE);
            });
            if (match) finalResults.push({ pla: getColValue(match, ['PLA ID', 'PLA_ID']), name: getColValue(match, ['PROPOSED LTE NAME', 'Proposed LTE Name']), alert: alarm, dn: dn, count: count });
          }
        }
      });

      if (finalResults.length === 0) alert("Scan complete. No recursive alarms (10+) found matching the Masterlist.");
      setResults(finalResults);
      setIsLoading(false);
      
      // Automatically collapse sidebar when real data loads to give max space!
      if (finalResults.length > 0) setIsSidebarCollapsed(true);

    } catch (error) {
      alert("Error processing files: " + error.message);
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (results.length === 0) return alert("No data to export.");
    const excelData = results.map(row => ({
      "PLA ID": row.pla || "N/A",
      "Site Name": row.name || "N/A",
      "Alarm Text": row.alert || "",
      "Distinguished Name": row.dn || "",
      "Number of Alerts (Count)": row.count || 0
    }));
    excelData.sort((a, b) => b["Number of Alerts (Count)"] - a["Number of Alerts (Count)"]);
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const headers = Object.keys(excelData[0]);
    const columnWidths = headers.map(header => {
      let maxLength = header.length; 
      excelData.forEach(row => {
        const cellValue = row[header] ? row[header].toString() : "";
        if (cellValue.length > maxLength) maxLength = cellValue.length;
      });
      return { wch: maxLength + 2 }; 
    });
    worksheet['!cols'] = columnWidths;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Critical Alerts");
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `SiteAlerts_Critical_${dateStr}.xlsx`);
  };

  const handleNavigate = (path) => {
    setIsLoading(true);
    setTimeout(() => navigate(path), 1000); 
  };

  const filteredResults = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return results
      .filter(row => {
        return [row.pla, row.name, row.alert, row.dn]
          .filter(Boolean)
          .some(value => value.toString().toLowerCase().includes(term));
      })
      .sort((a, b) => b.count - a.count); 
  }, [results, searchTerm]);

  const VirtualizedRow = ({ index, style }) => {
    const row = filteredResults[index];
    let rowStyle = {
      ...style,
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      cursor: "pointer", 
      transition: "background-color 0.2s",
      borderBottom: "1px solid rgba(128,128,128,0.1)",
      boxSizing: 'border-box',
      fontSize: '0.85rem'
    };
    const columnStyle = {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      paddingRight: '15px',
      boxSizing: 'border-box'
    };

    return (
      <div style={rowStyle} className="row-hover" onClick={() => setSelectedRowDetails(row)}>
        <div style={{ ...columnStyle, width: '12%', fontWeight: 'bold' }}>{row.pla || "N/A"}</div>
        <div style={{ ...columnStyle, width: '23%', color: '#1a73e8', fontWeight: 'bold' }}>{row.name}</div>
        <div style={{ ...columnStyle, width: '20%', fontFamily: 'ARIAL', color: isDarkMode ? 'var(--text-primary)' : '#000000' }}>{row.alert}</div>
        <div style={{ ...columnStyle, width: '37%', fontFamily: 'monospace', fontSize: '1rem', color: isDarkMode ? 'var(--text-secondary)' : '#3f3c3c' }}>{row.dn}</div>
        <div style={{ ...columnStyle, width: '8%', textAlign: 'center' }}>
           <span style={{ 
             display: 'inline-flex', 
             alignItems: 'center', 
             justifyContent: 'center', 
             padding: '4px 14px', 
             borderRadius: '99px', 
             backgroundColor: '#fde8e8', 
             color: '#e02424', 
             fontWeight: 'bold',
             fontSize: '0.85rem',
             lineHeight: '1.2' 
           }}>
             {row.count}
           </span>
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
        Export Alerts 
      </button>
    </div>
  );

  return (
    <DashboardLayout isLoading={isLoading} logo={currentLogo} onLogoClick={() => handleNavigate("/")} headerActions={headerActions}>
      {/* 🚀 FIXED: Added gap transition and removal logic */}
      <main className="main-layout" style={{ 
        display: 'flex', 
        overflow: 'hidden',
        transition: 'gap 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        gap: isSidebarCollapsed ? '0px' : ''
      }}>
        
        <aside 
          className="sidebar" 
          style={{ 
            width: isSidebarCollapsed ? '0px' : '320px', 
            minWidth: isSidebarCollapsed ? '0px' : '320px',
            marginRight: isSidebarCollapsed ? '0px' : '', 
            paddingLeft: isSidebarCollapsed ? '0px' : '',
            paddingRight: isSidebarCollapsed ? '0px' : '',
            flexShrink: 0,
            overflow: 'hidden', 
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            borderRight: isSidebarCollapsed ? 'none' : '1px solid var(--border-light)',
            opacity: isSidebarCollapsed ? 0 : 1
          }}
        >
          <div style={{ width: '320px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            <div className="data-input-section" style={{ marginBottom: '20px', padding: '1.5rem 1.5rem 1.5rem 1.5rem', flexShrink: 0 }}>
              <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '1.1rem' }}>Site Alerts Data</h3>
              <div className="upload-group">
                <span className="input-label">NMS File</span>
                <div className="file-drop-area">
                  <img src={isDarkMode ? fileDark : fileLight} className="upload-icon" alt="icon" style={{ width: '20px' }} />
                  <span className="file-msg">{monitorFile1 ? monitorFile1.name : "Drag .xlsx, .xls, or .csv"}</span>
                  <input className="file-input" type="file" accept=".csv, .xlsx, .xls" onChange={(e) => handleFileChange(e, setMonitorFile1)} />
                </div>
              </div>
              <div className="upload-group">
                 <span className="input-label">SA MASTERLIST File</span>
                 <div className="file-drop-area">
                   <img src={isDarkMode ? fileDark : fileLight} className="upload-icon" alt="icon" style={{ width: '20px' }} />
                   <span className="file-msg">{monitorFile2 ? monitorFile2.name : "Drag .xlsx, .xls, or .csv"}</span>
                   <input className="file-input" type="file" accept=".csv, .xlsx, .xls" onChange={(e) => handleFileChange(e, setMonitorFile2)} />
                 </div>
              </div>
              
              <button className="btn primary-filled scan-btn full-width" onClick={handleScan} disabled={isLoading} style={{ marginTop: '40px', padding: '12px' }}>
                <img src={search} alt="Scan" className="btn-icon" style={{ width: '16px'}} />
                <span>{isLoading ? "Running Alert Check..." : "Run Check"}</span>
              </button>
            </div>

            <div className="sidebar-top-section" style={{ flex: 1 }}>
               <div className={`sidebar-carousel ${selectedRowDetails ? 'show-details' : ''}`}>
                <div className="carousel-panel" style={{ visibility: selectedRowDetails ? 'visible' : 'hidden' }}>
                  <div className="details-header">
                    <button className="back-btn" onClick={() => setSelectedRowDetails(null)}>✕</button>
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Alert Details</h3>
                  </div>
                  
                  {selectedRowDetails && (
                    <div className="details-content">
                      <div>
                        <span className="input-label">PLA_ID</span>
                        <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{selectedRowDetails.pla}</div>
                      </div>
                      <div className="details-box" style={{ borderLeft: '4px solid #f02849' }}>
                        <span className="input-label">Alert Count</span>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f02849' }}>
                          {selectedRowDetails.count} <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Repetitions</span>
                        </div>
                      </div>
                      <div className="details-box">
                        <span className="input-label">Site Name</span>
                        <div style={{ fontWeight: 'bold', marginTop: '4px', wordBreak: 'break-word', color: '#1a73e8' }}>
                          {selectedRowDetails.name}
                        </div>
                      </div>
                      <div className="details-box">
                        <span className="input-label">Alarm Text</span>
                        <div style={{ fontWeight: 'bold', marginTop: '4px', wordBreak: 'break-word' }}>
                          {selectedRowDetails.alert}
                        </div>
                      </div>
                      <div className="details-box">
                        <span className="input-label">Distinguished Name (Truncated)</span>
                        <div style={{ fontFamily: 'monospace', marginTop: '4px', wordBreak: 'break-all', fontSize: '0.8rem' }}>
                          {selectedRowDetails.dn}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </aside>

        {/* 🚀 FIXED: Added zeroing out of margins/padding when collapsed */}
        <section className="content-area" style={{ 
          position: 'relative', 
          flex: 1, 
          minWidth: 0, 
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          marginLeft: isSidebarCollapsed ? '0px' : '',
          paddingLeft: isSidebarCollapsed ? '0px' : ''
        }}>
          
          <div className="output-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', transition: 'padding 0.4s ease' }}>
            
            <div className="table-toolbar" style={{ borderBottom: '1px solid var(--border-light)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <button 
                    className="sidebar-toggle-btn"
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    aria-label={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px'
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.3s ease', transform: isSidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                       <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>
                  <img src={isDarkMode ? warningDark : warningLight} alt="Alerts" style={{ width: '24px' }} />
                  <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Critical Site Alerts ({filteredResults.length})</h2>
               </div>
              <input 
                type="text" 
                className="search-bar" 
                placeholder="Search ID, Name, or Alarm..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                disabled={results.length === 0} 
              />
            </div>

            <div className="output-box" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {results.length > 0 ? (
                <div className="table-wrapper" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  
                  <div style={{ 
                    display: 'flex', 
                    padding: '12px 35px 12px 20px', 
                    fontWeight: 'bold', 
                    borderBottom: '2px solid var(--border-color)', 
                    backgroundColor: 'var(--bg-secondary)',
                    textTransform: 'uppercase',
                    fontSize: '0.8rem'
                  }}>
                    <div style={{ width: '12%', paddingRight: '15px', boxSizing: 'border-box' }}>PLA_ID</div>
                    <div style={{ width: '23%', paddingRight: '15px', boxSizing: 'border-box', color: '#1a73e8' }}>Site Name</div>
                    <div style={{ width: '20%', paddingRight: '15px', boxSizing: 'border-box' }}>Alarm Text</div>
                    <div style={{ width: '37%', paddingRight: '15px', boxSizing: 'border-box' }}>Distinguished Name</div>
                    <div style={{ width: '8%', paddingRight: '15px', boxSizing: 'border-box', textAlign: 'center' }}>Count</div>
                  </div>
                  
                  <div style={{ flex: 1, width: '100%' }}>
                    <List height={700} itemCount={filteredResults.length} itemSize={70} width={'100%'} overscanCount={10}>
                      {VirtualizedRow}
                    </List>
                  </div>
                  
                </div>
              ) : (
                <div className="placeholder-container">
                  <p className="placeholder-text" style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                    Upload NMS and SA Masterlist to scan for recursive alarms.
                  </p>
                </div>
              )}
            </div>

          </div>
        </section>
      </main>
    </DashboardLayout>
  );
}