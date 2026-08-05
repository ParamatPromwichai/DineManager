'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminGuard() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    // Only run checks if we are authenticated and the user is an admin
    if (status === 'authenticated' && session?.user?.role === 'admin') {
      
      // 1. Force logout if navigating to a page outside of the admin area (allow login pages during transition)
      if (!pathname.startsWith('/dashboard/admin') && !pathname.startsWith('/login/admin')) {
        signOut({ callbackUrl: '/' });
        return;
      }

      // 2. Browser close or new tab detection using sessionStorage
      // sessionStorage is unique per tab and cleared when the tab/browser is closed.
      const isAdminActive = sessionStorage.getItem('admin_active_session');
      
      if (!isAdminActive) {
        // If the flag is missing, it means this is a new tab or browser was closed
        signOut({ callbackUrl: '/' });
      } else {
        // Just in case, ensure it remains set
        sessionStorage.setItem('admin_active_session', 'true');
      }
    }
  }, [session, pathname, status]);

  return null;
}
