'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ShieldCheck, Lock, Unlock, Users, Loader2, Edit, Trash2, X } from 'lucide-react';

interface User {
  id: number;
  username: string;
  name: string | null;
  email: string | null;
  role: string;
  phone: string | null;
  is_locked: number;
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', role: 'customer' });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
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

  // --- ฟังก์ชันเปิด Modal แก้ไข ---
  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || '',
      role: user.role,
    });
    setIsModalOpen(true);
  };

  // --- ฟังก์ชันบันทึกการแก้ไข ---
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_user', userId: editingUser.id, data: formData }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchUsers();
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (error) {
      console.error(error);
    }
  };

  // --- ฟังก์ชัน ระงับ/ปลดแบน บัญชี ---
  const handleToggleLock = async (userId: number, currentStatus: number) => {
    const confirmMsg = currentStatus ? 'ยืนยันการ "ปลดล็อก" บัญชีนี้?' : 'ยืนยันการ "ระงับ" บัญชีนี้? (ผู้ใช้จะล็อกอินไม่ได้)';
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_lock', userId }),
      });
      if (res.ok) fetchUsers();
    } catch (error) {
      console.error(error);
    }
  };

  // --- ฟังก์ชันลบผู้ใช้ ---
  const handleDelete = async (userId: number) => {
    if (!confirm('ยืนยันการลบบัญชีนี้ถาวร? (การกระทำนี้ย้อนกลับไม่ได้)')) return;

    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        fetchUsers();
      } else {
        alert(data.message || 'ลบไม่สำเร็จ');
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;
  }
  if (status !== 'authenticated' || (session?.user as any)?.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans pb-24">
      
      {/* Header */}
      <header className="mb-8 flex items-center gap-4 border-b border-slate-800 pb-6">
        <div className="p-4 bg-blue-500/10 text-blue-500 rounded-2xl border border-blue-500/20">
          <Users size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">ระบบจัดการผู้ใช้งาน</h1>
          <p className="text-sm text-slate-400 mt-1">จัดการข้อมูล แก้ไขสิทธิ์ และระงับบัญชีในระบบ</p>
        </div>
      </header>

      {/* Table Section */}
      <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider font-bold">
                <th className="p-4 w-16">ID</th>
                <th className="p-4">ข้อมูลบัญชี</th>
                <th className="p-4 w-32">สิทธิ์ (Role)</th>
                <th className="p-4 w-32 text-center">สถานะ</th>
                <th className="p-4 text-center w-48">จัดการ</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-800/50">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="animate-spin text-blue-500 mx-auto" /></td></tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 text-slate-500 font-mono text-xs">#{user.id}</td>
                  <td className="p-4">
                    <div className="font-bold text-blue-400">{user.username}</div>
                    <div className="text-xs text-slate-400 mt-1 flex flex-col gap-0.5">
                      {user.name && <span>👤 {user.name} </span>}
                      {user.phone && <span>📞 {user.phone}</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase border tracking-wider ${
                      user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                      user.role === 'shop' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                      'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {user.is_locked ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                        <Lock size={12} /> ถูกระงับ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <ShieldCheck size={12} /> ปกติ
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEditModal(user)} className="p-2 bg-slate-800 text-slate-400 hover:bg-blue-500/20 hover:text-blue-400 rounded-lg transition-colors border border-slate-700/50 hover:border-blue-500/30" title="แก้ไขข้อมูล">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleToggleLock(user.id, user.is_locked)} className={`p-2 rounded-lg transition-colors border ${user.is_locked ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700/50 hover:bg-amber-500/20 hover:text-amber-500 hover:border-amber-500/30'}`} title={user.is_locked ? "ปลดล็อก" : "ระงับบัญชี"}>
                        {user.is_locked ? <Unlock size={16} /> : <Lock size={16} />}
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="p-2 bg-slate-800 text-slate-400 hover:bg-rose-500/20 hover:text-rose-500 rounded-lg transition-colors border border-slate-700/50 hover:border-rose-500/30" title="ลบบัญชี">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Modal สำหรับแก้ไขข้อมูลผู้ใช้ (Dark Theme) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-800">
            <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-950/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><Edit size={18} className="text-blue-500" /> แก้ไขข้อมูลผู้ใช้</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">ชื่อ-นามสกุล</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="ไม่ระบุ" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">เบอร์โทรศัพท์</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="ไม่ระบุ" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">สิทธิ์การใช้งาน (Role)</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all">
                    <option value="customer">Customer (ลูกค้า)</option>
                    <option value="shop">Shop (ร้านค้า)</option>
                    <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                  </select>
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-3 bg-slate-800 text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-700 transition-colors">ยกเลิก</button>
                <button type="submit" className="flex-1 p-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-900/30 transition-colors">บันทึกการแก้ไข</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}