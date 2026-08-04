'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, ReceiptText, LayoutGrid, Store } from 'lucide-react';
import GlobalOrderNotification from '@/components/GlobalOrderNotification';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useRef } from 'react';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // กำหนดเมนู (เปลี่ยนมาใช้ Icon จาก lucide-react แทน Emoji เพื่อความโปร)
  const navItems = [
    { name: 'หน้าแรก', href: '/dashboard/shop', icon: Home },
    { name: 'เมนู', href: '/dashboard/shop/menus', icon: BookOpen },
    { name: 'ออเดอร์', href: '/dashboard/shop/orders', icon: ReceiptText },
    { name: 'โต๊ะ/คิว', href: '/dashboard/shop/tables', icon: LayoutGrid },
    { name: 'ร้าน', href: '/dashboard/shop/profile', icon: Store },
  ];

  // คำนวณทิศทางการเลื่อน (ใช้ useRef เพื่อให้คำนวณทันทีตอน Render)
  const prevIndexRef = useRef(0);
  const directionRef = useRef(0);
  
  const currentIndex = navItems.findIndex((item) => pathname === item.href);
  const current = currentIndex !== -1 ? currentIndex : 0;

  if (current !== prevIndexRef.current) {
    directionRef.current = current > prevIndexRef.current ? 1 : -1;
    prevIndexRef.current = current;
  }
  const direction = directionRef.current;

  const isMenuPage = navItems.some(item => pathname === item.href);

  // ตั้งค่า Animation ให้ดูสมูทขึ้น (ใช้ Ease แบบ iOS-style เพื่อลดความเด้งของ Spring)
  const variants: Variants = {
    initial: (dir: number) => ({
      x: dir > 0 ? '30%' : '-30%',
      opacity: 0,
    }),
    animate: (dir: number) => ({
      x: 0,
      opacity: 1,
      transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] }, // Apple's custom easeOut curve
    }),
    exit: (dir: number) => ({
      x: dir > 0 ? '-30%' : '30%',
      opacity: 0,
      transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
    }),
  };

  return (
    // 🚨 เติม suppressHydrationWarning ตรง div นอกสุด เพื่อกัน Error จาก Browser Extension
    <div suppressHydrationWarning className={`min-h-screen bg-slate-50 ${isMenuPage ? 'pb-[80px]' : ''} font-sans text-slate-900`}>
      
      {/* 🔔 ฝังตัวแจ้งเตือนออเดอร์แบบ Global ไว้ตรงนี้ (ทำงานทุกหน้า) */}
      <GlobalOrderNotification />

      {/* ส่วนเนื้อหาหลัก (จะเปลี่ยนไปตามหน้า) */}
      <div className={`relative overflow-hidden w-full ${isMenuPage ? 'h-[calc(100vh-80px)]' : 'h-[100dvh]'}`}>
        <AnimatePresence custom={direction} initial={false}>
          <motion.main
            key={pathname}
            custom={direction}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full h-full absolute inset-0 overflow-y-auto bg-slate-50"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation Bar (SaaS Style) */}
      {isMenuPage && (
        <nav 
          className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} // 🚨 ย้าย CSS มารองรับ Safe Area ตรงนี้แทน
        >
          <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className="relative flex flex-col items-center justify-center w-full h-full group"
                  suppressHydrationWarning // 🚨 กัน Error ตรงลิงก์/ปุ่มกด
                >
                  <div className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all duration-300 ${
                    isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                  }`}>
                    
                    {/* แบ็คกราวนด์จางๆ เวลากดเลือก */}
                    {isActive && (
                      <div className="absolute inset-0 bg-blue-50/50 rounded-xl -z-10 m-1"></div>
                    )}

                    <Icon 
                      size={isActive ? 22 : 20} 
                      strokeWidth={isActive ? 2.5 : 2}
                      className={`transition-all duration-300 ${isActive ? '-translate-y-0.5' : 'group-hover:-translate-y-0.5'}`} 
                    />
                    
                    <span className={`text-[10px] mt-1 transition-all duration-300 ${
                      isActive ? 'font-bold opacity-100' : 'font-medium opacity-80'
                    }`}>
                      {item.name}
                    </span>
                    
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

    </div>
  );
}