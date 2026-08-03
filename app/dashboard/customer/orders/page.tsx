'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { 
  History, 
  ChevronRight, 
  Clock, 
  ChefHat, 
  CheckCircle2, 
  Motorbike, 
  XCircle, 
  Calendar,
  CircleDollarSign,
  ClipboardList,
  SearchX,
  Banknote
} from 'lucide-react';

type OrderItem = {
  menu_name: string;
};

type Order = {
  id: number;
  status: string;
  created_at: string;
  total_price: number;
  items: OrderItem[];
};

// Mapping สถานะให้ดูดี (ปรับโทนสีให้เข้ากับดีไซน์ใหม่)
const statusConfig = {
  pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', text: 'รอรับออเดอร์' },
  checking_slip: { icon: Banknote, color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-200', text: 'รอตรวจสลิป' },
  cooking: { icon: ChefHat, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', text: 'กำลังปรุง' },
  delivery: { icon: Motorbike, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', text: 'กำลังจัดส่ง' },
  done: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'สำเร็จแล้ว' },
  cancel: { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200', text: 'ยกเลิกแล้ว' }
};

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ');
  return res.json();
});

export default function OrderHistoryPage() {
  const { data: session, status } = useSession();
  
  // 🏷️ Filter State
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'done' | 'cancel'>('all');
  
  // 📜 Infinite Scroll States
  const [displayLimit, setDisplayLimit] = useState(10);
  const observerTarget = useRef<HTMLDivElement>(null);
  
  const router = useRouter();

  // ➕ 3. เช็คสถานะการล็อกอิน ถ้ายังไม่ล็อกอินให้เด้งไปหน้า login
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

  // ➕ 4. ดึงข้อมูลออเดอร์เมื่อล็อกอินสำเร็จ โดยใช้ useSWR เพื่อ Cache ข้อมูล
  const { data: orders = [], isLoading: isOrdersLoading } = useSWR<Order[]>(
    status === 'authenticated' ? '/api/customer/orders' : null,
    fetcher,
    { revalidateOnFocus: true, refreshInterval: 10000 } // Auto refresh ทุก 10 วิ
  );

  // 🔍 กรองข้อมูลออเดอร์
  const filteredOrders = useMemo(() => {
    if (activeFilter === 'all') return orders;
    if (activeFilter === 'active') {
      return orders.filter(o => ['pending', 'checking_slip', 'cooking', 'delivery'].includes(o.status));
    }
    if (activeFilter === 'done') {
      return orders.filter(o => o.status === 'done');
    }
    if (activeFilter === 'cancel') {
      return orders.filter(o => o.status === 'cancel');
    }
    return orders;
  }, [orders, activeFilter]);

  // ตัดแบ่งออเดอร์ที่จะแสดง
  const displayedOrders = useMemo(() => {
    return filteredOrders.slice(0, displayLimit);
  }, [filteredOrders, displayLimit]);

  // รีเซ็ต Limit เมื่อเปลี่ยน Filter
  useEffect(() => {
    setDisplayLimit(10);
  }, [activeFilter]);

  // Intersection Observer สำหรับโหลดเพิ่ม
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayLimit(prev => prev + 10);
        }
      },
      { rootMargin: '400px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    const currentTarget = observerTarget.current;
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [displayedOrders.length]);

  // --- Loading State (Skeleton) ---
  // เช็คว่าไม่มีข้อมูลใน Cache (เพิ่งโหลดครั้งแรก) ถึงจะแสดง Skeleton
  const showSkeleton = status === 'loading' || (isOrdersLoading && orders.length === 0);

  if (showSkeleton) {
    return (
      <div className="min-h-screen bg-blue-50 dark:bg-slate-900 pb-20 font-sans transition-colors animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-white dark:bg-slate-800 px-5 py-4 sticky top-0 z-40 border-b border-blue-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="h-7 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg mx-auto"></div>
        </div>

        <div className="max-w-2xl mx-auto p-4 sm:p-6">
          {/* Filters Skeleton */}
          <div className="flex gap-2.5 overflow-hidden pb-3 mb-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-[42px] w-[100px] bg-slate-200 dark:bg-slate-700 rounded-full shrink-0"></div>
            ))}
          </div>

          {/* Order Cards Skeleton */}
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-[20px] p-5 border border-blue-100 dark:border-slate-700 shadow-sm">
                {/* Top Row */}
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                    <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                  </div>
                  <div className="h-7 w-24 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                </div>
                
                {/* Middle Row */}
                <div className="h-20 bg-slate-100 dark:bg-slate-700/50 rounded-2xl mb-4"></div>
                
                {/* Bottom Row */}
                <div className="flex justify-between items-center pt-3 mt-2">
                  <div className="h-7 w-28 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                  <div className="h-8 w-28 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Empty State (ไม่มีออเดอร์เลยในระบบ) ---
  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-blue-50 dark:bg-slate-900 p-6 flex flex-col items-center justify-center text-center transition-colors">
        <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center shadow-sm mb-6 border border-blue-100 dark:border-slate-700 transition-colors">
          <SearchX size={48} className="text-blue-300 dark:text-slate-500" />
        </div>
        <h2 className="text-xl font-black text-blue-900 dark:text-blue-50 mb-2">ยังไม่มีประวัติการสั่งซื้อ</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-[240px]">ออเดอร์แสนอร่อยของคุณจะมาปรากฏอยู่ที่นี่ สั่งเลย!</p>
        <button 
          onClick={() => router.push('/dashboard/customer/menus')}
          className="bg-blue-600 dark:bg-blue-600 text-white px-8 py-3 rounded-2xl font-black shadow-[0_8px_20px_rgba(37,99,235,0.3)] hover:bg-blue-700 dark:hover:bg-blue-700 transition-all active:scale-95"
        >
          ไปที่เมนูอาหาร
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-slate-900 pb-20 font-sans transition-colors">
      
      {/* 🌟 Header */}
      <div className="bg-white dark:bg-slate-800 px-5 py-4 sticky top-0 z-40 border-b border-blue-100 dark:border-slate-700 shadow-sm flex items-center gap-4 transition-colors">
        <h1 className="text-xl font-black text-blue-900 dark:text-blue-50 flex items-center justify-center gap-2 flex-1 pr-16 m-0">
          <History size={22} className="text-blue-600 dark:text-blue-400" /> ประวัติ
        </h1>
      </div>

      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        
        {/* 🧭 แถบตัวกรองดีไซน์ Horizontal Slide */}
        <div className="flex gap-2.5 overflow-x-auto pb-3 mb-4 scroll-smooth snap-x scrollbar-hide">
          <button 
            onClick={() => setActiveFilter('all')} 
            className={`snap-start px-5 py-2.5 rounded-full font-bold text-[0.85rem] whitespace-nowrap transition-all border ${activeFilter === 'all' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-blue-100 dark:border-slate-700'}`}
          >
            📋 ทั้งหมด
          </button>
          <button 
            onClick={() => setActiveFilter('active')} 
            className={`snap-start px-5 py-2.5 rounded-full font-bold text-[0.85rem] whitespace-nowrap transition-all border ${activeFilter === 'active' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-blue-100 dark:border-slate-700'}`}
          >
            ⏳ กำลังดำเนินการ
          </button>
          <button 
            onClick={() => setActiveFilter('done')} 
            className={`snap-start px-5 py-2.5 rounded-full font-bold text-[0.85rem] whitespace-nowrap transition-all border ${activeFilter === 'done' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-blue-100 dark:border-slate-700'}`}
          >
            ✅ สำเร็จแล้ว
          </button>
          <button 
            onClick={() => setActiveFilter('cancel')} 
            className={`snap-start px-5 py-2.5 rounded-full font-bold text-[0.85rem] whitespace-nowrap transition-all border ${activeFilter === 'cancel' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-blue-100 dark:border-slate-700'}`}
          >
            ❌ ยกเลิก
          </button>
        </div>

        {/* --- List ออเดอร์ --- */}
        <div className="space-y-4">
          {filteredOrders.length > 0 ? (
            <>
              {displayedOrders.map((order) => {
              const status = statusConfig[order.status as keyof typeof statusConfig] || { 
                icon: ClipboardList, color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-700', border: 'border-slate-200 dark:border-slate-600', text: order.status 
              };
              const StatusIcon = status.icon;

              return (
                <div
                  key={order.id}
                  onClick={() => router.push(`/dashboard/customer/order/${order.id}`)}
                  className="bg-white dark:bg-slate-800 rounded-[20px] p-5 border border-blue-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
                >
                  {/* Top Row: Order ID & Status */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[0.7rem] font-black text-slate-400 uppercase tracking-widest block mb-1">Order Number</span>
                      <h3 className="text-lg font-black text-blue-900 dark:text-blue-50">#{order.id}</h3>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-white dark:bg-slate-800 ${status.color} ${status.border}`}>
                      <div className={`p-1 rounded-full ${status.bg} dark:bg-opacity-20`}>
                        <StatusIcon size={12} strokeWidth={3} />
                      </div>
                      <span className="text-xs font-bold pr-1">{status.text}</span>
                    </div>
                  </div>

                  {/* Middle Row: Date & Summary */}
                  <div className="flex flex-col gap-2.5 mb-4 text-[0.85rem] font-bold text-slate-500 dark:text-slate-400 bg-blue-50 dark:bg-slate-700/50 p-3.5 rounded-2xl border border-blue-50 dark:border-slate-600 transition-colors">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-blue-300 dark:text-slate-400" />
                      {new Date(order.created_at).toLocaleDateString('th-TH', { 
                        day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' 
                      })} น.
                    </div>
                    <div className="flex items-center gap-2">
                      <ClipboardList size={16} className="text-blue-300 dark:text-slate-400" />
                      <span className="truncate">
                        {order.items.length} รายการ: {order.items[0]?.menu_name}
                        {order.items.length > 1 && ` และอื่นๆ อีก ${order.items.length - 1} อย่าง`}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Row: Total & Action */}
                  <div className="flex justify-between items-center pt-3 mt-2">
                    <div className="flex items-center gap-1.5">
                      <CircleDollarSign size={20} className="text-blue-600 dark:text-blue-400" />
                      <span className="text-xl font-black text-blue-900 dark:text-blue-50">
                        {Number(order.total_price).toLocaleString()} ฿
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full font-bold text-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                      รายละเอียด <ChevronRight size={16} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              );
              })}
              
              {/* Sentinel สำหรับโหลดออเดอร์เพิ่ม */}
              {displayLimit < filteredOrders.length && (
                <div ref={observerTarget} className="w-full h-20 flex flex-col items-center justify-center mt-2">
                  <div className="w-6 h-6 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <span className="text-xs text-blue-500 dark:text-blue-400 font-bold">กำลังโหลดเพิ่ม...</span>
                </div>
              )}
            </>
          ) : (
            // กรณีมีออเดอร์ในระบบ แต่ไม่มีออเดอร์ใน Filter นี้
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-blue-100 dark:border-slate-700 transition-colors">
              <SearchX size={40} className="text-blue-300 dark:text-slate-500 mx-auto mb-4" />
              <p className="text-blue-900 dark:text-blue-100 font-bold">ไม่พบประวัติออเดอร์ในหมวดหมู่นี้</p>
            </div>
          )}
        </div>
      </div>

      {filteredOrders.length > 0 && (
        <p className="text-center text-slate-400 dark:text-slate-500 text-xs font-bold mt-4 mb-8">
          แสดงประวัติการสั่งซื้อย้อนหลังทั้งหมด
        </p>
      )}
    </div>
  );
}