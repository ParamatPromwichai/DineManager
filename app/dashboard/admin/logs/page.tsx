'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, Activity, Search, RefreshCw, ShieldCheck, Ban, Trash2 } from 'lucide-react';

export default function SecurityLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [blockedIps, setBlockedIps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [logType, setLogType] = useState('system'); // system, login, blocked_ips

  const fetchLogs = async () => {
    setLoading(true);
    try {
      if (logType === 'blocked_ips') {
        const res = await fetch(`/api/admin/blocked-ips`);
        if (res.ok) {
          const data = await res.json();
          setBlockedIps(data.ips || []);
        }
      } else {
        const res = await fetch(`/api/logs?limit=200&type=${logType}`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [logType]);

  const blockIp = async (ip: string, reason: string) => {
    if (!ip || ip === '-' || ip === 'Unknown') return alert('ไม่มี IP ให้บล็อค');
    if (!confirm(`🚨 ยืนยันการบล็อค IP: ${ip} ใช่หรือไม่?\nIP นี้จะไม่สามารถเข้าใช้งานเว็บได้อีก`)) return;
    try {
      const res = await fetch('/api/admin/blocked-ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip_address: ip, reason })
      });
      if (res.ok) {
        alert('บล็อค IP สำเร็จ');
      } else {
        alert('เกิดข้อผิดพลาดในการบล็อค IP หรือ IP นี้ถูกบล็อคไปแล้ว');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const unblockIp = async (ip: string) => {
    if (!confirm(`ยืนยันการปลดบล็อค IP: ${ip} ใช่หรือไม่?`)) return;
    try {
      const res = await fetch('/api/admin/blocked-ips', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip_address: ip })
      });
      if (res.ok) {
        alert('ปลดบล็อค IP สำเร็จ');
        fetchLogs();
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการปลดบล็อค');
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes('blocked')) {
      return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-semibold flex items-center gap-1"><ShieldAlert size={12} /> {action}</span>;
    }
    return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-semibold flex items-center gap-1"><Activity size={12} /> {action}</span>;
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = (log.details?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                          (log.ip_address || '').includes(searchTerm) ||
                          (log.action || '').includes(searchTerm);
    if (filter === 'security') return matchesSearch && log.action.includes('blocked');
    if (filter === 'activity') return matchesSearch && !log.action.includes('blocked');
    return matchesSearch;
  });

  const filteredBlockedIps = blockedIps.filter(ip => 
    (ip.ip_address || '').includes(searchTerm) || (ip.reason?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="text-blue-600" /> ระบบบันทึกความปลอดภัยและการใช้งาน
          </h1>
          <p className="text-slate-500 text-sm mt-1">ตรวจสอบการโจมตี (Spam, SQLi, CSRF) และประวัติการเข้าสู่ระบบ</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setLogType('system')}
              className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${logType === 'system' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              System Logs
            </button>
            <button 
              onClick={() => setLogType('login')}
              className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${logType === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Login Logs
            </button>
            <button 
              onClick={() => setLogType('blocked_ips')}
              className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${logType === 'blocked_ips' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500 hover:text-red-600'}`}
            >
              Blocked IPs
            </button>
          </div>
          <button 
            onClick={fetchLogs} 
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors font-bold text-sm"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> รีเฟรช
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4 items-center flex-wrap">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={logType === 'blocked_ips' ? "ค้นหา IP หรือเหตุผล..." : "ค้นหา IP, Action, รายละเอียด..."}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {logType !== 'blocked_ips' && (
            <select 
              className="px-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 text-sm bg-white"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">แสดงทั้งหมด</option>
              <option value="security">ภัยคุกคาม (Blocked)</option>
              <option value="activity">กิจกรรมทั่วไป</option>
            </select>
          )}
        </div>

        <div className="overflow-x-auto">
          {logType === 'blocked_ips' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium border-b border-slate-200 w-1/4">IP Address</th>
                  <th className="px-4 py-3 font-medium border-b border-slate-200 w-2/4">เหตุผลที่บล็อค</th>
                  <th className="px-4 py-3 font-medium border-b border-slate-200 w-1/4">วันที่บล็อค</th>
                  <th className="px-4 py-3 font-medium border-b border-slate-200">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">กำลังโหลดข้อมูล...</td></tr>
                ) : filteredBlockedIps.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">ไม่มีรายการ IP ที่ถูกบล็อค</td></tr>
                ) : (
                  filteredBlockedIps.map(ip => (
                    <tr key={ip.ip_address} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-bold text-red-600">{ip.ip_address}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{ip.reason}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{new Date(ip.blocked_at).toLocaleString('th-TH')}</td>
                      <td className="px-4 py-3">
                        <button 
                          onClick={() => unblockIp(ip.ip_address)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-md flex items-center gap-1 transition-colors"
                        >
                          <Trash2 size={12} /> ปลดบล็อค
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium border-b border-slate-200">เวลา</th>
                  <th className="px-4 py-3 font-medium border-b border-slate-200">ประเภท</th>
                  <th className="px-4 py-3 font-medium border-b border-slate-200">รายละเอียด</th>
                  <th className="px-4 py-3 font-medium border-b border-slate-200">IP Address</th>
                  <th className="px-4 py-3 font-medium border-b border-slate-200 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">กำลังโหลดข้อมูล...</td></tr>
                ) : filteredLogs.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">ไม่มีประวัติการใช้งานที่ตรงกับเงื่อนไข</td></tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className={`hover:bg-slate-50 transition-colors ${(log.action.includes('blocked') || log.action.includes('failed')) ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('th-TH')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 max-w-md truncate" title={log.details}>
                        {log.details || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-500">
                        {log.ip_address || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {log.ip_address && log.ip_address !== '-' && log.ip_address !== 'Unknown' && (
                          <button
                            onClick={() => blockIp(log.ip_address, log.details || 'Blocked from logs')}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded transition-colors"
                            title="บล็อค IP นี้ทันที"
                          >
                            <Ban size={12} /> บล็อค
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
