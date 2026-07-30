'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export default function Mascot() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  
  const [showMessage, setShowMessage] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isMascotEnabled, setIsMascotEnabled] = useState(false);
  
  // State สำหรับให้เชฟเดินไปมา
  const [pos, setPos] = useState({ x: 0, facingRight: false, duration: 0 });
  const [isWalking, setIsWalking] = useState(false);
  // ระบบเสียงพูด (Text-to-Speech)
  const speakMessage = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // หยุดเสียงเก่าก่อนถ้ากำลังพูดอยู่
      window.speechSynthesis.cancel();
      
      // เอา Emoji, สัญลักษณ์, และเครื่องหมายวรรคตอนต่างๆ ออกให้หมดก่อนอ่าน (เพื่อป้องกันการอ่านออกเสียงแปลกๆ เช่น จุลภาค)
      const cleanText = text.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s]/g, '');
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'th-TH'; // ภาษาไทย
      utterance.rate = 0.9;     // ลดความเร็วลงให้ฟังรู้เรื่องและเป็นธรรมชาติขึ้น
      utterance.pitch = 1.2;    // เสียงสูงขึ้นนิดนึงให้ดูน่ารัก
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // เช็คการตั้งค่า
  useEffect(() => {
    const checkSetting = () => {
      const show = localStorage.getItem('show_mascot');
      setIsMascotEnabled(show === 'true');
    };
    checkSetting();
    window.addEventListener('mascot_setting_changed', checkSetting);
    return () => window.removeEventListener('mascot_setting_changed', checkSetting);
  }, []);

  // ข้อความตามหน้าที่กำลังใช้งาน
  useEffect(() => {
    if (!pathname) return;
    
    let msg = '';
    if (pathname === '/dashboard/customer') {
      msg = 'ยินดีต้อนรับกลับมาครับ! เลื่อนดูเมนูได้เลย 😋';
    } else if (pathname.includes('/customer/menu')) {
      msg = 'กดสั่งอาหารใส่ตะกร้าได้เลย! 🍔';
    } else if (pathname.includes('/customer/cart')) {
      msg = 'เช็ครายการในตะกร้าก่อนกดยืนยันสั่งอาหารนะครับ 🛒';
    } else if (pathname.includes('/customer/order')) {
      msg = 'ออเดอร์กำลังดำเนินการครับ นั่งรอชิลๆ ได้เลย ⏳';
    } else if (pathname.includes('/customer/profile')) {
      msg = 'จัดการข้อมูลส่วนตัว หรือตั้งค่าปิดมาสคอตได้ที่นี่ครับ ⚙️';
    } else if (pathname.includes('/customer/reserve')) {
      msg = 'สำหรับหน้านี้เป็นหน้าเอาไว้ดูสถานะโต๊ะในร้านนะครับ 🪑';
    } else {
      msg = 'มีอะไรให้ผมช่วยบอกได้เสมอนะครับ 😊';
    }

    setCurrentMessage(msg);
    // ยกเลิกการโชว์ข้อความอัตโนมัติเมื่อเปลี่ยนหน้า เพื่อให้รอผู้ใช้กดตัวน้องก่อน
    setShowMessage(false);
  }, [pathname]);

  // ระบบเดินลาดตระเวน (Patrol Mode) เดินไปมาระหว่างจุด A และ B แบบชัดเจน ไม่งง
  useEffect(() => {
    let walkTimeout: NodeJS.Timeout;
    let stopTimeout: NodeJS.Timeout;
    
    // กำหนดจุดซ้ายสุด (minLeft) และขวาสุด (maxRight) ของเส้นทางเดิน
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const isMobile = screenWidth < 768;
    const containerWidth = isMobile ? 100 : 220;
    
    // สำหรับมือถือ ให้เดินอยู่เฉพาะในช่องว่าง (กรอบแดง) ระหว่างคำว่า "หน้าหลัก" กับ "ปุ่มตะกร้า"
    // กล่องกว้าง 100px ขอบขวาสุดต้องเว้นปุ่มตะกร้า ขอบซ้ายสุดต้องเว้นคำว่า หน้าหลัก
    const maxRight = isMobile ? screenWidth - containerWidth - 50 : screenWidth - containerWidth - 80;
    const minLeft = isMobile ? Math.max(120, screenWidth - containerWidth - 110) : Math.max(20, screenWidth - 400); 
    
    // ตั้งค่าเริ่มต้น
    setPos({ x: maxRight, facingRight: false, duration: 0 });
    
    let currentX = maxRight;
    let currentTarget = minLeft;

    const patrol = () => {
      // คำนวณระยะทางและเวลา (ความเร็ว 30px ต่อวินาที ไม่ช้าไม่เร็วเกินไป)
      const actualDistance = Math.abs(currentTarget - currentX);
      const duration = actualDistance / 30; 
      
      if (duration > 0) {
        setIsWalking(true);
        const walkRight = currentTarget > currentX;
        
        // สั่งเดิน
        setPos({ x: currentTarget, facingRight: walkRight, duration });
        currentX = currentTarget; // อัปเดตจุดที่กำลังจะไปถึงสำหรับรอบถัดไป
        
        // ตั้งเวลาหยุดเดินเมื่อถึงจุดหมาย
        stopTimeout = setTimeout(() => {
          setIsWalking(false);
          
          // สลับเป้าหมายเพื่อเดินกลับ
          currentTarget = currentTarget === minLeft ? maxRight : minLeft;
          
          // รอ 3 วินาที แล้วหันหน้าเตรียมเดินต่อ
          walkTimeout = setTimeout(() => {
            const nextWalkRight = currentTarget > currentX;
            setPos(curr => ({ ...curr, facingRight: nextWalkRight, duration: 0.3 }));
            
            // รอหันหน้าเสร็จ 0.5 วินาที ค่อยเริ่มก้าวขา
            walkTimeout = setTimeout(patrol, 500); 
          }, 3000);
          
        }, duration * 1000);
        
      } else {
        currentTarget = currentTarget === minLeft ? maxRight : minLeft;
        walkTimeout = setTimeout(patrol, 1000);
      }
    };

    // เริ่มเดินครั้งแรก
    walkTimeout = setTimeout(patrol, 2000);
    
    return () => {
      clearTimeout(walkTimeout);
      clearTimeout(stopTimeout);
    };
  }, []);

  if (status !== 'authenticated' || (session?.user as any)?.role !== 'customer') {
    return null;
  }

  if (!isMascotEnabled) return null;

  return (
    <>
      {/* CSS Animation สำหรับการเดิน */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes walkBackLeg {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(30deg); }
        }
        @keyframes walkFrontLeg {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-30deg); }
        }
        @keyframes floatBody {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes armSwingBack {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-15deg); }
        }
        @keyframes armSwingFront {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(15deg); }
        }
        .walking-back-leg { animation: walkBackLeg 0.8s infinite ease-in-out; transform-origin: 40px 110px; }
        .walking-front-leg { animation: walkFrontLeg 0.8s infinite ease-in-out; transform-origin: 60px 110px; }
        .walking-body { animation: floatBody 0.4s infinite ease-in-out; }
        .walking-arm-back { animation: armSwingBack 0.8s infinite ease-in-out; transform-origin: 40px 70px; }
        .walking-arm-front { animation: armSwingFront 0.8s infinite ease-in-out; transform-origin: 60px 70px; }
      `}} />

      {/* กล่องหลักควบคุมตำแหน่งแกน X (กำหนดความกว้างคงที่ เพื่อไม่ให้กล่องข้อความดัน Layout ขยับตอนคลิก) */}
      <motion.div 
        className="fixed top-3 md:top-4 left-0 w-[100px] md:w-[220px] z-[40] pointer-events-none flex flex-col items-center"
        animate={{ x: pos.x }}
        transition={{ duration: pos.duration, ease: "linear" }}
      >
        {/* 👨‍🍳 Mascot เชฟเต็มตัว */}
        <motion.div
          animate={{ scaleX: pos.facingRight ? 1 : -1 }}
          transition={{ duration: 0.3 }}
          className="relative pointer-events-auto cursor-pointer drop-shadow-xl z-20"
          onClick={() => {
            const mode = localStorage.getItem('mascot_mode') || 'both';
            const willShow = !showMessage;
            
            // ถ้ากดเพื่อเปิด (เมื่อก่อนหน้านี้ปิดอยู่)
            if (willShow && currentMessage) {
              if (mode === 'both' || mode === 'voice') {
                speakMessage(currentMessage);
              }
              if (mode === 'both' || mode === 'text') {
                setShowMessage(true);
                // ให้ข้อความหายไปเองหลังจาก 5 วินาที
                setTimeout(() => setShowMessage(false), 5000);
              }
            } else {
              // ถ้ากดซ้ำตอนข้อความกำลังแสดงอยู่
              setShowMessage(false);
              if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
              }
              // ถ้ารูปแบบเป็นเสียงอย่างเดียว การกดจะหมายถึงให้พูดซ้ำเลย (เพราะข้อความไม่เคยแสดง)
              if (!willShow && mode === 'voice' && currentMessage) {
                speakMessage(currentMessage);
              }
            }
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg viewBox="0 0 100 150" className="w-12 h-16 md:w-24 md:h-32 relative z-10">
            
            {/* กรุ๊ปที่ควบคุมการขยับลำตัวทั้งหมดเวลาเดิน */}
            <g className={isWalking ? "walking-body" : ""}>
              
              {/* ขาหลัง */}
              <path d="M 40 110 L 32 140 L 22 140" fill="none" stroke="#334155" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className={isWalking ? "walking-back-leg" : ""} />
              {/* ขาหน้า */}
              <path d="M 60 110 L 68 140 L 78 140" fill="none" stroke="#334155" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className={isWalking ? "walking-front-leg" : ""} />

              {/* แขนหลัง (แกว่งอยู่ด้านหลัง) */}
              <path d="M 40 70 Q 25 90 35 105" fill="none" stroke="#cbd5e1" strokeWidth="8" strokeLinecap="round" className={isWalking ? "walking-arm-back" : ""} />

              {/* ลำตัว (เสื้อเชฟ) */}
              <path d="M 35 65 L 65 65 L 75 115 L 25 115 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" strokeLinejoin="round" />
              {/* กระดุมเสื้อ */}
              <circle cx="48" cy="80" r="2.5" fill="#334155" />
              <circle cx="48" cy="95" r="2.5" fill="#334155" />
              <circle cx="58" cy="80" r="2.5" fill="#334155" />
              <circle cx="58" cy="95" r="2.5" fill="#334155" />
              
              {/* ผ้าพันคอ */}
              <path d="M 35 65 Q 50 75 65 65 L 60 75 Q 50 70 40 75 Z" fill="#ef4444" />
              <path d="M 45 70 L 35 90 L 48 85 Z" fill="#ef4444" />

              {/* หัว */}
              <g>
                {/* ใบหน้า (วาดเยื้องไปทางขวานิดๆ เพื่อให้ดูหันหน้าไปทางขวา) */}
                <circle cx="50" cy="45" r="22" fill="#ffedd5" />
                {/* แก้มแดง */}
                <ellipse cx="40" cy="48" rx="4" ry="2.5" fill="#fca5a5" opacity="0.8" />
                <ellipse cx="68" cy="48" rx="4" ry="2.5" fill="#fca5a5" opacity="0.8" />
                {/* ตา (ยิ้มหยี) */}
                <path d="M 41 40 Q 44 37 47 40" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 61 40 Q 64 37 67 40" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
                {/* ปาก */}
                <path d="M 49 48 Q 54 54 59 48" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
                
                {/* หมวกเชฟ */}
                <circle cx="32" cy="15" r="14" fill="#ffffff" />
                <circle cx="50" cy="5" r="18" fill="#ffffff" />
                <circle cx="68" cy="15" r="14" fill="#ffffff" />
                <path d="M 28 25 Q 50 18 72 25 L 68 38 Q 50 42 32 38 Z" fill="#ffffff" />
                <path d="M 32 35 Q 50 38 68 35" fill="none" stroke="#f1f5f9" strokeWidth="2" strokeLinecap="round" />
              </g>

              {/* แขนหน้า (แกว่งอยู่ด้านหน้า) + ถือตะหลิว */}
              <g className={isWalking ? "walking-arm-front" : ""}>
                {/* ด้ามตะหลิว */}
                <line x1="62" y1="102" x2="82" y2="82" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
                
                {/* หัวตะหลิว */}
                <path d="M 80 84 L 92 68 L 100 74 L 86 90 Z" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" strokeLinejoin="round" />
                
                {/* รูระบายของตะหลิว (Slits) */}
                <line x1="86" y1="79" x2="93" y2="85" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="88" y1="76" x2="95" y2="82" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />

                {/* แขนหน้า (วาดทับด้ามตะหลิวตรงมือจับ) */}
                <path d="M 60 70 Q 75 90 65 105" fill="none" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" />
                <path d="M 60 70 Q 75 90 65 105" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
              </g>

            </g>
          </svg>
        </motion.div>

        {/* 💬 Speech Bubble (อยู่ด้านล่างน้อง) */}
        <AnimatePresence>
          {showMessage && currentMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="mt-1 md:mt-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm text-slate-800 dark:text-slate-100 px-2 py-1.5 md:px-5 md:py-3 rounded-2xl md:rounded-3xl shadow-[0_10px_40px_rgba(37,99,235,0.15)] dark:shadow-none border border-blue-100 dark:border-slate-700 max-w-[110px] md:max-w-[200px] pointer-events-auto relative group cursor-pointer text-center z-10 transition-colors"
              onClick={() => setShowMessage(false)}
            >
              <button className="absolute top-1.5 right-1.5 md:top-2 md:right-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                 <X size={14} />
              </button>
              <p className="text-[11px] md:text-sm font-semibold leading-relaxed md:mt-1 m-0">{currentMessage}</p>
              {/* ติ่งชี้ขึ้น */}
              <div className="absolute -top-1.5 md:-top-2 left-1/2 -translate-x-1/2 w-3 h-3 md:w-4 md:h-4 bg-white dark:bg-slate-800 border-t border-l border-blue-100 dark:border-slate-700 transform rotate-45 transition-colors"></div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* เงาที่พื้น (หายไปเวลาเดินเพื่อความสมจริง) */}
        {!isWalking && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            className="w-10 h-1 md:w-16 md:h-2 bg-slate-900 dark:bg-slate-950 rounded-full blur-[1px] md:blur-[2px] -mt-1 transition-colors"
          />
        )}
      </motion.div>
    </>
  );
}
