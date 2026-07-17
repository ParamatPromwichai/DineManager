'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Clock, CheckCircle2, ChefHat, XCircle, RefreshCw, Receipt } from 'lucide-react';

type OrderItem = {
  menu_name: string;
  price: string;
  quantity: number;
};

type Order = {
  id: number;
  total_price: string;
  status: 'pending' | 'cooking' | 'done' | 'cancel';
  created_at: string;
  items: OrderItem[];
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending': return <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-xs font-bold border border-amber-200"><Clock size={14}/> รอยืนยัน</span>;
    case 'cooking': return <span className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-xs font-bold border border-blue-200"><ChefHat size={14}/> กำลังทำ</span>;
    case 'done': return <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-200"><CheckCircle2 size={14}/> เสิร์ฟแล้ว</span>;
    case 'cancel': return <span className="flex items-center gap-1 bg-rose-100 text-rose-700 px-3 py-1.5 rounded-full text-xs font-bold border border-rose-200"><XCircle size={14}/> ยกเลิก</span>;
    default: return null;
  }
};

export default function DineInOrdersPage(props: { params: Promise<{ table_id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionToken = searchParams.get('session');

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = () => {
    if (!sessionToken) return;
    setLoading(true);
    fetch(`/api/dine-in/tables/${params.table_id}/orders?session=${sessionToken}`)
      .then(res => res.json())
      .then(data => {
        setOrders(data || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // Auto refresh every 10s
    return () => clearInterval(interval);
  }, [params.table_id, sessionToken]);

  if (loading && orders.length === 0) {
    return <div className="flex justify-center items-center min-h-screen bg-slate-50"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-20 font-sans">
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={() => router.push(`/dine-in/${params.table_id}?session=${sessionToken}`)} 
          className="bg-white p-2.5 rounded-full shadow-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black text-slate-800 flex items-center gap-2 m-0 flex-1">
          <Receipt size={24} className="text-indigo-600" />
          ประวัติการสั่งอาหาร
        </h1>
        <button onClick={fetchOrders} className="bg-indigo-50 text-indigo-600 p-2.5 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-colors">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
          <Receipt size={48} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-lg font-bold text-slate-600">ยังไม่มีรายการอาหาร</h2>
          <p className="text-sm text-slate-400 mt-2">รายการอาหารที่คุณสั่งจะแสดงที่นี่</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <div className="text-xs font-bold text-slate-400 mb-1">
                    {new Date(order.created_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                  <div className="font-black text-indigo-900">
                    ออเดอร์ #{order.id}
                  </div>
                </div>
                {getStatusBadge(order.status)}
              </div>
              
              <div className="p-4 bg-white">
                <div className="space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-sm">
                      <div className="flex gap-3">
                        <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg h-fit">{item.quantity}x</span>
                        <div>
                          <p className="font-bold text-slate-700">{item.menu_name.split('[')[0].trim()}</p>
                          {item.menu_name.includes('[') && (
                            <p className="text-xs text-slate-500 mt-0.5">[{item.menu_name.split('[')[1]}</p>
                          )}
                        </div>
                      </div>
                      <div className="font-bold text-slate-800">
                        {Number(item.price).toLocaleString()} ฿
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-500">ยอดรวม</span>
                <span className="text-lg font-black text-indigo-700">{Number(order.total_price).toLocaleString()} ฿</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
