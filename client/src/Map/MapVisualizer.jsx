import { useEffect } from 'react';
import { MapContainer, TileLayer, WMSTileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- LEAFLET ICON FIX ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- HELPER: CUSTOM COLOR PINS (WITH BADGE HIGHLIGHTING) ---
export const getCustomIcon = (status, isSelected, duplicateCount = 1) => {
  let bgColor = '#5e5e5d'; 
  if (status === 'NEW SITE') bgColor = '#28a745'; 
  if (status === 'REMOVED SITE') bgColor = '#dc3545'; 
  if (status === 'NAME MISMATCH') bgColor = '#d97706'; 

  const size = isSelected ? 20 : 14;
  const anchor = isSelected ? 10 : 7;
  const border = isSelected ? '3px solid #ffffff' : '2px solid white';
  const shadow = isSelected 
    ? '0 0 0 4px rgba(0, 31, 95, 0.4), 0 4px 8px rgba(0,0,0,0.5)'
    : '0 2px 4px rgba(0,0,0,0.3)'; 

  // Badge logic: If there are multiple records for the same site, show a red bubble with the count
  const badgeHtml = duplicateCount > 1 
    ? `<div style="position: absolute; top: -6px; right: -6px; background-color: #dc3545; color: white; width: 16px; height: 16px; border-radius: 50%; font-size: 0.65rem; font-weight: bold; display: flex; justify-content: center; align-items: center; border: 1px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.4); z-index: 10;">${duplicateCount}</div>`
    : '';

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="position: relative; background-color: ${bgColor}; width: ${size}px; height: ${size}px; border-radius: 50%; border: ${border}; box-shadow: ${shadow}; transition: all 0.3s ease;">
             ${badgeHtml}
           </div>`,
    iconSize: [size, size],
    iconAnchor: [anchor, anchor] 
  });
};

// --- HELPER: BEAUTIFUL CUSTOM CLUSTER BUBBLES ---
const createCustomClusterIcon = (cluster) => {
  return L.divIcon({
    html: `<div style="background-color: #001f5f; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
            ${cluster.getChildCount()}
          </div>`,
    className: 'custom-cluster-marker',
    iconSize: L.point(34, 34, true),
  });
};

// --- HELPER: MAP RECENTER ---
function MapRecenter({ lat, lng, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (lat && lng) {
      // Fly to the coordinates at the aggressive zoom level needed to spiderfy
      map.flyTo([lat, lng], zoom, { animate: true, duration: 1.5 });
    }
  }, [lat, lng, zoom, map]);
  return null;
}

export default function MapVisualizer({ selectedSite = {}, filteredResults = [], isExpanded = false }) {
  
  // DYNAMIC ZOOM LOGIC: If a site is clicked, blast the zoom to 18 to force declustering
  const currentZoom = selectedSite.lat ? 18 : (isExpanded ? 15 : 10);
  
  // Default center (Fall back to Davao region if nothing is selected)
  const centerLat = selectedSite.lat || 7.1907;
  const centerLng = selectedSite.lng || 125.4553;

  return (
    <MapContainer 
      center={[centerLat, centerLng]} 
      zoom={currentZoom} 
      zoomControl={isExpanded} 
      style={{ height: "100%", width: "100%", zIndex: 1 }}
    >
      {/* 1. Base Map Layer */}
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
      {/* 2. Map Recenter Engine */}
      <MapRecenter lat={selectedSite.lat} lng={selectedSite.lng} zoom={currentZoom} />

      {/* 3. Live Satellite Cloud Snapshot (Catches the Easterlies, No API Key needed) */}
      <WMSTileLayer
        url="https://mesonet.agron.iastate.edu/cgi-bin/wms/goes/global_ir.cgi"
        layers="goes_global_ir"
        format="image/png"
        transparent={true}
        opacity={0.4}
        zIndex={10}
      />

      {/* 4. Clusters & Data Pins */}
      {/* --- THE 'ESCAPE THE CLUSTER' LOGIC --- */}
      {(() => {
        const clusteredPins = [];
        let highlightedPin = null;

        filteredResults.forEach((site, idx) => {
          const isSelected = selectedSite.index === idx;
          
          // Count how many times this exact PLA_ID appears in the data
          const duplicateCount = filteredResults.filter(s => s.PLA_ID === site.PLA_ID).length;

          // If selected, offset it by 0.0001 so it pops out of the cluster
          const pinLat = isSelected ? parseFloat(site.Lat) + 0.0001 : parseFloat(site.Lat);
          const pinLng = isSelected ? parseFloat(site.Lng) + 0.0001 : parseFloat(site.Lng);

          const markerElement = (
            <Marker 
              key={`pin-${idx}`} 
              position={[pinLat, pinLng]} 
              icon={getCustomIcon(site.Status, isSelected, duplicateCount)}
              zIndexOffset={isSelected ? 1000 : 0} 
            >
              <Tooltip permanent={true} direction="right" offset={[isSelected ? 14 : 10, 0]} opacity={0.9}>
                <span style={{ fontSize: isSelected ? '0.9rem' : '0.75rem', fontWeight: 'bold', color: isSelected ? '#001f5f' : '#222' }}>
                  {site.PLA_ID}
                </span>
              </Tooltip>
              <Popup>
                <strong>{site.PLA_ID}</strong><br/>
                Status: {site.Status}
              </Popup>
            </Marker>
          );

          // Sort the pins: The selected one escapes the cluster, the rest stay trapped inside!
          if (isSelected) {
            highlightedPin = markerElement;
          } else {
            clusteredPins.push(markerElement);
          }
        });

        return (
          <>
            <MarkerClusterGroup 
              chunkedLoading 
              maxClusterRadius={60}
              iconCreateFunction={createCustomClusterIcon}
              disableClusteringAtZoom={16} // Clusters automatically dissolve at Zoom Level 16
            >
              {clusteredPins}
            </MarkerClusterGroup>
            
            {/* Render the escaped pin OUTSIDE the cluster group so it bypasses Leaflet's physics entirely */}
            {highlightedPin}
          </>
        );
      })()}
    </MapContainer>
  );
}