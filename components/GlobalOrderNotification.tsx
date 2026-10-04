'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, Check, X, Clock } from 'lucide-react';
import useSWR, { mutate } from 'swr';
import { useRouter } from 'next/navigation';

const fetcher = (url: string) => fetch(url).then(res => res.json());

type OrderItem = { menu_name: string; quantity: number };
type Order = { id: number; status: string; total_price: number; payment_method: string; items: OrderItem[]; table_name?: string | null; };
type AlertOrder = Order & { timeLeft: number };

export default function GlobalOrderNotification() {
  const router = useRouter();
  const [activeAlerts, setActiveAlerts] = useState<AlertOrder[]>([]);
  
  const notifiedOrders = useRef<Set<number>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 🚨 1. เพิ่ม audioRef เพื่อเก็บ Object เสียงไว้สั่งหยุดทีหลัง
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 🚨 ปลดล็อคเสียงบน iPad/Safari เมื่อผู้ใช้สัมผัสหน้าจอครั้งแรก
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/notification.mp3');
      audioRef.current.loop = true;
      
      const unlockAudio = () => {
        if (audioRef.current) {
          audioRef.current.volume = 0;
          audioRef.current.play().then(() => {
            audioRef.current?.pause();
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.volume = 1;
            }
          }).catch(() => {});
        }
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
      };
      
      document.addEventListener('click', unlockAudio);
      document.addEventListener('touchstart', unlockAudio);
      
      return () => {
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
      };
    }
  }, []);

  const { data: orders } = useSWR<Order[]>('/api/shop/orders', fetcher, { refreshInterval: 1000, refreshWhenHidden: true });

  const handleAction = async (orderId: number, action: 'accept' | 'cancel', paymentMethod: string) => {
    // 🚨 เช็คว่าออเดอร์โดนคนอื่นกดไปแล้วหรือยัง (เช็คจาก local state ที่ sync มาล่าสุด)
    const currentOrderState = orders?.find(o => o.id === orderId);
    if (currentOrderState && currentOrderState.status !== 'pending') {
      setActiveAlerts(prev => prev.filter(a => a.id !== orderId));
      return; // ปิดป็อปอัพเงียบๆ ไม่ต้องทำอะไรต่อ
    }

    setActiveAlerts(prev => prev.filter(a => a.id !== orderId));

    let newStatus = 'cancel';
    if (action === 'accept') {
      newStatus = paymentMethod === 'qr' ? 'checking_slip' : 'cooking';
    }

    try {
      const res = await fetch('/api/shop/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus })
      });

      if (res.status === 409) {
        // มีพนักงานคนอื่นกดรับไปแล้ว! ปิดป็อปอัพเงียบๆ
        return;
      }

      mutate('/api/shop/orders');

      if (action === 'accept') {
        router.push('/dashboard/shop/orders');
      }
    } catch {
      alert('เกิดข้อผิดพลาด');
    }
  };

  useEffect(() => {
    if (!orders) return;
    const pendingOrders = orders.filter(o => o.status === 'pending');
    
    let hasNew = false;
    const newAlerts: AlertOrder[] = [];

    for (const order of pendingOrders) {
      if (!notifiedOrders.current.has(order.id)) {
        notifiedOrders.current.add(order.id);
        newAlerts.push({ ...order, timeLeft: 60 });
        hasNew = true;
      }
    }

    if (hasNew) {
      setTimeout(() => setActiveAlerts(prev => [...prev, ...newAlerts]), 0);
      
      // ถ้ายังไม่มีเสียงเล่นอยู่ ให้เริ่มเล่น
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(e => console.log('เบราว์เซอร์บล็อคเสียง:', e));
      }
    }

    // 🚨 Sync activeAlerts: ลบออเดอร์ที่ถูกจัดการไปแล้ว (สถานะไม่ใช่ pending) จากหน้าต่างอื่นออก
    setTimeout(() => {
      setActiveAlerts(prev => {
        const pendingIds = new Set(pendingOrders.map(o => o.id));
        const filtered = prev.filter(a => pendingIds.has(a.id));
        return filtered.length !== prev.length ? filtered : prev;
      });
    }, 0);
  }, [orders]);

  // ฟังก์ชันสำหรับสั่ง "หยุดเสียง"
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  useEffect(() => {
    if (activeAlerts.length > 0) {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setActiveAlerts(prev => {
            const updated = prev.map(a => ({ ...a, timeLeft: a.timeLeft - 1 }));
            const timedOut = updated.filter(a => a.timeLeft <= 0);
            
            // ยกเลิกออเดอร์ที่หมดเวลา
            timedOut.forEach(a => handleAction(a.id, 'cancel', a.payment_method));
            
            return updated.filter(a => a.timeLeft > 0);
          });
        }, 1000);
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      stopAudio(); // หยุดเสียงเมื่อไม่มีการแจ้งเตือนเหลืออยู่
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [activeAlerts.length]);

  useEffect(() => {
    return () => {
      stopAudio(); // 🚨 หยุดเสียงถ้าหน้าต่างนี้ถูกปิดหรือเปลี่ยนหน้า
    };
  }, []);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-sm pointer-events-none">
      <AnimatePresence>
        {activeAlerts.map((newOrder, idx) => {
          const isTop = idx === 0;
          const isDineIn = !!newOrder.table_name;
          
          return (
          <motion.div 
            key={newOrder.id}
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ 
              opacity: 1 - (idx * 0.15), 
              y: idx * 16, 
              scale: 1 - (idx * 0.05),
              zIndex: 100 - idx
            }}
            exit={{ opacity: 0, scale: 0.5, y: -50, transition: { duration: 0.2 } }}
            className={`absolute top-0 left-0 w-full transition-all duration-300 ${isTop ? 'pointer-events-auto' : 'pointer-events-none'}`}
            layout
          >
            <div className={`${isDineIn ? 'bg-orange-950 border-orange-700' : 'bg-slate-900 border-slate-700'} text-white p-5 rounded-2xl shadow-2xl border relative overflow-hidden ${!isTop && 'blur-[1px]'}`}>
              
              <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: `${(newOrder.timeLeft / 60) * 100}%` }}
                transition={{ duration: 1, ease: 'linear' }}
                className={`absolute bottom-0 left-0 h-1 ${newOrder.timeLeft <= 10 ? 'bg-red-500' : (isDineIn ? 'bg-orange-500' : 'bg-blue-500')}`}
              />

              <div className="flex items-start gap-4">
                <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${isDineIn ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${isDineIn ? 'bg-orange-400' : 'bg-blue-400'} opacity-20`}></span>
                  <BellRing size={24} className="animate-bounce" />
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">{isDineIn ? `ออเดอร์หน้าร้าน! 🍽️ โต๊ะ ${newOrder.table_name}` : 'ออเดอร์ออนไลน์! 🛵'}</h3>
                    <div className={`flex items-center gap-1 text-sm font-black ${newOrder.timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-amber-500'}`}>
                      <Clock size={14} /> {newOrder.timeLeft}s
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-400 mt-1">
                    Order <span className="text-white font-bold">#{newOrder.id}</span> • ยอด <span className={`font-bold ${isDineIn ? 'text-orange-400' : 'text-emerald-400'}`}>฿{newOrder.total_price}</span>
                  </p>

                  {!isDineIn && (
                    <div className="mt-2 inline-block px-2 py-1 rounded-md text-[10px] font-bold tracking-wider text-white bg-slate-800 border border-slate-700">
                      {newOrder.payment_method === 'qr' ? '💳 โอนเงิน (รอตรวจสลิป)' : '💵 เงินสด'}
                    </div>
                  )}

                  <div className={`mt-3 rounded-lg p-3 text-sm border ${isDineIn ? 'bg-orange-950/60 border-orange-800/50' : 'bg-slate-800 border-slate-700/50'}`}>
                    {newOrder.items.slice(0, 2).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-slate-300 mb-1 last:mb-0">
                        <span>{item.menu_name}</span>
                        <span className="font-bold text-white">x{item.quantity}</span>
                      </div>
                    ))}
                    {newOrder.items.length > 2 && (
                      <div className={`text-xs text-slate-500 mt-2 text-center pt-2 border-t ${isDineIn ? 'border-orange-800' : 'border-slate-700'}`}>และอื่นๆ อีก {newOrder.items.length - 2} รายการ</div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button 
                      onClick={() => handleAction(newOrder.id, 'cancel', newOrder.payment_method)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-slate-300 hover:text-red-400 transition-colors text-sm font-bold ${isDineIn ? 'bg-orange-950/80 border border-orange-800/50 hover:bg-orange-900' : 'bg-slate-800 border border-slate-700/50 hover:bg-slate-700'}`}
                    >
                      <X size={16} strokeWidth={3} /> ปฏิเสธ
                    </button>
                    <button 
                      onClick={() => handleAction(newOrder.id, 'accept', newOrder.payment_method)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg hover:-translate-y-0.5 transition-all ${isDineIn ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20 hover:shadow-orange-500/40' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20 hover:shadow-emerald-500/40'}`}
                    >
                      <Check size={16} strokeWidth={3} /> รับออเดอร์
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )})}
      </AnimatePresence>
    </div>
  );
}
