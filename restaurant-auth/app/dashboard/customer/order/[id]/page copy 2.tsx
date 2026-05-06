'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  MapPin, 
  ChefHat, 
  Bike, 
  CheckCircle, 
  XCircle,
  Timer,
  Footprints,
  Flame,
  Utensils,
  Loader2,
  Gamepad2,
  Trophy,
  Star,
  Zap,
  RotateCcw
} from 'lucide-react';

// ============ MINI GAMES ============

// เกมจับสั่นสะเทือน
const ShakeGame = ({ onWin }: { onWin: () => void }) => {
  const [shakeCount, setShakeCount] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const targetCount = 10;

  useEffect(() => {
    const handleDeviceMotion = () => {
      if (!isShaking) {
        setIsShaking(true);
        setShakeCount(prev => {
          const newCount = prev + 1;
          if (newCount >= targetCount) {
            onWin();
            return 0;
          }
          return newCount;
        });
        setTimeout(() => setIsShaking(false), 300);
      }
    };

    window.addEventListener('devicemotion', handleDeviceMotion);
    return () => window.removeEventListener('devicemotion', handleDeviceMotion);
  }, [isShaking, onWin]);

  return (
    <div className="text-center">
      <div className="text-6xl mb-4 animate-bounce">📱</div>
      <p className="text-sm text-gray-600 mb-2">เขย่าโทรศัพท์!</p>
      <div className="flex justify-center gap-1">
        {[...Array(targetCount)].map((_, i) => (
          <motion.div
            key={i}
            className={`w-2 h-8 rounded-full ${i < shakeCount ? 'bg-green-500' : 'bg-gray-300'}`}
            animate={i === shakeCount ? { scaleY: [1, 1.5, 1] } : {}}
          />
        ))}
      </div>
    </div>
  );
};

// เกมจับเวลาปรุงอาหาร
const CookingGame = ({ onWin }: { onWin: () => void }) => {
  const [progress, setProgress] = useState(0);
  const [isBurning, setIsBurning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setIsBurning(true);
          return prev;
        }
        return prev + Math.random() * 5;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const handleFlip = () => {
    if (progress > 80 && progress < 95) {
      onWin();
    } else {
      alert('😢 ไหม้เกรียม! ลองใหม่');
      setProgress(0);
      setIsBurning(false);
    }
  };

  return (
    <div className="text-center">
      <motion.div
        animate={{ rotate: isBurning ? [0, 5, -5, 0] : 0 }}
        transition={{ duration: 0.3, repeat: isBurning ? Infinity : 0 }}
        className="text-6xl mb-4"
      >
        {isBurning ? '🔥' : '🥘'}
      </motion.div>
      <div className="h-4 bg-gray-200 rounded-full mb-4 overflow-hidden">
        <motion.div 
          className="h-full"
          style={{ 
            width: `${Math.min(progress, 100)}%`,
            backgroundColor: progress > 80 ? '#ef4444' : '#10b981'
          }}
        />
      </div>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleFlip}
        className="bg-orange-500 text-white px-6 py-2 rounded-full text-sm font-semibold"
        disabled={isBurning}
      >
        พลิกกลับ 🍳
      </motion.button>
      <p className="text-xs text-gray-500 mt-2">พลิกตอน 80-95%</p>
    </div>
  );
};

