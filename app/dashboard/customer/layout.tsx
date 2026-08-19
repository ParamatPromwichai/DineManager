'use client';

import CustomerNavbar from './CustomerNavbar';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useRef } from 'react';
import CustomerGlobalChatNotification from '@/components/CustomerGlobalChatNotification';

const navItems = [
  '/dashboard/customer',
  '/dashboard/customer/orders',
  '/dashboard/customer/chat',
  '/dashboard/customer/reserve',
  '/dashboard/customer/profile',
];

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isMenuPage = navItems.includes(pathname);

  // คำนวณทิศทางการเลื่อน
  const prevIndexRef = useRef(0);
  const directionRef = useRef(0);
  
  const currentIndex = navItems.indexOf(pathname);
  const current = currentIndex !== -1 ? currentIndex : 0;

  if (current !== prevIndexRef.current) {
    directionRef.current = current > prevIndexRef.current ? 1 : -1;
    prevIndexRef.current = current;
  }
  const direction = directionRef.current;

  // ตั้งค่า Animation แบบ iOS (Custom EaseOut)
  const variants: Variants = {
    initial: (dir: number) => ({
      x: dir > 0 ? '30%' : '-30%',
      opacity: 0,
    }),
    animate: (dir: number) => ({
      x: 0,
      opacity: 1,
      transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
    }),
    exit: (dir: number) => ({
      x: dir > 0 ? '-30%' : '30%',
      opacity: 0,
      transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
    }),
  };

  return (
    <div className="relative overflow-hidden w-full h-[100dvh] bg-blue-50 dark:bg-slate-900 transition-colors">
      <CustomerGlobalChatNotification />
      <AnimatePresence custom={direction} initial={false}>
        <motion.main
          key={pathname}
          custom={direction}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={`w-full h-full absolute inset-0 overflow-y-auto ${isMenuPage ? 'pb-[70px]' : ''}`}
        >
          {children}
        </motion.main>
      </AnimatePresence>
      
      {isMenuPage && <CustomerNavbar />}
    </div>
  );
}
