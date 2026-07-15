'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // กำหนดเมนู
  const navItems = [
    { name: 'หน้าแรก', href: '/dashboard/shop', icon: '🏠' },
    { name: 'เมนู', href: '/dashboard/shop/menus', icon: '📖' },
    { name: 'ออเดอร์', href: '/dashboard/shop/orders', icon: '📝' },
    { name: 'โต๊ะ/คิว', href: '/dashboard/shop/tables', icon: '🪑' },
    { name: 'ร้าน', href: '/dashboard/shop/profile', icon: '🏪' },
  ];

  return (
    <div style={{ background: '#f3f4f6', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* ส่วนเนื้อหาหลัก (จะเปลี่ยนไปตามหน้า) */}
      <main>{children}</main>

      {/* Bottom Navigation Bar */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#ffffff',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '10px 0',
        zIndex: 1000,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
      }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textDecoration: 'none',
                color: isActive ? '#2563eb' : '#9ca3af', // สีฟ้าเมื่อเลือก, สีเทาเมื่อไม่เลือก
                fontSize: '0.8rem',
                flex: 1
              }}
            >
              <span style={{ fontSize: '1.4rem', marginBottom: 2 }}>{item.icon}</span>
              <span style={{ fontWeight: isActive ? 'bold' : 'normal' }}>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}