'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Activity, Users, ShieldAlert, Server, LogOut, Menu, X, Shield, Store } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // รายการเมนูทั้งหมดของแอดมิน
  const navItems = [
    { name: 'Command Center', href: '/dashboard/admin', icon: Activity },
    { name: 'จัดการผู้ใช้งาน', href: '/dashboard/admin/users', icon: Users },
    { name: 'อนุมัติร้านค้า', href: '/dashboard/admin/approvals', icon: Store },
    { name: 'ตรวจสอบพฤติกรรม', href: '/dashboard/admin/audit', icon: ShieldAlert },
    { name: 'ตั้งค่าระบบ', href: '/dashboard/admin/settings', icon: Server },
  ];

  // ฟังก์ชันออกจากระบบ
  const handleLogout = async () => {
    if (confirm('ยืนยันการออกจากระบบแอดมิน?')) {
      // เมื่อล็อกเอาท์ ให้เด้งกลับไปหน้าล็อกอินของแอดมิน
      await signOut({ callbackUrl: '/login/admin' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row font-sans">
      
      {/* --- Topbar สำหรับหน้าจอมือถือ (Mobile) --- */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2 text-white font-black text-xl">
          <Shield className="text-blue-500" />
          DineManager
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="text-slate-400 hover:text-white transition-colors"
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* --- Sidebar สำหรับคอมพิวเตอร์ (Desktop) & เมนูที่เลื่อนออกมาในมือถือ --- */}
      <div 
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out flex flex-col
        md:translate-x-0 md:static md:flex 
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo พื้นที่ด้านบนของ Sidebar */}
        <div className="p-6 hidden md:flex items-center gap-3 text-white font-black text-2xl border-b border-slate-800">
          <Shield className="text-blue-500" size={32} />
          DineManager
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <p className="px-4 text-xs font-black text-slate-500 uppercase tracking-wider mb-4">Admin Menu</p>
          
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)} // ปิดเมนูมือถือเมื่อกดเลือกลิงก์
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <item.icon size={20} />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Logout Button ไว้ด้านล่างสุด */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-rose-500 hover:bg-rose-500/10 rounded-xl font-bold transition-colors"
          >
            <LogOut size={20} />
            ออกจากระบบ
          </button>
        </div>
      </div>

      {/* --- ฉากหลังสีดำจางๆ สำหรับมือถือเวลาเปิดเมนู --- */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* --- พื้นที่แสดงผลเนื้อหา (Main Content) --- */}
      <div className="flex-1 min-w-0 overflow-x-hidden relative z-0">
        {children}
      </div>
      
    </div>
  );
}