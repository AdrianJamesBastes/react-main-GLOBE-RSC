import { useState, useEffect } from 'react';
import AnalyticsDashboard from '../Dashboard/AnalyticsDashboard';
import MapVisualizer from '../Map/MapVisualizer';

import globeLogoDark from '../assets/Globe_LogoW.png'; 
import globeLogoLight from '../assets/Globe_LogoB.png'; 

import './App.css';

function LoadingScreen({ logo }) {
  return (
    <div className="loading-overlay">
      <div className="spinner-box">
        <div className="spinner-ripple"></div>
        <div className="spinner-ring"></div>
        <img src={logo} alt="Loading..." className="loading-logo" />
      </div>
      <p className="loading-text">Processing Delta Comparison...</p>
    </div>
  );
}

export default function App() {
  const [monitorFile1, setMonitorFile1] = useState(null);
  const [monitorFile2, setMonitorFile2] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedSite, setSelectedSite] = useState({ lat: 7.05568, lng: 125.5469, zoom: 15 });
  const [showBigMap, setShowBigMap] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  const [selectedRowDetails, setSelectedRowDetails] = useState(null);

  useEffect(() => {
    if (isDarkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);
  const currentLogo = isDarkMode ? globeLogoDark : globeLogoLight;

const filteredResults = results.filter(row => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = [row.plaId, row.techName, row.baseLocation, row.remarks]
      .filter(Boolean).some(value => value.toString().toLowerCase().includes(term));
    const matchesStatus = filterStatus === 'ALL' ? true : row.matchStatus === filterStatus;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    // 1. Sort primarily by Base Location (Alphanumerically)
    const baseA = a.baseLocation || "";
    const baseB = b.baseLocation || "";
    const baseCompare = baseA.localeCompare(baseB, undefined, { numeric: true, sensitivity: 'base' });
    
    // 2. If the Base Locations are identical, sort by PLA_ID to keep groupings perfect
    if (baseCompare === 0) {
      const plaA = a.plaId || "";
      const plaB = b.plaId || "";
      return plaA.localeCompare(plaB, undefined, { numeric: true, sensitivity: 'base' });
    }
    
    return baseCompare;
  });

  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const handleSpecificExport = (exportCategory) => {
    setShowExportMenu(false);
    if (results.length === 0) return alert("No data to export.");

    const dataToExport = exportCategory === 'ALL' ? results : results.filter(row => row.matchStatus === exportCategory);
    if (dataToExport.length === 0) return alert(`There are no "${exportCategory}" sites to export.`);

    const headers = ["PLA_ID", "Match Status", "Tech Name", "Base Location", "Suffix", "Remarks", "Latitude", "Longitude"];
    const rows = dataToExport.map(row => [
      row.plaId, row.matchStatus, `"${row.techName || ""}"`, `"${row.baseLocation || ""}"`, `"${row.technologySuffix || ""}"`, `"${row.remarks || ""}"`, row.lat, row.lng
    ].join(","));
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `network_report_${exportCategory === 'ALL' ? 'All_Sites' : exportCategory}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

      setTimeout(() => {
        if (window.google && window.google.script) {
           window.google.script.run
             .withSuccessHandler((resRaw) => {
               const res = JSON.parse(resRaw);
               if (res.success) {
                 setResults(res.data);
                 if (res.count === 0) alert("No data parsed. Check CSV format.");
               } else alert("Error: " + res.error);
               setIsLoading(false);
             })
             .withFailureHandler((err) => {
               alert("Connection Failed: " + err);
               setIsLoading(false);
             })
             .processCSVComparison(text1, text2);
        } else {
           // Fallback Mock Data mapped to the new backend structure
           const mockData = [];
           const statuses = ["UNCHANGED", "MISMATCH", "NEW", "REMOVED"];
           for(let i=1; i<=50; i++) {
             mockData.push({ 
               plaId: `MIN_${String(i).padStart(4, '0')}`, 
               matchStatus: statuses[i % 4], 
               techName: `SITENAME${i}DDNLYK`, 
               baseLocation: `SITENAME${i}DDN`,
               technologySuffix: "LYK",
               remarks: "Mock data generated.",
               lat: (7.0 + (Math.random() * 0.5)).toFixed(5), 
               lng: (125.4 + (Math.random() * 0.5)).toFixed(5) 
             });
           }
           setResults(mockData);
           setIsLoading(false);
        }
      }, 1000);
    } catch (error) {
      alert("Error: " + error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      {isLoading && <LoadingScreen logo={currentLogo} />}

      <header className="top-bar">
        <div className="logo-section">
          <img className="globe-logo" src={currentLogo} alt="Globe Logo" />
        </div>
        
        <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
          <button className="btn theme-toggle" onClick={toggleTheme} title="Toggle Theme">
            {isDarkMode ? "☀️ Light" : "🌙 Dark"}
          </button>

          <div className="export-dropdown-container" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setShowExportMenu(false); }} tabIndex={-1}>
            <button className="btn primary-outline export-toggle-btn" onClick={() => setShowExportMenu(!showExportMenu)}>
              Export Data ▾
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
      </header>

      <main className="main-layout">
        <aside className="sidebar">
          <div className="sidebar-top-section">
            <div className={`sidebar-carousel ${selectedRowDetails ? 'show-details' : ''}`}>
              
              <div className="carousel-panel">
                <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.2rem' }}>Data Input</h3>
                <div className="upload-group">
                  <label className="input-label">NMS CSV</label>
                  <div className="file-drop-area">
                    <span className="file-msg">{monitorFile1 ? monitorFile1.name : "Drag & drop or click"}</span>
                    <input className="file-input" type="file" accept=".csv" onChange={(e) => setMonitorFile1(e.target.files[0])} />
                  </div>
                </div>
                <div className="upload-group">
                  <label className="input-label">UDM CSV</label>
                  <div className="file-drop-area">
                    <span className="file-msg">{monitorFile2 ? monitorFile2.name : "Drag & drop or click"}</span>
                    <input className="file-input" type="file" accept=".csv" onChange={(e) => setMonitorFile2(e.target.files[0])} />
                  </div>
                </div>
                <button className="btn primary-filled full-width" onClick={handleScan} disabled={isLoading} style={{ marginTop: 'auto' }}>
                  {isLoading ? "Scanning..." : "Scan Files"}
                </button>
              </div>

              <div className="carousel-panel">
                <div className="details-header">
                  <button className="back-btn" onClick={() => setSelectedRowDetails(null)}>←</button>
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
              <button className="floating-btn" onClick={() => setShowBigMap(true)}>⤢</button>
            </div>
            <div className="mini-map">
              <MapVisualizer selectedSite={selectedSite} filteredResults={filteredResults} isExpanded={false} />
            </div>
          </div>
        </aside>

        <section className="content-area">
          <div className="output-card">
            {results.length > 0 && (
              <AnalyticsDashboard data={results} activeFilter={filterStatus} onFilterChange={setFilterStatus} />
            )}

            {results.length > 0 && (
              <div className="table-toolbar">
                <span className="table-label">
                  {filterStatus === 'ALL' ? 'Detailed Report' : `Filtered View: ${filterStatus}`}
                </span>
                <input type="text" className="search-bar" placeholder="Search ID or Name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            )}

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
    <th style={{color: '#1a73e8'}}>NMS Techname</th>
    <th>Remarks</th>
  </tr>
        </thead>
                        <tbody>
                  {filteredResults.flatMap((row, i) => {
                    
                    // --- 1. THE RAN CLASSIFIER FUNCTION ---
                    // This reads the NMS string, isolates the suffix, and tags the technology
                    const buildSubRows = (origStringGroup, baseGen) => {
                      if (!origStringGroup) return [];
                      
                      // Split the " | " strings into an array so they each get their own row!
                      return origStringGroup.split(" | ").map(nmsName => {
                        
                        // Isolate just the suffix to prevent false positives from the city name
                        const suffixMatch = nmsName.match(/(?:ID|AS|[XYLFWKHVZJBMNPRT])+$/i);
                        const suffix = suffixMatch ? suffixMatch[0].toUpperCase() : "";
                        
                        let label = baseGen;
                        
                        // Apply your exact telecom rules
                        if (baseGen === "4G") {
                          let types = [];
                          if (/[FLWY]/i.test(suffix)) types.push("");
                          if (/H/i.test(suffix)) types.push("");
                          if (/V/i.test(suffix)) types.push("");
                          
                          if (types.length > 0) label = `4G`;
                        } 
                        else if (baseGen === "5G") {
                          let types = [];
                          if (/M/i.test(suffix)) types.push("");
                          if (/[PN]/i.test(suffix)) types.push(""); // Including N as NMM Macro
                          
                          if (types.length > 0) label = `5G`;
                        }
                        
                        return { techGen: label, nmsName: nmsName };
                      });
                    };

                    // --- 2. UNFOLD THE ROWS ---
                    const subRows = [
                      ...buildSubRows(row.original2G, "2G"),
                      ...buildSubRows(row.original4G, "4G"),
                      ...buildSubRows(row.original5G, "5G")
                    ];
                    
                    // If it's a REMOVED site (no NMS data), we just show the smashed UDM name
                    if (subRows.length === 0) {
                      subRows.push({ techGen: "", nmsName: "" });
                    }

                    // --- 3. DRAW THE TABLE ---
                    return subRows.map((sub, j) => {
                      const isExactRow = selectedSite?.index === i;
                      const isSameGroup = selectedSite?.id === row.plaId && !isExactRow;
                      let rowStyle = { cursor: "pointer", transition: "background-color 0.2s" };
                      
                      if (isExactRow) rowStyle.backgroundColor = "rgba(0, 123, 255, 0.2)";
                      else if (isSameGroup) rowStyle.backgroundColor = "rgba(128, 128, 128, 0.15)";

                      // Thicker bottom border to cleanly separate different PLA_IDs
                      const isLastOfGroup = j === subRows.length - 1;
                      if (isLastOfGroup) rowStyle.borderBottom = "2px solid var(--border-color)";

                      return (
                        <tr key={`${i}-${j}`} className="row-hover" style={rowStyle}
                          onClick={() => {
                            const lat = parseFloat(row.lat);
                            const lng = parseFloat(row.lng);
                            setSelectedSite({ lat, lng, id: row.plaId, zoom: 18, index: i });
                            setSelectedRowDetails(row);
                          }}
                        >
                          {/* Only show the Base Data on the FIRST row of the group to keep it clean */}
                          <td className="font-bold">{j === 0 ? row.plaId : ""}</td>
                          <td>
                            {j === 0 && (
                              <span className={`status-badge ${row.matchStatus.toLowerCase()}`}>
                                {row.matchStatus}
                              </span>
                            )}
                          </td>
                          
                          <td style={{ fontWeight: '500' }}>{j === 0 ? row.baseLocation : ""}</td>
                          
                          {/* The dynamically classified Technology Label */}
                          <td style={{ fontWeight: 'bold', color: sub.techGen.includes('5G') ? '#28a745' : (sub.techGen.includes('4G') ? '#007bff' : '#666') }}>
                            {sub.techGen}
                          </td>
                          
                          {/* The individual, original NMS String */}
                          <td style={{ fontFamily: 'monospace', color: '#1a73e8', fontWeight: 'bold' }}>
                            {sub.nmsName}
                          </td>
                          
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                            {j === 0 ? row.remarks : ""}
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
                  </table>
                </div>
              ) : (
                <div className="placeholder-container">
                  <p className="placeholder-text">Ready for Delta check. Please upload NMS and UDM CSV files.</p>
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
              <button className="close-btn" onClick={() => setShowBigMap(false)}>✖ Close</button>
            </div>
            <div className="big-map-wrapper">
              <MapVisualizer selectedSite={selectedSite} filteredResults={filteredResults} isExpanded={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}