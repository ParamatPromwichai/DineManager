'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, Calendar, Wallet, Receipt, 
  Loader2, BarChart3, Filter, RefreshCw
} from 'lucide-react';

export default function ShopRevenuePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // --- States ---
  const [type, setType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [dateParam, setDateParam] = useState<string>('');
  
  const [channelFilter, setChannelFilter] = useState<'all' | 'online' | 'shop'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'qr' | 'cash'>('all');

  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
      const d = new Date(localNow.getTime());
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
      const week1 = new Date(d.getFullYear(), 0, 4);
      const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
      setDateParam(`${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`);
    }
  }, [type]);

  // 🚀 3. ดึงข้อมูลจาก API (ดึง raw data มาครั้งเดียว)
  useEffect(() => {
    if (status !== 'authenticated' || (session?.user as any)?.role !== 'shop') return;
    if (!dateParam) return;

    const fetchRevenue = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/shop/revenue?type=${type}&date=${dateParam}`);
        
        if (res.ok) {
          const json = await res.json();
          setRawOrders(json.orders || []);
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
  }, [type, dateParam, status, session, refreshTrigger]);

  // ⚡ 4. คำนวณยอดรวมและทำกราฟจากข้อมูลดิบแบบ Real-time
  const { total, orders, chartData } = useMemo(() => {
    let filtered = rawOrders;
    
    // Apply Channel Filter
    if (channelFilter === 'online') {
      filtered = filtered.filter(o => o.order_type === 'online' || !o.order_type);
    } else if (channelFilter === 'shop') {
      filtered = filtered.filter(o => o.order_type === 'shop' || o.order_type === 'dine_in');
    }

    // Apply Payment Filter
    if (paymentFilter === 'qr') {
      filtered = filtered.filter(o => o.payment_method === 'qr');
    } else if (paymentFilter === 'cash') {
      filtered = filtered.filter(o => o.payment_method === 'cash');
    }

    let sum = 0;
    filtered.forEach(o => sum += Number(o.total_price));

    // Group for Chart
    const groups: Record<string, number> = {};
    
    filtered.forEach(o => {
      // Parse with Thai Timezone awareness if needed, but DB created_at should be consistent
      const d = new Date(o.created_at);
      let key = '';
      if (type === 'daily') {
        key = `${d.getHours().toString().padStart(2, '0')}:00`;
      } else if (type === 'weekly') {
        const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
        key = days[d.getDay()];
      } else {
        key = d.getDate().toString();
      }
      
      if (!groups[key]) groups[key] = 0;
      groups[key] += Number(o.total_price);
    });

    let chartArray = Object.keys(groups).map(k => ({ label: k, value: groups[k] }));
    
    // Sort logic
    if (type === 'daily') {
       chartArray.sort((a, b) => a.label.localeCompare(b.label));
    } else if (type === 'weekly') {
       const dayOrder: any = {'จ.': 1, 'อ.': 2, 'พ.': 3, 'พฤ.': 4, 'ศ.': 5, 'ส.': 6, 'อา.': 7};
       chartArray.sort((a, b) => dayOrder[a.label] - dayOrder[b.label]);
    } else {
       chartArray.sort((a, b) => Number(a.label) - Number(b.label));
    }

    return { total: sum, orders: filtered.length, chartData: chartArray };
  }, [rawOrders, channelFilter, paymentFilter, type]);

  const maxVal = chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) : 100;

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
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md">
            <BarChart3 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">รายงานยอดขาย</h1>
            <p className="text-sm font-semibold text-slate-500">ดูยอดขายและจำนวนออเดอร์ของร้านค้า</p>
          </div>
        </div>
        
        <button 
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          disabled={loading}
          className="p-2 sm:px-4 sm:py-2 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">รีเฟรช</span>
        </button>
      </div>

      {/* ควบคุมการดูข้อมูล (Filter) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
            {/* ปุ่มสลับประเภทรายวัน */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto shrink-0">
              <button onClick={() => setType('daily')} className={`flex-1 sm:px-6 py-2 rounded-lg font-bold text-sm transition-all ${type === 'daily' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>รายวัน</button>
              <button onClick={() => setType('weekly')} className={`flex-1 sm:px-6 py-2 rounded-lg font-bold text-sm transition-all ${type === 'weekly' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>รายสัปดาห์</button>
              <button onClick={() => setType('monthly')} className={`flex-1 sm:px-6 py-2 rounded-lg font-bold text-sm transition-all ${type === 'monthly' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>รายเดือน</button>
            </div>

            {/* Input เลือกวันที่ */}
            <div className="relative w-full sm:w-auto shrink-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar size={18} className="text-slate-400" />
              </div>
              <input 
                type={type === 'daily' ? 'date' : type === 'monthly' ? 'month' : 'week'}
                value={dateParam}
                onChange={(e) => setDateParam(e.target.value)}
                className="w-full sm:w-[200px] pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
            {/* Filters (ช่องทาง และ การชำระเงิน) */}
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400 shrink-0" />
              <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 shrink-0">
                <button onClick={() => setChannelFilter('all')} className={`px-4 py-1.5 rounded-lg font-bold text-[13px] transition-all ${channelFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>ทุกช่องทาง</button>
                <button onClick={() => setChannelFilter('online')} className={`px-4 py-1.5 rounded-lg font-bold text-[13px] transition-all ${channelFilter === 'online' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>ออนไลน์</button>
                <button onClick={() => setChannelFilter('shop')} className={`px-4 py-1.5 rounded-lg font-bold text-[13px] transition-all ${channelFilter === 'shop' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>หน้าร้าน</button>
              </div>
            </div>

            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 shrink-0">
              <button onClick={() => setPaymentFilter('all')} className={`px-4 py-1.5 rounded-lg font-bold text-[13px] transition-all ${paymentFilter === 'all' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>ทุกวิธีจ่าย</button>
              <button onClick={() => setPaymentFilter('qr')} className={`px-4 py-1.5 rounded-lg font-bold text-[13px] transition-all ${paymentFilter === 'qr' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>เงินโอน</button>
              <button onClick={() => setPaymentFilter('cash')} className={`px-4 py-1.5 rounded-lg font-bold text-[13px] transition-all ${paymentFilter === 'cash' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>เงินสด</button>
            </div>
          </div>

        </div>
      </div>

      {/* สรุปข้อมูล (Stats Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Card: ยอดขาย */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group">
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
                  {total.toLocaleString()}
                </span>
                <span className="text-xl font-bold text-slate-500 mb-1">บาท</span>
              </div>
            )}
          </div>
        </div>

        {/* Card: ออเดอร์ */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group">
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
                  {orders.toLocaleString()}
                </span>
                <span className="text-xl font-bold text-slate-500 mb-1">รายการ</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* กราฟยอดขาย */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-6">
        <h2 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-500"/> แนวโน้มยอดขาย
        </h2>
        
        {loading ? (
           <div className="h-56 flex items-center justify-center bg-slate-50 rounded-xl animate-pulse">
             <Loader2 size={32} className="text-slate-300 animate-spin" />
           </div>
        ) : chartData.length === 0 ? (
           <div className="h-56 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-xl">
             <BarChart3 size={48} className="text-slate-200 mb-4" />
             <div className="text-slate-400 font-bold">ไม่มีข้อมูลยอดขายในช่วงเวลานี้</div>
           </div>
        ) : (
           <div className="flex items-end justify-between h-56 w-full gap-2 px-2 overflow-x-auto pb-4 pt-10">
             {chartData.map(d => (
               <div key={d.label} className="flex flex-col items-center flex-1 min-w-[32px] group relative h-full justify-end">
                 
                 {/* Tooltip on hover */}
                 <div className="absolute -top-8 bg-slate-900 text-white text-[11px] font-bold py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
                   ฿{d.value.toLocaleString()}
                   <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                 </div>

                 {/* Bar */}
                 <div 
                   className="w-full max-w-[40px] bg-blue-500 rounded-t-xl transition-all duration-700 ease-out group-hover:bg-blue-400 shadow-sm border border-blue-600/10"
                   style={{ height: `${Math.max((d.value / maxVal) * 100, 2)}%` }}
                 ></div>
                 
                 {/* Label */}
                 <div className="text-[11px] font-bold text-slate-500 mt-3 whitespace-nowrap">{d.label}</div>
               </div>
             ))}
           </div>
        )}
      </div>

    </div>
  );
}
