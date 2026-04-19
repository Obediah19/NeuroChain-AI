import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSupplyChain } from '../context/SupplyChainContext';
import { useTheme } from '../context/ThemeContext';

// Fix typical leaflet icon issue with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Node Icons
const createIcon = (color, isGhost = false) => {
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: ${isGhost ? '24px' : '16px'}; height: ${isGhost ? '24px' : '16px'}; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px ${color}; ${isGhost ? 'animation: pulse 1.5s infinite;' : ''}"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const defaultIcon = createIcon('#3b82f6');
const congestedIcon = createIcon('#ef4444');
const ghostIcon = createIcon('#a855f7', true); // purple for ghost nodes
const shipmentIcon = createIcon('#22c55e');

export default function MapDashboard() {
  const { nodes, routes, shipments } = useSupplyChain();
  const { theme } = useTheme();

  // Dark mode map tiles vs Light mode tiles
  const tileUrl = theme === 'dark' 
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden glass shadow-2xl border border-gray-200 dark:border-gray-800">
      <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer
          url={tileUrl}
          attribution='&copy; OpenStreetMap contributors'
        />
        
        {/* Render Routes */}
        {routes.map(r => {
          const from = nodes.find(n => n.id === r.from);
          const to = nodes.find(n => n.id === r.to);
          if (!from || !to) return null;
          
          const isGhostRoute = from.type === 'ghost' || to.type === 'ghost';
          return (
            <Polyline 
              key={r.id} 
              positions={[[from.lat, from.lng], [to.lat, to.lng]]} 
              color={isGhostRoute ? '#a855f7' : theme === 'dark' ? '#334155' : '#cbd5e1'}
              weight={isGhostRoute ? 3 : 2}
              dashArray={isGhostRoute ? "5, 10" : ""}
              opacity={0.6}
            />
          );
        })}

        {/* Render Nodes */}
        {nodes.map(node => (
          <Marker 
            key={node.id} 
            position={[node.lat, node.lng]}
            icon={node.type === 'ghost' ? ghostIcon : node.congestion > 0.5 ? congestedIcon : defaultIcon}
          >
            <Popup>
              <div className="font-sans">
                <h3 className="font-bold text-lg mb-1">{node.name}</h3>
                <p className="text-sm opacity-80">Type: {node.type === 'ghost' ? 'Dynamic Ghost Node' : 'Primary Hub'}</p>
                <p className="text-sm opacity-80">Congestion: {(node.congestion * 100).toFixed(0)}%</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Render Shipments */}
        {shipments.map(shipment => (
           <Marker 
             key={shipment.id}
             position={[shipment.lat, shipment.lng]}
             icon={shipmentIcon}
           >
              <Popup>
                <div className="font-sans">
                  <h3 className="font-bold text-md">{shipment.id}</h3>
                  <p className="text-sm text-green-500">Agent Active</p>
                  <p className="text-sm opacity-80">Target: {shipment.target}</p>
                  <p className="text-sm opacity-80">Risk: {(shipment.riskScore * 100).toFixed(0)}%</p>
                </div>
              </Popup>
           </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
