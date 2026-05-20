'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Users, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';

// --- Types ให้ตรงกับฐานข้อมูลเป๊ะๆ ---
type Table = {
  id: number;
  name: string;
  capacity: number;
  is_occupied: number; // 0 = ว่าง, 1 = ไม่ว่าง
};

export default function TableStatusPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<number | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Data State
  const [tables, setTables] = useState<Table[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 🛡️ เช็คการเข้าสู่ระบบ
  useEffect(() => {
    const id = localStorage.getItem("user_id");
    if (!id) {
      router.push('/login');
      return;
    }
    setUserId(Number(id));
    setCheckingAuth(false);
  }, [router]);

  // 🔄 ฟังก์ชันโหลดข้อมูลสถานะโต๊ะ
  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/tables');
      if (res.ok) {
        setTables(await res.json());
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load tables", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // โหลดข้อมูลครั้งแรก และตั้งเวลา Auto-refresh ทุกๆ 30 วินาที
  useEffect(() => {
    if (!userId) return;
    
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 30000); // 30 วินาทีอัปเดตทีนึง

    return () => clearInterval(interval);
  }, [userId]);

  if (checkingAuth) return null;

  // คำนวณสรุปจำนวนโต๊ะ
  const occupiedCount = tables.filter(t => t.is_occupied === 1).length;
  const availableCount = tables.length - occupiedCount;

  return (
    // 🌟 เปลี่ยนพื้นหลังเป็นสีฟ้าอ่อน (Premium Blue & White)
    <div style={{ padding: '20px', paddingBottom: '100px', minHeight: '100dvh', background: '#F4F8FF', fontFamily: 'sans-serif' }}>
      
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* 🌟 Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 25, position: 'relative' }}>

          
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '900', color: '#1E3A8A', margin: '0 0 6px 0' }}>
              📊 สถานะโต๊ะปัจจุบัน
            </h1>
            <p style={{ color: '#64748B', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.9rem', fontWeight: 'bold' }}>
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} color="#60A5FA" /> 
              อัปเดตล่าสุด: <span style={{ color: '#2563EB' }}>{lastUpdated.toLocaleTimeString('th-TH')}</span>
            </p>
          </div>
        </div>

        {/* 🚥 สรุปสถานะ (Legend) */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 15, marginBottom: 25, flexWrap: 'wrap' }}>
          <div style={{ background: '#ffffff', padding: '10px 20px', borderRadius: '16px', border: '1px solid #DCE8FF', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 10px rgba(37,99,235,0.03)' }}>
            <CheckCircle2 size={20} color="#10B981" />
            <span style={{ fontWeight: 'bold', color: '#1E3A8A' }}>ว่าง ({availableCount})</span>
          </div>
          <div style={{ background: '#ffffff', padding: '10px 20px', borderRadius: '16px', border: '1px solid #DCE8FF', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 10px rgba(37,99,235,0.03)' }}>
            <XCircle size={20} color="#EF4444" />
            <span style={{ fontWeight: 'bold', color: '#1E3A8A' }}>ไม่ว่าง ({occupiedCount})</span>
          </div>
        </div>

        {/* 🪑 Grid แสดงโต๊ะ */}
        <div style={{ background: '#ffffff', padding: 25, borderRadius: '24px', boxShadow: '0 4px 20px rgba(37,99,235,0.05)', border: '1px solid #DCE8FF' }}>
          
          {tables.length === 0 && !isRefreshing && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#93C5FD' }}>
              <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>ยังไม่มีข้อมูลโต๊ะในระบบ</p>
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))',
            gap: 16
          }}>
            {tables.map(table => {
              const isOccupied = table.is_occupied === 1;

              return (
                <div
                  key={table.id}
                  style={{
                    height: 115,
                    border: isOccupied ? '2px solid #FECACA' : '2px solid #A7F3D0',
                    background: isOccupied ? '#FEF2F2' : '#ECFDF5',
                    borderRadius: '16px',
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    position: 'relative',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.02)',
                    cursor: 'default'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 15px rgba(0,0,0,0.05)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.02)';
                  }}
                >
                  <span style={{ fontWeight: '900', fontSize: '1.25rem', color: isOccupied ? '#991B1B' : '#065F46', marginBottom: 6 }}>
                    {table.name}
                  </span>
                  
                  <span style={{ fontSize: '0.85rem', color: isOccupied ? '#DC2626' : '#059669', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 'bold', background: isOccupied ? '#FEE2E2' : '#D1FAE5', padding: '4px 10px', borderRadius: '12px' }}>
                    <Users size={14} strokeWidth={2.5} /> {table.capacity}
                  </span>

                  {/* Badge มุมขวาบน */}
                  <div style={{ 
                    position: 'absolute', top: -8, right: -8, 
                    background: isOccupied ? '#EF4444' : '#10B981', 
                    color: 'white', borderRadius: '50%', padding: '5px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                  }}>
                    {isOccupied ? <XCircle size={14} strokeWidth={3} /> : <CheckCircle2 size={14} strokeWidth={3} />}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* ปุ่มกดอัปเดตแบบ Manual */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30 }}>
            <button 
              onClick={loadData}
              disabled={isRefreshing}
              style={{ 
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', 
                background: isRefreshing ? '#F8FAFC' : '#EFF6FF', 
                color: isRefreshing ? '#94A3B8' : '#1D4ED8', 
                border: `1px solid ${isRefreshing ? '#E2E8F0' : '#BFDBFE'}`, 
                borderRadius: '24px', fontSize: '0.95rem', fontWeight: 'bold', 
                cursor: isRefreshing ? 'not-allowed' : 'pointer', 
                transition: 'all 0.2s',
                boxShadow: isRefreshing ? 'none' : '0 4px 12px rgba(37,99,235,0.1)'
              }}
              onMouseOver={(e) => { if(!isRefreshing) e.currentTarget.style.background = '#DBEAFE'; }}
              onMouseOut={(e) => { if(!isRefreshing) e.currentTarget.style.background = '#EFF6FF'; }}
            >
              <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} strokeWidth={2.5} /> 
              {isRefreshing ? 'กำลังโหลด...' : 'รีเฟรชข้อมูล'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}