// เกมจับคู่อาหาร
const MemoryGame = ({ onWin }: { onWin: () => void }) => {
  const [cards, setCards] = useState([
    { id: 1, emoji: '🍔', matched: false, flipped: false },
    { id: 2, emoji: '🍕', matched: false, flipped: false },
    { id: 3, emoji: '🌮', matched: false, flipped: false },
    { id: 4, emoji: '🍣', matched: false, flipped: false },
    { id: 5, emoji: '🍔', matched: false, flipped: false },
    { id: 6, emoji: '🍕', matched: false, flipped: false },
    { id: 7, emoji: '🌮', matched: false, flipped: false },
    { id: 8, emoji: '🍣', matched: false, flipped: false },
  ].sort(() => Math.random() - 0.5));
  
  const [selected, setSelected] = useState<number[]>([]);
  const [disabled, setDisabled] = useState(false);

  const handleCardClick = (id: number) => {
    if (disabled) return;
    
    const card = cards.find(c => c.id === id);
    if (card?.matched || card?.flipped) return;

    setCards(prev => prev.map(c => 
      c.id === id ? { ...c, flipped: true } : c
    ));

    setSelected(prev => [...prev, id]);
  };

  useEffect(() => {
    if (selected.length === 2) {
      setDisabled(true);
      const [firstId, secondId] = selected;
      const firstCard = cards.find(c => c.id === firstId);
      const secondCard = cards.find(c => c.id === secondId);

      if (firstCard?.emoji === secondCard?.emoji) {
        setCards(prev => prev.map(c => 
          c.id === firstId || c.id === secondId ? { ...c, matched: true } : c
        ));
        setSelected([]);
        setDisabled(false);
      } else {
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            c.id === firstId || c.id === secondId ? { ...c, flipped: false } : c
          ));
          setSelected([]);
          setDisabled(false);
        }, 1000);
      }
    }
  }, [selected, cards]);

  useEffect(() => {
    if (cards.every(c => c.matched)) {
      onWin();
    }
  }, [cards, onWin]);

  return (
    <div>
      <p className="text-sm text-gray-600 mb-3 text-center">จับคู่อาหาร</p>
      <div className="grid grid-cols-4 gap-2">
        {cards.map(card => (
          <motion.button
            key={card.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleCardClick(card.id)}
            className={`aspect-square rounded-xl text-2xl flex items-center justify-center
              ${card.matched ? 'bg-green-100' : card.flipped ? 'bg-white' : 'bg-blue-500'}`}
            disabled={card.matched || disabled}
          >
            <AnimatePresence mode="wait">
              {card.matched || card.flipped ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  {card.emoji}
                </motion.span>
              ) : (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="text-white"
                >
                  ?
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// เกมแตะด่วน
const TapGame = ({ onWin }: { onWin: () => void }) => {
  const [taps, setTaps] = useState(0);
  const targetTaps = 20;
  const [timeLeft, setTimeLeft] = useState(5);
  const [gameActive, setGameActive] = useState(true);

  useEffect(() => {
    if (!gameActive) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameActive]);

  const handleTap = () => {
    if (!gameActive) return;
    
    setTaps(prev => {
      const newTaps = prev + 1;
      if (newTaps >= targetTaps) {
        onWin();
        return 0;
      }
      return newTaps;
    });
  };

  if (!gameActive) {
    return (
      <div className="text-center">
        <p className="text-red-500 mb-2">หมดเวลา!</p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setTaps(0);
            setTimeLeft(5);
            setGameActive(true);
          }}
          className="text-blue-500 flex items-center gap-1 mx-auto"
        >
          <RotateCcw size={16} /> เล่นใหม่
        </motion.button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-600">⏱️ {timeLeft}s</span>
        <span className="text-sm text-gray-600">{taps}/{targetTaps}</span>
      </div>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleTap}
        className="w-32 h-32 bg-gradient-to-br from-orange-400 to-red-500 
                   rounded-full text-white text-4xl shadow-lg mx-auto
                   flex items-center justify-center"
      >
        🍔
      </motion.button>
    </div>
  );
};

// ============ MAIN COMPONENT ============

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
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [isLate, setIsLate] = useState(false);
  const [emojiIndex, setEmojiIndex] = useState(0);
  const [showGames, setShowGames] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [showWinEffect, setShowWinEffect] = useState(false);

  useEffect(() => {
    if (!id) return;

    const emojiInterval = setInterval(() => {
      setEmojiIndex((prev) => (prev + 1) % foodEmojis.length);
    }, 500);

    let interval: NodeJS.Timeout;

    fetch(`/api/customer/order/${id}`)
      .then(res => res.json())
      .then(data => {
        setOrder(data);

        if (data.status === 'done' || data.status === 'cancel') {
          setRemainingTime(0);
          return;
        }

        const created = new Date(data.created_at).getTime();
        const endTime = created + data.total_time_min * 60 * 1000;

        interval = setInterval(() => {
          const now = Date.now();
          const diff = endTime - now;

          if (diff <= 0) {
            setRemainingTime(0);
            setIsLate(true);
          } else {
            setRemainingTime(diff);
          }
        }, 1000);
      });

    return () => {
      clearInterval(emojiInterval);
      if (interval) clearInterval(interval);
    };
  }, [id]);

  const handleGameWin = () => {
    setPoints(prev => prev + 10);
    setShowWinEffect(true);
    setSelectedGame(null);
    setTimeout(() => setShowWinEffect(false), 2000);
  };

  if (!order) return (
    <div className="flex items-center justify-center min-h-screen">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 size={40} className="text-blue-500" />
      </motion.div>
    </div>
  );

  const minutes = Math.floor(remainingTime / 60000);
  const seconds = Math.floor((remainingTime % 60000) / 1000);
  const progress = order.status !== 'done' && order.status !== 'cancel' 
    ? ((order.total_time_min * 60 * 1000 - remainingTime) / (order.total_time_min * 60 * 1000)) * 100
    : 100;

  const games = [
    { id: 'shake', name: 'เขย่า!', icon: '📱', component: ShakeGame },
    { id: 'cook', name: 'พลิกไข่', icon: '🍳', component: CookingGame },
    { id: 'memory', name: 'จับคู่', icon: '🎴', component: MemoryGame },
    { id: 'tap', name: 'แตะด่วน', icon: '👆', component: TapGame },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      {/* Win Effect */}
      <AnimatePresence>
        {showWinEffect && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                       bg-gradient-to-r from-yellow-400 to-orange-400 text-white
                       px-8 py-4 rounded-full text-2xl font-bold z-50
                       flex items-center gap-2 shadow-2xl"
          >
            <Trophy size={32} />
            +10 คะแนน!
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto"
      >
        {/* Header with Points */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">#{order.id}</h1>
          <div className="flex items-center gap-4">
            <motion.div 
              className="flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow"
              animate={{ scale: points > 0 ? [1, 1.2, 1] : 1 }}
            >
              <Star size={16} className="text-yellow-500 fill-current" />
              <span className="font-bold">{points}</span>
            </motion.div>
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: order.status === 'delivery' ? Infinity : 0 }}
              className="text-4xl"
            >
              {order.status === 'delivery' ? '🛵' : foodEmojis[emojiIndex]}
            </motion.div>
          </div>
        </div>

        {/* Status Card */}
        <motion.div 
          className="bg-white/80 backdrop-blur-lg rounded-3xl p-6 shadow-xl mb-4"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {statusIcons[order.status as keyof typeof statusIcons] && (
                <>
                  {(() => {
                    const Icon = statusIcons[order.status as keyof typeof statusIcons].icon;
                    return <Icon size={28} color={statusIcons[order.status as keyof typeof statusIcons].color} />;
                  })()}
                  <span className="text-lg font-semibold">
                    {statusIcons[order.status as keyof typeof statusIcons].text}
                  </span>
                </>
              )}
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

        {/* Games Section */}
        {(order.status === 'pending' || order.status === 'cooking' || order.status === 'delivery') && (
          <motion.div 
            className="bg-white/80 backdrop-blur-lg rounded-3xl p-6 shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <button
              onClick={() => setShowGames(!showGames)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Gamepad2 size={20} className="text-purple-500" />
                <span className="font-semibold">เกมฆ่าเวลา</span>
              </div>
              <motion.div
                animate={{ rotate: showGames ? 180 : 0 }}
              >
                ▼
              </motion.div>
            </button>

            <AnimatePresence>
              {showGames && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  {!selectedGame ? (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {games.map(game => (
                        <motion.button
                          key={game.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedGame(game.id)}
                          className="bg-gradient-to-br from-purple-100 to-pink-100 
                                   rounded-xl p-3 text-center"
                        >
                          <div className="text-3xl mb-1">{game.icon}</div>
                          <div className="text-sm font-medium">{game.name}</div>
                          <div className="text-xs text-purple-500 flex items-center justify-center gap-1 mt-1">
                            <Zap size={12} /> +10
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4"
                    >
                      <button
                        onClick={() => setSelectedGame(null)}
                        className="text-sm text-gray-500 mb-3 flex items-center gap-1"
                      >
                        ← กลับ
                      </button>
                      
                      {selectedGame === 'shake' && <ShakeGame onWin={handleGameWin} />}
                      {selectedGame === 'cook' && <CookingGame onWin={handleGameWin} />}
                      {selectedGame === 'memory' && <MemoryGame onWin={handleGameWin} />}
                      {selectedGame === 'tap' && <TapGame onWin={handleGameWin} />}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}