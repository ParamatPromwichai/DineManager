'use client';

import { useEffect } from 'react';

export default function AdminDashboard() {
  useEffect(() => {
    async function checkRole() {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (!res.ok) {
        window.location.href = '/login';
        return;
      }

      const data = await res.json();

      if (data.role !== 'admin') {
        window.location.href = '/login';
      }
    }

    checkRole();
  }, []);

  return <h1>Dashboard แอดมิน</h1>;
}
