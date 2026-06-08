'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, Calendar, Wallet, Receipt, 
  Loader2, ChevronRight, BarChart3
} from 'lucide-react';

export default function ShopRevenuePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // --- States ---
  const [type, setType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [dateParam, setDateParam] = useState<string>('');
  
  const [data, setData] = useState({ total: 0, orders: 0 });
  const [loading, setLoading] = useState(true);

  // 🛡️ 1. ตรวจสอบสิทธิ์ (เข้าได้เฉพาะร้านค้า)
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login/shop');
    } else if (status === 'authenticated' && (session?.user as any)?.role !== 'shop') {
      router.replace('/login/shop?error=wrong_role');
    }
  }, [status, session, router]);

  // 🗓️ 2. ตั้งค่า Default Date ตามประเภท (รายวัน/สัปดาห์/เดือน)
  useEffect(() => {
    const now = new Date();
    // ชดเชย Timezone ของไทย เพื่อไม่ให้วันที่เพี้ยน
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

    if (type === 'daily') {
      setDateParam(localNow.toISOString().split('T')[0]); // YYYY-MM-DD
    } else if (type === 'monthly') {
      setDateParam(localNow.toISOString().substring(0, 7)); // YYYY-MM
    } else if (type === 'weekly') {
      // คำนวณหา ISO Week แบบง่ายๆ (YYYY-Www)
      const d = new Date(localNow.getTime());
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
      const week1 = new Date(d.getFullYear(), 0, 4);
      const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
      setDateParam(`${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`);
    }
  }, [type]);

  // 🚀 3. ดึงข้อมูลจาก API
  useEffect(() => {
    if (status !== 'authenticated' || (session?.user as any)?.role !== 'shop') return;
    if (!dateParam) return;

    const fetchRevenue = async () => {
      setLoading(true);
      try {
        // 💡 แก้ URL API ตรงนี้ให้ตรงกับโฟลเดอร์ที่คุณสร้างไว้นะครับ
        const res = await fetch(`/api/shop/revenue?type=${type}&date=${dateParam}`);
        
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          console.error('Failed to fetch revenue');
        }
      } catch (error) {
        console.error('API Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRevenue();
  }, [type, dateParam, status, session]);

  // ⏳ หน้าจอโหลดขณะเช็คสิทธิ์
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-bold">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }

  // 🛑 ป้องกันไม่ให้แอบเห็น UI ก่อนโดนเตะ
  if (status !== 'authenticated' || (session?.user as any)?.role !== 'shop') return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-sans pb-24">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md">
          <BarChart3 size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">รายงานยอดขาย</h1>
          <p className="text-sm font-semibold text-slate-500">ดูยอดขายและจำนวนออเดอร์ของร้านค้า</p>
        </div>
      </div>

      {/* ควบคุมการดูข้อมูล (Filter) */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          
          {/* ปุ่มสลับประเภท */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button 
              onClick={() => setType('daily')}
              className={`flex-1 sm:px-6 py-2 rounded-lg font-bold text-sm transition-all ${type === 'daily' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              รายวัน
            </button>
            <button 
              onClick={() => setType('weekly')}
              className={`flex-1 sm:px-6 py-2 rounded-lg font-bold text-sm transition-all ${type === 'weekly' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              รายสัปดาห์
            </button>
            <button 
              onClick={() => setType('monthly')}
              className={`flex-1 sm:px-6 py-2 rounded-lg font-bold text-sm transition-all ${type === 'monthly' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              รายเดือน
            </button>
          </div>

          {/* Input เลือกวันที่ */}
          <div className="relative w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar size={18} className="text-slate-400" />
            </div>
            <input 
              type={type === 'daily' ? 'date' : type === 'monthly' ? 'month' : 'week'}
              value={dateParam}
              onChange={(e) => setDateParam(e.target.value)}
              className="w-full sm:w-[200px] pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

        </div>
      </div>

      {/* สรุปข้อมูล (Stats Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card: ยอดขาย */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-emerald-50 opacity-50 group-hover:scale-110 transition-transform duration-500">
            <Wallet size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-emerald-600 font-bold mb-4">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <TrendingUp size={20} />
              </div>
              ยอดขายสุทธิ
            </div>
            {loading ? (
              <div className="h-10 w-32 bg-slate-100 animate-pulse rounded-lg"></div>
            ) : (
              <div className="flex items-end gap-2">
                <span className="text-4xl sm:text-5xl font-black text-slate-800">
                  {data.total.toLocaleString()}
                </span>
                <span className="text-xl font-bold text-slate-500 mb-1">บาท</span>
              </div>
            )}
          </div>
        </div>

        {/* Card: ออเดอร์ */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-blue-50 opacity-50 group-hover:scale-110 transition-transform duration-500">
            <Receipt size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-blue-600 font-bold mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Receipt size={20} />
              </div>
              จำนวนออเดอร์สำเร็จ
            </div>
            {loading ? (
              <div className="h-10 w-24 bg-slate-100 animate-pulse rounded-lg"></div>
            ) : (
              <div className="flex items-end gap-2">
                <span className="text-4xl sm:text-5xl font-black text-slate-800">
                  {data.orders.toLocaleString()}
                </span>
                <span className="text-xl font-bold text-slate-500 mb-1">รายการ</span>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
