'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react'; // ➕ 1. นำเข้า NextAuth hooks
import { 
  Store, 
  TrendingUp, 
  Banknote,
  LayoutGrid,
  LogOut,
  ArrowRight,
  MessageCircle,
  Star
} from 'lucide-react';
import { motion } from 'framer-motion';

type DashboardData = {
  shop: { name: string; is_open: boolean; open_time: string; close_time: string };
  todayStats: { total_orders: number; total_revenue: number };
  tableStats: { total: number; available: number };
  recentOrders: { id: number; total_price: number; status: string; payment_method: string; created_at: string; order_type?: string }[];
  reviewStats: { total_reviews: number; avg_rating: number };
};

export default function ShopDashboardPage() {
  const router = useRouter();
  
  // 🚨 2. ใช้ useSession แทน localStorage
  const { data: session, status } = useSession();
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [activeTab, setActiveTab] = useState<'online' | 'dine_in'>('online');

  // 🚨 3. ตรวจสอบสิทธิ์ด้วย status จาก NextAuth
  useEffect(() => {
    if (status === 'unauthenticated') {
      // ถ้าไม่ได้ล็อกอิน ให้เด้งกลับไปหน้า login ร้านค้า
      router.replace('/login/shop');
    } else if (status === 'authenticated') {
      // ถ้าล็อกอินแล้ว แต่ไม่ใช่ร้านค้า ให้เตะออกไปหน้าล็อกอินร้านค้าพร้อมแจ้งเตือน
      if ((session.user as any)?.role !== 'shop') {
        router.replace('/login/shop?error=wrong_role');
      }
    }
  }, [status, session, router]);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/shop/dashboard');
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Failed to fetch dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChats = async () => {
    try {
      const res = await fetch('/api/shop/chat');
      const chatData = await res.json();
      
      let unread = 0;
      chatData.forEach((chat: any) => {
        const totalMsgs = chat.total_msgs || 0;
        const lastSender = chat.last_sender;
        
        // ถ้าฝั่งร้านค้าเป็นคนพิมพ์ล่าสุด ถือว่าอ่าน/ตอบแล้ว
        if (lastSender === 'shop') return;
        
        const readTotal = localStorage.getItem(`shop_read_total_msgs_${chat.user_id}`);
        if (!readTotal) {
          // ถ้าไม่มีข้อมูลใน localStorage ให้เพิ่มเข้าไป 1 แจ้งเตือน และเก็บค่า (totalMsgs - 1)
          localStorage.setItem(`shop_read_total_msgs_${chat.user_id}`, (totalMsgs - 1).toString());
          unread += 1;
        } else {
          const parsedRead = parseInt(readTotal, 10);
          if (totalMsgs > parsedRead) {
            unread += (totalMsgs - parsedRead);
          }
        }
      });
      setTotalUnread(unread);
    } catch (error) {
      console.error("Failed to fetch chats", error);
    }
  };

  // 🚨 4. จะดึงข้อมูลก็ต่อเมื่อผ่านการตรวจสอบสิทธิ์ว่าเป็นร้านค้าแล้วเท่านั้น
  useEffect(() => {
    if (status !== 'authenticated' || (session?.user as any)?.role !== 'shop') return; 

    fetchDashboard();
    fetchChats();
    const interval = setInterval(() => {
      fetchDashboard();
      fetchChats();
    }, 30000); 
    return () => clearInterval(interval);
  }, [status, session]);

  const toggleShopStatus = async () => {
    if (!data) return;
    setIsToggling(true);
    const newStatus = !data.shop.is_open;
    try {
      await fetch('/api/shop/dashboard', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_open: newStatus })
      });
      setData({ ...data, shop: { ...data.shop, is_open: newStatus } });
    } catch (error) {
      alert("ไม่สามารถเปลี่ยนสถานะร้านได้");
    } finally {
      setIsToggling(false);
    }
  };


  // Filter and limit recent orders
  const displayedRecentOrders = React.useMemo(() => {
    if (!data?.recentOrders) return [];
    if (activeTab === 'online') {
      return data.recentOrders.filter(o => o.order_type === 'online' || !o.order_type).slice(0, 5);
    } else {
      return data.recentOrders.filter(o => o.order_type === 'dine_in').slice(0, 5);
    }
  }, [data, activeTab]);

  // ⏳ หน้าจอโหลดขณะตรวจสอบสิทธิ์ หรือ กำลังดึงข้อมูล
  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-slate-400 tracking-wider">
            {status === 'loading' ? 'กำลังตรวจสอบสิทธิ์...' : 'กำลังโหลดข้อมูล...'}
          </span>
        </div>
      </div>
    );
  }
  
  // ป้องกันหน้าจอกระพริบก่อนที่จะเตะคนที่ไม่ใช่ร้านค้าออก
  if (status !== 'authenticated' || (session.user as any)?.role !== 'shop') return null;

  if (!data) return <div className="p-8 text-rose-500 font-bold text-center mt-20">เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูล</div>;

  const isTableFull = data.tableStats.available === 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24 font-sans selection:bg-blue-100">
      <div className="max-w-[840px] mx-auto px-4 sm:px-6 pt-8 sm:pt-10">
        
        {/* --- 🌟 Premium Header --- */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
              <Store size={24} strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mb-0.5">
                {data.shop.name || 'Overview'}
              </h1>
              <p className="text-xs sm:text-sm font-medium text-slate-500">
                ภาพรวมยอดขายและคิวหน้าร้าน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1.5 bg-white/60 backdrop-blur-md rounded-full border border-slate-200/80 shadow-sm w-full sm:w-auto">
            <div className="flex items-center gap-3 pl-3 pr-2 py-1">
              <span className="relative flex h-2.5 w-2.5">
                {data.shop.is_open && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${data.shop.is_open ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
              </span>
              <span className="text-sm font-bold text-slate-700 hidden sm:block">
                {data.shop.is_open ? 'เปิดรับออเดอร์' : 'ปิดร้านชั่วคราว'}
              </span>
              <button 
                onClick={toggleShopStatus}
                disabled={isToggling}
                className={`relative w-11 h-6 rounded-full transition-colors duration-300 outline-none ml-1 ${data.shop.is_open ? 'bg-emerald-500 shadow-inner shadow-emerald-700/20' : 'bg-slate-200 shadow-inner shadow-slate-400/20'}`}
              >
                <motion.div 
                  layout
                  className="absolute top-[2px] bg-white w-5 h-5 rounded-full shadow-md"
                  initial={false}
                  animate={{ x: data.shop.is_open ? 20 : 2 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            <div className="w-[1px] h-6 bg-slate-200"></div>

            <Link 
              href="/dashboard/shop/chat"
              className="relative flex items-center justify-center w-10 h-10 sm:w-auto sm:px-4 sm:h-10 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all font-bold text-sm group outline-none"
            >
              <MessageCircle size={18} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /> 
              <span className="hidden sm:inline ml-2">แชท</span>
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 sm:top-0 sm:-right-2 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 min-w-[20px] text-center rounded-full shadow-sm shadow-rose-500/30 border border-white">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </Link>

          </div>
        </div>

        {/* --- 📊 สถิติรวม (Unified Premium Card) --- */}
        <div className="bg-white border border-slate-200/60 rounded-[1.5rem] sm:rounded-[2rem] shadow-sm hover:shadow-lg transition-shadow duration-300 mb-8 flex flex-col sm:flex-row overflow-hidden">
          
          {/* 1. รายได้ (Revenue) */}
          <Link href="/dashboard/shop/revenue" className="relative w-full sm:flex-1 p-4 sm:p-7 hover:bg-slate-50/50 transition-colors group flex flex-col justify-between overflow-hidden border-b sm:border-b-0 sm:border-r border-slate-100">
            {/* Glow Hover Effect */}
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            
            <div className="flex justify-between items-start mb-3 sm:mb-4 relative z-10">
              <span className="text-[11px] sm:text-sm font-bold text-slate-500">รายได้วันนี้</span>
              <ArrowRight size={14} strokeWidth={2.5} className="-rotate-45 text-slate-300 group-hover:text-blue-500 transition-colors sm:w-4 sm:h-4" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <Banknote size={20} strokeWidth={2.5} className="text-blue-500 shrink-0 sm:w-6 sm:h-6" />
                <h3 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tighter leading-none truncate">
                  ฿{Number(data.todayStats.total_revenue).toLocaleString()}
                </h3>
              </div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 ml-7 sm:ml-8">
                {data.todayStats.total_orders} ออเดอร์ที่สำเร็จแล้ว
              </p>
            </div>
          </Link>

          {/* Row for Mobile (Tables & Reviews side-by-side) */}
          <div className="flex w-full sm:flex-[2] divide-x divide-slate-100">
            {/* 2. โต๊ะว่าง (Tables) */}
            <Link href="/dashboard/shop/tables" className="relative flex-1 p-4 sm:p-7 hover:bg-slate-50/50 transition-colors group flex flex-col justify-between overflow-hidden sm:border-r border-slate-100">
              {/* Glow Hover Effect */}
              <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${isTableFull ? 'bg-rose-400/20' : 'bg-purple-400/10'}`}></div>
              
              <div className="flex justify-between items-start mb-3 sm:mb-4 relative z-10">
                <span className={`text-[11px] sm:text-sm font-bold ${isTableFull ? 'text-rose-500' : 'text-slate-500'}`}>
                  {isTableFull ? '⚠️ โต๊ะเต็ม' : 'โต๊ะว่าง'}
                </span>
                <ArrowRight size={14} strokeWidth={2.5} className="-rotate-45 text-slate-300 group-hover:text-purple-500 transition-colors sm:w-4 sm:h-4" />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <LayoutGrid size={20} strokeWidth={2.5} className={`shrink-0 sm:w-6 sm:h-6 ${isTableFull ? 'text-rose-500' : 'text-purple-500'}`} />
                  <div className="flex items-baseline gap-1">
                    <h3 className={`text-2xl sm:text-4xl font-black tracking-tighter leading-none ${isTableFull ? 'text-rose-600' : 'text-slate-900'}`}>
                      {data.tableStats.available}
                    </h3>
                    <span className="text-sm sm:text-2xl font-bold text-slate-300 leading-none">
                      /{data.tableStats.total}
                    </span>
                  </div>
                </div>
              </div>
            </Link>

            {/* 3. รีวิวร้านค้า (Reviews) */}
            <Link href="/dashboard/shop/reviews" className="relative flex-1 p-4 sm:p-7 hover:bg-slate-50/50 transition-colors group flex flex-col justify-between overflow-hidden">
              {/* Glow Hover Effect */}
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-400/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              
              <div className="flex justify-between items-start mb-3 sm:mb-4 relative z-10">
                <span className="text-[11px] sm:text-sm font-bold text-slate-500">คะแนนรีวิว</span>
                <ArrowRight size={14} strokeWidth={2.5} className="-rotate-45 text-slate-300 group-hover:text-amber-500 transition-colors sm:w-4 sm:h-4" />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <Star size={20} strokeWidth={2.5} className="text-amber-500 shrink-0 fill-amber-500 sm:w-6 sm:h-6" />
                  <div className="flex items-baseline gap-1">
                    <h3 className="text-2xl sm:text-4xl font-black tracking-tighter leading-none text-slate-900">
                      {Number(data.reviewStats?.avg_rating || 0).toFixed(1)}
                    </h3>
                    <span className="text-sm sm:text-2xl font-bold text-slate-300 leading-none">
                      /5
                    </span>
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs font-bold text-slate-400 ml-7 sm:ml-8 hidden sm:block">
                  จาก {data.reviewStats?.total_reviews || 0} รีวิวทั้งหมด
                </p>
                <p className="text-[9px] font-bold text-slate-400 ml-7 block sm:hidden">
                  {data.reviewStats?.total_reviews || 0} รีวิว
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* --- ตารางออเดอร์ล่าสุด --- */}
        <div className="bg-white border border-slate-200/60 rounded-[2rem] shadow-sm overflow-hidden">
          <div className="px-6 py-5 flex justify-between items-center">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <TrendingUp size={20} className="text-slate-400" /> 
              ออเดอร์ล่าสุด
            </h2>
            <Link href="/dashboard/shop/orders/history" className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3.5 py-1.5 rounded-full transition-colors flex items-center gap-1">
              ดูทั้งหมด
            </Link>
          </div>

          {/* 🌟 Tabs */}
          <div className="px-6 pb-2">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
              <button 
                onClick={() => setActiveTab('online')}
                className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'online' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                ออนไลน์
              </button>
              <button 
                onClick={() => setActiveTab('dine_in')}
                className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'dine_in' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                หน้าร้าน
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto pb-2">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-3 pb-4">Order ID</th>
                  <th className="px-6 py-3 pb-4">เวลา</th>
                  <th className="px-6 py-3 pb-4">การชำระเงิน</th>
                  <th className="px-6 py-3 pb-4">ยอดสุทธิ</th>
                  <th className="px-6 py-3 pb-4 text-right">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayedRecentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-3">
                        <span className="text-2xl opacity-50">🍽️</span>
                      </div>
                      <p className="text-slate-400 font-bold">ยังไม่มีออเดอร์{activeTab === 'online' ? 'ออนไลน์' : 'หน้าร้าน'}ในวันนี้</p>
                    </td>
                  </tr>
                ) : (
                  displayedRecentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 font-black text-slate-800">
                        #{order.id.toString().padStart(4, '0')}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-400 text-xs sm:text-sm">
                        {new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${order.payment_method === 'qr' ? 'bg-indigo-500' : 'bg-amber-500'}`}></div>
                          <span className="font-bold text-slate-600 text-xs sm:text-sm">
                            {order.payment_method === 'qr' ? 'โอนเงิน' : 'เงินสด'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900 text-base">
                        ฿{order.total_price.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <OrderStatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>


    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-600 ring-amber-200/50', 
    checking_slip: 'bg-sky-50 text-sky-600 ring-sky-200/50',
    cooking: 'bg-blue-50 text-blue-600 ring-blue-200/50', 
    delivery: 'bg-purple-50 text-purple-600 ring-purple-200/50',
    done: 'bg-emerald-50 text-emerald-600 ring-emerald-200/50', 
    cancel: 'bg-slate-50 text-slate-500 ring-slate-200/50',
  };
  const labels: Record<string, string> = {
    pending: 'รอรับออเดอร์', checking_slip: 'รอตรวจสลิป', cooking: 'กำลังปรุง',
    delivery: 'กำลังจัดส่ง', done: 'เสร็จสิ้น', cancel: 'ยกเลิก',
  };
  
  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-black ring-1 inset-ring ${styles[status] || 'bg-slate-50 text-slate-600 ring-slate-200'}`}>
      {labels[status] || status}
    </span>
  );
}