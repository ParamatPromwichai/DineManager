'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import useSWR from 'swr';
const fetcher = (url: string) => fetch(url).then(res => res.json());
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Phone, MapPin, Save, LogOut, 
  Navigation, Loader2, Map, CheckCircle2, ArrowLeft, Moon, Sun
} from 'lucide-react';
import { useTheme } from 'next-themes';

export default function CustomerProfile() {
  const router = useRouter();

  // ➕ 2. ดึงข้อมูล Session จาก NextAuth
  const { data: session, status } = useSession();

  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showMascot, setShowMascot] = useState(false);
  const [mascotMode, setMascotMode] = useState('both');
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setShowMascot(localStorage.getItem('show_mascot') === 'true');
    setMascotMode(localStorage.getItem('mascot_mode') || 'both');
  }, []);

  const toggleMascot = () => {
    const newState = !showMascot;
    setShowMascot(newState);
    if (newState) {
      localStorage.setItem('show_mascot', 'true');
    } else {
      localStorage.removeItem('show_mascot');
    }
    window.dispatchEvent(new Event('mascot_setting_changed'));
  };

  const changeMascotMode = (mode: string) => {
    setMascotMode(mode);
    localStorage.setItem('mascot_mode', mode);
  };

  // 📝 Current Data
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<any>(null);

  // 🗄️ Initial Data (สำหรับเทียบว่าข้อมูลถูกแก้หรือยัง)
  const [initialData, setInitialData] = useState<any>({
    name: '', email: '', phone: '', address: '', location: null
  });

  /* =========================
     🔐 CHECK LOGIN
  ========================= */
  // 🛡️ เช็คว่าถ้ายังไม่ได้ล็อกอินให้เด้งไปหน้า Login
  useEffect(() => {
    if (status === 'unauthenticated' || (status === 'authenticated' && !session?.user)) {
      fetch('/api/auth/force-logout', { method: 'POST' }).then(() => {
        document.cookie.split(";").forEach((c) => {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        window.location.href = '/login';
      });
    }
  }, [status, session]);

  /* =========================
     🔥 LOAD PROFILE
  ========================= */
  const { data: profileData, mutate, isLoading: isProfileLoading } = useSWR(
    status === 'authenticated' ? '/api/customer/profile' : null,
    fetcher
  );

  useEffect(() => {
    if (profileData) {
      const fetchedData = {
        name: profileData.name || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        address: profileData.address || '',
        location: (profileData.latitude && profileData.longitude) ? { lat: Number(profileData.latitude), lng: Number(profileData.longitude) } : null
      };
      
      setName(fetchedData.name);
      setEmail(fetchedData.email);
      setPhone(fetchedData.phone);
      setAddress(fetchedData.address);
      setLocation(fetchedData.location);
      
      setInitialData(fetchedData);
    }
  }, [profileData]);

  /* =========================
     📍 LOCATION
  ========================= */
  function requestLocation() {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ของคุณไม่รองรับระบบพิกัด');
      return;
    }

    setIsFetchingLocation(true);

    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setIsFetchingLocation(false);
      },
      (error) => {
        let errorMsg = 'กรุณาอนุญาตการเข้าถึงตำแหน่งก่อนใช้งาน';
        if (error.code === 1) errorMsg = 'การเข้าถึงตำแหน่งถูกปฏิเสธ (Permission Denied)';
        if (error.code === 2) errorMsg = 'ไม่สามารถหาตำแหน่งได้ (Position Unavailable) - ตรวจสอบ GPS ของคุณ';
        if (error.code === 3) errorMsg = 'หมดเวลาในการหาตำแหน่ง (Timeout)';
        
        if (error.code === 3) {
          // ถ้าเป็น Timeout (มักเกิดในคอมพิวเตอร์) ไม่ต้องแสดงแจ้งเตือน Error น่ากลัวๆ ให้แสดงแค่ข้อความเตือนนุ่มนวล
          alert('ไม่สามารถดึงพิกัดอัตโนมัติได้ กรุณาระบุที่อยู่ด้วยตนเองครับ');
        } else {
          alert(`เกิดข้อผิดพลาด: ${errorMsg}`);
        }
        setIsFetchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  /* =========================
     💾 SAVE
  ========================= */
  async function handleSave() {
    if (!phone || !address) {
      alert('กรุณากรอกเบอร์โทรและที่อยู่ให้ครบถ้วน');
      return;
    }

    setIsSaving(true);
    try {
      // ➕ 5. ลบการส่ง Headers: {'user-id'} ออกตอน Save เช่นกัน
      const res = await fetch('/api/customer/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone,
          address,
          location,
          name,
          email
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('บันทึกข้อมูลส่วนตัวเรียบร้อยแล้วครับ!');
        // อัปเดต initial data เป็นค่าปัจจุบันเพื่อรีเซ็ตปุ่มบันทึกให้กดไม่ได้ชั่วคราว
        setInitialData({ name, email, phone, address, location });
        mutate();
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (error) {
      alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setIsSaving(false);
    }
  }

  /* =========================
     🚪 LOGOUT
  ========================= */
  // ➕ 6. ใช้ฟังก์ชัน signOut ของ NextAuth แทนการเคลียร์ localStorage เอง
  function handleLogout() {
    signOut({ callbackUrl: '/login' });
  }

  /* =========================
     👀 ตรวจสอบว่ามีการเปลี่ยนแปลงข้อมูลหรือไม่
  ========================= */
  const isDirty = 
    name !== initialData.name ||
    email !== initialData.email ||
    phone !== initialData.phone ||
    address !== initialData.address ||
    JSON.stringify(location) !== JSON.stringify(initialData.location);

  /* =========================
     ⏳ LOADING SCREEN
  ========================= */
  // ➕ 7. ใช้ status === 'loading' แทน checkingAuth
  if (status === 'loading' || (isProfileLoading && !profileData)) {
    return (
      <div className="bg-blue-50 dark:bg-slate-900 font-sans min-h-[100dvh] pb-2 transition-colors animate-pulse">
        <div className="bg-white dark:bg-slate-800 px-5 py-4 border-b border-blue-100 dark:border-slate-700 shadow-sm flex items-center justify-between sticky top-0 z-10 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-24 h-6 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
          </div>
          <div className="flex items-center gap-2.5">
             <div className="w-24 h-10 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
             <div className="w-24 h-10 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
          </div>
        </div>
        <div className="max-w-[600px] mx-auto p-5 mt-2">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-blue-100 dark:border-slate-700 transition-colors">
             <div className="w-32 h-6 bg-slate-200 dark:bg-slate-700 rounded-md mb-6"></div>
             <div className="space-y-5">
               {[1, 2, 3, 4, 5].map(i => (
                 <div key={i} className="space-y-2">
                   <div className="w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
                   <div className="w-full h-12 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>
    );
  }

  /* =========================
     UI Styles
  ========================= */
  const labelStyle = "block text-sm font-bold mb-2 text-blue-900 dark:text-blue-100";
  const inputWrapperStyle = "flex items-start bg-blue-50 dark:bg-slate-700 border border-blue-200 dark:border-slate-600 rounded-2xl p-3.5 transition-all mb-5";
  const inputIconStyle = "text-blue-600 dark:text-blue-400 mr-3 mt-0.5";
  const inputFieldStyle = "w-full border-none bg-transparent outline-none text-base text-blue-900 dark:text-blue-50 placeholder-slate-400 dark:placeholder-slate-400";

  return (
    <div className="bg-blue-50 dark:bg-slate-900 font-sans pb-2 transition-colors">
      
      {/* 🌟 Header */}
      <div className="bg-white dark:bg-slate-800 px-5 py-4 border-b border-blue-100 dark:border-slate-700 shadow-sm flex items-center justify-between sticky top-0 z-10 transition-colors">
        
        {/* ด้านซ้าย (กลับ + หัวข้อ) */}
        <div className="flex items-center gap-3">
          <div>
            <h1 className="m-0 text-lg font-black text-blue-900 dark:text-blue-50">ข้อมูลส่วนตัว</h1>
          </div>
        </div>

        {/* ด้านขวา (ปุ่มออกจากระบบ + ปุ่มบันทึก) */}
        <div className="flex items-center gap-2.5">
          
          <button
            onClick={() => setShowLogoutPopup(true)}
            className="bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900/50 p-2.5 rounded-xl cursor-pointer flex items-center justify-center transition-colors"
          >
            <LogOut size={18} />
          </button>

        </div>
      </div>

      <div className="px-5 py-6 max-w-[600px] mx-auto">
        
        {/* 📋 Form Area (Card) */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-blue-100 dark:border-slate-700 transition-colors">
          
          <div>
            <label className={labelStyle}>ชื่อ-นามสกุล</label>
            <div className={inputWrapperStyle}>
              <User size={18} className={inputIconStyle} />
              <input type="text" placeholder="ระบุชื่อของคุณ" value={name} onChange={e => setName(e.target.value)} className={inputFieldStyle} />
            </div>
          </div>

          <div>
            <label className={labelStyle}>อีเมล</label>
            <div className={inputWrapperStyle}>
              <Mail size={18} className={inputIconStyle} />
              <input type="email" placeholder="example@email.com" value={email} onChange={e => setEmail(e.target.value)} className={inputFieldStyle} />
            </div>
          </div>

          <div>
            <label className={labelStyle}>เบอร์โทรศัพท์ <span className="text-red-500">*</span></label>
            <div className={inputWrapperStyle}>
              <Phone size={18} className={inputIconStyle} />
              <input type="tel" placeholder="08X-XXX-XXXX" value={phone} onChange={e => setPhone(e.target.value)} className={inputFieldStyle} />
            </div>
          </div>

          <div>
            <label className={labelStyle}>รายละเอียดที่อยู่จัดส่ง <span className="text-red-500">*</span></label>
            <div className={inputWrapperStyle}>
              <Map size={18} className={inputIconStyle} />
              <textarea placeholder="เช่น บ้านเลขที่, อาคาร, ซอย, จุดสังเกต..." value={address} onChange={e => setAddress(e.target.value)} className={`${inputFieldStyle} min-h-[80px] resize-y`} />
            </div>
          </div>

          {/* 📍 Location Button */}
          <div className="mt-1.5">
            <label className={labelStyle}>พิกัด GPS สำหรับจัดส่ง <span className="text-red-500">*</span></label>
            
            <button 
              onClick={requestLocation}
              disabled={isFetchingLocation}
              className={`w-full flex items-center justify-center gap-2.5 p-4 rounded-2xl font-bold text-[0.95rem] transition-all ${
                isFetchingLocation ? 'cursor-not-allowed bg-blue-50 dark:bg-slate-700 text-blue-700 dark:text-blue-400 border border-dashed border-blue-600' :
                location ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-500 cursor-pointer' :
                'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-dashed border-blue-600 cursor-pointer'
              }`}
            >
              {isFetchingLocation ? (
                <><Loader2 size={20} className="animate-spin" /> กำลังค้นหาพิกัด...</>
              ) : location ? (
                <><CheckCircle2 size={20} /> บันทึกพิกัดปัจจุบันแล้ว (กดเพื่ออัปเดต)</>
              ) : (
                <><Navigation size={20} /> ดึงพิกัดตำแหน่งปัจจุบัน</>
              )}
            </button>
          </div>

          {/* 💾 Save Button */}
          <div className="mt-6">
            <button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className={`w-full py-4 rounded-2xl font-black text-[1.05rem] flex items-center justify-center gap-2 transition-all ${
                (!isDirty || isSaving) 
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-lg shadow-blue-600/20'
              }`}
            >
              {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
              {isSaving ? 'กำลังบันทึกข้อมูล...' : 'บันทึกข้อมูลส่วนตัว'}
            </button>
          </div>
        </div>

        {/* ⚙️ Settings Area (New Card) */}
        <div className="mt-6 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-blue-100 dark:border-slate-700 transition-colors">
          <h2 className="text-[1.1rem] font-black text-blue-900 dark:text-blue-50 m-0 mb-4">การตั้งค่าแอปพลิเคชัน</h2>

          {/* 🤖 Mascot Settings */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 transition-colors">
            <div className="flex justify-between items-center gap-4">
              <div className="flex-1">
                <div className="font-bold text-blue-900 dark:text-blue-50 text-[0.95rem]">มาสคอต AI นำทาง</div>
                <div className="text-[0.8rem] text-slate-500 dark:text-slate-400 mt-0.5">แสดงหุ่นยนต์ผู้ช่วยแนะนำการใช้งานเว็บ</div>
              </div>
              <button 
                onClick={toggleMascot}
                className={`w-[50px] h-[28px] shrink-0 rounded-full relative border-none cursor-pointer transition-colors ${showMascot ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <div className={`w-[24px] h-[24px] bg-white rounded-full absolute top-[2px] left-[2px] transition-transform shadow-[0_2px_5px_rgba(0,0,0,0.2)] ${showMascot ? 'translate-x-[22px]' : 'translate-x-0'}`} />
              </button>
            </div>
            
            {showMascot && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-2">
                <div className="text-[0.85rem] font-bold text-slate-700 dark:text-slate-300 mb-2">เมื่อกดที่ตัวมาสคอต:</div>
                <div className="flex gap-2">
                  <button onClick={() => changeMascotMode('both')} className={`flex-1 py-2 px-1 text-[0.75rem] rounded-xl border transition-colors cursor-pointer ${mascotMode === 'both' ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-600 text-blue-700 dark:text-blue-300 font-bold' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'}`}>เสียง+ข้อความ</button>
                  <button onClick={() => changeMascotMode('text')} className={`flex-1 py-2 px-1 text-[0.75rem] rounded-xl border transition-colors cursor-pointer ${mascotMode === 'text' ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-600 text-blue-700 dark:text-blue-300 font-bold' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'}`}>ข้อความเท่านั้น</button>
                  <button onClick={() => changeMascotMode('voice')} className={`flex-1 py-2 px-1 text-[0.75rem] rounded-xl border transition-colors cursor-pointer ${mascotMode === 'voice' ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-600 text-blue-700 dark:text-blue-300 font-bold' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'}`}>เสียงเท่านั้น</button>
                </div>
              </div>
            )}
          </div>

          {/* 🌙 Dark Mode Settings */}
          {mounted && (
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex justify-between items-center gap-4 transition-colors">
              <div className="flex-1">
                <div className="font-bold text-blue-900 dark:text-blue-50 text-[0.95rem] flex items-center gap-2">
                  {theme === 'dark' ? <Moon size={16} className="text-indigo-400 shrink-0" /> : <Sun size={16} className="text-amber-500 shrink-0" />}
                  โหมดกลางคืน (Dark Mode)
                </div>
                <div className="text-[0.8rem] text-slate-500 dark:text-slate-400 mt-0.5">เปลี่ยนธีมสีของแอปพลิเคชัน</div>
              </div>
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={`w-[50px] h-[28px] shrink-0 rounded-full relative border-none cursor-pointer transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <div className={`w-[24px] h-[24px] bg-white rounded-full absolute top-[2px] left-[2px] transition-transform shadow-[0_2px_5px_rgba(0,0,0,0.2)] ${theme === 'dark' ? 'translate-x-[22px]' : 'translate-x-0'}`} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 🌟 Custom Popup ออกจากระบบ */}
      <AnimatePresence>
        {showLogoutPopup && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[1000] p-5">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 10 }} 
              className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-[340px] text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut size={32} className="text-red-500" />
              </div>
              <h3 className="m-0 mb-2 text-blue-900 dark:text-blue-50 text-xl font-black">ออกจากระบบ</h3>
              <p className="m-0 mb-6 text-slate-500 dark:text-slate-400 text-[0.95rem] leading-relaxed">คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบบัญชีนี้?</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowLogoutPopup(false)} 
                  className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold border-none cursor-pointer text-[0.95rem] hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleLogout} 
                  className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold border-none cursor-pointer text-[0.95rem] shadow-lg shadow-red-500/20 transition-all"
                >
                  ออกจากระบบ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
    </div>
  );
}