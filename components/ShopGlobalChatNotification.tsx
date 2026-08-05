'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ShopGlobalChatNotification() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const prevCustomersRef = useRef<any[]>([]);

  const { data: customers } = useSWR(
    status === 'authenticated' && (session?.user as any)?.role === 'shop' ? '/api/shop/chat' : null,
    fetcher,
    { refreshInterval: 5000 }
  );

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.error('Audio play failed', e);
    }
  };

  useEffect(() => {
    if (customers && prevCustomersRef.current.length > 0) {
      let hasNew = false;
      customers.forEach((c: any) => {
        const prev = prevCustomersRef.current.find((p: any) => p.user_id === c.user_id);
        // ถ้าเป็นข้อความใหม่จากลูกค้า (sender = user)
        if (c.last_sender === 'user') {
          if (prev && c.total_msgs > prev.total_msgs) {
            hasNew = true;
          } else if (!prev && c.total_msgs > 0) {
            hasNew = true;
          }
        }
      });

      if (hasNew) {
        if (pathname !== '/dashboard/shop/chat') {
          playNotificationSound();
        }
      }
    }
    if (customers) {
      prevCustomersRef.current = customers;
    }
  }, [customers, pathname]);

  return null; // Component นี้มีหน้าที่แค่ส่งเสียง ไม่ต้องแสดง UI
}
