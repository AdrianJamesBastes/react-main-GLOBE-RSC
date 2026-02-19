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
      <p className="loading-text">Processing Comparison of Data...</p>
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

  const [selectedSite, setSelectedSite] = useState({ lat: 7.25, lng: 125.55, zoom: 10 });
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
    const matchesSearch = [row.PLA_ID, row["UDM Name"], row["NMS Name"]]
      .filter(Boolean).some(value => value.toString().toLowerCase().includes(term));
    const matchesStatus = filterStatus === 'ALL' ? true : row.Status === filterStatus;
    return matchesSearch && matchesStatus;
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

    const dataToExport = exportCategory === 'ALL' ? results : results.filter(row => row.Status === exportCategory);
    if (dataToExport.length === 0) return alert(`There are no "${exportCategory}" sites to export.`);

    const headers = ["PLA_ID", "Status", "NMS Name", "UDM Name", "Latitude", "Longitude"];
    const rows = dataToExport.map(row => [
      row.PLA_ID, row.Status, `"${row["NMS Name"] || ""}"`, `"${row["UDM Name"] || ""}"`, row.Lat, row.Lng
    ].join(","));
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `network_report_${exportCategory === 'ALL' ? 'All_Sites' : exportCategory.replace(/\s+/g, '_')}.csv`;
    
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
                 if (res.count === 0) alert("Match! No discrepancies found.");
               } else alert("Error: " + res.error);
               setIsLoading(false);
             })
             .withFailureHandler((err) => {
               alert("Connection Failed: " + err);
               setIsLoading(false);
             })
             .processCSVComparison(text1, text2);
        } else {
           const mockData = [];
           for(let i=1; i<=200; i++) {
             mockData.push({ 
               PLA_ID: `MND_TEST_${String(i).padStart(4, '0')}`, 
               Status: i % 4 === 0 ? "UNCHANGED" : i % 3 === 0 ? "NEW SITE" : "NAME MISMATCH", 
               "NMS Name": `Site_${i}_Old`, 
               "UDM Name": `Site_${i}_New`, 
               Lat: (7.0 + (Math.random() * 0.5)).toFixed(5), 
               Lng: (125.4 + (Math.random() * 0.5)).toFixed(5) 
             });
           }
           setResults(mockData);
           setIsLoading(false);
           setSelectedSite({ lat: 7.25, lng: 125.55, zoom: 10 });
        }
      }, 1500);
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
          <button className="btn theme-toggle" onClick={toggleTheme} title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            {isDarkMode ? "☀️ Light" : "🌙 Dark"}
          </button>

          <div 
            className="export-dropdown-container" 
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setShowExportMenu(false); }}
            tabIndex={-1}
          >
            <button className="btn primary-outline export-toggle-btn" onClick={() => setShowExportMenu(!showExportMenu)}>
              Export Data ▾
            </button>
            
            {showExportMenu && (
              <div className="export-menu">
                <button onClick={() => handleSpecificExport('ALL')}>Storm Masterlist</button>
                <button onClick={() => handleSpecificExport('NEW SITE')}>New Sites Only</button>
                <button onClick={() => handleSpecificExport('REMOVED SITE')}>Removed Only</button>
                <button onClick={() => handleSpecificExport('NAME MISMATCH')}>Mismatches Only</button>
                <button onClick={() => handleSpecificExport('UNCHANGED')}>Unchanged Only</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="main-layout">
        
        {/* --- CLEAN CSS-POWERED SIDEBAR --- */}
        <aside className="sidebar">
          
          <div className="sidebar-top-section">
            <div className={`sidebar-carousel ${selectedRowDetails ? 'show-details' : ''}`}>
              
              {/* 1. DATA INPUT PANEL */}
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

              {/* 2. SITE DETAILS PANEL */}
              <div className="carousel-panel">
                <div className="details-header">
                  <button className="back-btn" onClick={() => setSelectedRowDetails(null)}>←</button>
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Site Details</h3>
                </div>
                
                {selectedRowDetails && (
                  <div className="details-content">
                    <div>
                      <span className="input-label">PLA_ID</span>
                      <div style={{ fontSize: '1.3rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>{selectedRowDetails.PLA_ID}</div>
                    </div>
                    
                    <div>
                      <span className="input-label">Status</span>
                      <div style={{ marginTop: '6px' }}>
                        <span className={`status-badge ${selectedRowDetails.Status.replace(/\s+/g, '-').toLowerCase()}`}>
                          {selectedRowDetails.Status}
                        </span>
                      </div>
                    </div>

                    <div className="details-box">
                      <span className="input-label">NMS Database</span>
                      <div style={{ fontWeight: 'bold', marginTop: '4px', wordBreak: 'break-word' }} 
                           className={selectedRowDetails.Status === 'NAME MISMATCH' ? 'text-danger' : ''}>
                        {selectedRowDetails["NMS Name"] || "N/A (Missing)"}
                      </div>
                    </div>

                    <div className="details-box">
                      <span className="input-label">UDM Database</span>
                      <div style={{ fontWeight: 'bold', marginTop: '4px', wordBreak: 'break-word' }}
                           className={selectedRowDetails.Status === 'NAME MISMATCH' ? 'text-amber' : ''}>
                        {selectedRowDetails["UDM Name"] || "N/A (Missing)"}
                      </div>
                    </div>

                    <div>
                      <span className="input-label">Location Profile</span>
                      <div className="details-box" style={{ fontFamily: 'monospace', fontSize: '0.9rem', marginTop: '6px' }}>
                        Lat: {selectedRowDetails.Lat}<br/>
                        Lng: {selectedRowDetails.Lng}
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* SEAMLESS MINI MAP */}
          <div className="sidebar-map-wrapper">
            <div className="map-floating-header">
              <span className="floating-title">Site Visualizer</span>
              <button className="floating-btn" onClick={() => setShowBigMap(true)} title="Expand Map">⤢</button>
            </div>
            
            <div className="map-shadow-overlay"></div>
            
            <div className="mini-map">
              <MapVisualizer 
                selectedSite={selectedSite} 
                filteredResults={filteredResults}
                isExpanded={false} 
              />
            </div>
          </div>
        </aside>

        <section className="content-area">
          <div className="output-card">
            
            {results.length > 0 ? (
              <AnalyticsDashboard 
                data={results} 
                activeFilter={filterStatus}
                onFilterChange={setFilterStatus}
              />
            ) : null}

            {results.length > 0 ? (
              <div className="table-toolbar">
                <span className="table-label">
                  {filterStatus === 'ALL' ? 'Detailed Report' : `Filtered View: ${filterStatus}`}
                </span>
                <input 
                  type="text" 
                  className="search-bar" 
                  placeholder="Search..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            ) : null}

            <div className="output-box">
              {results.length > 0 ? (
                <div className="table-wrapper">
                  <table className="result-table">
                    <thead>
                      <tr>
                        <th>PLA_ID</th>
                        <th>Status</th>
                        <th>NMS Name</th>
                        <th>UDM Name</th>
                        <th>Latitude</th>
                        <th>Longitude</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResults.map((row, i) => (
                        <tr 
                          key={i} 
                          className={`row-hover ${selectedSite.id === row.PLA_ID ? 'active-row' : ''}`}
                          onClick={() => {
                            const lat = parseFloat(row.Lat);
                            const lng = parseFloat(row.Lng);
                            setSelectedSite({ lat, lng, id: row.PLA_ID, zoom: 15 });
                            setSelectedRowDetails(row);
                          }}
                        >
                          <td className="font-bold">{row.PLA_ID}</td>
                          <td>
                            <span className={`status-badge ${row.Status.replace(/\s+/g, '-').toLowerCase()}`}>
                              {row.Status}
                            </span>
                          </td>
                          <td>{row["NMS Name"]}</td>
                          <td>{row["UDM Name"]}</td>
                          <td className="coord-text">{row.Lat}</td>
                          <td className="coord-text">{row.Lng}</td>
                        </tr>
                      ))}
                      {filteredResults.length === 0 && (
                         <tr>
                           <td colSpan="6" style={{textAlign: 'center', padding: '20px', color: 'var(--text-secondary)'}}>
                             No results found for "{searchTerm}" in {filterStatus} category.
                           </td>
                         </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="placeholder-container">
                  <p className="placeholder-text">Ready for file comparison. Please upload NMS and UDM CSV files.</p>
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
              <h3>Site Location: {selectedSite.id || "Davao Region"}</h3>
              <button className="close-btn" onClick={() => setShowBigMap(false)}>✖ Close</button>
            </div>
            <div className="big-map-wrapper">
              <MapVisualizer 
                selectedSite={selectedSite} 
                filteredResults={filteredResults}
                isExpanded={true} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}