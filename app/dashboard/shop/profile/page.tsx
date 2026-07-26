'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; 
import { useSession, signOut } from 'next-auth/react'; // ➕ 1. นำเข้า useSession
import { Store, Landmark, UploadCloud, CreditCard, Building, UserSquare2, QrCode, Clock, MapPin, Type, Navigation, Save, LogOut, X, Zap } from 'lucide-react';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('@/components/MapPicker'), {
  ssr: false,
  loading: () => <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>กำลังโหลดแผนที่...</div>
});
import { motion, AnimatePresence } from 'framer-motion';

export default function ShopProfilePage() {
  const router = useRouter(); 
  
  // 🚨 2. เรียกใช้ Session เพื่อตรวจสอบสิทธิ์
  const { data: session, status } = useSession();

  const [shop, setShop] = useState({
    name: '',
    open_time: '',
    close_time: '',
    is_open: true,
    bank_name: '',
    account_number: '',
    account_name: '',
    qr_image: '',
    latitude: '',  
    longitude: ''  
  });
  
  const [loading, setLoading] = useState(false);
  
  // สร้าง State สำหรับเช็คว่า "มีการเปลี่ยนแปลงข้อมูลหรือยัง?"
  const [isDirty, setIsDirty] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const [showMapModal, setShowMapModal] = useState(false);
  const [tempLocation, setTempLocation] = useState<{lat: number; lng: number} | null>(null);

  const confirmLogout = async () => {
    setIsLogoutModalOpen(false); 
    await signOut({ callbackUrl: '/login/shop' });
  };

  // 🛡️ 3. ตรวจสอบสิทธิ์ผ่าน NextAuth
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login/shop'); // ไม่มีสิทธิ์ เตะกลับหน้าล็อกอินร้านค้า
    } else if (status === 'authenticated') {
      if ((session.user as any)?.role !== 'shop') {
        router.replace('/login/shop?error=wrong_role'); // Role ไม่ใช่ร้านค้า เตะออก
      }
    }
  }, [status, session, router]);

  // ดึงข้อมูลร้าน (ทำงานเมื่อได้รับสิทธิ์แล้ว)
  useEffect(() => {
    if (status !== 'authenticated' || (session?.user as any)?.role !== 'shop') return;

    fetch('/api/customer/home')
      .then(res => res.json())
      .then(data => { 
        if(data.shop) {
          setShop({
            name: data.shop.name || '',
            open_time: data.shop.open_time ? data.shop.open_time.substring(0, 5) : '',
            close_time: data.shop.close_time ? data.shop.close_time.substring(0, 5) : '',
            is_open: data.shop.is_open ?? true,
            bank_name: data.shop.bank_name || '',
            account_number: data.shop.account_number || '',
            account_name: data.shop.account_name || '',
            qr_image: data.shop.qr_image || '',
            latitude: data.shop.latitude?.toString() || '',
            longitude: data.shop.longitude?.toString() || ''
          });
          
          // โหลดข้อมูลเสร็จ ให้ตั้งค่าว่ายังไม่มีการแก้ไข
          setIsDirty(false);
        } 
      });
  }, [status, session]);

  // ดักจับการปิดแท็บ หรือรีเฟรชหน้าเว็บ
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ''; // คำสั่งมาตรฐานเพื่อเรียกใช้ Popup ยืนยันของเบราว์เซอร์
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // ฟังก์ชันตัวช่วยสำหรับอัปเดตข้อมูลและแจ้งว่า "มีการแก้ไขแล้ว"
  const handleShopChange = (field: string, value: any) => {
    setShop(prev => ({ ...prev, [field]: value }));
    setIsDirty(true); // ข้อมูลถูกแก้แล้ว
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ของคุณไม่รองรับการดึงพิกัด');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setShop(prev => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString()
        }));
        setIsDirty(true); // 📍 อัปเดตพิกัด = ข้อมูลเปลี่ยน
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        alert('กรุณา "อนุญาต" การเข้าถึงตำแหน่งในเบราว์เซอร์ของคุณ');
      },
      { enableHighAccuracy: true }
    );
  };

  const handleMapCurrentLocation = () => {
    if (!navigator.geolocation) { alert('เบราว์เซอร์ไม่รองรับ location'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setTempLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => alert('กรุณาอนุญาตการเข้าถึงตำแหน่ง')
    );
  };


  const handleSave = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', shop.name || '');
      formData.append('open_time', shop.open_time || '');
      formData.append('close_time', shop.close_time || '');
      formData.append('is_open', shop.is_open ? '1' : '0');
      formData.append('bank_name', shop.bank_name || '');
      formData.append('account_number', shop.account_number || '');
      formData.append('account_name', shop.account_name || '');
      formData.append('latitude', shop.latitude || '');   
      formData.append('longitude', shop.longitude || '');

      const res = await fetch('/api/shop/profile', {
        method: 'PUT',
        body: formData, 
      });

      if (!res.ok) throw new Error('บันทึกไม่สำเร็จ');
      
      alert('บันทึกข้อมูลเรียบร้อย ✅');
      setIsDirty(false); // 🚨 บันทึกสำเร็จแล้ว ปลดล็อกสถานะการแจ้งเตือน
      
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  // ⏳ 4. โชว์หน้าโหลดดิ้งระหว่างรอเช็คสิทธิ์ ป้องกันการแอบเห็น UI ก่อนโดนเตะ
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-slate-400 tracking-wider">กำลังตรวจสอบสิทธิ์...</span>
        </div>
      </div>
    );
  }

  // ป้องกันหน้ากระพริบกรณีที่เตะ User ออก
  if (status !== 'authenticated' || (session?.user as any)?.role !== 'shop') {
    return null; 
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 text-slate-900 font-sans relative">
      
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 sm:px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 text-white rounded-xl shadow-sm hidden sm:block">
            <Store size={20}/>
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">ตั้งค่าร้านค้า</h1>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
            <span className="text-xs font-bold text-slate-600 hidden sm:block">
              {shop.is_open ? 'เปิดให้บริการ' : 'ปิดร้าน'}
            </span>
            <button 
              onClick={() => handleShopChange('is_open', !shop.is_open)}
              className={`relative h-6 w-11 rounded-full transition-colors ${shop.is_open ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <motion.div 
                animate={{ x: shop.is_open ? 22 : 2 }}
                className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm"
              />
            </button>
          </div>

          <button 
            onClick={handleSave} 
            disabled={loading || !isDirty} // 💡 ทริค: ถ้ายังไม่แก้ข้อมูล ปุ่มเซฟจะกดไม่ได้
            className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 bg-blue-600 text-white text-sm sm:text-base font-bold rounded-full shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            <span className="hidden sm:inline">{loading ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</span>
            <span className="sm:hidden">{loading ? '...' : 'บันทึก'}</span>
          </button>

          <div className="w-[1px] h-6 bg-slate-200 hidden sm:block"></div>

          <button 
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex items-center justify-center w-10 h-10 sm:w-auto sm:px-4 sm:h-10 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all font-bold text-sm group outline-none shrink-0"
          >
            <LogOut size={18} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /> 
            <span className="hidden sm:inline ml-2">ออก</span>
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold">
              <MapPin size={24} /> ตำแหน่งร้านค้า
            </div>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={handleGetCurrentLocation}
                className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 hover:scale-105 transition-all border border-rose-100 shadow-sm"
              >
                <Navigation size={14} /> ดึงพิกัดปัจจุบัน
              </button>
              <button 
                type="button"
                onClick={() => {
                  setTempLocation({
                    lat: shop.latitude ? Number(shop.latitude) : 17.1664,
                    lng: shop.longitude ? Number(shop.longitude) : 104.1486
                  });
                  setShowMapModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 hover:scale-105 transition-all border border-indigo-100 shadow-sm"
              >
                <MapPin size={14} /> ปักหมุดในแผนที่
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Latitude</label>
              <input 
                type="text" placeholder="13.xxxx" value={shop.latitude || ''} 
                onChange={e => handleShopChange('latitude', e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 font-medium focus:ring-2 focus:ring-rose-500 outline-none transition-shadow"
              />
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Longitude</label>
              <input 
                type="text" placeholder="100.xxxx" value={shop.longitude || ''} 
                onChange={e => handleShopChange('longitude', e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 font-medium focus:ring-2 focus:ring-rose-500 outline-none transition-shadow"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4 text-blue-600 font-bold">
            <Clock size={24} /> ข้อมูลร้าน & เวลาให้บริการ
          </div>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-1.5 ml-1"><Type size={16} className="text-slate-400"/> ชื่อร้าน</label>
              <input 
                type="text" placeholder="กรอกชื่อร้านของคุณ" value={shop.name || ''} 
                onChange={e => handleShopChange('name', e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 ml-1 mb-1.5 block">เวลาเปิด</label>
                <input type="time" value={shop.open_time || ''} onChange={e => handleShopChange('open_time', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 ml-1 mb-1.5 block">เวลาปิด</label>
                <input type="time" value={shop.close_time || ''} onChange={e => handleShopChange('close_time', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4 text-indigo-600 font-bold">
            <Landmark size={24} /> ข้อมูลการชำระเงิน
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">ชื่อธนาคาร / พร้อมเพย์</label>
              <input type="text" placeholder="เช่น กสิกรไทย, พร้อมเพย์" value={shop.bank_name || ''} onChange={e => handleShopChange('bank_name', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">เบอร์พร้อมเพย์</label>
              <input type="text" placeholder="เบอร์โทรศัพท์มือถือ หรือ เลขบัตรประชาชน" value={shop.account_number || ''} onChange={e => handleShopChange('account_number', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-indigo-700 tracking-wider focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">ชื่อบัญชี</label>
              <input type="text" placeholder="ชื่อ-นามสกุล" value={shop.account_name || ''} onChange={e => handleShopChange('account_name', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
        </div>

      </div>

      {/* --- 🚪 MODAL: ยืนยันการออกจากระบบ --- */}
      <AnimatePresence>
        {isLogoutModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-[2rem] shadow-2xl shadow-slate-900/10 w-full max-w-[340px] p-8 text-center border border-slate-100"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <LogOut size={28} strokeWidth={2.5} className="ml-1" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">ออกจากระบบ?</h3>
              <p className="text-slate-500 font-medium mb-8 text-sm leading-relaxed">
                เซสชันการทำงานของคุณจะถูกปิดลง<br/>คุณต้องเข้าสู่ระบบใหม่ในครั้งถัดไป
              </p>
              
              <div className="flex flex-col gap-3">
                <button onClick={confirmLogout} className="w-full py-3.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold shadow-md transition-all active:scale-95">
                  ยืนยันออกจากระบบ
                </button>
                <button onClick={() => setIsLogoutModalOpen(false)} className="w-full py-3.5 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl font-bold transition-colors">
                  ยกเลิก
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🗺️ Popup หน้าต่างปักหมุดแผนที่ */}
      {showMapModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200, padding: 20 }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '500px', borderRadius: 28, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 20px 15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EBF1FF' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#1E3A8A' }}>เลือกตำแหน่งร้านค้า</h3>
              <button onClick={() => setShowMapModal(false)} style={{ background: '#F4F8FF', border: 'none', width: 36, height: 36, borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: '#2563EB' }}><X size={20} /></button>
            </div>
            <div style={{ height: '350px', background: '#E2E8F0', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 15, right: 15, zIndex: 400 }}>
                <button type="button" onClick={handleMapCurrentLocation} style={{ background: 'white', border: 'none', padding: '8px 12px', borderRadius: 8, boxShadow: '0 4px 10px rgba(0,0,0,0.15)', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6, color: '#1D4ED8' }}>
                  <Zap size={16} fill="#2563EB" color="#2563EB" /> ตำแหน่งของฉัน
                </button>
              </div>
              <MapPicker tempLocation={tempLocation} setTempLocation={setTempLocation} setAddress={() => {}} />
            </div>
            <div style={{ padding: 20 }}>
              <button onClick={() => { 
                if (tempLocation) {
                  handleShopChange('latitude', tempLocation.lat.toString());
                  handleShopChange('longitude', tempLocation.lng.toString());
                }
                setShowMapModal(false); 
              }} style={{ width: '100%', padding: '14px', background: '#2563EB', color: 'white', borderRadius: 14, fontWeight: '900', fontSize: '1.05rem', border: 'none', cursor: 'pointer' }}>
                ยืนยันตำแหน่งนี้
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}