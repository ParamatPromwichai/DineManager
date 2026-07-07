'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Store, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface User {
  id: number;
  username: string;
  name: string | null;
  email: string | null;
  role: string;
  phone: string | null;
  created_at: string;
}

export default function AdminApprovalsPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/approvals');
      if (res.ok) setUsers(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'admin') fetchUsers();
  }, [status, session]);

  const handleApprove = async (userId: number) => {
    if (!confirm('ยืนยันการอนุมัติร้านค้านี้?')) return;

    try {
      const res = await fetch('/api/admin/approvals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', userId }),
      });
      if (res.ok) {
        alert('อนุมัติร้านค้าเรียบร้อย');
        fetchUsers();
      } else {
        alert('เกิดข้อผิดพลาดในการอนุมัติ');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleReject = async (userId: number) => {
    if (!confirm('ยืนยันการปฏิเสธและลบบัญชีร้านค้านี้ถาวร?')) return;

    try {
      const res = await fetch(`/api/admin/approvals?id=${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        alert('ปฏิเสธและลบคำขอเรียบร้อย');
        fetchUsers();
      } else {
        alert(data.message || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (status === 'loading' || loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;
  }
  if (status !== 'authenticated' || (session?.user as any)?.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans pb-24">
      
      <header className="mb-8 flex items-center gap-4 border-b border-slate-800 pb-6">
        <div className="p-4 bg-orange-500/10 text-orange-500 rounded-2xl border border-orange-500/20">
          <Store size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">จัดการร้านค้าใหม่</h1>
          <p className="text-sm text-slate-400 mt-1">อนุมัติหรือปฏิเสธบัญชีร้านค้าที่รอการยืนยัน</p>
        </div>
      </header>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/50 text-slate-400 uppercase text-xs font-black tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Username / Email</th>
                <th className="px-6 py-4">ชื่อผู้ติดต่อ</th>
                <th className="px-6 py-4">เบอร์โทร</th>
                <th className="px-6 py-4">วันที่สมัคร</th>
                <th className="px-6 py-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500 font-medium">
                    ไม่มีร้านค้ารอการอนุมัติในขณะนี้
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 text-slate-400">#{user.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{user.username}</div>
                      <div className="text-xs text-slate-500 mt-1">{user.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{user.name || '-'}</td>
                    <td className="px-6 py-4 text-slate-300">{user.phone || '-'}</td>
                    <td className="px-6 py-4 text-slate-300">
                      {new Date(user.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleApprove(user.id)}
                          className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white px-3 py-2 rounded-lg font-bold transition-all text-xs border border-emerald-500/20 hover:border-emerald-500"
                        >
                          <CheckCircle size={16} /> อนุมัติ
                        </button>
                        <button 
                          onClick={() => handleReject(user.id)}
                          className="flex items-center gap-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white px-3 py-2 rounded-lg font-bold transition-all text-xs border border-rose-500/20 hover:border-rose-500"
                        >
                          <XCircle size={16} /> ปฏิเสธ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
