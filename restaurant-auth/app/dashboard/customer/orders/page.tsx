'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react'; // ➕ 1. นำเข้า useSession
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

// Mapping สถานะให้ดูดี (ปรับโทนสีให้เข้ากับดีไซน์ใหม่)
const statusConfig = {
  pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', text: 'รอรับออเดอร์' },
  checking_slip: { icon: Banknote, color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-200', text: 'รอตรวจสลิป' },
  cooking: { icon: ChefHat, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', text: 'กำลังปรุง' },
  delivery: { icon: Motorbike, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', text: 'กำลังจัดส่ง' },
  done: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'สำเร็จแล้ว' },
  cancel: { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200', text: 'ยกเลิกแล้ว' }
};

export default function OrderHistoryPage() {
  // ➕ 2. ใช้ useSession แทน localStorage
  const { data: session, status } = useSession();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🏷️ Filter State
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'done' | 'cancel'>('all');
  
  const router = useRouter();

  // ➕ 3. เช็คสถานะการล็อกอิน ถ้ายังไม่ล็อกอินให้เด้งไปหน้า login
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // ➕ 4. ดึงข้อมูลออเดอร์เมื่อล็อกอินสำเร็จ
  useEffect(() => {
    // ต้องรอให้ session โหลดเสร็จก่อน
    if (status !== 'authenticated') return;

    const fetchOrders = async () => {
      try {
        // ❌ เอา headers 'user-id' ออก เพราะเดี๋ยว API จะเช็คจาก Cookie เอง
        const res = await fetch('/api/customer/orders');
        
        if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ');
        const data = await res.json();
        setOrders(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [status]);

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

  // --- Loading State ---
  // ใช้ status === 'loading' ของ next-auth เพื่อโชว์ Loading ให้เนียนขึ้น
  if (status === 'loading' || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F4F8FF] gap-4">
        <div className="w-10 h-10 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#1E3A8A] font-bold text-sm tracking-wide">กำลังโหลดประวัติ...</p>
      </div>
    );
  }

  // --- Empty State (ไม่มีออเดอร์เลยในระบบ) ---
  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-[#F4F8FF] p-6 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-[0_4px_15px_rgba(37,99,235,0.05)] mb-6 border border-[#DCE8FF]">
          <SearchX size={48} className="text-[#93C5FD]" />
        </div>
        <h2 className="text-xl font-black text-[#1E3A8A] mb-2">ยังไม่มีประวัติการสั่งซื้อ</h2>
        <p className="text-[#64748B] mb-8 max-w-[240px]">ออเดอร์แสนอร่อยของคุณจะมาปรากฏอยู่ที่นี่ สั่งเลย!</p>
        <button 
          onClick={() => router.push('/dashboard/customer/menus')}
          className="bg-[#2563EB] text-white px-8 py-3 rounded-2xl font-black shadow-[0_8px_20px_rgba(37,99,235,0.3)] hover:bg-[#1D4ED8] transition-all active:scale-95"
        >
          ไปที่เมนูอาหาร
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F8FF] pb-20 font-sans">
      
      {/* 🌟 Header */}
      <div className="bg-white px-5 py-4 sticky top-0 z-40 border-b border-[#DCE8FF] shadow-[0_4px_15px_rgba(37,99,235,0.03)] flex items-center gap-4">
        <h1 className="text-xl font-black text-[#1E3A8A] flex items-center justify-center gap-2 flex-1 pr-16 m-0">
          <History size={22} className="text-[#2563EB]" /> ประวัติ
        </h1>
      </div>

      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        
        {/* 🧭 แถบตัวกรองดีไซน์ Horizontal Slide */}
        <div className="flex gap-2.5 overflow-x-auto pb-3 mb-4 scroll-smooth snap-x" style={{ scrollbarWidth: 'none' }}>
          <button 
            onClick={() => setActiveFilter('all')} 
            className={`snap-start px-5 py-2.5 rounded-full font-bold text-[0.85rem] whitespace-nowrap transition-all border ${activeFilter === 'all' ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-[0_4px_10px_rgba(37,99,235,0.25)]' : 'bg-white text-[#475569] border-[#DCE8FF]'}`}
          >
            📋 ทั้งหมด
          </button>
          <button 
            onClick={() => setActiveFilter('active')} 
            className={`snap-start px-5 py-2.5 rounded-full font-bold text-[0.85rem] whitespace-nowrap transition-all border ${activeFilter === 'active' ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-[0_4px_10px_rgba(37,99,235,0.25)]' : 'bg-white text-[#475569] border-[#DCE8FF]'}`}
          >
            ⏳ กำลังดำเนินการ
          </button>
          <button 
            onClick={() => setActiveFilter('done')} 
            className={`snap-start px-5 py-2.5 rounded-full font-bold text-[0.85rem] whitespace-nowrap transition-all border ${activeFilter === 'done' ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-[0_4px_10px_rgba(37,99,235,0.25)]' : 'bg-white text-[#475569] border-[#DCE8FF]'}`}
          >
            ✅ สำเร็จแล้ว
          </button>
          <button 
            onClick={() => setActiveFilter('cancel')} 
            className={`snap-start px-5 py-2.5 rounded-full font-bold text-[0.85rem] whitespace-nowrap transition-all border ${activeFilter === 'cancel' ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-[0_4px_10px_rgba(37,99,235,0.25)]' : 'bg-white text-[#475569] border-[#DCE8FF]'}`}
          >
            ❌ ยกเลิก
          </button>
        </div>

        {/* --- List ออเดอร์ --- */}
        <div className="space-y-4">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => {
              const status = statusConfig[order.status as keyof typeof statusConfig] || { 
                icon: ClipboardList, color: 'text-[#64748B]', bg: 'bg-[#F1F5F9]', border: 'border-[#E2E8F0]', text: order.status 
              };
              const StatusIcon = status.icon;

              return (
                <div
                  key={order.id}
                  onClick={() => router.push(`/dashboard/customer/order/${order.id}`)}
                  className="bg-white rounded-[20px] p-5 border border-[#DCE8FF] shadow-[0_4px_12px_rgba(37,99,235,0.03)] hover:shadow-md hover:border-[#BFDBFE] transition-all cursor-pointer group active:scale-[0.98]"
                >
                  {/* Top Row: Order ID & Status */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[0.7rem] font-black text-[#94A3B8] uppercase tracking-widest block mb-1">Order Number</span>
                      <h3 className="text-lg font-black text-[#1E3A8A]">#{order.id}</h3>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-white ${status.color} ${status.border}`}>
                      <div className={`p-1 rounded-full ${status.bg}`}>
                        <StatusIcon size={12} strokeWidth={3} />
                      </div>
                      <span className="text-xs font-bold pr-1">{status.text}</span>
                    </div>
                  </div>

                  {/* Middle Row: Date & Summary */}
                  <div className="flex flex-col gap-2.5 mb-4 text-[0.85rem] font-bold text-[#64748B] bg-[#F4F8FF] p-3.5 rounded-2xl border border-[#EBF1FF]">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-[#93C5FD]" />
                      {new Date(order.created_at).toLocaleDateString('th-TH', { 
                        day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' 
                      })} น.
                    </div>
                    <div className="flex items-center gap-2">
                      <ClipboardList size={16} className="text-[#93C5FD]" />
                      <span className="truncate">
                        {order.items.length} รายการ: {order.items[0]?.menu_name}
                        {order.items.length > 1 && ` และอื่นๆ อีก ${order.items.length - 1} อย่าง`}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Row: Total & Action */}
                  <div className="flex justify-between items-center pt-3 mt-2">
                    <div className="flex items-center gap-1.5">
                      <CircleDollarSign size={20} className="text-[#2563EB]" />
                      <span className="text-xl font-black text-[#1E3A8A]">
                        {Number(order.total_price).toLocaleString()} ฿
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-[#EFF6FF] text-[#2563EB] px-3 py-1.5 rounded-full font-bold text-sm group-hover:bg-[#2563EB] group-hover:text-white transition-all">
                      รายละเอียด <ChevronRight size={16} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            // กรณีมีออเดอร์ในระบบ แต่ไม่มีออเดอร์ใน Filter นี้
            <div className="text-center py-16 bg-white rounded-3xl border border-[#DCE8FF]">
              <SearchX size={40} className="text-[#93C5FD] mx-auto mb-4" />
              <p className="text-[#1E3A8A] font-bold">ไม่พบประวัติออเดอร์ในหมวดหมู่นี้</p>
            </div>
          )}
        </div>
      </div>

      {filteredOrders.length > 0 && (
        <p className="text-center text-[#94A3B8] text-xs font-bold mt-4 mb-8">
          แสดงประวัติการสั่งซื้อย้อนหลังทั้งหมด
        </p>
      )}
    </div>
  );
}