'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

// Fix for default marker icons in react-leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const CustomShopIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #3b82f6; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); border: 3px solid white; font-size: 22px; z-index: 999;">🏍️</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

const createNumberedIcon = (number: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #ef4444; color: white; width: 36px; height: 36px; border-radius: 50% 50% 50% 0; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); border: 2px solid white; font-weight: 900; font-size: 13px; transform: rotate(-45deg);"><span style="transform: rotate(45deg);">${number}</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

export type DeliveryLocation = {
  id: number;
  lat: number;
  lng: number;
  address: string;
  customerName?: string;
};

interface DeliveryMapProps {
  locations: DeliveryLocation[];
  shopLocation?: { lat: number; lng: number };
  focusedLocationId?: number;
}

function MapBoundsUpdater({ locations, shopLocation, focusedLocationId }: DeliveryMapProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    
    let activePoints = [...locations];
    if (focusedLocationId) {
      activePoints = locations.filter(loc => loc.id === focusedLocationId);
    }
    
    if (shopLocation) {
      activePoints.push({ id: 0, lat: shopLocation.lat, lng: shopLocation.lng, address: 'Shop' });
    }

    if (activePoints.length === 0) return;
    
    if (activePoints.length === 1) {
      map.setView([activePoints[0].lat, activePoints[0].lng], 15);
    } else {
      const bounds = L.latLngBounds(activePoints.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [locations, shopLocation, focusedLocationId, map]);

  return null;
}

export default function DeliveryMap({ locations, shopLocation, focusedLocationId }: DeliveryMapProps) {
  let activeLocations = locations;
  
  if (focusedLocationId) {
    activeLocations = locations.filter(loc => loc.id === focusedLocationId);
  }

  const processedLocations = activeLocations.map((loc, index) => {
    // Add a tiny spiral offset for duplicate locations to prevent perfect overlap
    // Using index to ensure deterministic offset
    const offsetLat = Number(loc.lat) + (index * 0.00005 * Math.sin(index * Math.PI / 4));
    const offsetLng = Number(loc.lng) + (index * 0.00005 * Math.cos(index * Math.PI / 4));
    return { ...loc, displayLat: offsetLat, displayLng: offsetLng };
  });

  const defaultCenter: [number, number] = shopLocation ? [shopLocation.lat, shopLocation.lng] : (processedLocations.length > 0 ? [processedLocations[0].displayLat, processedLocations[0].displayLng] : [13.7563, 100.5018]);

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {shopLocation && (
          <Marker position={[shopLocation.lat, shopLocation.lng]} icon={CustomShopIcon}>
            <Popup>
              <div className="font-bold text-slate-800">ร้านอาหาร</div>
              <div className="text-xs text-slate-500">จุดเริ่มต้นการจัดส่ง</div>
            </Popup>
          </Marker>
        )}

        {processedLocations.map(loc => (
          <Marker 
            key={loc.id} 
            position={[loc.displayLat, loc.displayLng]} 
            icon={createNumberedIcon(loc.id.toString().slice(-3))}
          >
            <Popup>
              <div className="font-bold text-slate-800">Order #{loc.id}</div>
              <div className="text-sm font-medium mt-1">{loc.customerName || 'ลูกค้าทั่วไป'}</div>
              <div className="text-xs text-slate-500 mt-1 line-clamp-2">{loc.address}</div>
              <a 
                href={`https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block text-center w-full bg-blue-600 text-white font-bold py-1.5 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                style={{ textDecoration: 'none' }}
              >
                📍 เปิดนำทาง (Google Maps)
              </a>
            </Popup>
          </Marker>
        ))}

        <MapBoundsUpdater locations={processedLocations} shopLocation={shopLocation} focusedLocationId={focusedLocationId} />
      </MapContainer>
    </div>
  );
}
