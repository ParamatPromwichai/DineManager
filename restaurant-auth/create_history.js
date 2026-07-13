const fs = require('fs');
const content = \'use client';

import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react'; 
import useSWR from 'swr';
import { Calendar, User, Phone, MapPin, ChevronDown, ChevronUp, CheckCircle2, CircleDashed, Truck, Check, RefreshCw, AlertCircle, List, Clock, Receipt, XCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const fetcher = (url) => fetch(url).then(res => res.json());

export default function OrderHistoryPage() {
  const { data: session, status } = useSession();
  const todayDate = new Date().toLocaleDateString('en-CA');
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [expandedCustomers, setExpandedCustomers] = useState({});
  const [activeTab, setActiveTab] = useState('all');

  const isShop = status === 'authenticated' && session?.user?.role === 'shop';
  const { data: fetchedOrders, error, mutate } = useSWR(
    isShop ? '/api/shop/orders/history' : null,
    fetcher,
    { refreshInterval: 10000 }
  );
  const orders = fetchedOrders || [];

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.created_at).toLocaleDateString('en-CA');
      return !selectedDate || orderDate === selectedDate;
    }).sort((a, b) => b.id - a.id);
  }, [orders, selectedDate]);

  const displayedOrders = useMemo(() => {
    if (activeTab === 'all') return filteredOrders;
    return filteredOrders.filter(o => o.status === activeTab);
  }, [filteredOrders, activeTab]);

  const getTabCount = (status) => {
    if (status === 'all') return filteredOrders.length;
    return filteredOrders.filter(o => o.status === status).length;
  };

  const toggleCustomerInfo = (orderId) => setExpandedCustomers(p => ({...p, [orderId]: !p[orderId]}));

  const getStatusBadge = (s) => {
    const styles = { pending: 'bg-orange-50 text-orange-600 border-orange-200', checking_slip: 'bg-sky-50 text-sky-600 border-sky-200', cooking: 'bg-blue-50 text-blue-600 border-blue-200', delivery: 'bg-purple-50 text-purple-600 border-purple-200', done: 'bg-emerald-50 text-emerald-600 border-emerald-200', cancel: 'bg-slate-50 text-slate-500 border-slate-200' };
    const labels = { pending: 'รอรับออเดอร์', checking_slip: 'รอตรวจสลิป', cooking: 'กำลังปรุง', delivery: 'กำลังจัดส่ง', done: 'ส่งสำเร็จ', cancel: 'ยกเลิก' };
    return <span className={ \px-2.5 py-1 rounded-md text-[11px] font-bold border \\ }>{labels[s] || s}</span>;
  };

  if (status === 'loading') return <div className=\min-h-screen bg-slate-50 flex items-center justify-center\><div className=\nimate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full\></div></div>;
  if (status !== 'authenticated' || session?.user?.role !== 'shop') return null;

  return (
    <div className=\min-h-screen bg-slate-50 pb-24 text-slate-900 font-sans\>
      <div className=\max-w-3xl mx-auto space-y-4 pt-8 px-4 sm:px-0\>
        <div className=\lex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100\>
          <div>
            <h1 className=\	ext-2xl font-bold text-slate-800\>ประวัติออเดอร์</h1>
            <p className=\	ext-sm text-slate-500 mt-1\>ดูรายการออเดอร์ย้อนหลังทั้งหมด</p>
          </div>
          <div className=\lex flex-col sm:flex-row w-full sm:w-auto items-center gap-3\>
            <Link href=\/dashboard/shop/orders\ className=\lex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors w-full sm:w-auto font-medium text-sm\>
              <ArrowLeft size={18} /> กลับหน้าปัจจุบัน
            </Link>
            <div className=\lex items-center w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2\>
              <Calendar className=\	ext-slate-400 mr-2\ size={18} />
              <input type=\date\ value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className=\g-transparent border-none text-slate-700 font-medium text-sm outline-none w-full\ />
            </div>
            <button onClick={() => mutate()} className=\hidden sm:flex p-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-colors\><RefreshCw size={18} /></button>
          </div>
        </div>

        <div className=\lex overflow-x-auto gap-2 pb-2 mb-4 -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]\>
          {[{ id: 'all', label: 'ทั้งหมด', icon: <List size={16} className=\sm:hidden\ /> }, { id: 'pending', label: 'รอรับออเดอร์', icon: <Clock size={16} className=\sm:hidden\ /> }, { id: 'checking_slip', label: 'รอตรวจสลิป', icon: <Receipt size={16} className=\sm:hidden\ /> }, { id: 'cooking', label: 'กำลังปรุง', icon: <CircleDashed size={16} className=\sm:hidden\ /> }, { id: 'delivery', label: 'กำลังจัดส่ง', icon: <Truck size={16} className=\sm:hidden\ /> }, { id: 'done', label: 'ส่งสำเร็จ', icon: <CheckCircle2 size={16} className=\sm:hidden\ /> }, { id: 'cancel', label: 'ยกเลิก', icon: <XCircle size={16} className=\sm:hidden\ /> }].map(tab => {
            const count = getTabCount(tab.id);
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={\lex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all \\}>
                {tab.icon} <span className=\hidden sm:inline\>{tab.label}</span> <span className={\px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold \\}>{count}</span>
              </button>
            );
          })}
        </div>

        {displayedOrders.length === 0 ? (
          <div className=\	ext-center py-20\>
            <div className=\	ext-slate-300 mb-3 flex justify-center\><CircleDashed size={48} /></div>
            <p className=\	ext-slate-500 font-medium\>ไม่มีออเดอร์ในหมวดหมู่นี้</p>
          </div>
        ) : (
          <div className=\grid gap-4\>
            {displayedOrders.map((order) => {
              const isCustomerExpanded = expandedCustomers[order.id];
              const orderDateStr = new Date(order.created_at).toLocaleDateString('en-CA');
              const isOverdue = orderDateStr !== todayDate && !['done', 'cancel'].includes(order.status);
              
              return (
                <div key={order.id} className={\g-white rounded-2xl shadow-sm border overflow-hidden \\}>
                  {isOverdue && <div className=\g-orange-500 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-1.5\><AlertCircle size={14} /> ออเดอร์ตกค้างจากวันที่ {new Date(order.created_at).toLocaleDateString('th-TH')}</div>}
                  
                  <div className=\p-4 sm:p-5 flex justify-between items-start gap-4\>
                    <div>
                      <div className=\lex items-center gap-2 mb-1\>
                        <span className=\	ext-lg font-black tracking-tight text-slate-900\>#{order.id}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className=\	ext-xs font-medium text-slate-400 flex items-center gap-2\>
                        {new Date(order.created_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                        <span className=\w-1 h-1 bg-slate-300 rounded-full\></span>
                        {order.payment_method === 'qr' ? 'โอนเงิน (QR)' : 'เงินสด'}
                      </div>
                    </div>
                    <div className=\	ext-right\><div className=\	ext-lg font-black tracking-tight text-slate-900\>฿{order.total_price.toLocaleString()}</div></div>
                  </div>

                  <div className=\px-4 sm:px-5 pb-4\>
                    <div className=\space-y-2.5\>
                      {order.items.map((item, idx) => {
                        const isDone = ['done', 'cancel', 'delivery'].includes(order.status);
                        return (
                          <div key={idx} className=\lex justify-between items-start text-sm\>
                            <div className=\lex items-start gap-3\>
                              <span className={\ont-semibold mt-0.5 \\}>
                                {isDone ? <CheckCircle2 size={16} /> : <CircleDashed size={16} />}
                              </span>
                              <span className={\ont-semibold \\}>{item.menu_name}</span>
                            </div>
                            <div className={\ont-bold text-xs px-2 py-1 rounded \\}>
                              {item.quantity} / {item.quantity}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className=\p-4 sm:p-5 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4\>
                    <div className=\w-full sm:w-auto\>
                      <button onClick={() => toggleCustomerInfo(order.id)} className=\	ext-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors\>
                        รายละเอียดลูกค้า {isCustomerExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {isCustomerExpanded && (
                        <div className=\mt-3 space-y-1.5 text-sm\>
                          <div className=\lex items-center gap-2 text-slate-600\><User size={14} className=\	ext-slate-400\/> <span className=\ont-medium\>{order.customer_name || 'ลูกค้าทั่วไป'}</span></div>
                          <div className=\lex items-center gap-2 text-slate-600\><Phone size={14} className=\	ext-slate-400\/> <span className=\ont-medium\>{order.phone || '-'}</span></div>
                          <div className=\lex items-start gap-2 text-slate-600\><MapPin size={14} className=\	ext-slate-400 mt-0.5 shrink-0\/> <span className=\ont-medium\>{order.address || 'รับหน้าร้าน'}</span></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}\;
fs.writeFileSync('app/dashboard/shop/orders/history/page.tsx', content);
