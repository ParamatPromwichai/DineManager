'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Users, DollarSign, ShoppingBag, ShieldAlert, ShieldCheck, Activity, Loader2, ArrowRight, Wifi } from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  stats: {
    totalUsers: number;
    totalOrders: number;
    totalRevenue: number;
    activeUsers: number;
  };
  recentLogins: {
    id: number;
    username: string;
    ip_address: string;
    status: string;
    thai_time: string;
  }[];
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login/admin');
    else if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') {
      router.replace('/login/admin?error=wrong_role');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'admin') {
      fetch('/api/admin/dashboard')
        .then(async res => {
          if (!res.ok) throw new Error(`HTTP Error ${res.status}: ${await res.text()}`);
          return res.json();
        })
        .then(json => {
          if (!json.stats) throw new Error('ข้อมูลไม่ครบถ้วนจากเซิร์ฟเวอร์');
          setData(json);
        })
        .catch(err => {
          console.error(err);
          setError(err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [status, session]);

  if (status === 'loading' || loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;
  }
  if (status !== 'authenticated' || (session?.user as any)?.role !== 'admin') return null;

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <ShieldAlert size={64} className="text-rose-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">ไม่สามารถโหลดข้อมูล Dashboard ได้</h2>
        <p className="text-slate-400 text-center max-w-lg bg-slate-900 p-4 rounded-xl border border-rose-900/50 break-words">
          {error}
        </p>
        <button onClick={() => window.location.reload()} className="mt-6 bg-blue-600 hover:bg-blue-700 px-6 py-2.5 rounded-xl font-bold transition-colors">
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans pb-24">
      
      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Activity className="text-blue-500" size={32} />
            Command Center
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">ภาพรวมระบบและตรวจสอบความปลอดภัย DineManager</p>
        </div>
        <Link href="/dashboard/admin/users" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-lg shadow-blue-900/20">
          <Users size={18} />
          จัดการผู้ใช้งาน
          <ArrowRight size={16} />
        </Link>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-slate-800 group-hover:scale-110 transition-transform"><DollarSign size={100} /></div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-slate-400 mb-2 flex items-center gap-2"><DollarSign size={16} className="text-emerald-500"/> ยอดขายรวมทั้งระบบ</p>
            <h2 className="text-4xl font-black text-white">{data.stats.totalRevenue.toLocaleString()} <span className="text-xl text-slate-500">฿</span></h2>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-slate-800 group-hover:scale-110 transition-transform"><ShoppingBag size={100} /></div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-slate-400 mb-2 flex items-center gap-2"><ShoppingBag size={16} className="text-orange-500"/> ออเดอร์ทั้งหมด</p>
            <h2 className="text-4xl font-black text-white">{data.stats.totalOrders.toLocaleString()} <span className="text-xl text-slate-500">รายการ</span></h2>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-slate-800 group-hover:scale-110 transition-transform"><Users size={100} /></div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-slate-400 mb-2 flex items-center gap-2"><Users size={16} className="text-blue-500"/> ผู้ใช้งานในระบบ</p>
            <h2 className="text-4xl font-black text-white">{data.stats.totalUsers.toLocaleString()} <span className="text-xl text-slate-500">บัญชี</span></h2>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-slate-800 group-hover:scale-110 transition-transform"><Wifi size={100} /></div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-slate-400 mb-2 flex items-center gap-2">
              <span className="relative flex h-3 w-3 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              ออนไลน์ตอนนี้
            </p>
            <h2 className="text-4xl font-black text-white">{data.stats.activeUsers.toLocaleString()} <span className="text-xl text-slate-500">คน</span></h2>
          </div>
        </div>
      </div>

      {/* Security Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3">
          <ShieldAlert className="text-rose-500" size={24} />
          <h3 className="font-bold text-lg text-white">Security: ประวัติการเข้าสู่ระบบ (10 รายการล่าสุด)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-950 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <th className="p-4">เวลา (เวลาไทย)</th>
                <th className="p-4">บัญชีที่พยายามล็อกอิน</th>
                <th className="p-4">IP Address</th>
                <th className="p-4">สถานะ</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-800/50">
              {data.recentLogins.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-4 text-slate-300 font-mono text-xs">{log.thai_time}</td>
                  <td className="p-4 font-bold text-blue-400">{log.username}</td>
                  <td className="p-4 text-slate-400 font-mono text-xs">{log.ip_address}</td>
                  <td className="p-4">
                    {log.status === 'success' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <ShieldCheck size={14} /> สำเร็จ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <ShieldAlert size={14} /> ผิดพลาด ({log.status})
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {data.recentLogins.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 font-medium">ยังไม่มีประวัติการเข้าสู่ระบบ</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}