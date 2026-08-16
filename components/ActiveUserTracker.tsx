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

    return () => clearInterval(intervalId);
  }, [status, pathname]);

  return null; // Component นี้ไม่มี UI
}
