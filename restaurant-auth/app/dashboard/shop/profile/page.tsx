'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // 👈 1. นำเข้า useRouter
import { Store, Landmark, UploadCloud, CreditCard, Building, UserSquare2, QrCode, Clock, MapPin, Type, Navigation, Save } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ShopProfilePage() {
  const router = useRouter(); // 👈 2. เรียกใช้ router
  const [isAuthorized, setIsAuthorized] = useState(false); // 🚨 State ตรวจสอบสิทธิ์

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
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string>('');
  
  // สร้าง State สำหรับเช็คว่า "มีการเปลี่ยนแปลงข้อมูลหรือยัง?"
  const [isDirty, setIsDirty] = useState(false);

  // 🛡️ 3. ตรวจสอบสิทธิ์ก่อนเป็นอันดับแรก
  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      router.replace('/login'); // ไม่มีสิทธิ์ เตะกลับหน้าล็อกอิน
    } else {
      setIsAuthorized(true); // มีสิทธิ์ ให้ผ่านได้
    }
  }, [router]);

  // ดึงข้อมูลร้าน (ทำงานเมื่อได้รับสิทธิ์แล้ว)
  useEffect(() => {
    if (!isAuthorized) return;

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
          if (data.shop.qr_image) setQrPreview(data.shop.qr_image);
          
          // โหลดข้อมูลเสร็จ ให้ตั้งค่าว่ายังไม่มีการแก้ไข
          setIsDirty(false);
        } 
      });
  }, [isAuthorized]);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setQrFile(file);
      setQrPreview(URL.createObjectURL(file)); 
      setIsDirty(true); // 🖼️ เปลี่ยนรูป = ข้อมูลเปลี่ยน
    }
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
      
      if (qrFile) formData.append('qr_image', qrFile); 

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
  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-slate-400 tracking-wider">กำลังตรวจสอบสิทธิ์...</span>
        </div>
      </div>
    );
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
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold">
              <MapPin size={24} /> ตำแหน่งร้านค้า
            </div>
            <button 
              type="button"
              onClick={handleGetCurrentLocation}
              className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 hover:scale-105 transition-all border border-rose-100 shadow-sm"
            >
              <Navigation size={14} /> ดึงพิกัดปัจจุบัน
            </button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">ชื่อธนาคาร / พร้อมเพย์</label>
                <input type="text" placeholder="เช่น กสิกรไทย" value={shop.bank_name || ''} onChange={e => handleShopChange('bank_name', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">เลขที่บัญชี</label>
                <input type="text" placeholder="012-3-45678-9" value={shop.account_number || ''} onChange={e => handleShopChange('account_number', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-indigo-700 tracking-wider focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">ชื่อบัญชี</label>
                <input type="text" placeholder="ชื่อ-นามสกุล" value={shop.account_name || ''} onChange={e => handleShopChange('account_name', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
            <div>
               <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">อัปโหลดรูป QR Code</label>
               <label className="relative flex flex-col items-center justify-center w-full h-full min-h-[220px] border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 cursor-pointer overflow-hidden group hover:border-indigo-400 hover:bg-indigo-50/30 transition-all">
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                {qrPreview ? (
                  <div className="relative w-full h-full p-2">
                    <img src={qrPreview} alt="QR" className="w-full h-full object-contain rounded-xl" />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl m-2">
                       <span className="bg-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-xl"><UploadCloud size={16}/> เปลี่ยนรูป</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                    <QrCode size={36} className="mx-auto mb-3 opacity-50 group-hover:opacity-100" />
                    <p className="text-sm font-bold">กดเพื่ออัปโหลด QR Code</p>
                    <p className="text-xs mt-1 opacity-70">ไฟล์ JPG, PNG</p>
                  </div>
                )}
              </label>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}