'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react'; // ➕ 1. นำเข้า useSession
import { motion } from 'framer-motion';
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

  // ➕ 2. ใช้ useSession ตรวจสอบสถานะแทน localStorage
  const { data: session, status } = useSession();

  // Data State
  const [tables, setTables] = useState<Table[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 🛡️ 3. เช็คการเข้าสู่ระบบ ถ้าไม่ได้ล็อกอินให้เด้งไปหน้า login
  useEffect(() => {
    if (status === 'unauthenticated') {
      fetch('/api/auth/force-logout', { method: 'POST' }).then(() => {
        document.cookie.split(";").forEach((c) => {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        window.location.href = '/login';
      });
    }
  }, [status]);

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

  // 🔄 4. โหลข้อมูลครั้งแรก และตั้งเวลา Auto-refresh เมื่อตรวจสอบสิทธิ์ผ่านแล้ว
  useEffect(() => {
    if (status !== 'authenticated') return;
    
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 30000); // 30 วินาทีอัปเดตทีนึง

    return () => clearInterval(interval);
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-blue-50 dark:bg-slate-900 gap-4 transition-colors">
        <div className="w-10 h-10 border-4 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-blue-900 dark:text-blue-100 font-bold">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  // ป้องกันไม่ให้กระพริบหน้าจอถ้าระบบยังไม่ยืนยันสิทธิ์
  if (status !== 'authenticated') return null;

  // คำนวณสรุปจำนวนโต๊ะ
  const occupiedCount = tables.filter(t => t.is_occupied === 1).length;
  const availableCount = tables.length - occupiedCount;

  return (
    <div className="p-5 pb-8 font-sans transition-colors">
      
      <div className="max-w-[800px] mx-auto">
        
        {/* 🌟 Header */}
        <div className="flex items-center mb-6 relative">
          <div className="flex-1 text-center">
            <h1 className="text-[1.6rem] font-black text-blue-900 dark:text-blue-50 m-0 mb-1.5 transition-colors">
              📊 Status โต๊ะปัจจุบัน
            </h1>
            <p className="text-slate-500 dark:text-slate-400 m-0 flex items-center justify-center gap-1.5 text-[0.9rem] font-bold transition-colors">
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} color="#60A5FA" /> 
              อัปเดตล่าสุด: <span className="text-blue-600 dark:text-blue-400">{lastUpdated.toLocaleTimeString('th-TH')}</span>
            </p>
          </div>
        </div>

        {/* 🚥 สรุปสถานะ (Legend) */}
        <div className="flex justify-center gap-4 mb-6 flex-wrap">
          <div className="bg-white dark:bg-slate-800 py-2.5 px-5 rounded-2xl border border-blue-100 dark:border-slate-700 flex items-center gap-2 shadow-sm transition-colors">
            <CheckCircle2 size={20} className="text-emerald-500" />
            <span className="font-bold text-blue-900 dark:text-blue-50">ว่าง ({availableCount})</span>
          </div>
          <div className="bg-white dark:bg-slate-800 py-2.5 px-5 rounded-2xl border border-blue-100 dark:border-slate-700 flex items-center gap-2 shadow-sm transition-colors">
            <XCircle size={20} className="text-rose-500" />
            <span className="font-bold text-blue-900 dark:text-blue-50">ไม่ว่าง ({occupiedCount})</span>
          </div>
        </div>

        {/* 🪑 Grid แสดงโต๊ะ */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border border-blue-100 dark:border-slate-700 transition-colors">
          
          {tables.length === 0 && !isRefreshing && (
            <div className="text-center py-10 text-blue-400 dark:text-blue-500">
              <p className="font-bold text-[1.1rem]">ยังไม่มีข้อมูลโต๊ะในระบบ</p>
            </div>
          )}

          <div className="grid grid-cols-[repeat(auto-fill,minmax(115px,1fr))] gap-4">
            {tables.map(table => {
              const isOccupied = table.is_occupied === 1;

              return (
                <div
                  key={table.id}
                  className={`h-[115px] rounded-2xl flex flex-col items-center justify-center relative cursor-default transition-transform hover:-translate-y-[2px] shadow-sm hover:shadow-md border-2 ${
                    isOccupied 
                      ? 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30' 
                      : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30'
                  }`}
                >
                  <span className={`font-black text-[1.25rem] mb-1.5 ${
                    isOccupied ? 'text-rose-800 dark:text-rose-300' : 'text-emerald-800 dark:text-emerald-300'
                  }`}>
                    {table.name}
                  </span>
                  
                  <span className={`text-[0.85rem] flex items-center gap-1 font-bold py-1 px-2.5 rounded-xl ${
                    isOccupied 
                      ? 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/50' 
                      : 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50'
                  }`}>
                    <Users size={14} strokeWidth={2.5} /> {table.capacity}
                  </span>

                  {/* Badge มุมขวาบน */}
                  <div className={`absolute -top-2 -right-2 text-white rounded-full p-[5px] shadow-sm ${
                    isOccupied ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}>
                    {isOccupied ? <XCircle size={14} strokeWidth={3} /> : <CheckCircle2 size={14} strokeWidth={3} />}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* ปุ่มกดอัปเดตแบบ Manual */}
          <div className="flex justify-center mt-7">
            <button 
              onClick={loadData}
              disabled={isRefreshing}
              className={`flex items-center gap-2 py-3 px-6 rounded-[24px] text-[0.95rem] font-bold border transition-colors ${
                isRefreshing 
                  ? 'bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600 cursor-not-allowed shadow-none' 
                  : 'bg-blue-50 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-slate-600 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-slate-600 cursor-pointer shadow-sm'
              }`}
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