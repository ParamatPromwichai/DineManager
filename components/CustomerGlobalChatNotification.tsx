'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function CustomerGlobalChatNotification() {
  const { data: session, status } = useSession();
  const userId = (session?.user as any)?.id;
  const pathname = usePathname();
  const prevMessagesLength = useRef(0);
  const [chatToast, setChatToast] = useState<{id: number, title: string, body: string} | null>(null);

  const { data: messages } = useSWR(
    status === 'authenticated' && userId ? `/api/chat?user_id=${userId}` : null,
    fetcher,
    { refreshInterval: 3000 }
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

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

  const showBrowserNotification = (title: string, body: string) => {
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  };

  useEffect(() => {
    if (messages && messages.length > prevMessagesLength.current) {
      if (prevMessagesLength.current > 0) {
        const newMessages = messages.slice(prevMessagesLength.current);
        const hasNewFromShopOrBot = newMessages.some((msg: any) => msg.sender !== 'user');
        
        if (hasNewFromShopOrBot) {
          showBrowserNotification('มีข้อความใหม่', 'ร้านค้าหรือระบบได้ตอบกลับข้อความของคุณ');
          if (pathname !== '/dashboard/customer/chat') {
            playNotificationSound();
            setChatToast({ id: Date.now(), title: 'มีข้อความใหม่', body: 'ร้านค้าหรือระบบได้ตอบกลับข้อความของคุณ' });
            setTimeout(() => setChatToast(null), 4000);
          }
        }
      }
      prevMessagesLength.current = messages.length;
    }
  }, [messages, pathname]);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-sm pointer-events-none">
      <AnimatePresence>
        {chatToast && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, y: -20, transition: { duration: 0.2 } }}
            className="bg-blue-600 text-white p-4 rounded-2xl shadow-2xl border border-blue-500 relative overflow-hidden pointer-events-auto flex items-start gap-4"
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-20"></span>
              <BellRing size={20} className="animate-bounce" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-white">{chatToast.title}</h3>
              <p className="text-sm text-blue-100 mt-0.5">{chatToast.body}</p>
            </div>
            <button onClick={() => setChatToast(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
