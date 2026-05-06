'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  MapPin,
  ChefHat,
  Bike,
  Package,
  CheckCircle,
  XCircle,
  Timer,
  Footprints,
  Flame,
  Coffee,
  Utensils,
  Loader2,
  Star
} from 'lucide-react';

type OrderItem = {
  menu_name: string;
  quantity: number;
  price: number;
};

type Order = {
  id: number;
  status: string;
  created_at: string;
  total_price: number;
  distance_km: number;
  cooking_time_min: number;
  delivery_time_min: number;
  total_time_min: number;
  items: OrderItem[];
};

const statusIcons = {
  pending: { icon: Clock, color: '#f59e0b', text: 'รับออเดอร์' },
  cooking: { icon: ChefHat, color: '#3b82f6', text: 'กำลังปรุง' },
  delivery: { icon: Bike, color: '#8b5cf6', text: 'กำลังไป' },
  done: { icon: CheckCircle, color: '#10b981', text: 'ถึงมือเธอ' },
  cancel: { icon: XCircle, color: '#ef4444', text: 'ยกเลิก' }
};

const foodEmojis = ['🍔', '🍕', '🌮', '🍣', '🥗', '🍜', '🍛', '🍝'];

export default function OrderDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [isLate, setIsLate] = useState(false);
  const [emojiIndex, setEmojiIndex] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  // ใช้ ref เพื่อเก็บ interval ID สำหรับ cleanup
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const emojiIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ฟังก์ชัน submit review แยกออกจาก useEffect เพื่อให้ใช้ order ล่าสุดได้
  const submitReview = useCallback(async () => {
    if (!order) return;

    try {
      const res = await fetch('/api/customer/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          rating,
          comment
        })
      });

      if (!res.ok) throw new Error('ส่งรีวิวไม่สำเร็จ');

      setShowReview(false);
      alert('ขอบคุณสำหรับรีวิว ❤️');
    } catch (err) {
      alert('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
    }
  }, [order, rating, comment]);

  // โหลดข้อมูลออเดอร์
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    fetch(`/api/customer/order/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'ไม่สามารถโหลดข้อมูลได้');
        }
        return res.json();
      })
      .then((data) => {
        setOrder(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  // จัดการ emoji animation (แยก effect)
  useEffect(() => {
    emojiIntervalRef.current = setInterval(() => {
      setEmojiIndex((prev) => (prev + 1) % foodEmojis.length);
    }, 500);

    return () => {
      if (emojiIntervalRef.current) clearInterval(emojiIntervalRef.current);
    };
  }, []);

  // จัดการ countdown timer
  useEffect(() => {
    if (!order) return;
    if (order.status === 'done' || order.status === 'cancel') {
      setRemainingTime(0);
      setIsLate(false);
      return;
    }

    const created = new Date(order.created_at).getTime();
    const endTime = created + order.total_time_min * 60 * 1000;

    // ฟังก์ชันอัปเดตเวลา
    const updateRemaining = () => {
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0) {
        setRemainingTime(0);
        setIsLate(true);
        // เมื่อหมดเวลาแล้วหยุด interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        setRemainingTime(diff);
        setIsLate(false);
      }
    };

    // เรียกทันทีครั้งแรก
    updateRemaining();

    // ตั้ง interval
    intervalRef.current = setInterval(updateRemaining, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [order]); // ขึ้นกับ order เท่านั้น เมื่อ order เปลี่ยนให้คำนวณใหม่

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 size={40} className="text-blue-500" />
        </motion.div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-6 text-center max-w-md">
          <XCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-gray-600">{error || 'ไม่พบออเดอร์'}</p>
        </div>
      </div>
    );
  }

  const minutes = Math.floor(remainingTime / 60000);
  const seconds = Math.floor((remainingTime % 60000) / 1000);
  const progress =
    order.status !== 'done' && order.status !== 'cancel'
      ? ((order.total_time_min * 60 * 1000 - remainingTime) / (order.total_time_min * 60 * 1000)) * 100
      : 100;

  const StatusIcon = statusIcons[order.status as keyof typeof statusIcons]?.icon;
  const statusColor = statusIcons[order.status as keyof typeof statusIcons]?.color;
  const statusText = statusIcons[order.status as keyof typeof statusIcons]?.text;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">#{order.id}</h1>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: order.status === 'delivery' ? Infinity : 0 }}
            className="text-4xl"
          >
            {order.status === 'delivery' ? '🛵' : foodEmojis[emojiIndex]}
          </motion.div>
        </div>

        {/* Status Card */}
        <motion.div
          className="bg-white/80 backdrop-blur-lg rounded-3xl p-6 shadow-xl mb-4"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {StatusIcon && <StatusIcon size={28} color={statusColor} />}
              <span className="text-lg font-semibold">{statusText}</span>
            </div>
            {order.status !== 'done' && order.status !== 'cancel' && !isLate && (
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800">
                  {minutes}:{seconds.toString().padStart(2, '0')}
                </div>
                <div className="text-xs text-gray-500">เหลือเวลาอีก</div>
              </div>
            )}
            {isLate && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="text-red-500 font-bold flex items-center gap-1"
              >
                <Flame size={20} />
                <span>สายแล้ว!</span>
              </motion.div>
            )}
          </div>

          {/* Progress Bar */}
          {order.status !== 'done' && order.status !== 'cancel' && (
            <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden mb-4">
              <motion.div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-purple-400"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <MapPin size={16} className="text-gray-500 mb-1" />
              <div className="text-sm font-semibold">{order.distance_km} km</div>
              <div className="text-xs text-gray-500">ระยะทาง</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <Timer size={16} className="text-gray-500 mb-1" />
              <div className="text-sm font-semibold">{order.total_time_min} นาที</div>
              <div className="text-xs text-gray-500">เวลารวม</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <ChefHat size={16} className="text-gray-500 mb-1" />
              <div className="text-sm font-semibold">{order.cooking_time_min}'</div>
              <div className="text-xs text-gray-500">ทำอาหาร</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <Footprints size={16} className="text-gray-500 mb-1" />
              <div className="text-sm font-semibold">{order.delivery_time_min}'</div>
              <div className="text-xs text-gray-500">จัดส่ง</div>
            </div>
          </div>
        </motion.div>

        {/* Menu Items */}
        <motion.div
          className="bg-white/80 backdrop-blur-lg rounded-3xl p-6 shadow-xl mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Utensils size={20} className="text-gray-600" />
            รายการอาหาร
          </h2>

          <div className="space-y-3 mb-4">
            <AnimatePresence>
              {order.items?.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{foodEmojis[index % foodEmojis.length]}</span>
                    <div>
                      <div className="font-medium">{item.menu_name}</div>
                      <div className="text-sm text-gray-500">x{item.quantity}</div>
                    </div>
                  </div>
                  <div className="font-semibold">฿{item.price * item.quantity}</div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between pt-3 border-t-2 border-gray-200">
            <span className="font-semibold">รวมทั้งสิ้น</span>
            <span className="text-2xl font-bold text-blue-600">฿{order.total_price}</span>
          </div>
        </motion.div>

        {/* Fun Animation while waiting */}
        {order.status === 'pending' && (
          <motion.div
            className="bg-white/80 backdrop-blur-lg rounded-3xl p-4 text-center"
            animate={{
              backgroundColor: ['#ffffffcc', '#fef3c7cc', '#ffffffcc'],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <p className="text-sm text-gray-600">กำลังรับออเดอร์...</p>
            <div className="flex justify-center gap-2 mt-2">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-yellow-400 rounded-full"
                  animate={{ y: [-5, 0, -5] }}
                  transition={{ duration: 0.6, delay: i * 0.2, repeat: Infinity }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {order.status === 'delivery' && (
          <motion.div
            className="bg-white/80 backdrop-blur-lg rounded-3xl p-4 text-center"
            animate={{ x: [-10, 10, -10] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <p className="text-sm text-gray-600">ไรเดอร์กำลังไป...</p>
            <div className="text-4xl mt-2">🛵 💨</div>
          </motion.div>
        )}

        {order.status === 'cooking' && (
          <motion.div className="bg-white/80 backdrop-blur-lg rounded-3xl p-4 text-center">
            <p className="text-sm text-gray-600 mb-2">กำลังปรุงอาหาร</p>
            <div className="flex justify-center gap-1">
              {['🍳', '🔪', '🥘'].map((emoji, i) => (
                <motion.span
                  key={i}
                  className="text-2xl"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 1, delay: i * 0.3, repeat: Infinity }}
                >
                  {emoji}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ปุ่มรีวิวเมื่อออเดอร์เสร็จ */}
        {order.status === 'done' && (
          <motion.div className="mt-4">
            <button
              onClick={() => setShowReview(true)}
              className="w-full bg-yellow-400 text-white font-semibold py-3 rounded-2xl shadow hover:scale-105 transition flex items-center justify-center gap-2"
            >
              <Star size={20} /> รีวิวอาหาร
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Modal รีวิว */}
      <AnimatePresence>
        {showReview && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-3xl p-6 w-full max-w-sm"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <h2 className="text-lg font-semibold mb-3">รีวิวอาหาร</h2>

              {/* Rating */}
              <div className="flex gap-2 mb-4 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-3xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                  >
                    ⭐
                  </button>
                ))}
              </div>

              {/* Comment */}
              <textarea
                placeholder="เขียนรีวิว..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full border rounded-xl p-2 mb-4"
                rows={3}
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setShowReview(false)}
                  className="flex-1 border rounded-xl py-2"
                >
                  ยกเลิก
                </button>

                <button
                  onClick={submitReview}
                  className="flex-1 bg-green-500 text-white rounded-xl py-2"
                >
                  ส่งรีวิว
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}