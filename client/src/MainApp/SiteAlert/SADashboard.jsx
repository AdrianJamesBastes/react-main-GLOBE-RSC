import { useState } from 'react';
// LoadingScreen was unused and removed
import useDarkMode from '../../hooks/useDarkMode';
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

import * as XLSX from 'xlsx';
import { useNavigate } from "react-router-dom";

// Removed getTechSplits since we do vertical rows now!
import { parseLocationData, getShortRegionByProvince } from '../../utils/telecom';
// Added the dictionary import so your Triple Fallback works!
import { cityToProvinceMap } from '../MapDictionary/TelecomDictionaries';
import DashboardLayout from '../../components/DashboardLayout';
import '../../styles/Dashboard_styles.css';
//import './SM_styles.css';

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

// Helpers moved to utils/telecom.js and imported above

export default function SADashboard() {
  const [monitorFile1, setMonitorFile1] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);

  const navigate = useNavigate();
  const [isDarkMode, toggleTheme] = useDarkMode();

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

  const handleSpecificExport = (exportCategory) => {
    setShowExportMenu(false);
    if (results.length === 0) return alert("No data to export.");

    const dataToExport = exportCategory === 'ALL' ? results : results.filter(row => row.matchStatus === exportCategory);
    if (dataToExport.length === 0) return alert(`There are no "${exportCategory}" sites to export.`);

    // Using flatMap to create multiple rows per site based on Technology!
    const excelData = dataToExport.flatMap(row => {
      const geo = parseLocationData(row.baseLocation);
      
      // FALLBACK 1: Try raw UDM province
      let reg = getShortRegionByProvince(row.prov);

      // FALLBACK 2: Try parsed Site Name province
      if (!reg && geo.province) {
        reg = getShortRegionByProvince(geo.province);
      }

      // FALLBACK 3: City guess
      if (!reg && row.mCity) {
        const cleanCity = String(row.mCity).toUpperCase().trim();
        const fallbackProv = cityToProvinceMap[cleanCity];
        if (fallbackProv) reg = getShortRegionByProvince(fallbackProv);
      }

      // HELPER: This creates the exact Excel row structure you want
      const buildExcelRow = (techLabel, specificTechName) => ({
        "Region": "MIN",
        "PLA ID": row.plaId || "",
        "PLA Status": "",
        "Area": row.sArea || "",
        "Region ": (geo.region || reg) || "",
        "Province": (geo.province || row.prov) || "",
        "City/Municipality": (geo.city || row.mCity) || "",
        "Barangay": "",
        "Site Address": row.sAdd || "",
        "Longitude": row.lng || "",
        "Latitude": row.lat || "",
        "Technology": techLabel,            // <--- Outputting the 2G/4G/5G label
        "Tech Name/ BTS": specificTechName, // <--- Outputting the specific string
        "Tech Description": "",
        "Tech Status": "",
        "Site Owner": row.siteOwner || geo.siteCode || "GLOBE TELECOM",
        "Territory": row.trt || "",
        "Hiroshima Severity": row.hSvr || "",
        "Remarks": row.remarks || "",
        "Remarks Status": row.matchStatus || ""
      });

      let expandedRows = [];

      // SCENARIO A: If the site was REMOVED, it only exists in UDM, so it has no NMS splits.
      if (row.matchStatus === 'REMOVED') {
        expandedRows.push(buildExcelRow("UDM Only", row.techName));
      } 
      // SCENARIO B: Split the NMS strings into vertical rows!
      else {
        // Look for the original strings sent from the backend and split them by the " | " separator
        if (row.original2G) {
          row.original2G.split(" | ").forEach(nmsName => expandedRows.push(buildExcelRow("2G", nmsName)));
        }
        if (row.original4G) {
          row.original4G.split(" | ").forEach(nmsName => expandedRows.push(buildExcelRow("4G", nmsName)));
        }
        if (row.original5G) {
          row.original5G.split(" | ").forEach(nmsName => expandedRows.push(buildExcelRow("5G", nmsName)));
        }
        
        // Safety net: If a row somehow has no tech strings, just print the base name.
        if (expandedRows.length === 0) {
          expandedRows.push(buildExcelRow("Unknown", row.techName));
        }
      }

      return expandedRows; // flatMap merges all these into the main Excel sheet!
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const headers = Object.keys(excelData[0]);
    
    // Auto-size the Excel columns
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
    
    // Generate the file name with today's date
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `StormMasterlist_${exportCategory === 'ALL' ? 'Complete' : exportCategory}_${dateStr}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
  };

  const handleScan = async () => {
    setIsLoading(true);
    setResults([]);
    setSelectedRowDetails(null);

    try {
      const text1 = await readFileAsText(monitorFile1);

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
             .processCSVComparison(text1);
        } else {
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
               lng: (125.4 + (Math.random() * 0.5)).toFixed(5),
               original2G: `SITE${i}A | SITE${i}B`,
               original4G: `SITE${i}C`,
               original5G: ""
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

  const handleNavigate = (path) => {
    setIsLoading(true);
    setTimeout(() => {
      navigate(path);
    }, 1000); // simulate loading
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
                <button className="btn primary-filled scan-btn full-width" onClick={handleScan} disabled={isLoading}>
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

          {/* end of sidebar */}
        </aside>

        {/* content area with blank dashboard-container for future table */}
        <section className="content-area">
          <div className="output-card">
            <div className="dashboard-container">
              {/* empty by design; user will insert table or Excel view here */}
            </div>
          </div>
        </section>
      </main>
    </DashboardLayout>
  );
}
