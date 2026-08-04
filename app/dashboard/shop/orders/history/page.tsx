'use client';

import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react'; 
import useSWR from 'swr';
import { Calendar, User, Phone, MapPin, ChevronDown, ChevronUp, CheckCircle2, CircleDashed, Truck, Check, RefreshCw, AlertCircle, List, Clock, Receipt, XCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then(res => res.json());

type OrderItem = {
  menu_name: string;
  quantity: number;
};

type Order = {
  id: number;
  status: string;
  total_price: number;
  created_at: string;
  payment_method: string;
  slip_image: string | null;
  customer_name: string;
  phone?: string;
  address?: string;
  order_type?: string;
  table_id?: number;
  table_name?: string;
  items: OrderItem[];
};

export default function OrderHistoryPage() {
  const { data: session, status } = useSession();
  
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const [expandedCustomers, setExpandedCustomers] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'online' | 'dine_in'>('all');
  const [slipPopupOrder, setSlipPopupOrder] = useState<Order | null>(null);

  const isShop = status === 'authenticated' && (session?.user as any)?.role === 'shop';
  const { data: fetchedOrders, error, mutate, isLoading: isOrdersLoading } = useSWR<Order[]>(
    isShop ? '/api/shop/orders/history' : null,
    fetcher,
    { refreshInterval: 10000 }
  );
  const orders = fetchedOrders || [];

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.created_at);
      const now = new Date();
      let isDateMatch = true;

      if (timeFilter === 'today') {
        isDateMatch = orderDate.toLocaleDateString('en-CA') === now.toLocaleDateString('en-CA');
      } else if (timeFilter === 'custom' && customDate) {
        isDateMatch = orderDate.toLocaleDateString('en-CA') === customDate;
      }

      const isTypeMatch = orderTypeFilter === 'all' || 
                          (orderTypeFilter === 'online' && (order.order_type === 'online' || !order.order_type)) || 
                          (orderTypeFilter === 'dine_in' && order.order_type === 'dine_in');
      return isDateMatch && isTypeMatch;
    }).sort((a, b) => {
      return b.id - a.id;
    });
  }, [orders, timeFilter, customDate, orderTypeFilter]);

  const displayedOrders = useMemo(() => {
    if (activeTab === 'all') return filteredOrders;
    return filteredOrders.filter(o => o.status === activeTab);
  }, [filteredOrders, activeTab]);

  const getTabCount = (status: string) => {
    if (status === 'all') return filteredOrders.length;
    return filteredOrders.filter(o => o.status === status).length;
  };

  const toggleCustomerInfo = (orderId: number) => {
    setExpandedCustomers(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const getStatusBadge = (status: string) => {
    const styles: any = {
      pending: 'bg-orange-50 text-orange-600 border-orange-200',
      checking_slip: 'bg-sky-50 text-sky-600 border-sky-200',
      cooking: 'bg-blue-50 text-blue-600 border-blue-200',
      delivery: 'bg-purple-50 text-purple-600 border-purple-200',
      done: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      cancel: 'bg-slate-50 text-slate-500 border-slate-200',
    };
    const labels: any = {
      pending: 'รอรับออเดอร์', checking_slip: 'รอตรวจสลิป', cooking: 'กำลังปรุง',
      delivery: 'กำลังจัดส่ง', done: 'ส่งสำเร็จ', cancel: 'ยกเลิก'
    };
    return <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${styles[status]}`}>{labels[status] || status}</span>;
  };

  if (status === 'loading' || (isOrdersLoading && !fetchedOrders)) {
    return (
      <div className="min-h-screen bg-slate-50 pb-24 text-slate-900 font-sans animate-pulse">
        <div className="max-w-3xl mx-auto space-y-4 pt-8 px-4 sm:px-0">
          
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="space-y-2">
              <div className="w-40 h-8 bg-slate-200 rounded-lg"></div>
              <div className="w-48 h-4 bg-slate-200 rounded-md"></div>
            </div>
            <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center gap-3">
              <div className="w-full sm:w-32 h-10 bg-slate-200 rounded-xl"></div>
              <div className="w-full sm:w-48 h-10 bg-slate-200 rounded-xl"></div>
            </div>
          </div>

          {/* Type Filter Skeleton */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
            <div className="w-20 h-9 bg-slate-200 rounded-full"></div>
            <div className="w-28 h-9 bg-slate-200 rounded-full"></div>
            <div className="w-28 h-9 bg-slate-200 rounded-full"></div>
          </div>

          {/* Status Tabs Skeleton */}
          <div className="flex overflow-x-auto gap-2 pb-3 mb-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="w-28 h-9 bg-slate-200 rounded-full shrink-0"></div>
            ))}
          </div>

          {/* Order Cards Skeleton */}
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 sm:p-5 flex justify-between items-start gap-4">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="w-16 h-6 bg-slate-200 rounded-md"></div>
                      <div className="w-20 h-6 bg-slate-200 rounded-md"></div>
                    </div>
                    <div className="w-32 h-4 bg-slate-200 rounded-md"></div>
                  </div>
                  <div className="w-24 h-7 bg-slate-200 rounded-md"></div>
                </div>
                <div className="px-4 sm:px-5 pb-4 space-y-3">
                  <div className="w-3/4 h-4 bg-slate-200 rounded-md"></div>
                  <div className="w-1/2 h-4 bg-slate-200 rounded-md"></div>
                </div>
              </div>
            ))}
          </div>
          
        </div>
      </div>
    );
  }

  if (status !== 'authenticated' || (session?.user as any)?.role !== 'shop') {
    return null; 
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-900 font-sans">
      <div className="max-w-5xl w-full mx-auto space-y-5 pt-8 px-4 sm:px-6">
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 sm:gap-4 shrink-0 w-full lg:w-auto">
            <Link href="/dashboard/shop/orders" className="shrink-0 flex items-center justify-center gap-2 p-2.5 sm:px-5 sm:py-2 bg-slate-900 text-white rounded-xl sm:rounded-full font-bold text-sm hover:bg-slate-800 transition-colors shadow-sm">
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">กลับ</span>
            </Link>
            <div className="hidden sm:block w-px h-10 bg-slate-200"></div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 truncate">ประวัติออเดอร์</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 hidden sm:block">ดูรายการออเดอร์ย้อนหลังทั้งหมด</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row w-full lg:w-auto items-center gap-3 min-w-0">
            
            <div className="flex w-full md:w-auto items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 overflow-x-auto hide-scrollbar">
              <button onClick={() => { setTimeFilter('all'); setCustomDate(''); }} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${timeFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'}`}>ทั้งหมด</button>
              <button onClick={() => { setTimeFilter('today'); setCustomDate(''); }} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${timeFilter === 'today' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'}`}>วันนี้</button>
              
              <div className="w-px h-6 bg-slate-200 mx-1 shrink-0"></div>
              <div className="flex items-center px-2 py-0.5 shrink-0">
                <Calendar className="text-slate-400 mr-2" size={16} />
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    if (e.target.value) setTimeFilter('custom');
                    else setTimeFilter('all');
                  }}
                  className="bg-transparent border-none text-slate-700 font-medium text-sm outline-none w-[110px]"
                />
              </div>
            </div>

            <button 
              onClick={() => mutate()} 
              className="hidden sm:flex items-center justify-center p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-colors shrink-0"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar mb-4">
          <button 
            onClick={() => setOrderTypeFilter('all')}
            className={`shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-all ${orderTypeFilter === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
          >ทั้งหมด</button>
          <button 
            onClick={() => setOrderTypeFilter('online')}
            className={`shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-all ${orderTypeFilter === 'online' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
          >🛵 สั่งออนไลน์</button>
          <button 
            onClick={() => setOrderTypeFilter('dine_in')}
            className={`shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-all ${orderTypeFilter === 'dine_in' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
          >🍽️ ทานที่ร้าน</button>
        </div>

        <div className="flex overflow-x-auto gap-2 pb-3 mb-4 -mx-4 px-4 sm:mx-0 sm:px-1 sm:pb-4 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          {[
            { id: 'all', label: 'ทั้งหมด', icon: <List size={16} className="sm:hidden" /> },
            { id: 'pending', label: 'รอรับออเดอร์', icon: <Clock size={16} className="sm:hidden" /> },
            { id: 'checking_slip', label: 'รอตรวจสลิป', icon: <Receipt size={16} className="sm:hidden" /> },
            { id: 'cooking', label: 'กำลังปรุง', icon: <CircleDashed size={16} className="sm:hidden" /> },
            { id: 'delivery', label: 'กำลังจัดส่ง', icon: <Truck size={16} className="sm:hidden" /> },
            { id: 'done', label: 'ส่งสำเร็จ', icon: <CheckCircle2 size={16} className="sm:hidden" /> },
            { id: 'cancel', label: 'ยกเลิก', icon: <XCircle size={16} className="sm:hidden" /> }
          ].map(tab => {
            const count = getTabCount(tab.id);
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                  isActive 
                    ? 'bg-slate-900 text-white shadow-md' 
                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {displayedOrders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-slate-300 mb-3 flex justify-center"><CircleDashed size={48} /></div>
            <p className="text-slate-500 font-medium">ไม่มีออเดอร์ในหมวดหมู่นี้</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {displayedOrders.map((order) => {
              const isCustomerExpanded = expandedCustomers[order.id];
              const isOverdue = false; // Note: Date logic changed, overdue calculation might need adjustment if required for history, but history is meant for viewing past orders so 'overdue' highlight might not be necessary, we'll keep it false to simplify.
              
              return (
                <div key={order.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${isOverdue ? 'border-orange-300 ring-2 ring-orange-100' : 'border-slate-100'}`}>
                  {isOverdue && (
                    <div className="bg-orange-500 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-1.5">
                      <AlertCircle size={14} /> ออเดอร์ตกค้างจากวันที่ {new Date(order.created_at).toLocaleDateString('th-TH')}
                    </div>
                  )}
                  
                  <div className="p-4 sm:p-5 flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-black tracking-tight text-slate-900">#{order.id}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="text-xs font-medium text-slate-400 flex items-center gap-2">
                        {new Date(order.created_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        {order.payment_method === 'qr' ? 'โอนเงิน (QR)' : 'เงินสด'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black tracking-tight text-slate-900">฿{order.total_price.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="px-4 sm:px-5 pb-4">
                    <div className="space-y-2.5">
                      {order.items.map((item, idx) => {
                        const isDone = ['done', 'cancel', 'delivery'].includes(order.status);
                        return (
                          <div key={idx} className="flex justify-between items-start text-sm">
                            <div className="flex items-start gap-3">
                              <span className={`font-semibold mt-0.5 ${isDone ? 'text-emerald-500' : 'text-slate-400'}`}>
                                {isDone ? <CheckCircle2 size={16} /> : <CircleDashed size={16} />}
                              </span>
                              <span className={`font-semibold ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                {item.menu_name}
                              </span>
                            </div>
                            <div className={`font-bold text-xs px-2 py-1 rounded ${isDone ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
                              {item.quantity} / {item.quantity}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="w-full sm:w-auto">
                      <button 
                        onClick={() => toggleCustomerInfo(order.id)}
                        className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                      >
                        {order.order_type === 'dine_in' ? `ทานที่ร้าน (โต๊ะ ${order.table_name})` : 'รายละเอียดลูกค้า'} {isCustomerExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      
                      {isCustomerExpanded && (
                        <div className="mt-3 space-y-1.5 text-sm">
                          {order.order_type === 'dine_in' ? (
                            <div className="flex items-center gap-2 text-indigo-600 font-bold bg-indigo-50 px-3 py-2 rounded-lg">
                               🍽️ ทานที่ร้าน (โต๊ะ {order.table_name})
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 text-slate-600"><User size={14} className="text-slate-400"/> <span className="font-medium">{order.customer_name || 'ลูกค้าทั่วไป'}</span></div>
                              <div className="flex items-center gap-2 text-slate-600"><Phone size={14} className="text-slate-400"/> <span className="font-medium">{order.phone || '-'}</span></div>
                              <div className="flex items-start gap-2 text-slate-600"><MapPin size={14} className="text-slate-400 mt-0.5 shrink-0"/> <span className="font-medium">{order.address || 'รับหน้าร้าน'}</span></div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    {order.slip_image && (
                      <div className="flex w-full sm:w-auto gap-2 flex-wrap justify-end mt-3 sm:mt-0">
                        <button onClick={() => setSlipPopupOrder(order)} className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 rounded-lg font-bold text-sm transition-colors">
                          <Receipt size={16} /> ดูสลิป
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🖼️ Popup ดูสลิป */}
      {slipPopupOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-[9999] px-4">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm text-center shadow-2xl">
            <h3 className="text-xl font-black mb-1">สลิปการโอนเงิน</h3>
            <p className="text-slate-500 mb-5 font-medium">Order #{slipPopupOrder.id} • <strong className="text-slate-900">฿{slipPopupOrder.total_price.toLocaleString()}</strong></p>
            {slipPopupOrder.slip_image ? (
              <img src={slipPopupOrder.slip_image} alt="Slip" className="w-full max-h-80 object-contain rounded-xl mb-6 bg-slate-50" />
            ) : (
              <div className="py-10 bg-slate-50 text-slate-400 rounded-xl mb-6 font-bold">ไม่พบรูปสลิป</div>
            )}
            <button onClick={() => setSlipPopupOrder(null)} className="w-full py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold transition-colors">ปิด</button>
          </div>
        </div>
      )}

    </div>
  );
}