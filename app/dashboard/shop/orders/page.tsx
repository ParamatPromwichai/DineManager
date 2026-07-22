'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { Search, Calendar, User, Phone, MapPin, ChevronDown, ChevronUp, CheckCircle2, CircleDashed, CookingPot, Truck, Check, RefreshCw, AlertCircle, List, Clock, Receipt, XCircle, History, ImageOff, Camera, UploadCloud, X } from 'lucide-react';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then(res => res.json());

type ActiveBatch = {
  id: string;
  menuName: string;
  amount: number;
  status?: 'cooking' | 'done';
  orderIds?: number[];
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
  order_type?: string;
  table_id?: number;
  table_name?: string;
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

  const { data: homeData } = useSWR(isShop ? '/api/customer/home' : null, fetcher);
  const shopData = homeData?.shop;

  const { data: sysconfig } = useSWR('/api/sysconfig', fetcher);

  const orders = fetchedOrders || [];
  const [slipPopupOrder, setSlipPopupOrder] = useState<Order | null>(null);
  const [cookedItems, setCookedItems] = useState<Record<number, Record<string, number>>>({});
  const [doneInputs, setDoneInputs] = useState<Record<string, number>>({});
  const [activeBatches, setActiveBatches] = useState<ActiveBatch[]>([]);
  const [readyPopupOrder, setReadyPopupOrder] = useState<Order | null>(null);
  const promptedOrders = useRef<Set<number>>(new Set());

  const todayDate = new Date().toLocaleDateString('en-CA');
  const [expandedCustomers, setExpandedCustomers] = useState<Record<number, boolean>>({});
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>('all');
  const [mobileView, setMobileView] = useState<'online' | 'kitchen' | 'dine_in'>('online');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const [codPaymentOrder, setCodPaymentOrder] = useState<Order | null>(null);
  const [codPaymentMethod, setCodPaymentMethod] = useState<'qr' | 'cash' | ''>('');
  const [codSlipImage, setCodSlipImage] = useState<string | null>(null);

  const paymentBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (codPaymentMethod === 'qr' && paymentBottomRef.current) {
      setTimeout(() => {
        paymentBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [codPaymentMethod]);

  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบการอนุญาตใช้งานกล้อง');
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        setCodSlipImage(canvas.toDataURL('image/jpeg', 0.8));
        stopCamera();
      }
    }
  };

  const handleCodFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setCodSlipImage(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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

  const updateStatus = async (orderId: number, newStatus: string, slipImage?: string) => {
    // ⚡ Optimistic Update: อัปเดต UI ทันทีไม่ต้องรอเซิร์ฟเวอร์
    const optimisticData = orders.map(o => o.id === orderId ? { ...o, status: newStatus as any, ...(slipImage ? { slip_image: slipImage } : {}) } : o);
    mutate(optimisticData, false);

    await fetch('/api/shop/orders', {
      method: 'PUT',
      body: JSON.stringify({ id: orderId, status: newStatus, slip_image: slipImage }),
      headers: { 'Content-Type': 'application/json' }
    });

    // โหลดข้อมูลล่าสุดมาทับอีกรอบ
    mutate();
  };

  // 🕰️ กรองออเดอร์ และจัดเรียงลำดับใหม่
  const allActiveOrders = useMemo(() => {
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
      if (weightA !== weightB) return weightA - weightB;
      return a.id - b.id;
    });
  }, [orders, todayDate]);

  const displayedOnlineOrders = useMemo(() => {
    let list = allActiveOrders.filter(o => o.order_type === 'online' || !o.order_type);
    if (activeTab !== 'all') list = list.filter(o => o.status === activeTab);
    return list;
  }, [allActiveOrders, activeTab]);

  const displayedDineInOrders = useMemo(() => {
    let list = allActiveOrders.filter(o => o.order_type === 'dine_in');
    if (activeTab !== 'all') list = list.filter(o => o.status === activeTab);
    return list;
  }, [allActiveOrders, activeTab]);

  const getTabCount = (status: string) => {
    if (status === 'all') return allActiveOrders.length;
    return allActiveOrders.filter(o => o.status === status).length;
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

  const handleCancelBatch = (batchId: string, menuName: string, amount: number) => {
    if (window.confirm(`ต้องการยกเลิกการทำเมนู "${menuName}" จำนวน ${amount} ใช่หรือไม่?`)) {
      setActiveBatches(prev => prev.filter(b => b.id !== batchId));
    }
  };

  const handleFinishCooking = (batchId: string, menuName: string, amount: number) => {
    let fulfilledOrderIds: number[] = [];
    let remainingForCalc = amount;
    const cookingOrders = [...allActiveOrders].filter(o => o.status === 'cooking').sort((a, b) => a.id - b.id);

    for (const order of cookingOrders) {
      if (remainingForCalc <= 0) break;
      const orderItem = order.items.find(i => i.menu_name === menuName);
      if (!orderItem) continue;

      const alreadyCooked = cookedItems[order.id]?.[menuName] || 0;
      const need = orderItem.quantity - alreadyCooked;

      if (need > 0) {
        const fill = Math.min(need, remainingForCalc);
        remainingForCalc -= fill;
        fulfilledOrderIds.push(order.id);
      }
    }

    setCookedItems(prev => {
      const next = { ...prev };
      let remaining = amount;

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

    setActiveBatches(prev => prev.map(b => b.id === batchId ? { ...b, status: 'done', orderIds: fulfilledOrderIds } : b));
  };

  useEffect(() => {
    setActiveBatches(prev => {
      const next = prev.filter(batch => {
        if (batch.status !== 'done') return true;
        if (!batch.orderIds || batch.orderIds.length === 0) return false;
        const hasCookingOrder = batch.orderIds.some(id => {
          const order = allActiveOrders.find(o => o.id === id);
          return order && order.status === 'cooking';
        });
        return hasCookingOrder;
      });
      if (prev.length !== next.length) return next;
      return prev;
    });
  }, [allActiveOrders]);

  useEffect(() => {
    if (readyPopupOrder) return;
    const cookingOrders = allActiveOrders.filter(o => o.status === 'cooking');
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
  }, [cookedItems, allActiveOrders, readyPopupOrder]);

  // อาหารที่ทำเสร็จแล้ว รอเสิร์ฟ
  const readyToServeOrders = useMemo(() => {
    return allActiveOrders.filter(order => {
      if (order.status !== 'cooking') return false;
      const isComplete = order.items.length > 0 && order.items.every(item => {
        return Number(cookedItems[order.id]?.[item.menu_name] || 0) >= Number(item.quantity);
      });
      return isComplete;
    });
  }, [allActiveOrders, cookedItems]);

  const batchSuggestions = useMemo(() => {
    const cookingOrders = allActiveOrders.filter(o => o.status === 'cooking');

    const cookingSums: Record<string, number> = {};
    activeBatches.forEach(b => {
      if (b.status !== 'done') {
        cookingSums[b.menuName] = (cookingSums[b.menuName] || 0) + Number(b.amount || 0);
      }
    });

    const itemMap: Record<string, { total: number, orderBreakdown: Record<number, { qty: number, type: string, table?: string }>, minRemainingMinutes: number }> = {};

    cookingOrders.forEach(order => {
      const elapsedMinutes = Math.floor((currentTime.getTime() - new Date(order.created_at).getTime()) / 60000);
      const totalQuantity = order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      const baseCookingTime = (sysconfig?.base_cooking_time_per_item || 5) * totalQuantity;
      const queueCount = allActiveOrders.filter(o => o.id < order.id && ['pending', 'cooking', 'checking_slip'].includes(o.status)).length;
      const queueDelayPerOrder = sysconfig?.queue_delay_per_order || 1;
      const estimatedTotalMinutes = baseCookingTime + (queueCount * queueDelayPerOrder);

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

          if (!itemMap[menuName].orderBreakdown[order.id]) {
            itemMap[menuName].orderBreakdown[order.id] = { qty: 0, type: order.order_type || 'online', table: order.table_name };
          }
          itemMap[menuName].orderBreakdown[order.id].qty += remainingForOrder;

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
          .map(([id, info]) => {
            const suffix = info.type === 'dine_in' && info.table ? ` (โต๊ะ ${info.table})` : ` (ออนไลน์)`;
            return `#${id}${suffix}: ${info.qty}`;
          })
          .join(', ')
      }));
  }, [allActiveOrders, cookedItems, activeBatches, currentTime]);

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


  const renderOrderCard = (order: Order) => {
    const isCustomerExpanded = expandedCustomers[order.id];
    const isOrderExpanded = expandedOrders[order.id];
    const orderDateStr = new Date(order.created_at).toLocaleDateString('en-CA');
    const isOverdue = orderDateStr !== todayDate && order.status !== 'done' && order.status !== 'cancel';

    const isPendingCooking = ['pending', 'checking_slip', 'cooking'].includes(order.status);

    const elapsedMinutes = Math.floor((new Date().getTime() - new Date(order.created_at).getTime()) / 60000);

    const totalQuantity = order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const baseCookingTime = (sysconfig?.base_cooking_time_per_item || 5) * totalQuantity;
    const queueCount = allActiveOrders.filter(o => o.id < order.id && ['pending', 'cooking', 'checking_slip'].includes(o.status)).length;
    const queueDelayPerOrder = sysconfig?.queue_delay_per_order || 1;
    const estimatedTotalMinutes = baseCookingTime + (queueCount * queueDelayPerOrder);

    const remainingMinutes = estimatedTotalMinutes - elapsedMinutes;
    const isDelayed = remainingMinutes < 0 && isPendingCooking;

    const isFinishedState = order.status === 'done' || order.status === 'cancel' || order.status === 'delivery';

    return (
      <div key={order.id} className={`bg-white rounded-2xl border transition-all ${isDelayed ? 'border-red-300 ring-2 ring-red-100' : isOverdue ? 'border-rose-200 shadow-sm' : 'border-slate-200 shadow-sm hover:shadow-md'} ${isFinishedState ? 'opacity-60 hover:opacity-100' : ''}`}>

        {isDelayed && (
          <div className="bg-red-500 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-1.5 animate-pulse rounded-t-2xl">
            <AlertCircle size={14} /> ออเดอร์นี้ล่าช้า (เกินเวลา {Math.abs(remainingMinutes)} นาที)
          </div>
        )}

        <div 
          className="cursor-pointer group hover:bg-slate-50/50 transition-colors"
          onClick={() => setExpandedOrders(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
        >
          <div className={`px-4 flex flex-wrap justify-between items-start gap-3 ${isOrderExpanded ? 'py-3' : 'py-2'}`}>
            <div>
              <div className={`flex items-center gap-3 flex-wrap ${isOrderExpanded ? 'mb-1.5' : 'mb-0'}`}>
                <span className={`${isOrderExpanded ? 'text-lg' : 'text-base'} font-black ${isFinishedState ? 'text-slate-600' : 'text-slate-900'}`}>#{order.id}</span>
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

              {isOrderExpanded && (
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                  <span>{new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>•</span>
                  {order.payment_method === 'qr' ? <span className={isFinishedState ? 'text-slate-400' : 'text-indigo-500'}>โอนเงิน</span> : <span className="text-slate-500">เงินสด</span>}
                </div>
              )}
            </div>

            <div className="text-right flex items-center gap-2">
              <div className={`${isOrderExpanded ? 'text-lg' : 'text-base'} font-black ${isFinishedState ? 'text-slate-600' : 'text-slate-900'}`}>
                ฿{order.total_price.toLocaleString()}
              </div>
              <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
                {isOrderExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>
          </div>

          <div className={`px-4 ${isOrderExpanded ? 'pb-4' : 'pb-2 pt-1'}`}>
            <div className={isOrderExpanded ? 'space-y-3' : 'space-y-1.5'}>
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
        </div>

        {isOrderExpanded && (
          <div className="p-4 sm:p-5 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">

          <div className="w-full sm:w-auto">
            <div className="text-sm font-bold text-slate-800 mb-2">
              {order.order_type === 'dine_in' ? `ทานที่ร้าน (โต๊ะ ${order.table_name})` : 'รายละเอียดลูกค้า'}
            </div>

            <div className="space-y-1.5 text-sm">
              {order.order_type === 'dine_in' ? (
                <div className="flex items-center gap-2 text-indigo-600 font-bold bg-indigo-50 px-3 py-2 rounded-lg">
                  🍽️ ทานที่ร้าน (โต๊ะ {order.table_name})
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-slate-600"><User size={14} className="text-slate-400" /> <span className="font-medium">{order.customer_name || 'ลูกค้าทั่วไป'}</span></div>
                  <div className="flex items-center gap-2 text-slate-600"><Phone size={14} className="text-slate-400" /> <span className="font-medium">{order.phone || '-'}</span></div>
                  <div className="flex items-start gap-2 text-slate-600"><MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" /> <span className="font-medium">{order.address || 'รับหน้าร้าน'}</span></div>
                </>
              )}
            </div>
          </div>

          <div className="flex w-full sm:w-auto gap-2">
            {order.slip_image && order.status !== 'checking_slip' && (
              <button onClick={() => setSlipPopupOrder(order)} className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 rounded-lg font-bold text-sm transition-colors">
                <Receipt size={16} /> ดูสลิป
              </button>
            )}
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
              <button onClick={() => {
                if (order.slip_image) {
                  // ถ้าจ่ายแล้วและมีสลิปแล้ว ให้ผ่านเลย
                  updateStatus(order.id, 'done');
                } else if (order.order_type === 'dine_in') {
                  // ทานที่ร้าน ปกติจะไปจ่ายที่หน้าจัดการโต๊ะ
                  updateStatus(order.id, 'done');
                } else {
                  // สำหรับหน้าร้านและออนไลน์ที่ยังไม่มีสลิป ให้เปิด popup ชำระเงิน (สแกน/เงินสด)
                  setCodPaymentOrder(order);
                }
              }} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm rounded-lg font-bold text-sm transition-colors">
                <Check size={16} /> ส่งสำเร็จ
              </button>
            )}
          </div>
          </div>
        )}

      </div>
    );
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
    <div className="bg-slate-50 text-slate-900 font-sans min-h-[calc(100vh-80px)] lg:h-[calc(100vh-80px)] flex flex-col lg:overflow-hidden">
      <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 pt-6 flex flex-col flex-1 lg:h-full lg:min-h-0">

        {/* 🌟 Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 shrink-0">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">รายการออเดอร์</h1>
            <p className="text-sm text-slate-500 mt-1">จัดการออเดอร์และคิวทำอาหารแบบเรียลไทม์</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/dashboard/shop/orders/rider"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-all"
            >
              <Truck size={16} /> จัดการออเดอร์ไรเดอร์
            </Link>
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


        {/* --- แถบสถานะ (Global) --- */}
        {/* --- ส่วนรายการออเดอร์ --- */}
        <div className="flex overflow-x-auto gap-2 pb-3 mb-4 -mx-4 px-4 sm:mx-0 sm:px-1 sm:pb-4 shrink-0 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
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
                className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${isActive
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

        {/* แถบเมนูสำหรับหน้าจอเล็ก (Mobile View Selector) */}
        <div className="lg:hidden flex bg-white rounded-2xl shadow-sm border border-slate-200 p-1 mb-4 shrink-0">
          {[
            { id: 'online', label: 'ออนไลน์', icon: <Truck size={16} />, count: displayedOnlineOrders.length },
            { id: 'kitchen', label: 'หน้าเตา', icon: <CookingPot size={16} /> },
            { id: 'dine_in', label: 'หน้าร้าน', icon: <User size={16} />, count: displayedDineInOrders.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setMobileView(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold rounded-xl transition-all ${mobileView === tab.id
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
            >
              <span className="hidden sm:inline">{tab.icon}</span> {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${mobileView === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 🌟 3-Column Layout สำหรับออเดอร์ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4 flex-1 lg:min-h-0 pb-4">

          {/* คอลัมน์ 1: ออเดอร์ออนไลน์ */}
          <div className={`bg-slate-100 p-4 rounded-3xl shadow-inner lg:h-full flex-col lg:overflow-hidden ${mobileView === 'online' ? 'flex' : 'hidden lg:flex'}`}>
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-indigo-900 shrink-0">
              <Truck size={20} /> ออเดอร์ออนไลน์
              <span className="bg-indigo-200/50 text-indigo-700 text-sm px-2.5 py-0.5 rounded-full ml-auto font-black shadow-sm">
                {displayedOnlineOrders.length}
              </span>
            </h2>
            <div className="flex flex-col gap-4 lg:overflow-y-auto pb-4 pr-1 flex-1 lg:min-h-0">
              {displayedOnlineOrders.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-slate-300 mb-2 flex justify-center"><CircleDashed size={32} /></div>
                  <p className="text-slate-500 font-medium text-sm">ไม่มีออเดอร์</p>
                </div>
              ) : (
                displayedOnlineOrders.map(renderOrderCard)
              )}
            </div>
          </div>

          {/* คอลัมน์ 2: Smart Kitchen */}
          <div className={`bg-white rounded-3xl shadow-sm border-2 border-slate-200 lg:h-full flex-col lg:overflow-hidden ${mobileView === 'kitchen' ? 'flex' : 'hidden lg:flex'}`}>
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 rounded-t-[1.3rem] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <CookingPot size={22} className="text-slate-700" />
                <h3 className="text-slate-800 font-bold text-lg">คิวหน้าเตา (Smart Kitchen)</h3>
              </div>
            </div>
            <div className="p-2 lg:overflow-y-auto pb-4 flex-1 lg:min-h-0">
              {/* 👨‍🍳 Smart Kitchen */}
              {(batchSuggestions.length > 0 || activeBatches.length > 0) && (
                <div className="h-full flex flex-col">
                  <div className="hidden">
                    <div className="flex items-center gap-2">
                      <CookingPot size={18} className="text-slate-700" />
                      <h3 className="text-slate-800 font-bold text-sm">คิวหน้าเตา (Smart Kitchen)</h3>
                    </div>
                  </div>

                  <div className="p-5 grid gap-3">
                    {/* === อาหารพร้อมเสิร์ฟ / รอส่ง (Ready to Serve) === */}
                    {readyToServeOrders.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-bold text-emerald-600 mb-2 uppercase tracking-wider">พร้อมเสิร์ฟ / รอส่งมอบ</h4>
                        <div className="space-y-2">
                          {readyToServeOrders.map(order => (
                            <div key={order.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                              <div>
                                <div className="font-bold text-emerald-900">
                                  Order #{order.id} {order.order_type === 'dine_in' ? `(โต๊ะ ${order.table_name})` : '(ออนไลน์)'}
                                </div>
                                <div className="text-xs text-emerald-600 mt-0.5">
                                  {order.items.map(i => `${i.menu_name} x${i.quantity}`).join(', ')}
                                </div>
                              </div>
                              <button
                                onClick={() => updateStatus(order.id, 'delivery')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm whitespace-nowrap"
                              >
                                {order.order_type === 'dine_in' ? 'เสิร์ฟอาหาร' : 'ส่งให้ไรเดอร์'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* === รายการที่กำลังทำอยู่ (Active Batches) === */}
                    {activeBatches.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">กำลังทำบนเตา</h4>
                        <div className="space-y-2">
                          {activeBatches.map((batch) => (
                            <div key={batch.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-3 border rounded-xl ${batch.status === 'done' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-blue-50/50 border-blue-100'}`}>
                              <div>
                                <div className={`font-bold ${batch.status === 'done' ? 'text-emerald-900' : 'text-blue-900'}`}>
                                  {batch.menuName} <span className={`${batch.status === 'done' ? 'text-emerald-600' : 'text-blue-600'} text-sm font-bold ml-1`}>x {batch.amount}</span>
                                </div>
                                {batch.status === 'done' ? (
                                  <div className="text-xs text-emerald-500 mt-0.5 flex items-center gap-1">
                                    <CheckCircle2 size={12} /> ปรุงเสร็จแล้ว รอส่งมอบ
                                  </div>
                                ) : (
                                  <div className="text-xs text-blue-500 mt-0.5 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> กำลังปรุง...
                                  </div>
                                )}
                              </div>
                              {batch.status !== 'done' && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleCancelBatch(batch.id, batch.menuName, batch.amount)}
                                    className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm"
                                  >
                                    ยกเลิก
                                  </button>
                                  <button
                                    onClick={() => handleFinishCooking(batch.id, batch.menuName, batch.amount)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm"
                                  >
                                    เสร็จแล้ว
                                  </button>
                                </div>
                              )}
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
                                  <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                                    <button onClick={() => handleAmountChange(sug.menuName, -1, sug.total)} className="px-3 py-1.5 hover:bg-slate-200 font-bold text-slate-600">-</button>
                                    <div className="px-2 font-bold text-slate-900 min-w-[30px] text-center text-sm">{currentInput}</div>
                                    <button onClick={() => handleAmountChange(sug.menuName, 1, sug.total)} className="px-3 py-1.5 hover:bg-slate-200 font-bold text-slate-600">+</button>
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


            </div>
          </div>

          {/* คอลัมน์ 3: ออเดอร์หน้าร้าน */}
          <div className={`bg-slate-100 p-4 rounded-3xl shadow-inner lg:h-full flex-col lg:overflow-hidden ${mobileView === 'dine_in' ? 'flex' : 'hidden lg:flex'}`}>
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-emerald-900 shrink-0">
              🍽️ ออเดอร์หน้าร้าน
              <span className="bg-emerald-200/50 text-emerald-700 text-sm px-2.5 py-0.5 rounded-full ml-auto font-black shadow-sm">
                {displayedDineInOrders.length}
              </span>
            </h2>
            <div className="flex flex-col gap-4 lg:overflow-y-auto pb-4 pr-1 flex-1 lg:min-h-0">
              {displayedDineInOrders.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-slate-300 mb-2 flex justify-center"><CircleDashed size={32} /></div>
                  <p className="text-slate-500 font-medium text-sm">ไม่มีออเดอร์</p>
                </div>
              ) : (
                displayedDineInOrders.map(renderOrderCard)
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 🛎️ Popup ออเดอร์พร้อมส่ง */}
      {readyPopupOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-[9999] px-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm text-center shadow-2xl">
            <div className="text-6xl mb-4 animate-bounce">🛎️</div>
            <h3 className="text-2xl text-slate-900 font-black mb-2">
              ออเดอร์ #{readyPopupOrder.id}
            </h3>
            {readyPopupOrder.order_type === 'dine_in' && (
              <div className="text-xl font-bold text-indigo-600 mb-2">โต๊ะ {readyPopupOrder.table_name}</div>
            )}
            <p className="text-slate-500 font-medium mb-6">
              {readyPopupOrder.order_type === 'dine_in' ? 'อาหารเสร็จครบแล้ว นำไปเสิร์ฟที่โต๊ะได้เลย' : 'อาหารเสร็จครบแล้ว เตรียมส่งมอบได้เลย'}
            </p>
            <button onClick={() => { updateStatus(readyPopupOrder.id, 'delivery'); setReadyPopupOrder(null); }} className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-colors mb-2">
              {readyPopupOrder.order_type === 'dine_in' ? 'ตกลง (เสิร์ฟอาหาร)' : 'ตกลง (ส่งให้ไรเดอร์)'}
            </button>
            <button onClick={() => setReadyPopupOrder(null)} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors">ยังทำไม่เสร็จ</button>
          </div>
        </div>
      )}

      {/* 💰 Popup ชำระเงินปลายทาง */}
      {codPaymentOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-[9999] px-4">
          <div className="bg-white rounded-3xl w-full max-w-sm flex flex-col overflow-hidden max-h-[600px] shadow-2xl">
            <div className="p-6 overflow-y-auto flex-1 text-center">
              <h3 className="text-xl font-black mb-1">ชำระเงินก่อนส่งมอบ</h3>
              <p className="text-slate-500 mb-5 font-medium">Order #{codPaymentOrder.id} • <strong className="text-slate-900">฿{codPaymentOrder.total_price.toLocaleString()}</strong></p>

              <div className="flex gap-2 mb-4">
                <label className={`flex-1 py-3 border rounded-xl cursor-pointer font-bold transition-colors ${codPaymentMethod === 'cash' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                  <input type="radio" checked={codPaymentMethod === 'cash'} onChange={() => setCodPaymentMethod('cash')} className="hidden" />
                  เงินสด
                </label>
                <label className={`flex-1 py-3 border rounded-xl cursor-pointer font-bold transition-colors ${codPaymentMethod === 'qr' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                  <input type="radio" checked={codPaymentMethod === 'qr'} onChange={() => setCodPaymentMethod('qr')} className="hidden" />
                  สแกน QR
                </label>
              </div>

              {codPaymentMethod === 'qr' && shopData && (
                <div className="mb-4 flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                  {shopData.account_number ? (
                    <img src={`https://promptpay.io/${shopData.account_number}/${codPaymentOrder.total_price}.png`} className="w-40 h-40 rounded-lg border-4 border-white shadow-sm" alt="PromptPay QR" />
                  ) : shopData.qr_image ? (
                    <img src={shopData.qr_image} className="w-40 h-40 object-cover rounded-lg border-4 border-white shadow-sm" alt="Shop QR" />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center bg-slate-200 rounded-lg"><ImageOff size={24} className="text-slate-400" /></div>
                  )}
                  <div className="mt-3 text-sm text-slate-600 font-medium">
                    {shopData.bank_name && <div>{shopData.bank_name}</div>}
                    {shopData.account_number && <div className="text-indigo-600 font-bold">{shopData.account_number}</div>}
                  </div>
                </div>
              )}

              {codPaymentMethod === 'qr' && (
                <div className="mb-4 text-left">
                  <p className="text-sm font-bold text-slate-700 mb-2">อัปโหลดหลักฐานการรับเงิน *</p>
                  <div className="flex gap-2 mb-3">
                    <button onClick={startCamera} className="flex-1 flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors text-slate-600 font-bold text-sm">
                      <Camera size={20} /> ถ่ายรูป
                    </button>
                    <label className="flex-1 flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors text-slate-600 font-bold text-sm">
                      <input type="file" accept="image/*" onChange={handleCodFileChange} className="hidden" />
                      <UploadCloud size={20} /> รูปในเครื่อง
                    </label>
                  </div>
                  {codSlipImage && (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200">
                      <img src={codSlipImage} className="w-full h-40 object-contain bg-slate-100" alt="Slip Preview" />
                      <button onClick={() => setCodSlipImage(null)} className="absolute top-2 right-2 p-1.5 bg-slate-900/50 text-white rounded-full hover:bg-slate-900/70"><X size={14} /></button>
                    </div>
                  )}
                </div>
              )}
              <div ref={paymentBottomRef} />
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex gap-2">
              <button onClick={() => { setCodPaymentOrder(null); setCodPaymentMethod(''); setCodSlipImage(null); }} className="flex-1 py-3 text-slate-400 hover:text-slate-600 font-bold transition-colors">ยกเลิก</button>
              <button
                disabled={!codPaymentMethod || (codPaymentMethod === 'qr' && !codSlipImage)}
                onClick={() => {
                  updateStatus(codPaymentOrder.id, 'done', codSlipImage || undefined);
                  setCodPaymentOrder(null);
                  setCodPaymentMethod('');
                  setCodSlipImage(null);
                }}
                className={`flex-1 py-3 text-white rounded-xl font-bold shadow-md transition-colors ${(!codPaymentMethod || (codPaymentMethod === 'qr' && !codSlipImage)) ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'}`}
              >
                ยืนยันการรับเงิน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🖼️ Popup ตรวจสอบสลิป */}
      {slipPopupOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-[9999] px-4">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm text-center shadow-2xl">
            <h3 className="text-xl font-black mb-1">
              {slipPopupOrder.status === 'checking_slip' ? 'ตรวจสอบสลิป' : 'สลิปการโอนเงิน'}
            </h3>
            <p className="text-slate-500 mb-5 font-medium">Order #{slipPopupOrder.id} • <strong className="text-slate-900">฿{slipPopupOrder.total_price.toLocaleString()}</strong></p>
            {slipPopupOrder.slip_image ? (
              <img src={slipPopupOrder.slip_image} alt="Slip" className="w-full max-h-80 object-contain rounded-xl mb-6 bg-slate-50" />
            ) : (
              <div className="py-10 bg-slate-50 text-slate-400 rounded-xl mb-6 font-bold">ไม่พบรูปสลิป</div>
            )}

            {slipPopupOrder.status === 'checking_slip' ? (
              <div className="flex gap-2">
                <button onClick={() => { updateStatus(slipPopupOrder.id, 'cancel'); setSlipPopupOrder(null); }} className="flex-1 py-3 text-rose-500 hover:bg-rose-50 rounded-xl font-bold transition-colors">ไม่อนุมัติ</button>
                <button onClick={() => { updateStatus(slipPopupOrder.id, 'cooking'); setSlipPopupOrder(null); }} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-md hover:bg-slate-800 transition-colors">อนุมัติ (เริ่มปรุง)</button>
              </div>
            ) : (
              <button onClick={() => setSlipPopupOrder(null)} className="w-full py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold transition-colors">ปิด</button>
            )}
          </div>
        </div>
      )}

      {/* 📸 Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-slate-900 z-[10000] flex flex-col">
          <div className="flex-1 relative flex items-center justify-center bg-black">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />

            <div className="absolute top-4 right-4">
              <button onClick={stopCamera} className="p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full backdrop-blur-sm transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-6 px-6">
              <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-[0_0_0_4px_rgba(255,255,255,0.3)] hover:scale-105 transition-transform">
                <div className="w-16 h-16 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center">
                  <Camera size={32} className="text-slate-800" />
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}