'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation'; // 👈 1. นำเข้า useRouter
import { Search, Calendar, User, Phone, MapPin, ChevronDown, ChevronUp, CheckCircle2, CircleDashed, CookingPot, Truck, Check, RefreshCw, AlertCircle } from 'lucide-react';

type OrderItem = {
  menu_name: string;
  quantity: number;
};

type Order = {
  id: number;
  status: 'pending' | 'checking_slip' | 'cooking' | 'delivery' | 'done' | 'cancel';
  total_price: number;
  created_at: string;
  payment_method?: string;
  slip_image?: string | null;
  customer_name?: string;
  phone?: string;
  address?: string;
  items: OrderItem[];
};

export default function ManageOrdersPage() {
  const router = useRouter(); // 👈 2. เรียกใช้งาน router
  const [isAuthorized, setIsAuthorized] = useState(false); // 🚨 State ตรวจสอบสิทธิ์

  const [orders, setOrders] = useState<Order[]>([]);
  const [slipPopupOrder, setSlipPopupOrder] = useState<Order | null>(null);
  const [cookedItems, setCookedItems] = useState<Record<number, Record<string, number>>>({});
  const [doneInputs, setDoneInputs] = useState<Record<string, number>>({});
  const [readyPopupOrder, setReadyPopupOrder] = useState<Order | null>(null);
  const promptedOrders = useRef<Set<number>>(new Set()); 

  const todayDate = new Date().toLocaleDateString('en-CA'); 
  const [selectedDate, setSelectedDate] = useState<string>(todayDate);
  const [expandedCustomers, setExpandedCustomers] = useState<Record<number, boolean>>({});

  // 🛡️ 3. ตรวจสอบสิทธิ์ก่อนเป็นอันดับแรก
  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      router.replace('/login'); // ไม่มีสิทธิ์ เตะกลับ
    } else {
      setIsAuthorized(true); // มีสิทธิ์
    }
  }, [router]);

  const fetchOrders = async () => {
    try {
        const res = await fetch('/api/shop/orders');
        const data = await res.json();
        setOrders(data);
    } catch (error) {
        console.error("Error fetching orders");
    }
  };

  // 🚨 4. ให้เริ่มดึงข้อมูลออเดอร์ "หลังจาก" ผ่านการเช็คสิทธิ์แล้วเท่านั้น
  useEffect(() => {
    if (!isAuthorized) return; 

    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [isAuthorized]);

  const updateStatus = async (orderId: number, newStatus: string) => {
    await fetch('/api/shop/orders', {
      method: 'PUT',
      body: JSON.stringify({ id: orderId, status: newStatus }),
      headers: { 'Content-Type': 'application/json' }
    });
    fetchOrders(); 
  };

  // 🕰️ กรองออเดอร์ และจัดเรียงลำดับใหม่
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.created_at).toLocaleDateString('en-CA');
      const isSelectedDate = !selectedDate || orderDate === selectedDate;
      const isUnfinished = order.status !== 'done' && order.status !== 'cancel';
      return isSelectedDate || isUnfinished;
    }).sort((a, b) => {
      // 🚨 เช็คว่าออเดอร์ไหนเสร็จสิ้นกระบวนการแล้ว (ส่งสำเร็จ หรือ ยกเลิก)
      const aIsFinished = a.status === 'done' || a.status === 'cancel';
      const bIsFinished = b.status === 'done' || b.status === 'cancel';

      // ถ้า a เสร็จแล้ว แต่ b ยังไม่เสร็จ -> ดัน a ลงไปข้างล่าง
      if (aIsFinished && !bIsFinished) return 1;
      // ถ้า b เสร็จแล้ว แต่ a ยังไม่เสร็จ -> ดัน b ลงไปข้างล่าง
      if (!aIsFinished && bIsFinished) return -1;
      
      // ถ้าสถานะเป็นกลุ่มเดียวกัน (เสร็จเหมือนกัน หรือ ยังไม่เสร็จเหมือนกัน) ให้เรียงตามคิว (ID เก่ามาก่อน)
      return a.id - b.id;
    });
  }, [orders, selectedDate]);

  const toggleCustomerInfo = (orderId: number) => {
    setExpandedCustomers(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const handleAmountChange = (menuName: string, delta: number, max: number) => {
    setDoneInputs(prev => {
      const current = prev[menuName] || 1;
      let next = current + delta;
      if (next < 1) next = 1;      
      if (next > max) next = max;  
      return { ...prev, [menuName]: next };
    });
  };

  const handleBatchDone = (menuName: string, batchAmount: number) => {
    setCookedItems(prev => {
      const next = { ...prev };
      let remaining = batchAmount;
      const cookingOrders = [...filteredOrders].filter(o => o.status === 'cooking').sort((a, b) => a.id - b.id);

      for (const order of cookingOrders) {
        if (remaining <= 0) break; 
        const orderItem = order.items.find(i => i.menu_name === menuName);
        if (!orderItem) continue;

        if (!next[order.id]) next[order.id] = {};
        const alreadyCooked = next[order.id][menuName] || 0;
        const need = orderItem.quantity - alreadyCooked;

        if (need > 0) {
          const fill = Math.min(need, remaining);
          next[order.id][menuName] = alreadyCooked + fill;
          remaining -= fill;
        }
      }
      return next;
    });
    setDoneInputs(prev => ({ ...prev, [menuName]: 1 }));
  };

  useEffect(() => {
    if (readyPopupOrder) return; 
    const cookingOrders = filteredOrders.filter(o => o.status === 'cooking');
    for (const order of cookingOrders) {
      const isComplete = order.items.length > 0 && order.items.every(item => {
        return (cookedItems[order.id]?.[item.menu_name] || 0) >= item.quantity;
      });

      if (isComplete && !promptedOrders.current.has(order.id)) {
        promptedOrders.current.add(order.id); 
        setReadyPopupOrder(order); 
        break; 
      }
    }
  }, [cookedItems, filteredOrders, readyPopupOrder]);

  const batchSuggestions = useMemo(() => {
    const cookingOrders = filteredOrders.filter(o => o.status === 'cooking');
    const itemMap: Record<string, { total: number, orderIds: Set<number> }> = {};

    cookingOrders.forEach(order => {
      order.items.forEach(item => {
        const cooked = cookedItems[order.id]?.[item.menu_name] || 0;
        const pending = item.quantity - cooked;
        if (pending > 0) {
          if (!itemMap[item.menu_name]) itemMap[item.menu_name] = { total: 0, orderIds: new Set() };
          itemMap[item.menu_name].total += pending;
          itemMap[item.menu_name].orderIds.add(order.id);
        }
      });
    });

    return Object.entries(itemMap).map(([menuName, data]) => ({
      menuName,
      total: data.total,
      orderIds: Array.from(data.orderIds).sort((a,b)=>a-b).join(', ')
    }));
  }, [filteredOrders, cookedItems]);

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

  // ⏳ 5. โชว์หน้าโหลดดิ้งระหว่างรอเช็คสิทธิ์ (อยู่หลัง Hooks ทั้งหมด)
  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-slate-400 tracking-wider">กำลังตรวจสอบสิทธิ์...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-900 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
        
        {/* 🌟 Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">รายการออเดอร์</h1>
            <p className="text-sm text-slate-500 mt-1">จัดการออเดอร์และคิวทำอาหารแบบเรียลไทม์</p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-slate-900 outline-none shadow-sm cursor-pointer"
              />
            </div>
            <button onClick={fetchOrders} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors shadow-sm">
              <RefreshCw size={18} className="text-slate-600" />
            </button>
          </div>
        </div>

        {/* 👨‍🍳 Smart Kitchen */}
        {batchSuggestions.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl mb-8 shadow-sm overflow-hidden">
            <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <CookingPot size={18} className="text-slate-700" />
              <h3 className="text-slate-800 font-bold text-sm">คิวหน้าเตา (Smart Kitchen)</h3>
            </div>
            
            <div className="p-5 grid gap-3">
              {batchSuggestions.map((sug, idx) => {
                const currentInput = Math.min(doneInputs[sug.menuName] || 1, sug.total);
                return (
                  <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                    <div>
                      <div className="font-bold text-slate-800">
                        {sug.menuName} <span className="text-slate-500 text-sm font-medium ml-1">x {sug.total}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">Order #{sug.orderIds}</div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                        <button onClick={() => handleAmountChange(sug.menuName, -1, sug.total)} className="px-3 py-1.5 hover:bg-slate-200 font-bold text-slate-600">-</button>
                        <div className="px-2 font-bold text-slate-900 min-w-[30px] text-center text-sm">{currentInput}</div>
                        <button onClick={() => handleAmountChange(sug.menuName, 1, sug.total)} className="px-3 py-1.5 hover:bg-slate-200 font-bold text-slate-600">+</button>
                      </div>
                      <button 
                        onClick={() => handleBatchDone(sug.menuName, currentInput)}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors"
                      >
                        เสร็จแล้ว
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- ส่วนรายการออเดอร์ --- */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-slate-300 mb-3 flex justify-center"><CircleDashed size={48} /></div>
            <p className="text-slate-500 font-medium">ไม่มีออเดอร์ในวันที่เลือก</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredOrders.map((order) => {
              const isCustomerExpanded = expandedCustomers[order.id];
              const orderDateStr = new Date(order.created_at).toLocaleDateString('en-CA');
              const isOverdue = orderDateStr !== todayDate && order.status !== 'done' && order.status !== 'cancel';
              
              // ทำให้ออเดอร์ที่เสร็จแล้วสีจางลงนิดหน่อย เพื่อลดความเด่น
              const isFinishedState = order.status === 'done' || order.status === 'cancel';
              
              return (
                <div key={order.id} className={`bg-white rounded-2xl border transition-all ${isOverdue ? 'border-rose-200 shadow-sm' : 'border-slate-200 shadow-sm hover:shadow-md'} ${isFinishedState ? 'opacity-60 hover:opacity-100' : ''}`}>
                  
                  {/* หัวการ์ด */}
                  <div className="p-5 border-b border-slate-100 flex flex-wrap justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className={`text-lg font-black ${isFinishedState ? 'text-slate-600' : 'text-slate-900'}`}>#{order.id}</span>
                        {getStatusBadge(order.status)}
                        
                        {isOverdue && (
                          <span className="flex items-center gap-1 text-[10px] bg-rose-50 text-rose-600 px-2 py-1 rounded-md font-bold border border-rose-100">
                            <AlertCircle size={12} /> ค้างจากเมื่อวาน
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                        <span>{new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>•</span>
                        {order.payment_method === 'qr' ? <span className={isFinishedState ? 'text-slate-400' : 'text-indigo-500'}>โอนเงิน</span> : <span className="text-slate-500">เงินสด</span>}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-lg font-black ${isFinishedState ? 'text-slate-600' : 'text-slate-900'}`}>฿{order.total_price.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* 📝 รายการอาหาร */}
                  <div className="p-5 pt-4">
                    <div className="space-y-3">
                      {order.items.map((item, idx) => {
                        const cooked = cookedItems[order.id]?.[item.menu_name] || 0;
                        const isDone = order.status === 'cooking' && cooked >= item.quantity;
                        const isPastCooking = ['delivery', 'done'].includes(order.status);
                        
                        return (
                          <div key={idx} className="flex justify-between items-start text-sm">
                            <div className="flex items-start gap-3">
                              <span className={`font-semibold mt-0.5 ${isDone || isPastCooking ? 'text-emerald-500' : 'text-slate-400'}`}>
                                {isDone || isPastCooking ? <CheckCircle2 size={16} /> : <CircleDashed size={16} />}
                              </span>
                              <span className={`font-semibold ${isDone || isPastCooking || isFinishedState ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                {item.menu_name}
                              </span>
                            </div>
                            <div className={`font-bold text-xs px-2 py-1 rounded ${isPastCooking || isDone ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
                              {isPastCooking ? item.quantity : cooked} / {item.quantity}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 👤 ข้อมูลลูกค้า & ปุ่ม Action */}
                  <div className="p-4 sm:p-5 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    
                    <div className="w-full sm:w-auto">
                      <button 
                        onClick={() => toggleCustomerInfo(order.id)}
                        className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                      >
                        รายละเอียดลูกค้า {isCustomerExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      
                      {isCustomerExpanded && (
                        <div className="mt-3 space-y-1.5 text-sm">
                          <div className="flex items-center gap-2 text-slate-600"><User size={14} className="text-slate-400"/> <span className="font-medium">{order.customer_name || 'ลูกค้าทั่วไป'}</span></div>
                          <div className="flex items-center gap-2 text-slate-600"><Phone size={14} className="text-slate-400"/> <span className="font-medium">{order.phone || '-'}</span></div>
                          <div className="flex items-start gap-2 text-slate-600"><MapPin size={14} className="text-slate-400 mt-0.5 shrink-0"/> <span className="font-medium">{order.address || 'รับหน้าร้าน'}</span></div>
                        </div>
                      )}
                    </div>

                    <div className="flex w-full sm:w-auto gap-2">
                      {order.status === 'pending' && (
                        <>
                          <button onClick={() => updateStatus(order.id, 'cancel')} className="px-4 py-2 text-rose-500 hover:bg-rose-50 rounded-lg font-bold text-sm transition-colors">ปฏิเสธ</button>
                          <button onClick={() => updateStatus(order.id, order.payment_method === 'qr' ? 'checking_slip' : 'cooking')} className="flex-1 sm:flex-none px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white shadow-sm rounded-lg font-bold text-sm transition-colors">รับออเดอร์</button>
                        </>
                      )}
                      {order.status === 'checking_slip' && (
                        <button onClick={() => setSlipPopupOrder(order)} className="flex-1 sm:flex-none px-6 py-2 bg-sky-50 text-sky-600 hover:bg-sky-100 border border-sky-200 rounded-lg font-bold text-sm transition-colors">ตรวจสอบสลิป</button>
                      )}
                      {order.status === 'cooking' && (
                        <button onClick={() => updateStatus(order.id, 'delivery')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white shadow-sm rounded-lg font-bold text-sm transition-colors">
                          <Truck size={16} /> ปรุงเสร็จ
                        </button>
                      )}
                      {order.status === 'delivery' && (
                        <button onClick={() => updateStatus(order.id, 'done')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm rounded-lg font-bold text-sm transition-colors">
                          <Check size={16} /> ส่งสำเร็จ
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🛎️ Popup ออเดอร์พร้อมส่ง */}
      {readyPopupOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-[9999] px-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm text-center shadow-2xl">
            <div className="text-6xl mb-4 animate-bounce">🛎️</div>
            <h3 className="text-2xl text-slate-900 font-black mb-2">ออเดอร์ #{readyPopupOrder.id}</h3>
            <p className="text-slate-500 font-medium mb-6">อาหารเสร็จครบแล้ว เตรียมส่งมอบได้เลย</p>
            <button onClick={() => { updateStatus(readyPopupOrder.id, 'delivery'); setReadyPopupOrder(null); }} className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-colors mb-2">ตกลง (ส่งให้ไรเดอร์)</button>
            <button onClick={() => setReadyPopupOrder(null)} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors">ปิดหน้าต่าง</button>
          </div>
        </div>
      )}

      {/* 🖼️ Popup ตรวจสอบสลิป */}
      {slipPopupOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-[9999] px-4">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm text-center shadow-2xl">
            <h3 className="text-xl font-black mb-1">ตรวจสอบสลิป</h3>
            <p className="text-slate-500 mb-5 font-medium">Order #{slipPopupOrder.id} • <strong className="text-slate-900">฿{slipPopupOrder.total_price.toLocaleString()}</strong></p>
            {slipPopupOrder.slip_image ? (
              <img src={slipPopupOrder.slip_image} alt="Slip" className="w-full max-h-80 object-contain rounded-xl mb-6 bg-slate-50" />
            ) : (
              <div className="py-10 bg-slate-50 text-slate-400 rounded-xl mb-6 font-bold">ไม่พบรูปสลิป</div>
            )}
            <div className="flex gap-2">
              <button onClick={() => { updateStatus(slipPopupOrder.id, 'cancel'); setSlipPopupOrder(null); }} className="flex-1 py-3 text-rose-500 hover:bg-rose-50 rounded-xl font-bold transition-colors">ไม่อนุมัติ</button>
              <button onClick={() => { updateStatus(slipPopupOrder.id, 'cooking'); setSlipPopupOrder(null); }} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-md hover:bg-slate-800 transition-colors">อนุมัติ (เริ่มปรุง)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}