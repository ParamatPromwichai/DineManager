'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function CustomerNavbar() {
  const pathname = usePathname();

  const menu = [
    { href: '/dashboard/customer', label: 'หน้าแรก', icon: '🏠' },
    { href: '/dashboard/customer/orders', label: 'ออเดอร์', icon: '📜' },
    { href: '/dashboard/customer/chat', label: 'แชท', icon: '🤖' },
    { href: '/dashboard/customer/reserve', label: 'จองโต๊ะ', icon: '🪑' },
    { href: '/dashboard/customer/profile', label: 'โปรไฟล์', icon: '👤' },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        background: '#fff',
        borderTop: '1px solid #ddd',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 100,
      }}
    >
      {menu.map(item => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              textDecoration: 'none',
              color: active ? '#2563eb' : '#555',
              fontSize: 12,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
