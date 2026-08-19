'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function ActiveUserTracker() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated') return;

    const controller = new AbortController();

    const sendHeartbeat = async () => {
      try {
        const response = await fetch('/api/user/heartbeat', {
          method: 'POST',
          cache: 'no-store',
          credentials: 'same-origin',
          signal: controller.signal,
        });

        if (!response.ok && response.status !== 401) {
          console.warn('Failed to send heartbeat', response.status);
        }
      } catch {
        // Browser lifecycle/network races are expected during navigation, reloads, and tab closing.
      }
    };

    sendHeartbeat();
    const intervalId = window.setInterval(sendHeartbeat, 60_000);

    const sendOffline = () => {
      if (navigator.sendBeacon('/api/user/offline')) return;

      fetch('/api/user/offline', {
        method: 'POST',
        keepalive: true,
        credentials: 'same-origin',
      }).catch(() => {});
    };

    window.addEventListener('pagehide', sendOffline);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
      window.removeEventListener('pagehide', sendOffline);
    };
  }, [status]);

  return null;
}
