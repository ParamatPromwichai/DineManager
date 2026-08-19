'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, ClipboardList, CalendarCheck, User } from 'lucide-react';

const menu = [
  { href: '/dashboard/customer', label: 'หน้าหลัก', Icon: Home },
  { href: '/dashboard/customer/orders', label: 'ออเดอร์', Icon: ClipboardList },
  { href: '/dashboard/customer/reserve', label: 'โต๊ะว่าง', Icon: CalendarCheck },
  { href: '/dashboard/customer/profile', label: 'โปรไฟล์', Icon: User },
];

export default function CustomerNavbar() {
  const pathname = usePathname();

  return (
    <>
      <div className="h-20" />
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white/40 dark:bg-black/40 backdrop-blur-3xl backdrop-saturate-200 border-t border-white/50 dark:border-white/10 z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.4)] transition-colors"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
          {menu.map((item) => {
            const active = pathname === item.href;
            const { Icon } = item;

            return (
              <Link key={item.href} href={item.href} className="relative flex flex-col items-center justify-center w-full h-full">
                <div className={`flex flex-col items-center justify-center w-14 h-12 rounded-2xl transition-all duration-300 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200'}`}>
                  {active && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute inset-0 bg-white/60 dark:bg-white/10 shadow-sm border border-white/60 dark:border-white/5 rounded-2xl -z-10 m-1 transition-colors backdrop-blur-md"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon size={active ? 24 : 22} strokeWidth={active ? 2.5 : 2} className={`transition-transform duration-300 ${active ? '-translate-y-0.5' : ''}`} />
                  <span className={`text-[10px] mt-1 font-medium transition-all duration-300 ${active ? 'opacity-100' : 'opacity-70'}`}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
