'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export default function ActiveUserTracker() {
  const { status } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    // ใช้งานเฉพาะตอนล็อกอินเท่านั้น
    if (status !== 'authenticated') return;

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/user/heartbeat', {
          method: 'POST',
        });
      } catch (error) {
        console.error('Failed to send heartbeat', error);
      }
    };

    // ส่ง Heartbeat ทันทีเมื่อโหลดคอมโพเนนต์ (หรือเปลี่ยนหน้า)
    sendHeartbeat();

    // ส่ง Heartbeat ทุกๆ 1 นาที (60000 ms)
    const intervalId = setInterval(sendHeartbeat, 60000);

    // เมื่อผู้ใช้ปิดหน้าเว็บ ปิดแท็บ หรือเปลี่ยนโดเมน ให้ส่งสัญญาณว่าออฟไลน์ทันที
    const handleUnload = () => {
      // ใช้ fetch แบบ keepalive เพื่อให้ยิง API ออกไปแม้เบราว์เซอร์จะถูกปิด
      fetch('/api/user/offline', { method: 'POST', keepalive: true }).catch(() => {});
    };

    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('pagehide', handleUnload);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [status, pathname]);

  return null; // Component นี้ไม่มี UI
}
