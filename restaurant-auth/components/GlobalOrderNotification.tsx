'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, Check, X, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

type OrderItem = { menu_name: string; quantity: number };
type Order = { id: number; status: string; total_price: number; payment_method: string; items: OrderItem[] };
type AlertOrder = Order & { timeLeft: number };

export default function GlobalOrderNotification() {
  const router = useRouter();
  const [activeAlerts, setActiveAlerts] = useState<AlertOrder[]>([]);
  
  const notifiedOrders = useRef<Set<number>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 🚨 1. เพิ่ม audioRef เพื่อเก็บ Object เสียงไว้สั่งหยุดทีหลัง
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: orders } = useSWR<Order[]>('/api/shop/orders', fetcher, { refreshInterval: 3000 });

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
      setActiveAlerts(prev => [...prev, ...newAlerts]);
      
      // ถ้ายังไม่มีเสียงเล่นอยู่ ให้เริ่มเล่น
      if (!audioRef.current) {
        const audio = new Audio('/sounds/notification.mp3');
        audio.loop = true; 
        audio.play().catch(e => console.log('เบราว์เซอร์บล็อคเสียง:', e));
        audioRef.current = audio;
      }
    }
  }, [orders]);

  // ฟังก์ชันสำหรับสั่ง "หยุดเสียง"
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
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

  const handleAction = async (orderId: number, action: 'accept' | 'cancel', paymentMethod: string) => {
    // ลบออกจาก activeAlerts ทันที (Optimistic)
    setActiveAlerts(prev => prev.filter(a => a.id !== orderId));
    
    let newStatus = 'cancel';
    if (action === 'accept') {
      newStatus = paymentMethod === 'qr' ? 'checking_slip' : 'cooking';
    }
    
    try {
      await fetch('/api/shop/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus })
      });
      
      mutate('/api/shop/orders'); // สั่งให้ทุกหน้าที่ดึงออเดอร์ ทำการ Refresh ทันที
    } catch (error) {
      alert('เกิดข้อผิดพลาด');
    }
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-sm pointer-events-none">
      <AnimatePresence>
        {activeAlerts.map((newOrder, idx) => {
          const isTop = idx === 0;
          
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
            <div className={`bg-slate-900 text-white p-5 rounded-2xl shadow-2xl border border-slate-700 relative overflow-hidden ${!isTop && 'blur-[1px]'}`}>
              
              <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: `${(newOrder.timeLeft / 60) * 100}%` }}
                transition={{ duration: 1, ease: 'linear' }}
                className={`absolute bottom-0 left-0 h-1 ${newOrder.timeLeft <= 10 ? 'bg-red-500' : 'bg-blue-500'}`}
              />

              <div className="flex items-start gap-4">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-20"></span>
                  <BellRing size={24} className="animate-bounce" />
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">ออเดอร์ใหม่เข้า! 🎉</h3>
                    <div className={`flex items-center gap-1 text-sm font-black ${newOrder.timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-amber-500'}`}>
                      <Clock size={14} /> {newOrder.timeLeft}s
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-400 mt-1">
                    Order <span className="text-white font-bold">#{newOrder.id}</span> • ยอด <span className="text-emerald-400 font-bold">฿{newOrder.total_price}</span>
                  </p>

                  <div className="mt-2 inline-block px-2 py-1 rounded-md text-[10px] font-bold tracking-wider bg-slate-800 text-slate-300">
                    {newOrder.payment_method === 'qr' ? '💳 โอนเงิน (รอตรวจสลิป)' : '💵 เงินสด (ชำระปลายทาง)'}
                  </div>

                  <div className="mt-3 bg-slate-800 rounded-lg p-3 text-sm border border-slate-700/50">
                    {newOrder.items.slice(0, 2).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-slate-300 mb-1 last:mb-0">
                        <span>{item.menu_name}</span>
                        <span className="font-bold text-white">x{item.quantity}</span>
                      </div>
                    ))}
                    {newOrder.items.length > 2 && (
                      <div className="text-xs text-slate-500 mt-2 text-center pt-2 border-t border-slate-700">และอื่นๆ อีก {newOrder.items.length - 2} รายการ</div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button 
                      onClick={() => handleAction(newOrder.id, 'cancel', newOrder.payment_method)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-red-400 transition-colors text-sm font-bold"
                    >
                      <X size={16} strokeWidth={3} /> ปฏิเสธ
                    </button>
                    <button 
                      onClick={() => handleAction(newOrder.id, 'accept', newOrder.payment_method)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all"
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