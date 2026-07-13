'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react'; 
import useSWR from 'swr';
import { Search, Calendar, User, Phone, MapPin, ChevronDown, ChevronUp, CheckCircle2, CircleDashed, CookingPot, Truck, Check, RefreshCw, AlertCircle, List, Clock, Receipt, XCircle, History, BellRing } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const playPingSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3); // Drop to A4
    
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime); // Make it slightly quieter
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.3);
  } catch (e) {
    console.error("Audio API not supported", e);
  }
};

type ActiveBatch = {
  id: string;
  menuName: string;
  amount: number;
};

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
  const router = useRouter(); 
  
  // 🚨 2. เรียกใช้งาน Session
  const { data: session, status } = useSession();

  const isShop = status === 'authenticated' && (session?.user as any)?.role === 'shop';
  const { data: fetchedOrders, error, mutate } = useSWR<Order[]>(
    isShop ? '/api/shop/orders' : null,
    fetcher,
    { refreshInterval: 3000 }
  );
  const orders = fetchedOrders || [];
  const [slipPopupOrder, setSlipPopupOrder] = useState<Order | null>(null);
  const [cookedItems, setCookedItems] = useState<Record<number, Record<string, number>>>({});
  const [doneInputs, setDoneInputs] = useState<Record<string, number>>({});
  const [activeBatches, setActiveBatches] = useState<ActiveBatch[]>([]);
  const [readyPopupOrder, setReadyPopupOrder] = useState<Order | null>(null);
  const promptedOrders = useRef<Set<number>>(new Set()); 
  const seenPendingOrders = useRef<Set<number>>(new Set()); 

  const todayDate = new Date().toLocaleDateString('en-CA'); 
  const [expandedCustomers, setExpandedCustomers] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>('all');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 🔔 แจ้งเตือนเสียงเมื่อมีออเดอร์ pending เข้ามาใหม่
  useEffect(() => {
    if (!orders || orders.length === 0) return;
    
    let hasNewPending = false;
    
    orders.forEach(order => {
      if (order.status === 'pending') {
        if (!seenPendingOrders.current.has(order.id)) {
          hasNewPending = true;
          seenPendingOrders.current.add(order.id);
        }
      }
    });

    if (hasNewPending) {
      playPingSound();
    }
  }, [orders]);

  // 📥 2.5 โหลดสถานะเตาและของที่ทำเสร็จแล้วจาก localStorage เพื่อกันรีเฟรชแล้วหาย
  useEffect(() => {
    try {
      const savedCooked = localStorage.getItem('smart_kitchen_cooked');
      const savedBatches = localStorage.getItem('smart_kitchen_batches');
      if (savedCooked) setCookedItems(JSON.parse(savedCooked));
      if (savedBatches) setActiveBatches(JSON.parse(savedBatches));
    } catch (error) {
      console.error("Failed to parse kitchen state from localStorage");
    }
  }, []);

  // 💾 2.6 บันทึกสถานะลง localStorage เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    localStorage.setItem('smart_kitchen_cooked', JSON.stringify(cookedItems));
  }, [cookedItems]);

  useEffect(() => {
    localStorage.setItem('smart_kitchen_batches', JSON.stringify(activeBatches));
  }, [activeBatches]);

  // 🛡️ 3. ตรวจสอบสิทธิ์ผ่าน NextAuth
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login/shop');
    } else if (status === 'authenticated') {
      if ((session.user as any)?.role !== 'shop') {
        router.replace('/login/shop?error=wrong_role');
      }
    }
  }, [status, session, router]);

  const updateStatus = async (orderId: number, newStatus: string) => {
    // ⚡ Optimistic Update: อัปเดต UI ทันทีไม่ต้องรอเซิร์ฟเวอร์
    const optimisticData = orders.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o);
    mutate(optimisticData, false);

    await fetch('/api/shop/orders', {
      method: 'PUT',
      body: JSON.stringify({ id: orderId, status: newStatus }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    // โหลดข้อมูลล่าสุดมาทับอีกรอบ
    mutate(); 
  };

  // 🕰️ กรองออเดอร์ และจัดเรียงลำดับใหม่
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.created_at).toLocaleDateString('en-CA');
      const isTodayDate = orderDate === todayDate;
      const isUnfinished = order.status !== 'done' && order.status !== 'cancel';
      return isTodayDate || isUnfinished;
    }).sort((a, b) => {
      const getStatusWeight = (status: string) => {
        if (['pending', 'checking_slip', 'cooking'].includes(status)) return 0;
        if (status === 'delivery') return 1;
        return 2; // done, cancel
      };

      const weightA = getStatusWeight(a.status);
      const weightB = getStatusWeight(b.status);

      if (weightA !== weightB) {
        return weightA - weightB;
      }
      
      return a.id - b.id;
    });
  }, [orders, todayDate]);

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

  const handleAmountChange = (menuName: string, delta: number, max: number) => {
    setDoneInputs(prev => {
      const current = prev[menuName] !== undefined ? prev[menuName] : max;
      let next = current + delta;
      if (next < 1) next = 1;      
      if (next > max) next = max;  
      return { ...prev, [menuName]: next };
    });
  };

  const handleStartCooking = (menuName: string, amount: number) => {
    setActiveBatches(prev => [...prev, { id: Date.now().toString() + Math.random(), menuName, amount }]);
    setDoneInputs(prev => {
      const next = { ...prev };
      delete next[menuName];
      return next;
    });
  };

  const handleFinishCooking = (batchId: string, menuName: string, amount: number) => {
    setActiveBatches(prev => prev.filter(b => b.id !== batchId));
    
    setCookedItems(prev => {
      const next = { ...prev };
      let remaining = amount;
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
  };

  useEffect(() => {
    if (readyPopupOrder) return; 
    const cookingOrders = filteredOrders.filter(o => o.status === 'cooking');
    for (const order of cookingOrders) {
      const isComplete = order.items.length > 0 && order.items.every(item => {
        return Number(cookedItems[order.id]?.[item.menu_name] || 0) >= Number(item.quantity);
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
    
    const cookingSums: Record<string, number> = {};
    activeBatches.forEach(b => {
      cookingSums[b.menuName] = (cookingSums[b.menuName] || 0) + Number(b.amount || 0);
    });

    const itemMap: Record<string, { total: number, orderBreakdown: Record<number, number>, minRemainingMinutes: number }> = {};

    cookingOrders.forEach(order => {
      const elapsedMinutes = Math.floor((currentTime.getTime() - new Date(order.created_at).getTime()) / 60000);
      const totalQuantity = order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      const baseCookingTime = 5 * totalQuantity;
      const queueCount = filteredOrders.filter(o => o.id < order.id && ['pending', 'cooking', 'checking_slip'].includes(o.status)).length;
      const estimatedTotalMinutes = baseCookingTime + queueCount;
      
      // เงื่อนไข: ถ้าสั่ง 1-3 เมนู ไม่ต้องเอาเวลามาจัดลำดับ (Infinity) แต่ถ้า >3 ค่อยจัดลำดับตามเวลา
      const remainingMinutes = totalQuantity <= 3 ? Infinity : (estimatedTotalMinutes - elapsedMinutes);

      order.items.forEach(item => {
        const menuName = item.menu_name;
        const cooked = Number(cookedItems[order.id]?.[menuName] || 0);
        let remainingForOrder = Math.max(0, Number(item.quantity) - cooked);
        
        if (remainingForOrder > 0) {
          const currentlyCookingForThisMenu = Number(cookingSums[menuName] || 0);
          if (currentlyCookingForThisMenu > 0) {
            const consumedByCooking = Math.min(remainingForOrder, currentlyCookingForThisMenu);
            remainingForOrder -= consumedByCooking;
            cookingSums[menuName] -= consumedByCooking;
          }
        }

        if (remainingForOrder > 0) {
          if (!itemMap[menuName]) itemMap[menuName] = { total: 0, orderBreakdown: {}, minRemainingMinutes: Infinity };
          itemMap[menuName].total += remainingForOrder;
          itemMap[menuName].orderBreakdown[order.id] = (itemMap[menuName].orderBreakdown[order.id] || 0) + remainingForOrder;
          if (remainingMinutes < itemMap[menuName].minRemainingMinutes) {
            itemMap[menuName].minRemainingMinutes = remainingMinutes;
          }
        }
      });
    });

    return Object.entries(itemMap)
      .sort(([, aData], [, bData]) => {
        if (aData.minRemainingMinutes !== bData.minRemainingMinutes) {
          return aData.minRemainingMinutes - bData.minRemainingMinutes;
        }
        return bData.total - aData.total; // ถ้าเวลาเท่ากัน หรือเป็น Infinity ทั้งคู่ ให้เรียงตามจำนวนรวมมากไปน้อย
      })
      .map(([menuName, data]) => ({
      menuName,
      total: data.total,
      orderIds: Object.entries(data.orderBreakdown)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([id, qty]) => `#${id}: ${qty}`)
        .join(', ')
    }));
  }, [filteredOrders, cookedItems, activeBatches, currentTime]);

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
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-slate-400 tracking-wider">กำลังตรวจสอบสิทธิ์...</span>
        </div>
      </div>
    );
  }

  // ป้องกันหน้ากระพริบกรณีที่เตะ User ออก
  if (status !== 'authenticated' || (session?.user as any)?.role !== 'shop') {
    return null; 
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
            <Link 
              href="/dashboard/shop/orders/history" 
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-slate-800 transition-all"
            >
              <History size={16} /> ประวัติออเดอร์
            </Link>
            <button onClick={() => mutate()} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors shadow-sm">
              <RefreshCw size={18} className="text-slate-600" />
            </button>
          </div>
        </div>

        {/* 👨‍🍳 Smart Kitchen */}
        {(batchSuggestions.length > 0 || activeBatches.length > 0) && (
          <div className="bg-white border border-slate-200 rounded-2xl mb-8 shadow-sm overflow-hidden">
            <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CookingPot size={18} className="text-slate-700" />
                <h3 className="text-slate-800 font-bold text-sm">คิวหน้าเตา (Smart Kitchen)</h3>
              </div>
            </div>
            
            <div className="p-5 grid gap-3">
              {/* === รายการที่กำลังทำอยู่ (Active Batches) === */}
              {activeBatches.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">กำลังทำบนเตา</h4>
                  <div className="space-y-2">
                    {activeBatches.map((batch) => (
                      <div key={batch.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                        <div>
                          <div className="font-bold text-blue-900 text-base">
                            {batch.menuName} <span className="text-blue-600 text-sm font-bold ml-1 bg-blue-100 px-2 py-0.5 rounded-md">x {batch.amount}</span>
                          </div>
                          <div className="w-full mt-2 relative h-1.5 bg-blue-100 rounded-full overflow-hidden">
                            <motion.div 
                              className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
                              initial={{ width: "0%" }}
                              animate={{ width: "100%" }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            />
                          </div>
                          <div className="text-xs text-blue-600 mt-1 font-semibold flex items-center gap-1">
                             กำลังปรุงบนเตา...
                          </div>
                        </div>
                        <button 
                          onClick={() => handleFinishCooking(batch.id, batch.menuName, batch.amount)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm"
                        >
                          เสร็จแล้ว
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* === รายการที่รอทำ (Pending Suggestions) === */}
              {batchSuggestions.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">รอคิวทำ</h4>
                  <div className="space-y-3">
                    {batchSuggestions.map((sug, idx) => {
                      const currentInput = doneInputs[sug.menuName] !== undefined ? Math.min(doneInputs[sug.menuName], sug.total) : sug.total;
                      return (
                        <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-3 border border-slate-100 rounded-xl">
                          <div>
                            <div className="font-bold text-slate-800">
                              {sug.menuName} <span className="text-slate-500 text-sm font-medium ml-1">x {sug.total}</span>
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">Order #{sug.orderIds}</div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                              <button onClick={() => handleAmountChange(sug.menuName, -1, sug.total)} className="px-4 py-2 hover:bg-slate-200 font-black text-slate-600 text-lg transition-colors">-</button>
                              <div className="px-3 font-black text-slate-900 min-w-[36px] text-center text-base bg-white py-2 border-x border-slate-100">{currentInput}</div>
                              <button onClick={() => handleAmountChange(sug.menuName, 1, sug.total)} className="px-4 py-2 hover:bg-slate-200 font-black text-slate-600 text-lg transition-colors">+</button>
                            </div>
                            <button 
                              onClick={() => handleStartCooking(sug.menuName, currentInput)}
                              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors"
                            >
                              กำลังทำ
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- ส่วนรายการออเดอร์ --- */}
        <div className="flex overflow-x-auto gap-2 pb-3 mb-4 -mx-4 px-4 sm:mx-0 sm:px-1 sm:pb-4 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          {[
            { id: 'all', label: 'ทั้งหมด', icon: <List size={16} className="sm:hidden" /> },
            { id: 'pending', label: 'รอรับออเดอร์', icon: <Clock size={16} className="sm:hidden" /> },
            { id: 'checking_slip', label: 'รอตรวจสลิป', icon: <Receipt size={16} className="sm:hidden" /> },
            { id: 'cooking', label: 'กำลังปรุง', icon: <CookingPot size={16} className="sm:hidden" /> },
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
              const orderDateStr = new Date(order.created_at).toLocaleDateString('en-CA');
              const isOverdue = orderDateStr !== todayDate && order.status !== 'done' && order.status !== 'cancel';
              
              const isPendingCooking = ['pending', 'checking_slip', 'cooking'].includes(order.status);
              
              // คำนวณเวลาที่ใช้ไปและเวลาที่เหลือ
              const elapsedMinutes = Math.floor((new Date().getTime() - new Date(order.created_at).getTime()) / 60000);
              
              // คำนวณเวลาประเมิน (เหมือนฝั่งลูกค้า: เมนูละ 5 นาที + คิวละ 1 นาที)
              const totalQuantity = order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
              const baseCookingTime = 5 * totalQuantity;
              const queueCount = filteredOrders.filter(o => o.id < order.id && ['pending', 'cooking', 'checking_slip'].includes(o.status)).length;
              const estimatedTotalMinutes = baseCookingTime + queueCount;
              
              const remainingMinutes = estimatedTotalMinutes - elapsedMinutes;
              const isDelayed = remainingMinutes < 0 && isPendingCooking;
              
              const isFinishedState = order.status === 'done' || order.status === 'cancel' || order.status === 'delivery';
              const isNewPending = order.status === 'pending';
              
              return (
                <div key={order.id} className={`bg-white rounded-2xl border transition-all duration-300 ${isDelayed ? 'border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)] ring-1 ring-red-400' : isNewPending ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)] ring-1 ring-amber-400' : isOverdue ? 'border-rose-200 shadow-sm' : 'border-slate-200 shadow-sm hover:shadow-md'} ${isFinishedState ? 'opacity-60 hover:opacity-100' : ''}`}>
                  
                  {isDelayed && (
                    <div className="bg-red-500 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-1.5 animate-pulse rounded-t-2xl">
                      <AlertCircle size={14} /> ออเดอร์นี้ล่าช้า (เกินเวลาที่ประเมินไว้ {Math.abs(remainingMinutes)} นาที)
                    </div>
                  )}
                  {isNewPending && !isDelayed && (
                    <div className="bg-amber-500 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-1.5 animate-pulse rounded-t-2xl">
                      <BellRing size={14} /> ออเดอร์เข้าใหม่! กรุณากดรับออเดอร์
                    </div>
                  )}

                  {/* หัวการ์ด */}
                  <div className="p-5 border-b border-slate-100 flex flex-wrap justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                        <span className={`text-lg font-black ${isFinishedState ? 'text-slate-600' : 'text-slate-900'}`}>#{order.id}</span>
                        {getStatusBadge(order.status)}
                        
                        {isPendingCooking && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm whitespace-nowrap border ${isDelayed ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                            {isDelayed ? `เลยเวลา ${Math.abs(remainingMinutes)} นาที` : `เหลือ ${remainingMinutes} นาที`}
                          </span>
                        )}

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
      <AnimatePresence>
      {readyPopupOrder && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-[9999] px-4"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="bg-white p-8 rounded-3xl w-full max-w-sm text-center shadow-2xl"
          >
            <div className="text-6xl mb-4 animate-bounce">🛎️</div>
            <h3 className="text-2xl text-slate-900 font-black mb-2">ออเดอร์ #{readyPopupOrder.id}</h3>
            <p className="text-slate-500 font-medium mb-6">อาหารเสร็จครบแล้ว เตรียมส่งมอบได้เลย</p>
            <button onClick={() => { updateStatus(readyPopupOrder.id, 'delivery'); setReadyPopupOrder(null); }} className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-colors mb-2">ตกลง (ส่งให้ไรเดอร์)</button>
            <button onClick={() => setReadyPopupOrder(null)} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors">ปิดหน้าต่าง</button>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* 🖼️ Popup ตรวจสอบสลิป */}
      <AnimatePresence>
      {slipPopupOrder && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-[9999] px-4"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="bg-white p-6 rounded-3xl w-full max-w-sm text-center shadow-2xl"
          >
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
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}