'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Users, CheckCircle2, XCircle, LayoutGrid } from 'lucide-react';

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
    <div style={{ padding: '20px', paddingBottom: '100px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 25 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <LayoutGrid size={28} color="#2563eb" />
          สถานะโต๊ะปัจจุบัน
        </h1>
        <p style={{ color: '#64748b', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.9rem' }}>
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} /> 
          อัปเดตล่าสุด: {lastUpdated.toLocaleTimeString('th-TH')}
        </p>
      </div>

      {/* สรุปสถานะ (Legend) */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 15, marginBottom: 25, flexWrap: 'wrap' }}>
        <div style={{ background: '#fff', padding: '10px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <CheckCircle2 size={20} color="#10b981" />
          <span style={{ fontWeight: 'bold', color: '#334155' }}>ว่าง ({availableCount})</span>
        </div>
        <div style={{ background: '#fff', padding: '10px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <XCircle size={20} color="#ef4444" />
          <span style={{ fontWeight: 'bold', color: '#334155' }}>ไม่ว่าง ({occupiedCount})</span>
        </div>
      </div>

      {/* Grid แสดงโต๊ะ */}
      <div style={{ background: '#fff', padding: 25, borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        
        {tables.length === 0 && !isRefreshing && (
          <p style={{ textAlign: 'center', color: '#94a3b8' }}>ยังไม่มีข้อมูลโต๊ะในระบบ</p>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
          gap: 15
        }}>
          {tables.map(table => {
            const isOccupied = table.is_occupied === 1;

            return (
              <div
                key={table.id}
                style={{
                  height: 110,
                  border: isOccupied ? '2px solid #fca5a5' : '2px solid #86efac',
                  background: isOccupied ? '#fef2f2' : '#f0fdf4',
                  borderRadius: '12px',
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}
              >
                <span style={{ fontWeight: '900', fontSize: '1.2rem', color: isOccupied ? '#b91c1c' : '#166534', marginBottom: 4 }}>
                  {table.name}
                </span>
                
                <span style={{ fontSize: '0.85rem', color: isOccupied ? '#ef4444' : '#10b981', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 'bold' }}>
                  <Users size={14} /> {table.capacity} ท่าน
                </span>

                {/* Badge มุมขวาบน */}
                <div style={{ 
                  position: 'absolute', top: -8, right: -8, 
                  background: isOccupied ? '#ef4444' : '#10b981', 
                  color: 'white', borderRadius: '50%', padding: '4px' 
                }}>
                  {isOccupied ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* ปุ่มกดอัปเดตแบบ Manual */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 25 }}>
          <button 
            onClick={loadData}
            disabled={isRefreshing}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold', cursor: isRefreshing ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} /> 
            {isRefreshing ? 'กำลังโหลด...' : 'รีเฟรชข้อมูล'}
          </button>
        </div>
      </div>

    </div>
  );
}