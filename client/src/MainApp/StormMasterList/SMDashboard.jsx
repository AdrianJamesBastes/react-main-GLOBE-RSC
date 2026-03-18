import { useState, useMemo, useRef, useEffect } from 'react';
import useDarkMode from '../../hooks/useDarkMode';
import AnalyticsDashboard from '../../Dashboard/AnalyticsDashboard';
import MapVisualizer from '../../Map/MapVisualizer';
import globeLogoDark from '../../assets/Globe_LogoW.png';
import globeLogoLight from '../../assets/Globe_LogoB.png';
import checkDark from '../../assets/checkDark.png';
import checkLight from '../../assets/checkLight.png';
import verifiedDark from '../../assets/verifiedDark.png';
import verifiedLight from '../../assets/verifiedLight.png';
import glitterDark from '../../assets/glitterDark.png';
import glitterLight from '../../assets/glitterLight.png';
import removedDark from '../../assets/removedDark.png';
import removedLight from '../../assets/removedLight.png';
import warningDark from '../../assets/warningDark.png';
import warningLight from '../../assets/warningLight.png';
import search from '../../assets/search.png';
import fileDark from '../../assets/fileDark.png';
import fileLight from '../../assets/fileLight.png';

import { useNavigate } from "react-router-dom";
import { FixedSizeList as List } from 'react-window';

import { parseLocationData, getShortRegionByProvince } from '../../utils/telecom';
import { cityToProvinceMap } from '../MapDictionary/TelecomDictionaries';
import DashboardLayout from '../../components/DashboardLayout';
import '../../styles/Dashboard_styles.css';
import './SM_styles.css';

const ICONS = {
  checkDark, checkLight, verifiedDark, verifiedLight,
  glitterDark, glitterLight, removedDark, removedLight,
  warningDark, warningLight, search, fileDark, fileLight
};

