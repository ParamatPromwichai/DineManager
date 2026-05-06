'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Home, 
  ClipboardList, 
  MessageSquareText, 
  CalendarCheck, 
  User, 
  Bot
} from 'lucide-react';
import { rootCertificates } from 'tls';

export default function CustomerNavbar() {
  const pathname = usePathname();

  const menu = [
    { href: '/dashboard/customer', label: 'หน้าแรก', Icon: Home },
    { href: '/dashboard/customer/orders', label: 'ออเดอร์', Icon: ClipboardList },
    { href: '/dashboard/customer/chat', label: 'แชทบอท', Icon: Bot },
    { href: '/dashboard/customer/reserve', label: 'จองโต๊ะ', Icon: CalendarCheck },
    { href: '/dashboard/customer/profile', label: 'โปรไฟล์', Icon: User },
  ];

  return (
    <>
      {/* Spacer ป้องกันเนื้อหาโดน Navbar บังด้านล่าง */}
      <div className="h-20" />

      <nav 
        className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} // รองรับขอบจอด้านล่างของ iPhone
      >
        <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
          {menu.map((item) => {
            const active = pathname === item.href;
            const { Icon } = item;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center justify-center w-full h-full"
              >
                <div
                  className={`flex flex-col items-center justify-center w-14 h-12 rounded-2xl transition-all duration-300 ${
                    active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {/* แอนิเมชันไฮไลท์พื้นหลังเมนูที่กำลังใช้งานอยู่ */}
                  {active && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute inset-0 bg-blue-50 rounded-2xl -z-10 m-1"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  
                  {/* ไอคอน */}
                  <Icon
                    size={active ? 24 : 22}
                    strokeWidth={active ? 2.5 : 2}
                    className={`transition-transform duration-300 ${active ? '-translate-y-0.5' : ''}`}
                  />
                  
                  {/* ข้อความเมนู */}
                  <span 
                    className={`text-[10px] mt-1 font-medium transition-all duration-300 ${
                      active ? 'opacity-100' : 'opacity-70'
                    }`}
                  >
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