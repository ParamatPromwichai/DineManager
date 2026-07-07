'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Settings, Shield, Save, Loader2, Server, Wrench, AlertTriangle, Bike } from 'lucide-react';

interface SystemSettings {
  max_failed_logins: string;
  maintenance_mode: string;
  delivery_fee: string;
  delivery_fee_per_km: string;
  require_shop_approval: string;
}

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState<SystemSettings>({
    max_failed_logins: '5',
    maintenance_mode: 'false',
    delivery_fee: '0',
    delivery_fee_per_km: '0',
    require_shop_approval: 'true'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'admin') {
      fetch('/api/admin/settings')
        .then(res => res.json())
        .then(data => {
          setFormData({
            max_failed_logins: data.max_failed_logins || '5',
            maintenance_mode: data.maintenance_mode || 'false',
            delivery_fee: data.delivery_fee || '0',
            delivery_fee_per_km: data.delivery_fee_per_km || '0',
            require_shop_approval: data.require_shop_approval || 'true'
          });
          setLoading(false);
        })
        .catch(err => console.error(err));
    }
  }, [status, session]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert('อัปเดตการตั้งค่าระบบเรียบร้อยแล้ว!');
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const isMaintenance = formData.maintenance_mode === 'true';
  const requireShopApproval = formData.require_shop_approval === 'true';

  if (status === 'loading' || loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;
  }
  if (status !== 'authenticated' || (session?.user as any)?.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans pb-24">
      
      <header className="mb-8 flex items-center gap-4 border-b border-slate-800 pb-6">
        <div className="p-4 bg-blue-500/10 text-blue-500 rounded-2xl border border-blue-500/20">
          <Server size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">ดูแลระบบเว็บ (System Config)</h1>
          <p className="text-sm text-slate-400 mt-1">ปรับแต่งค่าพารามิเตอร์ของเซิร์ฟเวอร์และความปลอดภัย</p>
        </div>
      </header>

      <form onSubmit={handleSave} className="max-w-3xl space-y-8">
        
        {/* Section 1: Maintenance Mode */}
        <div className={`border rounded-2xl overflow-hidden shadow-xl transition-colors ${isMaintenance ? 'bg-amber-950/20 border-amber-500/50' : 'bg-slate-900 border-slate-800'}`}>
          <div className={`p-5 border-b flex items-center gap-3 ${isMaintenance ? 'bg-amber-950/50 border-amber-500/20' : 'bg-slate-900/50 border-slate-800'}`}>
            <Wrench className={isMaintenance ? "text-amber-500" : "text-slate-400"} size={24} />
            <h2 className="font-bold text-lg text-white">โหมดซ่อมบำรุง (Maintenance Mode)</h2>
          </div>
          
          <div className="p-6 md:p-8">
            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 p-5 rounded-xl border ${isMaintenance ? 'bg-amber-900/10 border-amber-500/30' : 'bg-slate-950 border-slate-800'}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-white text-base">ปิดปรับปรุงระบบชั่วคราว</p>
                  {isMaintenance && <span className="bg-amber-500 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded uppercase flex items-center gap-1"><AlertTriangle size={12}/> Active</span>}
                </div>
                <p className="text-sm text-slate-400 mt-2">
                  เมื่อเปิดใช้งาน ลูกค้าและร้านค้าจะไม่สามารถเข้าสู่ระบบหรือสมัครสมาชิกได้ 
                  (มีเพียงบัญชีระดับ Admin เท่านั้นที่สามารถล็อกอินได้ตามปกติ)
                </p>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input 
                  type="checkbox" 
                  checked={isMaintenance} 
                  onChange={(e) => setFormData({ ...formData, maintenance_mode: e.target.checked ? 'true' : 'false' })}
                  className="sr-only peer" 
                />
                <div className="w-14 h-7 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Store & Delivery Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3">
            <Bike className="text-orange-500" size={24} />
            <h2 className="font-bold text-lg text-white">การตั้งค่าการจัดส่ง (Delivery)</h2>
          </div>
          
          <div className="p-6 md:p-8 space-y-4">
            {/* ค่าจัดส่งเริ่มต้น (เปลี่ยนคำอธิบายให้ชัดเจน) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex-1">
                <p className="font-bold text-white text-base">ค่าจัดส่งเริ่มต้น (ครอบคลุม 2 กม. แรก)</p>
                <p className="text-sm text-slate-500 mt-1">ค่าจัดส่งพื้นฐานสำหรับระยะทาง 0 - 2 กิโลเมตรแรก</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <input 
                  type="number" 
                  min="0" 
                  value={formData.delivery_fee} 
                  onChange={(e) => setFormData({ ...formData, delivery_fee: e.target.value })}
                  className="w-24 p-3 bg-slate-900 border border-slate-700 rounded-xl font-black text-center text-orange-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all" 
                />
                <span className="text-slate-400 font-bold w-12">บาท</span>
              </div>
            </div>

            {/* ค่าจัดส่งเพิ่มเติมต่อกิโลเมตร (เปลี่ยนคำอธิบายให้ชัดเจน) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex-1">
                <p className="font-bold text-white text-base">ค่าจัดส่งตามระยะทาง (ส่วนเกินจาก 2 กม.)</p>
                <p className="text-sm text-slate-500 mt-1">หากระยะทางเกิน 2 กิโลเมตร ระบบจะนำ "ระยะทางส่วนเกิน" มาคูณกับเรทนี้เพื่อบวกเพิ่มในค่าจัดส่ง</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <input 
                  type="number" 
                  min="0" 
                  value={formData.delivery_fee_per_km} 
                  onChange={(e) => setFormData({ ...formData, delivery_fee_per_km: e.target.value })}
                  className="w-24 p-3 bg-slate-900 border border-slate-700 rounded-xl font-black text-center text-orange-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all" 
                />
                <span className="text-slate-400 font-bold w-16">บาท/กม.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Security Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3">
            <Shield className="text-emerald-500" size={24} />
            <h2 className="font-bold text-lg text-white">การตั้งค่าความปลอดภัย (Security)</h2>
          </div>
          
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex-1">
                <p className="font-bold text-white text-base">จำกัดการล็อกอินผิดพลาด</p>
                <p className="text-sm text-slate-500 mt-1">กำหนดจำนวนครั้งที่ผู้ใช้สามารถพิมพ์รหัสผ่านผิดได้ ก่อนที่ระบบจะระงับบัญชีเพื่อป้องกันการสุ่มรหัสผ่าน</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <input 
                  type="number" 
                  min="1" 
                  max="20"
                  value={formData.max_failed_logins} 
                  onChange={(e) => setFormData({ ...formData, max_failed_logins: e.target.value })}
                  className="w-24 p-3 bg-slate-900 border border-slate-700 rounded-xl font-black text-center text-emerald-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all" 
                />
                <span className="text-slate-400 font-bold w-12">ครั้ง</span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-950 rounded-xl border border-slate-800 mt-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-white text-base">ระบบอนุมัติร้านค้าใหม่ (Shop Approval)</p>
                  {requireShopApproval && <span className="bg-emerald-500 text-emerald-950 text-[10px] font-black px-2 py-0.5 rounded uppercase flex items-center gap-1">Active</span>}
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  เมื่อเปิดใช้งาน บัญชีร้านค้าใหม่จะถูกระงับชั่วคราวและต้องรอให้ Admin ทำการอนุมัติก่อนจึงจะสามารถเข้าใช้งานระบบได้
                </p>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input 
                  type="checkbox" 
                  checked={requireShopApproval} 
                  onChange={(e) => setFormData({ ...formData, require_shop_approval: e.target.checked ? 'true' : 'false' })}
                  className="sr-only peer" 
                />
                <div className="w-14 h-7 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex">
          <button 
            type="submit" 
            disabled={saving} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-900/30 disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none w-full md:w-auto"
          >
            {saving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
            {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าระบบ'}
          </button>
        </div>

      </form >
    </div >
  );
}