export default function SMDashboard() {
  const [monitorFile1, setMonitorFile1] = useState(null);
  const [monitorFile2, setMonitorFile2] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);

  const navigate = useNavigate();
  const [isDarkMode, toggleTheme] = useDarkMode();
  const [showPreviewMenu, setShowPreviewMenu] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedSite, setSelectedSite] = useState({ lat: 7.05568, lng: 125.5469, zoom: 15 });
  const [showBigMap, setShowBigMap] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedRowDetails, setSelectedRowDetails] = useState(null);

  const [aiCommand, setAiCommand] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false); 
  
  const [chatHistory, setChatHistory] = useState([
    { sender: 'ai', text: "Hello Adrian! I'm your veRiSynC AI Copilot. Ask me to list sites or update remarks!" }
  ]);
  
  const chatContainerRef = useRef(null);
  const sidebarTopRef = useRef(null);

  useEffect(() => {
    if (sidebarTopRef.current) {
      sidebarTopRef.current.scrollLeft = 0;
    }
  }, [showAiPanel, selectedRowDetails]);

  useEffect(() => {
    if (showAiPanel && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isAiLoading, showAiPanel]);

  const currentLogo = isDarkMode ? globeLogoDark : globeLogoLight;

  const handleFileChange = (e, setFileState) => {
    const file = e.target.files[0];
    if (file) setFileState(file);
  };

  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (evt) => resolve(evt.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleAiExecute = () => {
    if (!aiCommand.trim()) return;
    
    const userMessage = aiCommand.trim();
    setChatHistory(prev => [...prev, { sender: 'user', text: userMessage }]);
    setAiCommand(""); 
    setIsAiLoading(true);
    
    if (window.google && window.google.script) {
      
      const ignoreWords = [
        "CHANGE", "UPDATE", "SET", "MODIFY", "STATUS", "MAKE", "PUT", "ADD",
        "TO", "FROM", "THE", "IN", "OF", "ON", "FOR", "AND", "WITH",
        "VERIFIED", "NEW", "MISMATCH", "REMOVED", "UNCHANGED", 
        "SITE", "SITES", "REMARK", "REMARKS", "ID", "PLA", "BCF", "NAME",
        "PLEASE", "CAN", "YOU", "COULD", "WOULD", "JUST", "HELP", "ME", "WANT", "NEED",
        "LIST", "SHOW", "FIND", "COUNT", "ALL"
      ];
      
      const searchWords = userMessage
        .toUpperCase()
        .replace(/[^A-Z0-9_-]/g, ' ') 
        .split(' ')
        .filter(w => w.length > 2 && !ignoreWords.includes(w));
        
      let relevantData = [];
      if (searchWords.length > 0) {
        relevantData = results.filter(r => {
          const rowData = `${r.plaId} ${r.baseLocation} ${r.nmsName}`.toUpperCase();
          return searchWords.some(word => rowData.includes(word));
        });
      }

      let finalDataToSend = relevantData.length > 0 ? relevantData.slice(0, 250) : results.slice(0, 50);

      const lightweightData = finalDataToSend.map(r => ({
        plaId: r.plaId,
        matchStatus: r.matchStatus,
        baseLocation: r.baseLocation,
        nmsName: r.nmsName,
        remarks: r.remarks
      }));

      const dataString = JSON.stringify(lightweightData);

      window.google.script.run
        .withSuccessHandler((aiResponse) => {
          setIsAiLoading(false);
          
          if (!aiResponse) {
            setChatHistory(prev => [...prev, { sender: 'system', text: "⚠️ AI returned an empty response.", isError: true }]);
            return;
          }

          if (aiResponse.error) {
            setChatHistory(prev => [...prev, { sender: 'system', text: `⚠️ System Error: ${aiResponse.error}`, isError: true }]);
            return;
          }
          
          const replyText = aiResponse.reply || aiResponse.response || aiResponse.message || aiResponse.text;
          
          if (replyText) {
            setChatHistory(prev => [...prev, { sender: 'ai', text: replyText }]);
          } else if (!aiResponse.mutations || aiResponse.mutations.length === 0) {
            setChatHistory(prev => [...prev, { sender: 'ai', text: `🤖 [Raw Output]: ${JSON.stringify(aiResponse)}` }]);
          }

          if (aiResponse.mutations && Array.isArray(aiResponse.mutations) && aiResponse.mutations.length > 0) {
            try {
              let actualChangesCount = 0;
              const updatedResults = results.map(row => {
                const change = aiResponse.mutations.find(c => c && c.plaId === row.plaId);
                if (change && change.updates) {
                  actualChangesCount++;
                  const safeStatus = change.updates.matchStatus || row.matchStatus || 'UNCHANGED';
                  const safeRemarks = change.updates.remarks ? `(AI) ${change.updates.remarks}` : row.remarks;
                  
                  return { 
                    ...row, 
                    matchStatus: safeStatus, 
                    remarks: safeRemarks 
                  };
                }
                return row; 
              });
              
              if (actualChangesCount > 0) {
                setResults(updatedResults);
                setChatHistory(prev => [...prev, { sender: 'system', text: `✓ Successfully applied updates to ${actualChangesCount} rows.` }]);
              }
            } catch {
              setChatHistory(prev => [...prev, { sender: 'system', text: `⚠️ Table protected from corrupted AI data.`, isError: true }]);
            }
          }
        })
        .withFailureHandler((err) => {
          setIsAiLoading(false);
          setChatHistory(prev => [...prev, { sender: 'system', text: `⚠️ Network Timeout: ${err.message || err}`, isError: true }]);
        })
        .processAIAgentCommand(userMessage, dataString);
    } else {
      setTimeout(() => {
        setIsAiLoading(false);
        setChatHistory(prev => [...prev, { sender: 'ai', text: "I'm running locally. Google Apps Script is offline. 🔌" }]);
      }, 1000);
    }
  };

  const handleSpecificExport = async (exportCategory) => {
    setShowExportMenu(false);
    if (results.length === 0) return alert("No data to export.");

    const XLSX = await import('xlsx');

    const dataToExport = exportCategory === 'ALL' 
      ? results.filter(row => row.matchStatus !== 'REMOVED') 
      : results.filter(row => row.matchStatus === exportCategory);

    if (dataToExport.length === 0) return alert(`There are no "${exportCategory}" sites to export.`);

    const exportStatusOrder = ['NEW', 'MISMATCH', 'REMOVED', 'UNCHANGED'];
    
    dataToExport.sort((a, b) => {
      const orderA = exportStatusOrder.indexOf(a.matchStatus);
      const orderB = exportStatusOrder.indexOf(b.matchStatus);
      if (orderA !== orderB) return orderA - orderB;

      const baseA = a.baseLocation || "";
      const baseB = b.baseLocation || "";
      return baseA.localeCompare(baseB, undefined, { numeric: true, sensitivity: 'base' });
    });

    const excelData = dataToExport.map(row => {
      const geo = parseLocationData(row.baseLocation);
      
      let reg = getShortRegionByProvince(row.prov);
      if (!reg && geo.province) reg = getShortRegionByProvince(geo.province);
      if (!reg && row.mCity) {
        const cleanCity = String(row.mCity).toUpperCase().trim();
        const fallbackProv = cityToProvinceMap[cleanCity];
        if (fallbackProv) reg = getShortRegionByProvince(fallbackProv);
      }

      return {
        "Region": "MIN",
        "PLA ID": row.plaId === "NEW_SITE" ? "" : (row.plaId || ""),
        "PLA Status": "",
        "Area": row.sArea || "",
        "Region ": (row.region || geo.region || reg) || "",
        "Province": (row.prov || geo.province) || "",
        "Municipality": (row.mCity || geo.city) || "",
        "Barangay": "",
        "Site Address": row.sAdd || "",
        "Longitude": row.lng || "",
        "Latitude": row.lat || "",
        "Technology": row.techGen || "UDM Only",            
        "Tech Name/ BTS": row.nmsName || row.techName, 
        "Tech Description": "",
        "Tech Status": "",
        "Site Owner": row.twrC || geo.siteCode || "GLOBE TELECOM",
        "Territory": row.trt || "",
        "Hiroshima Severity": row.hSvr || "",
        "Remarks": row.remarks || "",
        "Remarks Status": row.matchStatus || ""
      };
    });

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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Masterlist Data");
    
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `StormMasterlist_${exportCategory === 'ALL' ? 'Complete' : exportCategory}_${dateStr}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
  };

  const handleScan = async () => {
    if (!monitorFile1 || !monitorFile2) return alert("Please upload both CSV files.");
    setIsLoading(true);
    setResults([]);
    setFilterStatus('ALL');
    setSelectedRowDetails(null);
    setShowAiPanel(false); 

    try {
      const text1 = await readFileAsText(monitorFile1);
      const text2 = await readFileAsText(monitorFile2);

      const sendInChunks = (file1, file2) => {
        return new Promise((resolve, reject) => {
          if (window.google && window.google.script) {
             window.google.script.run
               .withSuccessHandler((resRaw) => {
                 const res = JSON.parse(resRaw);
                 if (res.success) resolve(res.data);
                 else reject(res.error);
               })
               .withFailureHandler(reject)
               .processCSVComparison(file1, file2);
          } else {
             setTimeout(() => {
               const mockData = [];
               const statuses = ["NEW", "MISMATCH", "UNCHANGED", "REMOVED"];
               for(let i=1; i<=50; i++) {
                 mockData.push({ 
                   plaId: `MIN_${String(i).padStart(4, '0')}`, 
                   matchStatus: statuses[(i-1) % statuses.length], 
                   techName: `SITENAME${i}DDN`, 
                   baseLocation: `SITENAME${i}DDN`,
                   techGen: "4G-FDD",
                   nmsName: `SITENAME${i}DDNLYK`,
                   remarks: "Mock data generated.",
                   lat: (7.0 + (Math.random() * 0.5)).toFixed(5), 
                   lng: (125.4 + (Math.random() * 0.5)).toFixed(5),
                   sArea: "N/A", prov: "UNKNOWN", mCity: "UNKNOWN", sAdd: "N/A", trt: "N/A", hSvr: "N/A", twrC: "N/A"
                 });
               }
               resolve(mockData);
             }, 1000);
          }
        });
      };

      const data = await sendInChunks(text1, text2);
      setResults(data);
      setIsLoading(false);
    } catch (error) {
      alert("Error: " + error);
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    const siteMap = new Map();
    results.forEach(r => {
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
  }, [results]);

  const filteredResults = useMemo(() => {
    const statusOrder = ['NEW', 'MISMATCH', 'UNCHANGED', 'REMOVED'];
    const term = searchTerm.toLowerCase();

    return results
      .filter(row => {
        const matchesSearch = [row.plaId, row.baseLocation, row.remarks, row.nmsName]
          .filter(Boolean)
          .some(value => value.toString().toLowerCase().includes(term));
        const matchesStatus = filterStatus === 'ALL' ? true : row.matchStatus === filterStatus;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const orderA = statusOrder.indexOf(a.matchStatus);
        const orderB = statusOrder.indexOf(b.matchStatus);
        if (orderA !== orderB) return orderA - orderB;

        const baseA = a.baseLocation || "";
        const baseB = b.baseLocation || "";
        const baseCompare = baseA.localeCompare(baseB, undefined, { numeric: true, sensitivity: 'base' });
        
        if (baseCompare === 0) return (a.nmsName || "").localeCompare(b.nmsName || "");
        return baseCompare;
      });
  }, [results, searchTerm, filterStatus]);

  const getPreviewLabel = (status) => {
    switch(status) {
      case 'ALL': return 'Storm Masterlist';
      case 'NEW': return 'New Sites Only';
      case 'REMOVED': return 'Removed Only';
      case 'MISMATCH': return 'Mismatches Only';
      case 'UNCHANGED': return 'Unchanged Only';
      default: return status;
    }
  };

  const handleNavigate = (path) => {
    setIsLoading(true);
    setTimeout(() => {
      navigate(path);
    }, 1000); 
  };

  const VirtualizedRow = ({ index, style }) => {
    const row = filteredResults[index];
    const prevRow = filteredResults[index - 1];
    const nextRow = filteredResults[index + 1];

    const isExactRow = selectedSite?.nmsName === row.nmsName;
    const isSameGroup = selectedSite?.baseLocation === row.baseLocation && !isExactRow;
    const isFirstOfGroup = !prevRow || prevRow.baseLocation !== row.baseLocation;
    const isLastOfGroup = !nextRow || nextRow.baseLocation !== row.baseLocation;

    let rowStyle = {
      ...style,
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      cursor: "pointer", 
      transition: "background-color 0.2s",
      borderBottom: isLastOfGroup ? "2px solid var(--border-color)" : "1px solid rgba(128,128,128,0.1)",
      backgroundColor: isExactRow ? "rgba(0, 123, 255, 0.2)" : (isSameGroup ? "rgba(128, 128, 128, 0.15)" : "transparent"),
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
      <div 
        style={rowStyle} 
        className="row-hover"
        onClick={() => {
          const lat = parseFloat(row.lat);
          const lng = parseFloat(row.lng);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            setSelectedSite({ lat, lng, id: row.plaId, baseLocation: row.baseLocation, nmsName: row.nmsName, zoom: 18 });
            setSelectedRowDetails(row);
          } else {
            console.warn("Invalid coordinates for site:", row.plaId);
            setSelectedRowDetails(row); 
          }
        }}
      >
        <div style={{ ...columnStyle, width: '10%', fontWeight: 'bold' }}>
          {isFirstOfGroup ? (row.plaId === "NEW_SITE" ? "N/A" : row.plaId) : ""}
        </div>
        <div style={{ ...columnStyle, width: '10%' }}>
          {isFirstOfGroup && (
            <span className={`status-badge ${(row.matchStatus || 'UNCHANGED').toLowerCase()}`} style={{ fontSize: '0.7rem' }}>
              {row.matchStatus || 'UNCHANGED'}
            </span>
          )}
        </div>
        <div style={{ ...columnStyle, width: '20%', fontWeight: '500' }}>
          {isFirstOfGroup ? row.baseLocation : ""}
        </div>
        <div style={{ ...columnStyle, width: '10%', fontWeight: 'bold', color: row.techGen?.includes('5G') ? '#28a745' : (row.techGen?.includes('4G') ? '#007bff' : '#666') }}>
          {row.techGen}
        </div>
        <div style={{ ...columnStyle, width: '25%', fontFamily: 'monospace', color: '#1a73e8', fontWeight: 'bold' }}>
          {row.nmsName}
        </div>
        <div style={{ ...columnStyle, width: '25%', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {isFirstOfGroup ? row.remarks : ""}
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

      <div className="export-dropdown-container" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setShowExportMenu(false); }} tabIndex={-1}>
        <button className="btn primary-outline export-toggle-btn" onClick={() => setShowExportMenu(!showExportMenu)}>
          Export Data 
        </button>
        {showExportMenu && (
          <div className="export-menu">
            <button onClick={() => handleSpecificExport('ALL')}>Storm Masterlist</button>
            <button onClick={() => handleSpecificExport('NEW')}>New Sites Only</button>
            <button onClick={() => handleSpecificExport('REMOVED')}>Removed Only</button>
            <button onClick={() => handleSpecificExport('MISMATCH')}>Mismatches Only</button>
            <button onClick={() => handleSpecificExport('UNCHANGED')}>Unchanged Only</button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <DashboardLayout
      isLoading={isLoading}
      logo={currentLogo}
      onLogoClick={() => handleNavigate("/")}
      headerActions={headerActions}
    >
      <main className="main-layout">
        
        <aside className="sidebar" style={{ width: '320px', minWidth: '320px', flexShrink: 0 }}>
          
          <div className="sidebar-top-section" ref={sidebarTopRef} style={{ width: '100%', flex: showAiPanel ? '1' : '0 0 350px' }}>
            <div className={`sidebar-carousel ${showAiPanel ? 'show-ai' : (selectedRowDetails ? 'show-details' : '')}`}>
              
              <div className="carousel-panel">
                <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '1.1rem' }}>Data Input</h3>
                <div className="upload-group">
                  <span className="input-label">NMS CSV</span>
                  <div className="file-drop-area">
                    <img src={isDarkMode ? fileDark : fileLight} className="upload-icon" alt="icon" style={{ width: '20px' }} />
                    <span className="file-msg">{monitorFile1 ? monitorFile1.name : "Drag & drop or click"}</span>
                    <input className="file-input" type="file" accept=".csv" onChange={(e) => handleFileChange(e, setMonitorFile1)} />
                  </div>
                </div>
                <div className="upload-group">
                  <span className="input-label">UDM CSV</span>
                  <div className="file-drop-area">
                    <img src={isDarkMode ? fileDark : fileLight} className="upload-icon" alt="icon" style={{ width: '20px' }} />
                    <span className="file-msg">{monitorFile2 ? monitorFile2.name : "Drag & drop or click"}</span>
                    <input className="file-input" type="file" accept=".csv" onChange={(e) => handleFileChange(e, setMonitorFile2)} />
                  </div>
                </div>
                <button className="btn primary-filled scan-btn full-width" onClick={handleScan} disabled={isLoading} style={{ marginTop: 'auto', padding: '12px' }}>
                  <img src={search} alt="Scan" className="btn-icon" style={{ width: '16px' }} />
                  <span>{isLoading ? "Scanning..." : "Scan Files"}</span>
                </button>
              </div>

              <div className="carousel-panel">
                <div className="details-header">
                  <button className="back-btn" onClick={() => setSelectedRowDetails(null)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Site Details</h3>
                </div>
                
                {selectedRowDetails && (
                  <div className="details-content">
                    <div>
                      <span className="input-label">PLA_ID</span>
                      <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>
                        {selectedRowDetails.plaId === "NEW_SITE" ? "N/A" : selectedRowDetails.plaId}
                      </div>
                    </div>
                    <div>
                      <span className="input-label">Status</span>
                      <div style={{ marginTop: '6px' }}>
                        <span className={`status-badge ${selectedRowDetails.matchStatus.toLowerCase()}`}>
                          {selectedRowDetails.matchStatus}
                        </span>
                      </div>
                    </div>
                    <div className="details-box">
                      <span className="input-label">Tech Name (String)</span>
                      <div style={{ fontWeight: 'bold', marginTop: '4px', wordBreak: 'break-word' }}>
                        {selectedRowDetails.nmsName || selectedRowDetails.baseLocation}
                      </div>
                    </div>
                    <div className="details-box">
                      <span className="input-label">System Remarks</span>
                      <div style={{ fontWeight: 'bold', marginTop: '4px', wordBreak: 'break-word', color: selectedRowDetails.matchStatus === 'MISMATCH' ? '#d97706' : '' }}>
                        {selectedRowDetails.remarks}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="carousel-panel" style={{ padding: 0 }}>
                <div style={{ padding: '2rem 1.5rem 1rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '12px', background: isDarkMode ? 'rgba(17, 28, 68, 0.95)' : 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(24px)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <button className="back-btn" onClick={() => setShowAiPanel(false)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                    <span style={{ fontSize: '1.4rem' }}>✨</span> veRiSynC AI
                  </h3>
                </div>
                
                <div ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {chatHistory.map((msg, idx) => (
                    <div key={idx} style={{ 
                      alignSelf: msg.sender === 'user' ? 'flex-end' : (msg.sender === 'system' ? 'center' : 'flex-start'),
                      maxWidth: msg.sender === 'system' ? '100%' : '85%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <div style={{
                        padding: msg.sender === 'system' ? '6px 12px' : '10px 14px',
                        borderRadius: msg.sender === 'user' ? '16px 16px 0 16px' : (msg.sender === 'system' ? '20px' : '16px 16px 16px 0'),
                        background: msg.sender === 'user' ? 'var(--brand-purple)' : (msg.sender === 'system' ? 'rgba(13, 177, 92, 0.15)' : 'var(--bg-input)'),
                        color: msg.sender === 'user' ? 'white' : (msg.sender === 'system' ? '#0db15c' : (msg.isError ? '#f02849' : 'var(--text-primary)')),
                        fontSize: msg.sender === 'system' ? '0.75rem' : '0.85rem',
                        lineHeight: '1.4',
                        border: msg.sender === 'ai' ? '1px solid var(--border-light)' : 'none',
                        fontWeight: msg.sender === 'system' ? 'bold' : 'normal'
                      }}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  
                  {isAiLoading && (
                    <div style={{ alignSelf: 'flex-start', background: 'var(--bg-input)', padding: '10px 14px', borderRadius: '16px 16px 16px 0', border: '1px solid var(--border-light)' }}>
                      <span style={{ display: 'inline-block', animation: 'logo-pulse 1s infinite', fontSize: '0.85rem' }}>🤖 Thinking...</span>
                    </div>
                  )}
                </div>

                <div style={{ padding: '1rem 1.5rem 1.5rem 1.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '10px', position: 'sticky', bottom: 0, background: 'var(--bg-card)' }}>
                  <textarea 
                    placeholder="Message Gemini..." 
                    value={aiCommand}
                    onChange={(e) => setAiCommand(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAiExecute();
                      }
                    }}
                    style={{ 
                      flex: 1, 
                      minHeight: '40px',
                      maxHeight: '100px',
                      padding: '10px 14px',
                      borderRadius: '20px',
                      background: 'var(--bg-input)', 
                      border: '1px solid var(--border-color)', 
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      resize: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      lineHeight: '1.4'
                    }}
                  />
                  <button 
                    onClick={handleAiExecute}
                    disabled={isAiLoading || !aiCommand.trim()}
                    className="btn primary-filled"
                    style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </button>
                </div>
              </div>
              
            </div>
          </div>

          <div className="sidebar-map-wrapper" style={{ display: showAiPanel ? 'none' : 'flex' }}>
            <div className="map-floating-header">
              <span className="floating-title">Site Visualizer</span>
              <button className="floating-btn" onClick={() => setShowBigMap(true)} aria-label="Expand map">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M4 8V4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M20 16v4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M20 8h-4V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 20H4v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div className="mini-map">
              {!showAiPanel && (
                <MapVisualizer selectedSite={selectedSite} filteredResults={filteredResults} isExpanded={false} />
              )}
            </div>
          </div>

        </aside>

        <section className="content-area">

          <div 
            className={`ai-side-tab ${showAiPanel ? 'active' : ''}`}
            onClick={() => {
              setShowAiPanel(!showAiPanel);
            }}
          >
            <span style={{ fontSize: '1rem', transform: 'rotate(90deg)' }}>{showAiPanel ? "✕" : "</>"}</span>
            <span className="ai-tab-text">{showAiPanel ? "CLOSE" : "veRiSynC AI"}</span>
          </div>

          <div className="output-card">
            <div className="dashboard-container">
              <AnalyticsDashboard data={results} activeFilter={filterStatus} onFilterChange={setFilterStatus} isDarkMode={isDarkMode} />
              
              {/* 🚀 THE DYNAMIC COMPACT MODE CLASS */}
              <div className={`cards-section ${results.length > 0 ? 'compact-mode' : ''}`}>
                
                <div className={`stat-card luxury-glass total ${filterStatus === 'ALL' ? 'active' : ''}`} onClick={() => setFilterStatus('ALL')} style={{cursor: 'pointer'}}>
                  <img src={isDarkMode ? ICONS.checkDark : ICONS.checkLight} className="stat-icon" alt="Total" />
                  <div className="stat-label">Total Validated</div>
                  <div className="stat-value">{stats.total}</div>
                </div>

                <div className={`stat-card luxury-glass unchanged ${filterStatus === 'UNCHANGED' ? 'active' : ''}`} onClick={() => setFilterStatus('UNCHANGED')} style={{cursor: 'pointer'}}>
                  <img src={isDarkMode ? ICONS.verifiedDark : ICONS.verifiedLight} className="stat-icon" alt="Verified" />
                  <div className="stat-label">Verified</div>
                  <div className="stat-value">{stats.unchanged}</div>
                </div>

                <div className={`stat-card luxury-glass new ${filterStatus === 'NEW' ? 'active' : ''}`} onClick={() => setFilterStatus('NEW')} style={{cursor: 'pointer'}}>
                  <img src={isDarkMode ? ICONS.glitterDark : ICONS.glitterLight} className="stat-icon" alt="New" />
                  <div className="stat-label">New In NMS</div>
                  <div className="stat-value">{stats.new}</div>
                </div>

                <div className={`stat-card luxury-glass removed ${filterStatus === 'REMOVED' ? 'active' : ''}`} onClick={() => setFilterStatus('REMOVED')} style={{cursor: 'pointer'}}>
                  <img src={isDarkMode ? ICONS.removedDark : ICONS.removedLight} className="stat-icon" alt="Removed" />
                  <div className="stat-label">Removed</div>
                  <div className="stat-value">{stats.removed}</div>
                </div>

                <div className={`stat-card luxury-glass mismatch ${filterStatus === 'MISMATCH' ? 'active' : ''}`} onClick={() => setFilterStatus('MISMATCH')} style={{cursor: 'pointer'}}>
                  <img src={isDarkMode ? ICONS.warningDark : ICONS.warningLight} className="stat-icon" alt="Warning" />
                  <div className="stat-label">Discrepancy</div>
                  <div className="stat-value">{stats.mismatch}</div>
                </div>
              </div>
            </div>

            <div className="table-toolbar">
              <div 
                className="preview-dropdown-container" 
                onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setShowPreviewMenu(false); }} 
                tabIndex={-1}
              >
                <button 
                  className="preview-toggle-btn" 
                  onClick={() => setShowPreviewMenu(!showPreviewMenu)}
                  disabled={results.length === 0}
                  style={{ opacity: results.length === 0 ? 0.5 : 1, cursor: results.length === 0 ? 'not-allowed' : 'pointer' }}
                >
                  Preview Data: <span style={{fontWeight: 'bold', color: 'var(--brand-purple)'}}>{getPreviewLabel(filterStatus)}</span> 
                </button>

                {showPreviewMenu && (
                  <div className="preview-menu">
                    <button onClick={() => { setFilterStatus('ALL'); setShowPreviewMenu(false); }}>Storm Masterlist</button>
                    <button onClick={() => { setFilterStatus('NEW'); setShowPreviewMenu(false); }}>New Sites Only</button>
                    <button onClick={() => { setFilterStatus('REMOVED'); setShowPreviewMenu(false); }}>Removed Only</button>
                    <button onClick={() => { setFilterStatus('MISMATCH'); setShowPreviewMenu(false); }}>Mismatches Only</button>
                    <button onClick={() => { setFilterStatus('UNCHANGED'); setShowPreviewMenu(false); }}>Unchanged Only</button>
                  </div>
                )}
              </div>

              <input 
                type="text" 
                className="search-bar" 
                placeholder="Search ID or Name..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                disabled={results.length === 0} 
                style={{ 
                  opacity: results.length === 0 ? 0.5 : 1, 
                  cursor: results.length === 0 ? 'not-allowed' : 'text' 
                }}
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
                    <div style={{ width: '10%', paddingRight: '15px', boxSizing: 'border-box' }}>PLA_ID</div>
                    <div style={{ width: '10%', paddingRight: '15px', boxSizing: 'border-box' }}>Status</div>
                    <div style={{ width: '20%', paddingRight: '15px', boxSizing: 'border-box' }}>Base Name</div>
                    <div style={{ width: '10%', color: '#1a73e8', paddingRight: '15px', boxSizing: 'border-box' }}>Tech</div>
                    <div style={{ width: '25%', color: '#1a73e8', paddingRight: '15px', boxSizing: 'border-box' }}>BCF NAME</div>
                    <div style={{ width: '25%', paddingRight: '15px', boxSizing: 'border-box' }}>Remarks</div>
                  </div>
                  
                  <div style={{ flex: 1, width: '100%' }}>
                    <List
                      height={500} 
                      itemCount={filteredResults.length}
                      itemSize={60}
                      width={'100%'}
                      overscanCount={10}
                    >
                      {VirtualizedRow}
                    </List>
                  </div>
                  
                </div>
              ) : (
                <div className="placeholder-container">
                  <p className="placeholder-text" style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                    Ready for Delta check. Please upload NMS and UDM CSV files.
                  </p>
                </div>
              )}
            </div>

          </div>
        </section>
      </main>

      {showBigMap && (
        <div className="map-modal-overlay">
          <div className="map-modal-content">
            <div className="map-modal-header">
              <h3>Site Location: {selectedSite.baseLocation || "Region Map"}</h3>
              <button className="close-btn" onClick={() => setShowBigMap(false)}> Close</button>
            </div>
            <div className="big-map-wrapper">
              <MapVisualizer selectedSite={selectedSite} filteredResults={filteredResults} isExpanded={true} />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}