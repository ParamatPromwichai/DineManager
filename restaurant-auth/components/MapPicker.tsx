'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
// @ts-ignore: missing type declarations for leaflet CSS import
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// แก้ปัญหาไอคอนหมุดของ Leaflet ไม่แสดงใน Next.js
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconShadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

type Location = { lat: number; lng: number };

interface MapPickerProps {
  tempLocation: Location | null;
  setTempLocation: (loc: Location) => void;
  setAddress: (address: string) => void;
}

// ตัวจัดการเมื่อผู้ใช้คลิกบนแผนที่
function MapEvents({ setTempLocation, setAddress }: Omit<MapPickerProps, 'tempLocation'>) {
  useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng;
      setTempLocation({ lat, lng });

      // ดึงข้อมูลสถานที่จาก ละติจูด/ลองจิจูด (Reverse Geocoding) ด้วย Nominatim ฟรี
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const data = await res.json();
        if (data && data.display_name) {
          // เอาที่อยู่ไปใส่ใน State ทันที
          setAddress(data.display_name);
        }
      } catch (error) {
        console.error("ดึงข้อมูลที่อยู่ไม่สำเร็จ", error);
      }
    }
  });
  return null;
}

// ตัวเลื่อนศูนย์กลางแผนที่เมื่อ tempLocation เปลี่ยนจากภายนอก (เช่นกดปุ่มตำแหน่งของฉัน)
function MapCenterUpdater({ location }: { location: Location | null }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.flyTo([location.lat, location.lng], map.getZoom());
    }
  }, [location, map]);
  return null;
}

export default function MapPicker({ tempLocation, setTempLocation, setAddress }: MapPickerProps) {
  const defaultCenter = tempLocation || { lat: 17.1664, lng: 104.1486 }; // ค่าเริ่มต้น (สกลนคร)

  return (
    <MapContainer 
      center={[defaultCenter.lat, defaultCenter.lng]} 
      zoom={16} 
      style={{ width: '100%', height: '100%', zIndex: 1 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapEvents setTempLocation={setTempLocation} setAddress={setAddress} />
      <MapCenterUpdater location={tempLocation} />
      {tempLocation && <Marker position={[tempLocation.lat, tempLocation.lng]} icon={customIcon} />}
    </MapContainer>
  );
}