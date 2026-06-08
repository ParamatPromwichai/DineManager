'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react'; // ➕ 1. นำเข้า NextAuth hooks
import { 
  Store, 
  TrendingUp, 
  Banknote,
  LayoutGrid,
  LogOut,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type DashboardData = {
  shop: { name: string; is_open: boolean; open_time: string; close_time: string };
  todayStats: { total_orders: number; total_revenue: number };
  tableStats: { total: number; available: number };
  recentOrders: { id: number; total_price: number; status: string; payment_method: string; created_at: string }[];
};

export default function ShopDashboardPage() {
  const router = useRouter();
  
  // 🚨 2. ใช้ useSession แทน localStorage
  const { data: session, status } = useSession();
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

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

  // 🚨 4. จะดึงข้อมูลก็ต่อเมื่อผ่านการตรวจสอบสิทธิ์ว่าเป็นร้านค้าแล้วเท่านั้น
  useEffect(() => {
    if (status !== 'authenticated' || (session?.user as any)?.role !== 'shop') return; 

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000); 
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

  const confirmLogout = async () => {
    setIsLogoutModalOpen(false); 
    // 🚨 5. ใช้ signOut ของ NextAuth ออกจากระบบ แล้วกลับไปหน้า login ร้านค้า
    await signOut({ callbackUrl: '/login/shop' });
  };

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

            <button 
              onClick={() => setIsLogoutModalOpen(true)}
              className="flex items-center justify-center w-10 h-10 sm:w-auto sm:px-4 sm:h-10 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all font-bold text-sm group outline-none"
            >
              <LogOut size={18} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /> 
              <span className="hidden sm:inline ml-2">ออก</span>
            </button>
          </div>
        </div>

        {/* --- 📊 สถิติรวม (Unified Premium Card) --- */}
        <div className="bg-white border border-slate-200/60 rounded-[2rem] shadow-sm hover:shadow-lg transition-shadow duration-300 mb-8 flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-slate-100 overflow-hidden">
          
          {/* 1. รายได้ (Revenue) */}
          <Link href="/dashboard/shop/revenue" className="relative flex-1 p-5 sm:p-7 hover:bg-slate-50/50 transition-colors group flex flex-col justify-between overflow-hidden">
            {/* Glow Hover Effect */}
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            
            <div className="flex justify-between items-start mb-4 relative z-10">
              <span className="text-xs sm:text-sm font-bold text-slate-500">รายได้วันนี้</span>
              <ArrowRight size={16} strokeWidth={2.5} className="-rotate-45 text-slate-300 group-hover:text-blue-500 transition-colors" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1.5">
                <Banknote size={26} strokeWidth={2.5} className="text-blue-500 shrink-0" />
                <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter leading-none truncate">
                  ฿{Number(data.todayStats.total_revenue).toLocaleString()}
                </h3>
              </div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-400 ml-8">
                {data.todayStats.total_orders} ออเดอร์ที่สำเร็จแล้ว
              </p>
            </div>
          </Link>

          {/* 2. โต๊ะว่าง (Tables) */}
          <Link href="/dashboard/shop/tables" className="relative flex-1 p-5 sm:p-7 hover:bg-slate-50/50 transition-colors group flex flex-col justify-between overflow-hidden">
            {/* Glow Hover Effect */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${isTableFull ? 'bg-rose-400/20' : 'bg-purple-400/10'}`}></div>
            
            <div className="flex justify-between items-start mb-4 relative z-10">
              <span className={`text-xs sm:text-sm font-bold ${isTableFull ? 'text-rose-500' : 'text-slate-500'}`}>
                {isTableFull ? '⚠️ โต๊ะเต็มแล้ว' : 'โต๊ะว่างหน้าร้าน'}
              </span>
              <ArrowRight size={16} strokeWidth={2.5} className="-rotate-45 text-slate-300 group-hover:text-purple-500 transition-colors" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1.5">
                <LayoutGrid size={26} strokeWidth={2.5} className={`shrink-0 ${isTableFull ? 'text-rose-500' : 'text-purple-500'}`} />
                <div className="flex items-baseline gap-1">
                  <h3 className={`text-3xl sm:text-4xl font-black tracking-tighter leading-none ${isTableFull ? 'text-rose-600' : 'text-slate-900'}`}>
                    {data.tableStats.available}
                  </h3>
                  <span className="text-lg sm:text-2xl font-bold text-slate-300 leading-none">
                    /{data.tableStats.total}
                  </span>
                </div>
              </div>
            </div>
          </Link>

        </div>

        {/* --- ตารางออเดอร์ล่าสุด --- */}
        <div className="bg-white border border-slate-200/60 rounded-[2rem] shadow-sm overflow-hidden">
          <div className="px-6 py-5 flex justify-between items-center">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <TrendingUp size={20} className="text-slate-400" /> 
              ออเดอร์ล่าสุด
            </h2>
            <Link href="/dashboard/shop/orders" className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3.5 py-1.5 rounded-full transition-colors flex items-center gap-1">
              ดูทั้งหมด
            </Link>
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
                {data.recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-3">
                        <span className="text-2xl opacity-50">🍽️</span>
                      </div>
                      <p className="text-slate-400 font-bold">ยังไม่มีออเดอร์ในวันนี้</p>
                    </td>
                  </tr>
                ) : (
                  data.recentOrders.map((order) => (
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

      {/* --- 🚪 MODAL: ยืนยันการออกจากระบบ --- */}
      <AnimatePresence>
        {isLogoutModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-[2rem] shadow-2xl shadow-slate-900/10 w-full max-w-[340px] p-8 text-center border border-slate-100"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <LogOut size={28} strokeWidth={2.5} className="ml-1" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">ออกจากระบบ?</h3>
              <p className="text-slate-500 font-medium mb-8 text-sm leading-relaxed">
                เซสชันการทำงานของคุณจะถูกปิดลง<br/>คุณต้องเข้าสู่ระบบใหม่ในครั้งถัดไป
              </p>
              
              <div className="flex flex-col gap-3">
                <button onClick={confirmLogout} className="w-full py-3.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold shadow-md transition-all active:scale-95">
                  ยืนยันออกจากระบบ
                </button>
                <button onClick={() => setIsLogoutModalOpen(false)} className="w-full py-3.5 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl font-bold transition-colors">
                  ยกเลิก
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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