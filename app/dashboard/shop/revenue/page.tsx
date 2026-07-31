'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp, Calendar, Wallet, Receipt,
  Loader2, BarChart3, Filter, RefreshCw,
  Download, FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ShopRevenuePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // --- States ---
  const [type, setType] = useState<'daily' | 'weekly' | 'monthly' | '3months' | '6months' | '1year' | 'all'>('daily');
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

    if (type === 'daily' || type === '3months' || type === '6months' || type === '1year') {
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
    } else if (type === 'all') {
      setDateParam('all');
    }
  }, [type]);

  // 🚀 3. ดึงข้อมูลจาก API (ดึง raw data มาครั้งเดียว)
  useEffect(() => {
    if (status !== 'authenticated' || (session?.user as any)?.role !== 'shop') return;
    if (!dateParam) return;

    let isMounted = true;
    const fetchRevenue = async () => {
      setLoading(true);
      try {
        let fetchedOrders = [];
        
        // 🔄 Bug 0 Retry Logic: ถ้ายอดเป็น 0 อาจจะเป็นเพราะ Cache หรือ Bug API จะลองดึงซ้ำอีกครั้ง
        for (let attempt = 1; attempt <= 2; attempt++) {
          const res = await fetch(`/api/shop/revenue?type=${type}&date=${dateParam}&t=${Date.now()}`, { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            fetchedOrders = json.orders || [];
            if (fetchedOrders.length > 0) break; // ได้ข้อมูลแล้วหยุด retry
            
            // ถ้า attempt 1 ข้อมูลว่าง เผื่อเป็นบัค ให้รอแปปนึงแล้วลองใหม่
            if (attempt === 1) await new Promise(r => setTimeout(r, 600));
          }
        }

        if (isMounted) setRawOrders(fetchedOrders);
      } catch (error) {
        console.error('API Error:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRevenue();
    return () => { isMounted = false; };
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
      filtered = filtered.filter(o => o.payment_method === 'cod' || o.payment_method === 'cash');
    }

    let sum = 0;
    filtered.forEach(o => sum += Number(o.total_price));

    // Group for Chart
    const groups: Record<string, number> = {};

    const monthsName = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    filtered.forEach(o => {
      // Parse with Thai Timezone awareness if needed, but DB created_at should be consistent
      const d = new Date(o.created_at);
      let key = '';
      if (type === 'daily') {
        key = `${d.getHours().toString().padStart(2, '0')}:00`;
      } else if (type === 'weekly') {
        const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
        key = days[d.getDay()];
      } else if (type === 'monthly') {
        key = d.getDate().toString();
      } else if (type === 'all') {
        key = (d.getFullYear() + 543).toString();
      } else {
        key = `${monthsName[d.getMonth()]} ${d.getFullYear() + 543}`;
      }

      if (!groups[key]) groups[key] = 0;
      groups[key] += Number(o.total_price);
    });

    let chartArray = Object.keys(groups).map(k => ({ label: k, value: groups[k] }));

    // Sort logic
    if (type === 'daily') {
      chartArray.sort((a, b) => a.label.localeCompare(b.label));
    } else if (type === 'weekly') {
      const dayOrder: any = { 'จ.': 1, 'อ.': 2, 'พ.': 3, 'พฤ.': 4, 'ศ.': 5, 'ส.': 6, 'อา.': 7 };
      chartArray.sort((a, b) => dayOrder[a.label] - dayOrder[b.label]);
    } else if (type === 'monthly') {
      chartArray.sort((a, b) => Number(a.label) - Number(b.label));
    } else if (type === 'all') {
      chartArray.sort((a, b) => Number(a.label) - Number(b.label));
    } else {
      chartArray.sort((a, b) => {
        const [mA, yA] = a.label.split(' ');
        const [mB, yB] = b.label.split(' ');
        if (yA !== yB) return Number(yA) - Number(yB);
        return monthsName.indexOf(mA) - monthsName.indexOf(mB);
      });
    }

    return { total: sum, orders: filtered.length, chartData: chartArray };
  }, [rawOrders, channelFilter, paymentFilter, type]);

  const maxVal = chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) : 100;

  const handleExportExcel = () => {
    if (orders === 0) return alert('ไม่มีข้อมูลสำหรับส่งออก');
    
    const exportData = rawOrders.map(o => ({
      'หมายเลขเอกสาร': o.id,
      'วันที่': new Date(o.created_at).toLocaleString('th-TH'),
      'ยอดชำระ (บาท)': o.total_price,
      'ช่องทาง': o.order_type === 'online' ? 'ออนไลน์' : 'หน้าร้าน',
      'วิธีชำระเงิน': o.payment_method === 'qr' ? 'เงินโอน' : 'เงินสด'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Revenue");
    XLSX.writeFile(wb, `Revenue_Report_${dateParam}.xlsx`);
  };

  const handleExportPDF = () => {
    window.print();
  };

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
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #pdf-table, #pdf-table * { visibility: visible; }
          #pdf-table { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .print-hide { display: none !important; }
        }
      `}</style>
      
      {/* 🖨️ PDF Table View (Hidden on screen, Visible on print) */}
      <div id="pdf-table" className="hidden print:block w-full text-black">
        <h1 className="text-2xl font-bold mb-2">รายงานยอดขาย</h1>
        <p className="mb-4 text-gray-600">
           {type === 'daily' ? `ประจำวันที่: ${dateParam}` : `ช่วงเวลา: ${dateParam}`}
        </p>
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">หมายเลขเอกสาร</th>
              <th className="border border-gray-300 p-2 text-left">วันที่</th>
              <th className="border border-gray-300 p-2 text-right">ยอดชำระ (บาท)</th>
              <th className="border border-gray-300 p-2 text-center">ช่องทาง</th>
              <th className="border border-gray-300 p-2 text-center">วิธีชำระเงิน</th>
            </tr>
          </thead>
          <tbody>
            {rawOrders.map(o => (
              <tr key={o.id}>
                <td className="border border-gray-300 p-2">{o.id}</td>
                <td className="border border-gray-300 p-2">{new Date(o.created_at).toLocaleString('th-TH')}</td>
                <td className="border border-gray-300 p-2 text-right">{o.total_price.toLocaleString()}</td>
                <td className="border border-gray-300 p-2 text-center">{o.order_type === 'online' ? 'ออนไลน์' : 'หน้าร้าน'}</td>
                <td className="border border-gray-300 p-2 text-center">{o.payment_method === 'qr' ? 'เงินโอน' : 'เงินสด'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="print-hide w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md">
              <BarChart3 size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">รายงานยอดขาย</h1>
              <p className="text-sm font-semibold text-slate-500">
                {type === 'daily' ? `ประจำวันที่: ${dateParam}` : `ช่วงเวลา: ${dateParam}`}
              </p>
            </div>
          </div>

          <div className="flex gap-2 print-hide">
            <button
              onClick={handleExportExcel}
              className="p-2 sm:px-4 sm:py-2 bg-emerald-50 border border-emerald-200 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="p-2 sm:px-4 sm:py-2 bg-rose-50 border border-rose-200 text-rose-600 hover:text-rose-700 hover:bg-rose-100 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
            >
              <FileText size={18} />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={() => setRefreshTrigger(prev => prev + 1)}
              disabled={loading}
              className="p-2 sm:px-4 sm:py-2 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">รีเฟรช</span>
            </button>
          </div>
        </div>

      {/* ควบคุมการดูข้อมูล (Filter) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 mb-4 print-hide">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-4 w-full xl:w-auto">
            {/* ปุ่มสลับประเภทรายวัน */}
            <div className="grid grid-cols-4 sm:flex sm:flex-wrap bg-slate-100 p-1 rounded-xl w-full xl:w-auto shrink-0 gap-1">
              <button onClick={() => setType('daily')} className={`px-1 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all ${type === 'daily' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>รายวัน</button>
              <button onClick={() => setType('weekly')} className={`px-1 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all ${type === 'weekly' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>รายสัปดาห์</button>
              <button onClick={() => setType('monthly')} className={`px-1 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all ${type === 'monthly' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>รายเดือน</button>
              <button onClick={() => setType('3months')} className={`px-1 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all ${type === '3months' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>3 เดือน</button>
              <button onClick={() => setType('6months')} className={`px-1 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all ${type === '6months' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>6 เดือน</button>
              <button onClick={() => setType('1year')} className={`px-1 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all ${type === '1year' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>1 ปี</button>
              <button onClick={() => setType('all')} className={`px-1 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all ${type === 'all' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>ทั้งหมด</button>
            </div>

            {/* Input เลือกวันที่ */}
            {type !== 'all' && (
              <div className="relative w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar size={18} className="text-slate-400" />
                </div>
                <input
                  type={type === 'monthly' ? 'month' : type === 'weekly' ? 'week' : 'date'}
                  value={dateParam}
                  onChange={(e) => setDateParam(e.target.value)}
                  className="w-full sm:w-[200px] pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-4 w-full xl:w-auto">
            {/* Filters (ช่องทาง และ การชำระเงิน) */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter size={16} className="text-slate-400 shrink-0 hidden sm:block" />
              <div className="grid grid-cols-3 sm:flex bg-slate-50 p-1 rounded-xl border border-slate-100 w-full sm:w-auto gap-1">
                <button onClick={() => setChannelFilter('all')} className={`px-2 sm:px-4 py-1.5 rounded-lg font-bold text-xs sm:text-[13px] transition-all ${channelFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>ทุกช่องทาง</button>
                <button onClick={() => setChannelFilter('online')} className={`px-2 sm:px-4 py-1.5 rounded-lg font-bold text-xs sm:text-[13px] transition-all ${channelFilter === 'online' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>ออนไลน์</button>
                <button onClick={() => setChannelFilter('shop')} className={`px-2 sm:px-4 py-1.5 rounded-lg font-bold text-xs sm:text-[13px] transition-all ${channelFilter === 'shop' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>หน้าร้าน</button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:flex bg-slate-50 p-1 rounded-xl border border-slate-100 w-full sm:w-auto gap-1">
              <button onClick={() => setPaymentFilter('all')} className={`px-2 sm:px-4 py-1.5 rounded-lg font-bold text-xs sm:text-[13px] transition-all ${paymentFilter === 'all' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>ทุกวิธีจ่าย</button>
              <button onClick={() => setPaymentFilter('qr')} className={`px-2 sm:px-4 py-1.5 rounded-lg font-bold text-xs sm:text-[13px] transition-all ${paymentFilter === 'qr' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>เงินโอน</button>
              <button onClick={() => setPaymentFilter('cash')} className={`px-2 sm:px-4 py-1.5 rounded-lg font-bold text-xs sm:text-[13px] transition-all ${paymentFilter === 'cash' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>เงินสด</button>
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
          <TrendingUp size={20} className="text-blue-500" /> แนวโน้มยอดขาย
        </h2>

        {loading ? (
          <div className="flex items-end justify-between h-56 w-full gap-2 px-2 overflow-hidden pb-4 pt-10">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="flex flex-col items-center flex-1 h-full justify-end">
                <div className="w-full max-w-[40px] bg-slate-100 rounded-t-xl animate-pulse" style={{ height: `${Math.random() * 60 + 20}%` }}></div>
                <div className="w-8 h-3 bg-slate-100 rounded animate-pulse mt-3"></div>
              </div>
            ))}
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-xl">
            <BarChart3 size={48} className="text-slate-200 mb-4" />
            <div className="text-slate-400 font-bold">ไม่มีข้อมูลยอดขายในช่วงเวลานี้</div>
          </div>
        ) : (
          <div className="h-[300px] w-full mt-4 print:h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }}
                  tickFormatter={(val) => `฿${val.toLocaleString()}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}
                  itemStyle={{ fontWeight: 'black', color: '#0f172a' }}
                  // @ts-ignore
                  formatter={(value: number) => [`฿${value.toLocaleString()}`, 'ยอดขาย']}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
