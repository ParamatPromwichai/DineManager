'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
const fetcher = (url: string) => fetch(url).then(res => res.json());
import { motion } from 'framer-motion';
import { RefreshCw, Users, CheckCircle2, XCircle, Utensils, LayoutDashboard } from 'lucide-react';
import { TopDownTable } from '@/components/RestaurantGraphics';

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

  const { data: fetchedTables, mutate, isLoading: isTablesLoading, isValidating } = useSWR<Table[]>(
    status === 'authenticated' ? '/api/tables' : null,
    fetcher,
    { refreshInterval: 3000 }
  );

  const tables = fetchedTables || [];
  const lastUpdated = new Date();

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



  if (status === 'loading' || (isTablesLoading && !fetchedTables)) {
    return (
      <div className="min-h-[100dvh] bg-blue-50 dark:bg-slate-900 p-5 pb-8 font-sans transition-colors animate-pulse">
        <div className="max-w-[800px] mx-auto">
          {/* Header Skeleton */}
          <div className="flex flex-col items-center mb-6 pt-4 gap-4">
            <div className="w-64 h-10 bg-blue-200 dark:bg-slate-700 rounded-xl"></div>
            <div className="w-40 h-5 bg-blue-200 dark:bg-slate-700 rounded-md"></div>
          </div>
          
          {/* Legend Skeleton */}
          <div className="flex justify-center gap-4 mb-6">
            <div className="w-24 h-10 bg-blue-200 dark:bg-slate-700 rounded-2xl"></div>
            <div className="w-24 h-10 bg-blue-200 dark:bg-slate-700 rounded-2xl"></div>
          </div>

          {/* Grid Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 pb-20">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="aspect-square bg-blue-100/50 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                <div className="w-16 h-16 bg-blue-200 dark:bg-slate-700 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
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
        <div className="flex items-center mb-6 relative min-h-[64px]">
          <div className="flex-1 text-center pr-10">
            <h1 className="text-[1.6rem] font-black text-blue-900 dark:text-blue-50 m-0 mb-2 transition-colors flex items-center justify-center gap-3">
              <div className="p-2.5 bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-2xl shadow-sm">
                <LayoutDashboard size={28} strokeWidth={2.5} />
              </div>
              สถานะโต๊ะปัจจุบัน
            </h1>
            <p className="text-slate-500 dark:text-slate-400 m-0 flex items-center justify-center gap-1.5 text-[0.9rem] font-bold transition-colors">
              อัปเดตล่าสุด: <span className="text-blue-600 dark:text-blue-400">{lastUpdated.toLocaleTimeString('th-TH')}</span>
            </p>
          </div>
          
          {/* ปุ่มรีเฟรชขวาบน */}
          <button 
            onClick={() => mutate()}
            disabled={isValidating}
            className={`absolute top-0 right-0 p-3 rounded-full transition-colors shadow-sm border ${
              isValidating 
                ? 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed' 
                : 'bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-slate-700 cursor-pointer hover:scale-105 active:scale-95'
            }`}
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={22} className={isValidating ? "animate-spin text-slate-400" : ""} strokeWidth={2.5} /> 
          </button>
        </div>

        {/* 🚥 สรุปสถานะ (Legend) */}
        <div className="flex justify-center gap-4 mb-6 flex-wrap">
          <div className="bg-white dark:bg-slate-800 py-2.5 px-5 rounded-2xl border border-emerald-100 dark:border-slate-700 flex items-center gap-3 shadow-sm transition-colors">
            <span className="relative flex h-3 w-3">
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            </span>
            <span className="font-bold text-emerald-800 dark:text-emerald-400">ว่าง ({availableCount})</span>
          </div>
          <div className="bg-white dark:bg-slate-800 py-2.5 px-5 rounded-2xl border border-rose-100 dark:border-slate-700 flex items-center gap-3 shadow-sm transition-colors">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
            </span>
            <span className="font-bold text-rose-800 dark:text-rose-400">ไม่ว่าง ({occupiedCount})</span>
          </div>
        </div>

        {/* 🪑 Grid แสดงโต๊ะ */}
        <div className="w-full">
          
          {tables.length === 0 && !isValidating && (
            <div className="text-center py-10 text-blue-400 dark:text-blue-500 bg-white/50 rounded-2xl">
              <p className="font-bold text-[1.1rem]">ยังไม่มีข้อมูลโต๊ะในระบบ</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 pb-20">
            {tables.map((table, index) => (
              <TopDownTable 
                key={table.id}
                index={index}
                capacity={table.capacity}
                isOccupied={table.is_occupied === 1}
                name={table.name}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}