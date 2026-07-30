'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react'; // ➕ 1. นำเข้า useSession
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, MapPin, ChefHat, Bike, CheckCircle2,
  XCircle, Timer, Footprints, Flame, Utensils,
  Loader2, Star, ArrowLeft, Receipt, Motorbike,
  Banknote
} from 'lucide-react';

type OrderItem = {
  menu_id: number;
  menu_name: string;
  quantity: number;
  price: number;
};

type Order = {
  id: number;
  status: string;
  created_at: string;
  total_price: number;
  delivery_fee?: number;
  distance_km: number;
  cooking_time_min: number;
  delivery_time_min: number;
  total_time_min: number;
  items: OrderItem[];
};

// 🚨 คงสีตามความหมายสถานะไว้ (Semantic Colors) เพื่อให้ผู้ใช้เข้าใจง่าย
const statusIcons = {
  pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', text: 'รอร้านรับออเดอร์' },
  checking_slip: { icon: Banknote, color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-200', text: 'รอร้านตรวจสอบสลิป' },
  cooking: { icon: ChefHat, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', text: 'ร้านกำลังปรุงอาหาร' },
  delivery: { icon: Motorbike, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', text: 'ไรเดอร์กำลังจัดส่ง' },
  done: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'จัดส่งสำเร็จ' },
  cancel: { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200', text: 'ออเดอร์ถูกยกเลิก' }
};

const foodEmojis = ['🍔', '🍕', '🌮', '🍣', '🥗', '🍜', '🍛', '🍝'];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  // ➕ 2. ดึงสถานะ Session
  const { data: session, status } = useSession();

  const [order, setOrder] = useState<Order | null>(null);
  const [queueCount, setQueueCount] = useState<number>(0); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [isLate, setIsLate] = useState(false);
  const [emojiIndex, setEmojiIndex] = useState(0);

  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hasReviewed, setHasReviewed] = useState(false);

  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const emojiIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 🛡️ เช็คสถานะการล็อกอิน
  useEffect(() => {
    if (status === 'unauthenticated') {
      fetch('/api/auth/force-logout', { method: 'POST' }).then(() => {
        document.cookie.split(";").forEach((c) => {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        window.location.href = '/login';
      });
    }
  }, [status]);

  // Submit Review 
  const submitReview = useCallback(async () => {
    if (!order) return;
    try {
      const res = await fetch('/api/customer/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, rating, comment, items: order.items })
      });
      if (!res.ok) throw new Error('ส่งรีวิวไม่สำเร็จ');
      setShowReview(false);
      setHasReviewed(true);
      alert(hasReviewed ? 'อัปเดตรีวิวเรียบร้อย ❤️' : 'ขอบคุณสำหรับรีวิว ❤️');
    } catch (err) {
      alert('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
    }
  }, [order, rating, comment, hasReviewed]);

  const handleCancelOrder = async () => {
    if (!order || !cancelReason.trim()) return;
    try {
      const res = await fetch('/api/customer/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          status: 'cancel',
          cancel_reason: cancelReason,
          cancelled_by: 'customer'
        })
      });
      if (res.ok) {
        setOrder({ ...order, status: 'cancel' });
        setShowCancelPopup(false);
        setCancelReason('');
      } else {
        alert('เกิดข้อผิดพลาดในการยกเลิกออเดอร์');
      }
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // Fetch Data
  useEffect(() => {
    // ➕ 4. ต้องรอให้ล็อกอินผ่านก่อนถึงจะดึงข้อมูล
    if (!id || status !== 'authenticated') return;
    
    setLoading(true);
    setError(null);

    fetch(`/api/customer/order/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text() || 'ไม่สามารถโหลดข้อมูลได้');
        return res.json();
      })
      .then((data) => { setOrder(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });

    fetch('/api/customer/home')
      .then(res => res.json())
      .then(data => {
        if (data.remainingQueue) setQueueCount(data.remainingQueue);
      }).catch(() => { });

    fetch(`/api/customer/review?order_id=${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.rating) {
          setRating(data.rating); setComment(data.comment || ''); setHasReviewed(true);
        }
      }).catch(() => { });
  }, [id, status]);

  // Emoji Animation
  useEffect(() => {
    emojiIntervalRef.current = setInterval(() => {
      setEmojiIndex((prev) => (prev + 1) % foodEmojis.length);
    }, 500);
    return () => { if (emojiIntervalRef.current) clearInterval(emojiIntervalRef.current); };
  }, []);

  // Calculate Time
  const estimatedTotalTimeMin = useMemo(() => {
    if (!order) return 0;
    const queueDelay = (order.status === 'pending' || order.status === 'checking_slip') ? (queueCount * 1) : 0;
    return order.total_time_min + queueDelay;
  }, [order, queueCount]);

  // Countdown Timer
  useEffect(() => {
    if (!order || estimatedTotalTimeMin === 0) return;
    if (order.status === 'done' || order.status === 'cancel') {
      setRemainingTime(0); setIsLate(false); return;
    }

    const created = new Date(order.created_at).getTime();
    const endTime = created + estimatedTotalTimeMin * 60 * 1000; 

    const updateRemaining = () => {
      const now = Date.now();
      const diff = endTime - now;
      if (diff <= 0) {
        setRemainingTime(0); setIsLate(true);
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      } else {
        setRemainingTime(diff); setIsLate(false);
      }
    };

    updateRemaining();
    intervalRef.current = setInterval(updateRemaining, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [order, estimatedTotalTimeMin]);

  // --- Loading & Error States ---
  // ➕ 5. โชว์ Loading ให้คลุมจังหวะที่ Session กำลังโหลดด้วย
  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50 dark:bg-slate-900 transition-colors">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-blue-900 dark:text-blue-100 tracking-wide">กำลังโหลดออเดอร์...</span>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50 dark:bg-slate-900 p-4 transition-colors">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 text-center max-w-sm w-full border border-blue-100 dark:border-slate-700 shadow-sm transition-colors">
          <XCircle size={56} className="text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-blue-900 dark:text-blue-50 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">{error || 'ไม่พบข้อมูลออเดอร์นี้'}</p>
          <button onClick={() => router.back()} className="w-full py-3.5 bg-blue-50 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-slate-600 text-blue-700 dark:text-blue-300 rounded-xl font-bold transition-colors">
            กลับไปหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  // --- Calculations ---
  const minutes = Math.floor(remainingTime / 60000);
  const seconds = Math.floor((remainingTime % 60000) / 1000);
  const progress = order.status !== 'done' && order.status !== 'cancel'
    ? ((estimatedTotalTimeMin * 60 * 1000 - remainingTime) / (estimatedTotalTimeMin * 60 * 1000)) * 100
    : 100;

  const statusInfo = statusIcons[order.status as keyof typeof statusIcons];
  const StatusIcon = statusInfo?.icon || Clock;

  const subTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = order.delivery_fee ?? (order.total_price - subTotal);

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 pb-24 transition-colors">

      {/* 🌟 Header */}
      <div className="bg-white dark:bg-slate-800 px-4 py-4 sm:px-6 sticky top-0 z-40 border-b border-blue-100 dark:border-slate-700 shadow-sm flex items-center justify-between transition-colors">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold text-sm transition-colors bg-blue-50 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-slate-600 px-3 py-2 rounded-xl border border-blue-200 dark:border-slate-600">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-black text-blue-900 dark:text-blue-50 flex items-center gap-2">
          ออเดอร์ #{order.id}
        </h1>
        <div className="w-16 text-right text-2xl relative">
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5, repeat: order.status === 'delivery' ? Infinity : 0 }}>
            {order.status === 'delivery' ? '🛵' : foodEmojis[emojiIndex]}
          </motion.div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-6">

        {/* 🟡 Status Tracking Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border mb-6 transition-colors ${statusInfo?.border || 'border-blue-100 dark:border-slate-700'}`}>
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${statusInfo?.bg || 'bg-blue-50 dark:bg-slate-700'} dark:bg-opacity-20 ${statusInfo?.color || 'text-blue-600 dark:text-blue-400'}`}>
                <StatusIcon size={24} strokeWidth={2.5} />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400 block mb-0.5">สถานะปัจจุบัน</span>
                <span className={`text-lg font-black ${statusInfo?.color || 'text-blue-900 dark:text-blue-50'}`}>{statusInfo?.text || 'ไม่ทราบสถานะ'}</span>
              </div>
            </div>

            {/* Timer */}
            {order.status !== 'done' && order.status !== 'cancel' && !isLate && (
              <div className="text-right bg-blue-50 dark:bg-slate-700 px-4 py-2 rounded-2xl border border-blue-100 dark:border-slate-600 transition-colors">
                <div className="text-2xl font-black text-blue-900 dark:text-blue-50 tabular-nums">
                  {minutes}:{seconds.toString().padStart(2, '0')}
                </div>
                <div className="text-[10px] font-bold text-blue-400 dark:text-blue-300">นาทีโดยประมาณ</div>
              </div>
            )}
            {isLate && order.status !== 'done' && order.status !== 'cancel' && (
              <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="text-right bg-rose-50 dark:bg-rose-900/30 px-3 py-2 rounded-2xl border border-rose-100 dark:border-rose-800">
                <div className="text-sm font-black text-rose-600 dark:text-rose-400 flex items-center gap-1"><Flame size={16} /> ล่าช้า!</div>
                <div className="text-[10px] font-bold text-rose-400 dark:text-rose-500">กำลังเร่งดำเนินการ</div>
              </motion.div>
            )}
          </div>

          {/* Progress Bar */}
          {order.status !== 'done' && order.status !== 'cancel' && (
            <div className="mb-6">
              <div className="relative h-2.5 bg-blue-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                <motion.div
                  className={`absolute top-0 left-0 h-full rounded-full ${order.status === 'delivery' ? 'bg-purple-500' : 'bg-blue-600'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 text-center flex items-center justify-center gap-1">
                <Timer size={12} className="text-blue-400 dark:text-blue-500" /> *รวมคิวที่รอแล้ว ร้านมีเวลาเตรียมอาหารอย่างเหมาะสม
              </p>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-blue-50 dark:bg-slate-700 rounded-2xl p-3 flex flex-col items-center justify-center text-center relative border border-blue-100 dark:border-slate-600 transition-colors">
              <Timer size={16} className="text-blue-400 dark:text-blue-400 mb-1" />
              <div className="text-xs font-black text-blue-900 dark:text-blue-50">{estimatedTotalTimeMin}m</div>
              <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">รวมทั้งหมด</div>
              {(order.status === 'pending' || order.status === 'checking_slip') && queueCount > 0 && (
                <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">
                  +{queueCount}m
                </div>
              )}
            </div>
            <div className="bg-blue-50 dark:bg-slate-700 rounded-2xl p-3 flex flex-col items-center justify-center text-center border border-blue-100 dark:border-slate-600 transition-colors">
              <ChefHat size={16} className="text-blue-400 dark:text-blue-400 mb-1" />
              <div className="text-xs font-black text-blue-900 dark:text-blue-50">{order.cooking_time_min}m</div>
              <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">เตรียมอาหาร</div>
            </div>
            <div className="bg-blue-50 dark:bg-slate-700 rounded-2xl p-3 flex flex-col items-center justify-center text-center border border-blue-100 dark:border-slate-600 transition-colors">
              <MapPin size={16} className="text-blue-400 dark:text-blue-400 mb-1" />
              <div className="text-xs font-black text-blue-900 dark:text-blue-50">{order.distance_km}km</div>
              <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">ระยะทาง</div>
            </div>
            <div className="bg-blue-50 dark:bg-slate-700 rounded-2xl p-3 flex flex-col items-center justify-center text-center border border-blue-100 dark:border-slate-600 transition-colors">
              <Footprints size={16} className="text-blue-400 dark:text-blue-400 mb-1" />
              <div className="text-xs font-black text-blue-900 dark:text-blue-50">{order.delivery_time_min}m</div>
              <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">การจัดส่ง</div>
            </div>
          </div>
        </motion.div>

        {/* 📝 Order Items & Receipt */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-blue-100 dark:border-slate-700 mb-6 transition-colors">
          <h2 className="text-base font-black mb-5 flex items-center gap-2 text-blue-900 dark:text-blue-50 pb-4 border-b border-blue-50 dark:border-slate-700 transition-colors">
            <Receipt size={18} className="text-blue-600 dark:text-blue-400" /> ใบเสร็จรับเงิน
          </h2>

          <div className="space-y-4 mb-6">
            <AnimatePresence>
              {order.items?.map((item, index) => (
                <motion.div key={index} className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-slate-700 border border-blue-100 dark:border-slate-600 overflow-hidden flex-shrink-0 flex items-center justify-center transition-colors">
                      {(item as any).image ? (
                        <img
                          src={(item as any).image}
                          alt={item.menu_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Utensils size={20} className="text-blue-300 dark:text-slate-500" />
                      )}
                    </div>

                    <div>
                      <div className="font-bold text-blue-800 dark:text-blue-200 text-sm leading-tight">{item.menu_name}</div>
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">x{item.quantity}</div>
                    </div>
                  </div>
                  <div className="font-black text-blue-600 dark:text-blue-400 text-sm">฿{(item.price * item.quantity).toLocaleString()}</div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="bg-blue-50 dark:bg-slate-700 p-4 rounded-2xl border border-blue-100 dark:border-slate-600 space-y-2 transition-colors">
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-slate-500 dark:text-slate-400">ค่าอาหารรวม</span>
              <span className="font-black text-blue-900 dark:text-blue-50">฿{subTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-slate-500 dark:text-slate-400">ค่าจัดส่ง ({order.distance_km} กม.)</span>
              <span className="font-black text-blue-900 dark:text-blue-50">฿{deliveryFee.toLocaleString()}</span>
            </div>
            <div className="border-t border-blue-200 dark:border-slate-600 my-2 transition-colors"></div>
            <div className="flex justify-between items-center">
              <span className="font-black text-blue-900 dark:text-blue-50">ยอดชำระสุทธิ</span>
              <span className="text-xl font-black text-blue-600 dark:text-blue-400">฿{order.total_price.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>
        
        {/* ⭐ Review Button */}
        {order.status === 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <button
              onClick={() => setShowReview(true)}
              className={`w-full py-4 rounded-2xl font-black text-lg shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 ${
                hasReviewed 
                ? 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-slate-700 hover:bg-blue-100 dark:hover:bg-slate-700' 
                : 'bg-gradient-to-r from-blue-700 to-blue-600 text-white hover:shadow-lg shadow-blue-600/30'
                }`}
            >
              <Star size={20} className={hasReviewed ? 'text-blue-400 dark:text-blue-500' : 'fill-amber-400 text-amber-400'} />
              {hasReviewed ? 'แก้ไขรีวิวของคุณ' : 'รีวิวอาหารมื้อนี้'}
            </button>
          </motion.div>
        )}
        
        {/* ❌ Cancel Button */}
        {(order.status === 'pending' || order.status === 'checking_slip') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-4">
            <button
              onClick={() => setShowCancelPopup(true)}
              className="w-full py-4 rounded-2xl font-black text-lg shadow-sm transition-all flex items-center justify-center gap-2 text-rose-500 bg-rose-50 border border-rose-200 hover:bg-rose-100 active:scale-95"
            >
              <XCircle size={20} />
              ยกเลิกออเดอร์
            </button>
          </motion.div>
        )}
      </div>

      {/* 🌟 Modal รีวิว */}
      <AnimatePresence>
        {showReview && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 w-full max-w-sm shadow-xl border border-blue-100 dark:border-slate-700 transition-colors"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
              <div className="w-16 h-16 bg-blue-50 dark:bg-slate-700 border border-blue-100 dark:border-slate-600 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                <Star size={32} className="fill-amber-500 text-amber-500" />
              </div>
              <h2 className="text-xl font-black mb-1 text-center text-blue-900 dark:text-blue-50">
                {hasReviewed ? 'แก้ไขรีวิว' : 'ให้คะแนนอาหาร'}
              </h2>
              <p className="text-center text-slate-500 dark:text-slate-400 font-medium text-sm mb-6">ช่วยบอกให้เรารู้ว่ามื้อนี้เป็นยังไงบ้าง 😊</p>

              {/* ดาว */}
              <div className="flex gap-2 mb-6 justify-center">
                {[1, 2, 3, 4, 5].map((starIdx) => (
                  <button key={starIdx} onClick={() => setRating(starIdx)} className="focus:outline-none transition-transform hover:scale-110 active:scale-95">
                    <Star size={36} className={`transition-colors ${starIdx <= rating ? 'fill-amber-500 text-amber-500' : 'text-slate-200 dark:text-slate-600'}`} />
                  </button>
                ))}
              </div>

              {/* Comment */}
              <textarea
                placeholder="เขียนรีวิวถึงร้านค้า (ไม่บังคับ)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-blue-50 dark:bg-slate-700 border border-blue-200 dark:border-slate-600 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none rounded-2xl p-4 mb-6 transition-all font-medium text-blue-900 dark:text-blue-50 placeholder-slate-400 dark:placeholder-slate-400 resize-none"
                rows={3}
              />

              <div className="flex gap-3">
                <button onClick={() => setShowReview(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl py-3.5 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  ยกเลิก
                </button>
                <button onClick={submitReview} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl py-3.5 transition-colors shadow-lg shadow-blue-600/30">
                  {hasReviewed ? 'บันทึก' : 'ส่งรีวิว'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ⚠️ Modal ยกเลิกออเดอร์ */}
      <AnimatePresence>
        {showCancelPopup && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 w-full max-w-sm shadow-xl border border-blue-100 dark:border-slate-700 text-center transition-colors"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100 dark:border-rose-800 transition-colors">
                <XCircle size={32} />
              </div>
              <h3 className="text-xl text-blue-900 dark:text-blue-50 font-black mb-2">
                ต้องการยกเลิกออเดอร์?
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-4 text-sm">
                เมื่อยกเลิกแล้วจะไม่สามารถย้อนกลับได้<br/>คุณแน่ใจใช่ไหม?
              </p>
              <div className="mb-6 text-left">
                <label className="block text-sm font-bold text-blue-900 dark:text-blue-50 mb-2">สาเหตุที่ยกเลิก <span className="text-rose-500">*</span></label>
                <textarea 
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="ระบุสาเหตุที่ยกเลิก..." 
                  className="w-full px-4 py-3 rounded-xl border border-blue-100 dark:border-slate-600 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-400 outline-none transition-all resize-none h-24 text-sm"
                ></textarea>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  disabled={!cancelReason.trim()}
                  onClick={handleCancelOrder} 
                  className={`w-full py-3.5 text-white rounded-xl font-bold shadow-md transition-colors ${cancelReason.trim() ? 'bg-rose-500 hover:bg-rose-600' : 'bg-rose-300 dark:bg-rose-800 cursor-not-allowed shadow-none'}`}
                >
                  ยืนยันการยกเลิก
                </button>
                <button 
                  onClick={() => { setShowCancelPopup(false); setCancelReason(''); }} 
                  className="w-full py-3.5 bg-blue-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl font-bold transition-colors border border-blue-100 dark:border-slate-600"
                >
                  ไม่ กลับไปก่อน
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}