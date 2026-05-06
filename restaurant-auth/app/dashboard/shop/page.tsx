'use client';

import { useEffect, useState } from 'react';
import { 
  Store, 
  TrendingUp, 
  ClipboardList, 
  Users, 
  Clock, 
  Banknote,
  MoreHorizontal,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { motion } from 'framer-motion';

type DashboardData = {
  shop: { name: string; is_open: boolean; open_time: string; close_time: string };
  remaining_queue: number;
  todayStats: { total_orders: number; total_revenue: number };
  pending_orders: number;
  pending_reservations: number;
  recentOrders: { id: number; total_price: number; status: string; payment_method: string; created_at: string }[];
};

export default function ShopDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

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

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000); 
    return () => clearInterval(interval);
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-slate-800 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-500">Loading workspace...</span>
        </div>
      </div>
    );
  }
  
  if (!data) return <div className="p-8 text-red-500 font-medium">เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูล</div>;

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 pb-24 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* --- Header Section --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-slate-900 text-white rounded-lg">
                <Store size={18} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {data.shop.name || 'Overview'}
              </h1>
            </div>
            <p className="text-sm text-slate-500 font-medium ml-1">
              ข้อมูลสรุปยอดขายและการดำเนินการประจำวัน
            </p>
          </div>

          {/* Shop Status Toggle (SaaS Style) */}
          <div className="flex items-center gap-4 bg-white p-1.5 pr-4 rounded-full border border-slate-200 shadow-sm">
            <button 
              onClick={toggleShopStatus}
              disabled={isToggling}
              className={`relative w-12 h-7 rounded-full transition-colors duration-300 outline-none ${data.shop.is_open ? 'bg-emerald-500' : 'bg-slate-200'}`}
            >
              <motion.div 
                layout
                className="absolute top-1 bg-white w-5 h-5 rounded-full shadow-sm"
                initial={false}
                animate={{ left: data.shop.is_open ? '26px' : '4px' }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            <div className="flex items-center gap-2">
              {data.shop.is_open ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-sm font-semibold text-slate-700">เปิดรับออเดอร์</span>
                </>
              ) : (
                <>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400"></span>
                  <span className="text-sm font-semibold text-slate-500">ปิดร้านชั่วคราว</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* --- Stats Grid --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <StatCard 
            title="รายได้วันนี้" 
            value={`฿${Number(data.todayStats.total_revenue).toLocaleString()}`} 
            subtitle={`${data.todayStats.total_orders} ออเดอร์ที่สำเร็จแล้ว`}
            icon={Banknote} 
            trend="up"
          />
          <StatCard 
            title="ออเดอร์รอยืนยัน" 
            value={data.pending_orders.toString()} 
            subtitle="ต้องการการตอบกลับทันที"
            icon={ClipboardList} 
            alert={data.pending_orders > 0}
          />
          <StatCard 
            title="จองโต๊ะรออนุมัติ" 
            value={data.pending_reservations.toString()} 
            subtitle="ตรวจสอบคำขอจองโต๊ะ"
            icon={Users} 
            alert={data.pending_reservations > 0}
          />
          <StatCard 
            title="คิวรอหน้าร้าน" 
            value={data.remaining_queue.toString()} 
            subtitle="ลูกค้าที่กำลังรอโต๊ะว่าง"
            icon={Clock} 
          />
        </div>

        {/* --- Recent Orders Table --- */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp size={18} className="text-slate-500" /> 
              รายการออเดอร์ล่าสุด
            </h2>
            <button className="text-sm font-semibold text-slate-900 hover:text-slate-600 flex items-center gap-1 transition-colors">
              ดูทั้งหมด <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-3 font-semibold text-slate-500">รหัส</th>
                  <th className="px-6 py-3 font-semibold text-slate-500">เวลา</th>
                  <th className="px-6 py-3 font-semibold text-slate-500">ช่องทางชำระ</th>
                  <th className="px-6 py-3 font-semibold text-slate-500">ยอดสุทธิ</th>
                  <th className="px-6 py-3 font-semibold text-slate-500">สถานะ</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      ไม่มีรายการออเดอร์ในขณะนี้
                    </td>
                  </tr>
                ) : (
                  data.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        #{order.id.toString().padStart(4, '0')}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4">
                        {order.payment_method === 'qr' ? (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span> โอนเงิน
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span> เงินสด
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        ฿{order.total_price.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-slate-900 transition-colors opacity-0 group-hover:opacity-100">
                          <MoreHorizontal size={18} />
                        </button>
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

// --- Sub Components ---

function StatCard({ title, value, subtitle, icon: Icon, alert, trend }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-100 group-hover:bg-slate-100 transition-colors">
          <Icon size={20} strokeWidth={2.5} />
        </div>
        {trend === 'up' && (
          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
            <ArrowUpRight size={14} /> วันนี้
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{value}</h3>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className={`text-xs mt-1 font-medium ${alert ? 'text-amber-600' : 'text-slate-500'}`}>
          {subtitle}
        </p>
      </div>

      {/* Decorative background flair if alert is true */}
      {alert && (
        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 rounded-full bg-amber-50 blur-2xl pointer-events-none"></div>
      )}
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100/50 text-amber-700 border-amber-200',
    cooking: 'bg-blue-100/50 text-blue-700 border-blue-200',
    delivery: 'bg-purple-100/50 text-purple-700 border-purple-200',
    done: 'bg-emerald-100/50 text-emerald-700 border-emerald-200',
    cancel: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const labels: Record<string, string> = {
    pending: 'รอดำเนินการ',
    cooking: 'กำลังปรุง',
    delivery: 'กำลังจัดส่ง',
    done: 'เสร็จสิ้น',
    cancel: 'ยกเลิก',
  };

  const className = styles[status] || 'bg-slate-100 text-slate-600 border-slate-200';
  const label = labels[status] || status;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${className}`}>
      {label}
    </span>
  );
}