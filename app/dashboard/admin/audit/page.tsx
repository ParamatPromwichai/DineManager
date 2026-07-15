'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ShieldAlert, AlertTriangle, UserX, Activity, Loader2, Ban, Crosshair } from 'lucide-react';
import Link from 'next/link';

interface AuditData {
  failedLogins: any[];
  suspiciousOrders: any[];
  lockedUsers: any[];
}

export default function AdminAuditPage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'admin') {
      fetch('/api/admin/audit')
        .then(res => res.json())
        .then(json => {
          setData(json);
          setLoading(false);
        })
        .catch(err => console.error(err));
    }
  }, [status, session]);

  if (status === 'loading' || loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-rose-500" size={40} /></div>;
  }
  if (status !== 'authenticated' || (session?.user as any)?.role !== 'admin' || !data) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans pb-24">
      
      {/* Header */}
      <header className="mb-8 flex items-center gap-4 border-b border-slate-800 pb-6">
        <div className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20">
          <Activity size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">ระบบตรวจสอบพฤติกรรม (Audit Logs)</h1>
          <p className="text-sm text-slate-400 mt-1">เฝ้าระวังการโจมตีระบบและพฤติกรรมการสั่งซื้อที่ผิดปกติ</p>
        </div>
      </header>

      {/* Alert Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-rose-950/30 border border-rose-900/50 p-6 rounded-2xl flex items-center gap-5">
          <div className="bg-rose-500/20 p-4 rounded-full text-rose-500"><ShieldAlert size={32}/></div>
          <div>
            <p className="text-rose-400 font-bold text-sm">การล็อกอินล้มเหลวล่าสุด</p>
            <h2 className="text-3xl font-black text-white">{data.failedLogins.length} <span className="text-lg text-rose-500 font-normal">รายการ</span></h2>
          </div>
        </div>
        <div className="bg-amber-950/30 border border-amber-900/50 p-6 rounded-2xl flex items-center gap-5">
          <div className="bg-amber-500/20 p-4 rounded-full text-amber-500"><AlertTriangle size={32}/></div>
          <div>
            <p className="text-amber-400 font-bold text-sm">ออเดอร์ยกเลิก / ยอดสูงผิดปกติ</p>
            <h2 className="text-3xl font-black text-white">{data.suspiciousOrders.length} <span className="text-lg text-amber-500 font-normal">รายการ</span></h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Section 1: Security Login Fails */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
          <div className="p-5 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <Crosshair className="text-rose-500" size={20} /> พยายามเจาะระบบ (Failed Logins)
            </h3>
          </div>
          <div className="overflow-y-auto max-h-[500px] p-2">
            {data.failedLogins.length === 0 ? (
              <p className="text-center text-slate-500 p-8">ไม่พบความผิดปกติ</p>
            ) : (
              <ul className="space-y-2">
                {data.failedLogins.map((log) => (
                  <li key={log.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800/50 hover:border-rose-500/30 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-blue-400">{log.username}</span>
                      <span className="text-xs font-mono text-slate-500">{log.time}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="text-xs text-slate-400 font-mono">
                        IP: <span className="text-slate-300">{log.ip_address}</span>
                      </div>
                      <span className="text-[10px] uppercase font-black px-2 py-1 bg-rose-500/10 text-rose-500 rounded border border-rose-500/20">
                        {log.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Section 2: Suspicious Orders & Locked Users */}
        <div className="space-y-8">
          
          {/* Suspicious Orders */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={20} /> พฤติกรรมออเดอร์ผิดปกติ
              </h3>
            </div>
            <div className="overflow-y-auto max-h-[250px] p-2">
              {data.suspiciousOrders.length === 0 ? (
                <p className="text-center text-slate-500 p-8">ไม่พบออเดอร์ผิดปกติ</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                      <th className="p-3 font-medium">Order ID</th>
                      <th className="p-3 font-medium">ลูกค้า</th>
                      <th className="p-3 font-medium">ยอดเงิน</th>
                      <th className="p-3 font-medium">ปัญหา</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {data.suspiciousOrders.map(order => (
                      <tr key={order.order_id} className="hover:bg-slate-800/30">
                        <td className="p-3 font-mono text-slate-400">#{order.order_id}</td>
                        <td className="p-3 text-blue-400">{order.username}</td>
                        <td className="p-3 text-slate-300">{Number(order.total_price).toLocaleString()} ฿</td>
                        <td className="p-3">
                          {order.status === 'cancel' ? 
                            <span className="text-rose-400 text-xs font-bold bg-rose-500/10 px-2 py-1 rounded">ลูกค้ายกเลิก</span> : 
                            <span className="text-amber-400 text-xs font-bold bg-amber-500/10 px-2 py-1 rounded">ยอดสูงผิดปกติ</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Locked Users Action Required */}
          <div className="bg-slate-900 border border-rose-900/50 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800 bg-rose-950/20 flex justify-between items-center">
              <h3 className="font-bold text-lg text-rose-500 flex items-center gap-2">
                <Ban size={20} /> บัญชีที่ถูกระงับ (รอตรวจสอบ)
              </h3>
            </div>
            <div className="p-2">
              {data.lockedUsers.length === 0 ? (
                <p className="text-center text-slate-500 p-6">ไม่มีบัญชีที่ถูกระงับ</p>
              ) : (
                <ul className="space-y-2">
                  {data.lockedUsers.map(user => (
                    <li key={user.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white flex items-center gap-2">
                          <UserX size={16} className="text-rose-500"/> {user.username}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">ล็อกอินผิดพลาด {user.failed_attempts} ครั้ง</p>
                      </div>
                      <Link href="/dashboard/admin/users" className="text-xs font-bold text-blue-500 hover:text-blue-400 bg-blue-500/10 px-3 py-2 rounded-lg transition-colors">
                        ไปหน้าจัดการผู้ใช้
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}