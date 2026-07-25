'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, Activity, Search, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function SecurityLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [logType, setLogType] = useState('system'); // ➕ เก็บสถานะว่าจะดู Log อะไร

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/logs?limit=200&type=${logType}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [logType]); // ➕ โหลดใหม่เมื่อเปลี่ยนประเภท Log

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
          {/* ➕ ปุ่มสลับประเภท Log */}
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
              placeholder="ค้นหา IP, Action, รายละเอียด..." 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 text-sm bg-white"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">แสดงทั้งหมด</option>
            <option value="security">ภัยคุกคาม (Blocked)</option>
            <option value="activity">กิจกรรมทั่วไป</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-medium border-b border-slate-200">เวลา</th>
                <th className="px-4 py-3 font-medium border-b border-slate-200">ประเภท (Action)</th>
                <th className="px-4 py-3 font-medium border-b border-slate-200">รายละเอียด</th>
                <th className="px-4 py-3 font-medium border-b border-slate-200">ผู้ใช้งาน</th>
                <th className="px-4 py-3 font-medium border-b border-slate-200">IP Address</th>
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
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {log.role ? (
                        <span className="capitalize">{log.role} (ID: {log.user_id})</span>
                      ) : (
                        <span className="text-slate-400">ผู้เยี่ยมชมทั่วไป</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-500">
                      {log.ip_address || '-'}
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
