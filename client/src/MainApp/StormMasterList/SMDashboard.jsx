import { useState, useMemo } from 'react';
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

// Note: getTechSplits is removed because we unpivot the columns now
import { parseLocationData, getShortRegionByProvince } from '../../utils/telecom';
import { cityToProvinceMap } from '../MapDictionary/TelecomDictionaries';
import DashboardLayout from '../../components/DashboardLayout';
import '../../styles/Dashboard_styles.css';
import './SM_styles.css';

const ICONS = {
  checkDark,
  checkLight,
  verifiedDark,
  verifiedLight,
  glitterDark,
  glitterLight,
  removedDark,
  removedLight,
  warningDark,
  warningLight,
  search,
  fileDark,
  fileLight
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

const handleSpecificExport = async (exportCategory) => {
    setShowExportMenu(false);
    if (results.length === 0) return alert("No data to export.");

    // Dynamic import to keep initial bundle size small
    const XLSX = await import('xlsx');

    // NEW LOGIC: If exporting 'ALL', filter out the 'REMOVED' sites!
    const dataToExport = exportCategory === 'ALL' 
      ? results.filter(row => row.matchStatus !== 'REMOVED') 
      : results.filter(row => row.matchStatus === exportCategory);

    if (dataToExport.length === 0) return alert(`There are no "${exportCategory}" sites to export.`);

    // --- NEW: Custom Sorting Logic for the Excel File ---
    const exportStatusOrder = ['NEW', 'MISMATCH', 'REMOVED', 'UNCHANGED'];
    
    dataToExport.sort((a, b) => {
      // 1. Sort by your specific Status priority
      const orderA = exportStatusOrder.indexOf(a.matchStatus);
      const orderB = exportStatusOrder.indexOf(b.matchStatus);
      if (orderA !== orderB) return orderA - orderB;

      // 2. If they have the same Status, sort them alphabetically by Base Name
      const baseA = a.baseLocation || "";
      const baseB = b.baseLocation || "";
      return baseA.localeCompare(baseB, undefined, { numeric: true, sensitivity: 'base' });
    });
    // ---------------------------------------------------

    // Flat results: each row is already one technology entry from the backend Gold layer
   // Flat results: each row is already one technology entry from the unpivoting step
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
        "PLA ID": row.plaId || "",
        "PLA Status": "",
        "Area": row.sArea || "",
        "Region ": (row.region || geo.region || reg) || "",
        "Province": (row.prov || geo.province) || "",
        "Municipality": (row.mCity || geo.city) || "",
        "Barangay": "",
        "Site Address": row.sAdd || "",
        "Longitude": row.lng || "",
        "Latitude": row.lat || "",
        "Technology": row.techGen || "UDM Only", // <-- FIXED: Pulls the 4G-FDD label             
        "Tech Name/ BTS": row.nmsName || row.techName, // <-- FIXED: Pulls the specific NMS string
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

    try {
      const text1 = await readFileAsText(monitorFile1);
      const text2 = await readFileAsText(monitorFile2);

      // --- CHUNKING LOGIC FOR GOOGLE APPS SCRIPT ---
      // We break the strings into 50kb chunks to avoid the 50mb limit and stabilize the RPC bridge.
      const sendInChunks = (file1, file2) => {
        return new Promise((resolve, reject) => {
          const CHUNK_SIZE = 50000;
          const chunks1 = [];
          const chunks2 = [];
          
          for (let i = 0; i < file1.length; i += CHUNK_SIZE) chunks1.push(file1.substring(i, i + CHUNK_SIZE));
          for (let i = 0; i < file2.length; i += CHUNK_SIZE) chunks2.push(file2.substring(i, i + CHUNK_SIZE));

          // In a real industrial setup, you'd call a 'receiveChunk' function multiple times.
          // For now, we simulate the 'Gold' path or direct call if data is small.
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
             // Mocking behavior for development
             setTimeout(() => {
               const mockData = [];
               const statuses = ["NEW", "MISMATCH", "UNCHANGED", "REMOVED"];
               for(let i=1; i<=50; i++) {
                 mockData.push({ 
                   plaId: `MIN_${String(i).padStart(4, '0')}`, 
                   matchStatus: statuses[(i-1) % statuses.length], 
                   techName: `SITENAME${i}DDNLYK`, 
                   baseLocation: `SITENAME${i}DDN`,
                   techGen: "4G-FDD",
                   remarks: "Mock data generated.",
                   lat: (7.0 + (Math.random() * 0.5)).toFixed(5), 
                   lng: (125.4 + (Math.random() * 0.5)).toFixed(5)
                 });               }
               resolve(mockData);
             }, 1000);
          }
        });
      };

      const data = await sendInChunks(text1, text2);
      
      // RESTORING FRONTEND UNPIVOTING (Matches Original Backend Contract)
      const flattenedResults = data.flatMap((row, i) => {
        const buildSubRows = (origStringGroup, baseGen) => {
          if (!origStringGroup) return [];
          return origStringGroup.split(" | ").map(nmsName => {
            const suffixMatch = nmsName.match(/(?:ID|AS|[XYLFWKHVZJBMNPRT])+$/i);
            const suffix = suffixMatch ? suffixMatch[0].toUpperCase() : "";
            let label = baseGen;
            
            if (baseGen === "4G") {
              let types = [];
              if (/[FLWY]/i.test(suffix)) types.push("FDD");
              if (/H/i.test(suffix)) types.push("TDD");
              if (/V/i.test(suffix)) types.push("MM");
              if (types.length > 0) label = `4G-${types.join("/")}`;
            } else if (baseGen === "5G") {
              let types = [];
              if (/M/i.test(suffix)) types.push("MM");
              if (/[PN]/i.test(suffix)) types.push("NMM");
              if (types.length > 0) label = `5G-${types.join("/")}`;
            }
            return { ...row, techGen: label, nmsName: nmsName, parentIndex: i };
          });
        };

        const subRows = [
          ...buildSubRows(row.original2G, "2G"),
          ...buildSubRows(row.original4G, "4G"),
          ...buildSubRows(row.original5G, "5G")
        ];
        
        return subRows.length > 0 ? subRows : [{ ...row, techGen: "", nmsName: row.techName, parentIndex: i }];
      });

      setResults(flattenedResults);
      setIsLoading(false);
    } catch (error) {
      alert("Error: " + error);
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    // Unique sites for statistics
    const uniqueSites = Array.from(new Set(results.map(r => r.plaId || r.techName)));
    const siteMap = new Map();
    results.forEach(r => {
      const key = r.plaId || r.techName;
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
        const matchesSearch = [row.plaId, row.techName, row.baseLocation, row.remarks, row.nmsName]
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
        if (baseCompare === 0) return (a.plaId || "").localeCompare(b.plaId || "");
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
        <aside className="sidebar">
          <div className="sidebar-top-section">
            <div className={`sidebar-carousel ${selectedRowDetails ? 'show-details' : ''}`}>
              
              <div className="carousel-panel">
                <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.2rem' }}>Data Input</h3>
                <div className="upload-group">
                  <span className="input-label">NMS CSV</span>
                  <div className="file-drop-area">
                    <img src={isDarkMode ? fileDark : fileLight} className="upload-icon" alt="icon" />
                    <span className="file-msg">{monitorFile1 ? monitorFile1.name : "Drag & drop or click"}</span>
                    <input className="file-input" type="file" accept=".csv" onChange={(e) => handleFileChange(e, setMonitorFile1)} />
                  </div>
                </div>
                <div className="upload-group">
                  <span className="input-label">UDM CSV</span>
                  <div className="file-drop-area">
                    <img src={isDarkMode ? fileDark : fileLight} className="upload-icon" alt="icon" />
                    <span className="file-msg">{monitorFile2 ? monitorFile2.name : "Drag & drop or click"}</span>
                    <input className="file-input" type="file" accept=".csv" onChange={(e) => handleFileChange(e, setMonitorFile2)} />
                  </div>
                </div>
                <button className="btn primary-filled scan-btn full-width" onClick={handleScan} disabled={isLoading} style={{ marginTop: 'auto' }}>
                  <img src={search} alt="Scan" className="btn-icon" />
                  <span>{isLoading ? "Scanning..." : "Scan Files"}</span>
                </button>
              </div>

              <div className="carousel-panel">
                <div className="details-header">
                  <button className="back-btn" onClick={() => setSelectedRowDetails(null)}></button>
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Site Details</h3>
                </div>
                
                {selectedRowDetails && (
                  <div className="details-content">
                    <div>
                      <span className="input-label">PLA_ID</span>
                      <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{selectedRowDetails.plaId}</div>
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
                        {selectedRowDetails.techName}
                      </div>
                    </div>
                    <div className="details-box">
                      <span className="input-label">System Remarks</span>
                      <div style={{ fontWeight: 'bold', marginTop: '4px', wordBreak: 'break-word', color: selectedRowDetails.matchStatus === 'MISMATCH' ? '#d97706' : '' }}>
                        {selectedRowDetails.remarks}
                      </div>
                    </div>
                    <div>
                      <span className="input-label">Location Profile</span>
                      <div className="details-box" style={{ fontFamily: 'monospace', fontSize: '0.9rem', marginTop: '6px' }}>
                        Lat: {selectedRowDetails.lat}<br/>
                        Lng: {selectedRowDetails.lng}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="sidebar-map-wrapper">
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
              <MapVisualizer selectedSite={selectedSite} filteredResults={filteredResults} isExpanded={false} />
            </div>
          </div>
        </aside>

        <section className="content-area">
          <div className="output-card">
            <div className="dashboard-container">
              <AnalyticsDashboard data={results} activeFilter={filterStatus} onFilterChange={setFilterStatus} isDarkMode={isDarkMode} />
              <div className="cards-section">
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
                  <div className="stat-label">Missing (Removed)</div>
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

            <div className="output-box">
              {results.length > 0 ? (
                <div className="table-wrapper">
                  <table className="result-table">
                    <thead>
                      <tr>
                        <th>PLA_ID</th>
                        <th>Status</th>
                        <th>Base Name</th>
                        <th style={{color: '#1a73e8'}}>Technology</th>
                        <th style={{color: '#1a73e8'}}>BCF NAME</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResults.map((row, i) => {
                        const isExactRow = selectedSite?.id === row.plaId && selectedSite?.techName === row.techName;
                        const isSameGroup = selectedSite?.id === row.plaId && !isExactRow;
                        
                        let rowStyle = { cursor: "pointer", transition: "background-color 0.2s" };
                        if (isExactRow) rowStyle.backgroundColor = "rgba(0, 123, 255, 0.2)";
                        else if (isSameGroup) rowStyle.backgroundColor = "rgba(128, 128, 128, 0.15)";

                        // Check if this is the last item of its logical group for border styling
                        const nextRow = filteredResults[i + 1];
                        const isLastOfGroup = !nextRow || nextRow.plaId !== row.plaId;
                        if (isLastOfGroup) rowStyle.borderBottom = "2px solid var(--border-color)";

                        // Visual grouping logic: only show primary site info on the first row of a group
                        const prevRow = filteredResults[i - 1];
                        const isFirstOfGroup = !prevRow || prevRow.plaId !== row.plaId;

                        return (
                          <tr key={`${row.plaId}-${row.nmsName}-${i}`} className="row-hover" style={rowStyle}
                            onClick={() => {
                              const lat = parseFloat(row.lat);
                              const lng = parseFloat(row.lng);
                              setSelectedSite({ lat, lng, id: row.plaId, techName: row.techName, zoom: 18 });
                              setSelectedRowDetails(row);
                            }}
                          >
                            <td className="font-bold">{isFirstOfGroup ? row.plaId : ""}</td>
                            <td>
                              {isFirstOfGroup && (
                                <span className={`status-badge ${row.matchStatus.toLowerCase()}`}>
                                  {row.matchStatus}
                                </span>
                              )}
                            </td>
                            <td style={{ fontWeight: '500' }}>{isFirstOfGroup ? row.baseLocation : ""}</td>
                            <td style={{ fontWeight: 'bold', color: row.techGen?.includes('5G') ? '#28a745' : (row.techGen?.includes('4G') ? '#007bff' : '#666') }}>
                              {row.techGen}
                            </td>
                            <td style={{ fontFamily: 'monospace', color: '#1a73e8', fontWeight: 'bold' }}>
                              {row.nmsName}
                            </td>
                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                              {isFirstOfGroup ? row.remarks : ""}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
              <h3>Site Location: {selectedSite.id || "Region Map"}</h3>
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