'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
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

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const emojiIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Fetch Data
  useEffect(() => {
    if (!id) return;
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
  }, [id]);

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
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F4F8FF]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-[#1E3A8A] tracking-wide">กำลังโหลดออเดอร์...</span>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F4F8FF] p-4">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full border border-[#DCE8FF] shadow-[0_4px_20px_rgba(37,99,235,0.05)]">
          <XCircle size={56} className="text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-[#1E3A8A] mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-[#64748B] font-medium mb-6">{error || 'ไม่พบข้อมูลออเดอร์นี้'}</p>
          <button onClick={() => router.back()} className="w-full py-3.5 bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] rounded-xl font-bold transition-colors">
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
    <div className="min-h-screen bg-[#F4F8FF] font-sans text-slate-900 pb-24">

      {/* 🌟 Header */}
      <div className="bg-white px-4 py-4 sm:px-6 sticky top-0 z-40 border-b border-[#DCE8FF] shadow-[0_2px_10px_rgba(37,99,235,0.03)] flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-[#1D4ED8] font-bold text-sm transition-colors bg-[#EFF6FF] hover:bg-[#DBEAFE] px-3 py-2 rounded-xl border border-[#BFDBFE]">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-black text-[#1E3A8A] flex items-center gap-2">
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`bg-white rounded-3xl p-6 shadow-[0_4px_15px_rgba(37,99,235,0.04)] border mb-6 ${statusInfo?.border || 'border-[#DCE8FF]'}`}>
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${statusInfo?.bg || 'bg-[#F4F8FF]'} ${statusInfo?.color || 'text-[#2563EB]'}`}>
                <StatusIcon size={24} strokeWidth={2.5} />
              </div>
              <div>
                <span className="text-sm font-bold text-[#64748B] block mb-0.5">สถานะปัจจุบัน</span>
                <span className={`text-lg font-black ${statusInfo?.color || 'text-[#1E3A8A]'}`}>{statusInfo?.text || 'ไม่ทราบสถานะ'}</span>
              </div>
            </div>

            {/* Timer */}
            {order.status !== 'done' && order.status !== 'cancel' && !isLate && (
              <div className="text-right bg-[#F4F8FF] px-4 py-2 rounded-2xl border border-[#DCE8FF]">
                <div className="text-2xl font-black text-[#1E3A8A] tabular-nums">
                  {minutes}:{seconds.toString().padStart(2, '0')}
                </div>
                <div className="text-[10px] font-bold text-[#60A5FA]">นาทีโดยประมาณ</div>
              </div>
            )}
            {isLate && order.status !== 'done' && order.status !== 'cancel' && (
              <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="text-right bg-rose-50 px-3 py-2 rounded-2xl border border-rose-100">
                <div className="text-sm font-black text-rose-600 flex items-center gap-1"><Flame size={16} /> ล่าช้า!</div>
                <div className="text-[10px] font-bold text-rose-400">กำลังเร่งดำเนินการ</div>
              </motion.div>
            )}
          </div>

          {/* Progress Bar */}
          {order.status !== 'done' && order.status !== 'cancel' && (
            <div className="mb-6">
              <div className="relative h-2.5 bg-[#E0EFFF] rounded-full overflow-hidden mb-2">
                <motion.div
                  className={`absolute top-0 left-0 h-full rounded-full ${order.status === 'delivery' ? 'bg-[#8B5CF6]' : 'bg-[#2563EB]'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-[11px] font-semibold text-[#64748B] text-center flex items-center justify-center gap-1">
                <Timer size={12} className="text-[#93C5FD]" /> *รวมคิวที่รอแล้ว ร้านมีเวลาเตรียมอาหารอย่างเหมาะสม
              </p>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-[#F4F8FF] rounded-2xl p-3 flex flex-col items-center justify-center text-center relative border border-[#DCE8FF]">
              <Timer size={16} className="text-[#60A5FA] mb-1" />
              <div className="text-xs font-black text-[#1E3A8A]">{estimatedTotalTimeMin}m</div>
              <div className="text-[9px] font-bold text-[#64748B] mt-0.5">รวมทั้งหมด</div>
              {(order.status === 'pending' || order.status === 'checking_slip') && queueCount > 0 && (
                <div className="absolute -top-2 -right-2 bg-[#2563EB] text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">
                  +{queueCount}m
                </div>
              )}
            </div>
            <div className="bg-[#F4F8FF] rounded-2xl p-3 flex flex-col items-center justify-center text-center border border-[#DCE8FF]">
              <ChefHat size={16} className="text-[#60A5FA] mb-1" />
              <div className="text-xs font-black text-[#1E3A8A]">{order.cooking_time_min}m</div>
              <div className="text-[9px] font-bold text-[#64748B] mt-0.5">เตรียมอาหาร</div>
            </div>
            <div className="bg-[#F4F8FF] rounded-2xl p-3 flex flex-col items-center justify-center text-center border border-[#DCE8FF]">
              <MapPin size={16} className="text-[#60A5FA] mb-1" />
              <div className="text-xs font-black text-[#1E3A8A]">{order.distance_km}km</div>
              <div className="text-[9px] font-bold text-[#64748B] mt-0.5">ระยะทาง</div>
            </div>
            <div className="bg-[#F4F8FF] rounded-2xl p-3 flex flex-col items-center justify-center text-center border border-[#DCE8FF]">
              <Footprints size={16} className="text-[#60A5FA] mb-1" />
              <div className="text-xs font-black text-[#1E3A8A]">{order.delivery_time_min}m</div>
              <div className="text-[9px] font-bold text-[#64748B] mt-0.5">การจัดส่ง</div>
            </div>
          </div>
        </motion.div>

        {/* 📝 Order Items & Receipt */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-3xl p-6 shadow-[0_4px_15px_rgba(37,99,235,0.04)] border border-[#DCE8FF] mb-6">
          <h2 className="text-base font-black mb-5 flex items-center gap-2 text-[#1E3A8A] pb-4 border-b border-[#EBF1FF]">
            <Receipt size={18} className="text-[#2563EB]" /> ใบเสร็จรับเงิน
          </h2>

          <div className="space-y-4 mb-6">
            <AnimatePresence>
              {order.items?.map((item, index) => (
                <motion.div key={index} className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#F4F8FF] border border-[#DCE8FF] overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {(item as any).image ? (
                        <img
                          src={(item as any).image}
                          alt={item.menu_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Utensils size={20} className="text-[#93C5FD]" />
                      )}
                    </div>

                    <div>
                      <div className="font-bold text-[#1E40AF] text-sm leading-tight">{item.menu_name}</div>
                      <div className="text-xs font-bold text-[#64748B] mt-1">x{item.quantity}</div>
                    </div>
                  </div>
                  <div className="font-black text-[#2563EB] text-sm">฿{(item.price * item.quantity).toLocaleString()}</div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="bg-[#F4F8FF] p-4 rounded-2xl border border-[#DCE8FF] space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-[#64748B]">ค่าอาหารรวม</span>
              <span className="font-black text-[#1E3A8A]">฿{subTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-[#64748B]">ค่าจัดส่ง ({order.distance_km} กม.)</span>
              <span className="font-black text-[#1E3A8A]">฿{deliveryFee.toLocaleString()}</span>
            </div>
            <div className="border-t border-[#BFDBFE] my-2"></div>
            <div className="flex justify-between items-center">
              <span className="font-black text-[#1E3A8A]">ยอดชำระสุทธิ</span>
              <span className="text-xl font-black text-[#2563EB]">฿{order.total_price.toLocaleString()}</span>
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
                ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] hover:bg-[#DBEAFE]' 
                : 'bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white hover:shadow-[0_8px_20px_rgba(37,99,235,0.3)]'
                }`}
            >
              <Star size={20} className={hasReviewed ? 'text-[#60A5FA]' : 'fill-[#FCD34D] text-[#FCD34D]'} />
              {hasReviewed ? 'แก้ไขรีวิวของคุณ' : 'รีวิวอาหารมื้อนี้'}
            </button>
          </motion.div>
        )}
      </div>

      {/* 🌟 Modal รีวิว */}
      <AnimatePresence>
        {showReview && (
          <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-[0_10px_40px_rgba(37,99,235,0.15)] border border-[#DCE8FF]"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
              <div className="w-16 h-16 bg-[#F4F8FF] border border-[#DCE8FF] rounded-full flex items-center justify-center mx-auto mb-4">
                <Star size={32} className="fill-[#F59E0B] text-[#F59E0B]" />
              </div>
              <h2 className="text-xl font-black mb-1 text-center text-[#1E3A8A]">
                {hasReviewed ? 'แก้ไขรีวิว' : 'ให้คะแนนอาหาร'}
              </h2>
              <p className="text-center text-[#64748B] font-medium text-sm mb-6">ช่วยบอกให้เรารู้ว่ามื้อนี้เป็นยังไงบ้าง 😊</p>

              {/* ดาว */}
              <div className="flex gap-2 mb-6 justify-center">
                {[1, 2, 3, 4, 5].map((starIdx) => (
                  <button key={starIdx} onClick={() => setRating(starIdx)} className="focus:outline-none transition-transform hover:scale-110 active:scale-95">
                    <Star size={36} className={`transition-colors ${starIdx <= rating ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-[#E2E8F0]'}`} />
                  </button>
                ))}
              </div>

              {/* Comment */}
              <textarea
                placeholder="เขียนรีวิวถึงร้านค้า (ไม่บังคับ)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-[#F4F8FF] border border-[#BFDBFE] focus:border-[#2563EB] focus:ring-4 focus:ring-[#E0EFFF] outline-none rounded-2xl p-4 mb-6 transition-all font-medium text-[#1E3A8A] resize-none"
                rows={3}
              />

              <div className="flex gap-3">
                <button onClick={() => setShowReview(false)} className="flex-1 bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl py-3.5 font-bold text-[#475569] hover:bg-[#E2E8F0] transition-colors">
                  ยกเลิก
                </button>
                <button onClick={submitReview} className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black rounded-xl py-3.5 transition-colors shadow-[0_4px_12px_rgba(37,99,235,0.25)]">
                  {hasReviewed ? 'บันทึก' : 'ส่งรีวิว'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}