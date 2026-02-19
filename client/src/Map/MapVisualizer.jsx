import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
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

// --- HELPER: CUSTOM COLOR PINS (WITH HIGHLIGHTING) ---
export const getCustomIcon = (status, isSelected) => {
  let bgColor = '#5e5e5d'; 
  if (status === 'NEW SITE') bgColor = '#28a745'; 
  if (status === 'REMOVED SITE') bgColor = '#dc3545'; 
  if (status === 'NAME MISMATCH') bgColor = '#d97706'; 

  // Make the selected site larger with a glowing blue border
  const size = isSelected ? 20 : 14;
  const anchor = isSelected ? 10 : 7;
  const border = isSelected ? '3px solid #ffffff' : '2px solid white';
  const shadow = isSelected 
    ? '0 0 0 4px rgba(0, 31, 95, 0.4), 0 4px 8px rgba(0,0,0,0.5)' // Blue glow
    : '0 2px 4px rgba(0,0,0,0.3)'; // Standard drop shadow

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${bgColor}; width: ${size}px; height: ${size}px; border-radius: 50%; border: ${border}; box-shadow: ${shadow}; transition: all 0.3s ease;"></div>`,
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
function MapRecenter({ lat, lng, zoom = 15 }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (lat && lng) map.flyTo([lat, lng], zoom, { animate: true, duration: 1.5 });
  }, [lat, lng, zoom, map]);
  return null;
}

export default function MapVisualizer({ selectedSite, filteredResults = [], isExpanded = false }) {
  return (
    <MapContainer 
      center={[selectedSite.lat, selectedSite.lng]} 
      zoom={isExpanded ? 15 : 10} 
      zoomControl={isExpanded} 
      style={{ height: "100%", width: "100%", zIndex: 1 }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapRecenter lat={selectedSite.lat} lng={selectedSite.lng} zoom={selectedSite.zoom || (isExpanded ? 15 : 10)} />

      {/* Provide our custom cluster styling function here */}
      <MarkerClusterGroup 
        chunkedLoading 
        maxClusterRadius={60}
        iconCreateFunction={createCustomClusterIcon}
      >
        
        {filteredResults.map((site, idx) => {
          // Check if this specific site is the one we clicked in the table
          const isSelected = site.PLA_ID === selectedSite.id;
          
          // Only show labels if the map is expanded, OR if it's the specific site we clicked
          const showTooltip = isExpanded || isSelected;

          return (
            <Marker 
              key={`pin-${idx}`} 
              position={[site.Lat, site.Lng]} 
              icon={getCustomIcon(site.Status, isSelected)}
            >
              
              {showTooltip && (
                <Tooltip 
                  permanent 
                  direction="right" 
                  offset={[isSelected ? 14 : 10, 0]} // Push it slightly further out if the dot is bigger
                  opacity={0.9}
                >
                  <span style={{ 
                    fontSize: isSelected ? '0.9rem' : '0.75rem', 
                    fontWeight: 'bold', 
                    color: isSelected ? '#001f5f' : '#222' 
                  }}>
                    {site.PLA_ID}
                  </span>
                </Tooltip>
              )}

              <Popup>
                <strong>{site.PLA_ID}</strong><br/>
                {site.Status}
              </Popup>
            </Marker>
          )
        })}

      </MarkerClusterGroup>
    </MapContainer>
  );
}