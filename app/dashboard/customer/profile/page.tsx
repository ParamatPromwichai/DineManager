'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react'; // ➕ 1. นำเข้า useSession และ signOut
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Phone, MapPin, Save, LogOut, 
  Navigation, Loader2, Map, CheckCircle2, ArrowLeft
} from 'lucide-react';

export default function CustomerProfile() {
  const router = useRouter();

  // ➕ 2. ดึงข้อมูล Session จาก NextAuth
  const { data: session, status } = useSession();

  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

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
  // ➕ 3. เช็คสถานะการล็อกอินด้วย status จาก NextAuth
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  /* =========================
     🔥 LOAD PROFILE
  ========================= */
  useEffect(() => {
    if (status !== 'authenticated') return;

    // ➕ 4. ลบการส่ง Headers: {'user-id'} ออก เพราะ Backend ใช้ Session แล้ว
    fetch('/api/customer/profile')
      .then(res => res.json())
      .then(data => {
        const fetchedData = {
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          location: (data.latitude && data.longitude) ? { lat: Number(data.latitude), lng: Number(data.longitude) } : null
        };
        
        // อัปเดตข้อมูลที่แสดงบนฟอร์ม
        setName(fetchedData.name);
        setEmail(fetchedData.email);
        setPhone(fetchedData.phone);
        setAddress(fetchedData.address);
        setLocation(fetchedData.location);
        
        // เก็บไว้เทียบว่ามีการแก้หรือยัง
        setInitialData(fetchedData);
      })
      .catch(() => {
        console.error('โหลดข้อมูลโปรไฟล์ไม่สำเร็จ');
      });

  }, [status]);

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
      () => {
        alert('กรุณาอนุญาตการเข้าถึงตำแหน่งก่อนใช้งาน');
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
  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: '#F4F8FF', gap: 15 }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #2563EB', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: '#1E3A8A', fontWeight: 'bold' }}>กำลังโหลดข้อมูล...</p>
        <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
      </div>
    );
  }

  /* =========================
     UI Styles
  ========================= */
  const labelStyle = { display: 'block', fontSize: '0.9rem', color: '#1E3A8A', fontWeight: 'bold', marginBottom: '8px' };
  const inputWrapperStyle = { display: 'flex', alignItems: 'flex-start', background: '#F4F8FF', border: '1px solid #BFDBFE', borderRadius: '16px', padding: '14px 16px', transition: 'all 0.2s', marginBottom: '20px' };
  const inputIconStyle = { color: '#2563EB', marginRight: '12px', marginTop: '2px' };
  const inputFieldStyle = { width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '0.95rem', color: '#1E3A8A' };

  return (
    <div style={{ minHeight: '100dvh', background: '#F4F8FF', fontFamily: 'sans-serif', paddingBottom: '40px' }}>
      
      {/* 🌟 Header */}
      <div style={{ 
        background: '#ffffff', padding: '16px 20px', borderBottom: '1px solid #DCE8FF', 
        boxShadow: '0 2px 10px rgba(37,99,235,0.03)', display: 'flex', alignItems: 'center', 
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 
      }}>
        
        {/* ด้านซ้าย (กลับ + หัวข้อ) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "900", color: "#1E3A8A" }}>ข้อมูลส่วนตัว</h1>
          </div>
        </div>

        {/* ด้านขวา (ปุ่มออกจากระบบ + ปุ่มบันทึก) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          
          <button
            onClick={() => setShowLogoutPopup(true)}
            style={{ 
              background: '#FEF2F2', color: '#EF4444', border: '1px solid #FEE2E2', 
              padding: '10px', borderRadius: '12px', cursor: 'pointer', 
              display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center'
            }}
          >
            <LogOut size={18} />
          </button>

          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            style={{ 
              background: (!isDirty || isSaving) ? '#E2E8F0' : '#2563EB', 
              color: (!isDirty || isSaving) ? '#94A3B8' : '#ffffff', 
              border: 'none', padding: '10px 16px', borderRadius: '12px', 
              fontWeight: 'bold', fontSize: '0.9rem', cursor: (!isDirty || isSaving) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'all 0.3s',
              boxShadow: (!isDirty || isSaving) ? 'none' : '0 4px 10px rgba(37,99,235,0.2)'
            }}
          >
            {isSaving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
            {isSaving ? 'กำลังบันทึก' : 'บันทึก'}
          </button>

        </div>
      </div>

      <div style={{ padding: '24px 20px', maxWidth: '600px', margin: '0 auto' }}>
        
        {/* 📋 Form Area (Card) */}
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(37,99,235,0.05)', border: '1px solid #DCE8FF' }}>
          
          <div>
            <label style={labelStyle}>ชื่อ-นามสกุล</label>
            <div style={inputWrapperStyle}>
              <User size={18} style={inputIconStyle} />
              <input type="text" placeholder="ระบุชื่อของคุณ" value={name} onChange={e => setName(e.target.value)} style={inputFieldStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>อีเมล</label>
            <div style={inputWrapperStyle}>
              <Mail size={18} style={inputIconStyle} />
              <input type="email" placeholder="example@email.com" value={email} onChange={e => setEmail(e.target.value)} style={inputFieldStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>เบอร์โทรศัพท์ <span style={{color: '#EF4444'}}>*</span></label>
            <div style={inputWrapperStyle}>
              <Phone size={18} style={inputIconStyle} />
              <input type="tel" placeholder="08X-XXX-XXXX" value={phone} onChange={e => setPhone(e.target.value)} style={inputFieldStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>รายละเอียดที่อยู่จัดส่ง <span style={{color: '#EF4444'}}>*</span></label>
            <div style={inputWrapperStyle}>
              <Map size={18} style={inputIconStyle} />
              <textarea placeholder="เช่น บ้านเลขที่, อาคาร, ซอย, จุดสังเกต..." value={address} onChange={e => setAddress(e.target.value)} style={{ ...inputFieldStyle, minHeight: '80px', resize: 'vertical' }} />
            </div>
          </div>

          {/* 📍 Location Button */}
          <div style={{ marginTop: '5px' }}>
            <label style={labelStyle}>พิกัด GPS สำหรับจัดส่ง <span style={{color: '#EF4444'}}>*</span></label>
            
            <button 
              onClick={requestLocation}
              disabled={isFetchingLocation}
              style={{ 
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px', 
                background: location ? '#ECFDF5' : '#EFF6FF', 
                color: location ? '#059669' : '#1D4ED8', 
                border: location ? '1px solid #10B981' : '1px dashed #2563EB', 
                borderRadius: '16px', cursor: isFetchingLocation ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '0.95rem', 
                transition: 'all 0.2s' 
              }}
            >
              {isFetchingLocation ? (
                <><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> กำลังค้นหาพิกัด...</>
              ) : location ? (
                <><CheckCircle2 size={20} /> บันทึกพิกัดปัจจุบันแล้ว (กดเพื่ออัปเดต)</>
              ) : (
                <><Navigation size={20} /> ดึงพิกัดตำแหน่งปัจจุบัน</>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* 🌟 Custom Popup ออกจากระบบ */}
      <AnimatePresence>
        {showLogoutPopup && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 10 }} 
              style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '340px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
            >
              <div style={{ width: '64px', height: '64px', background: '#FEF2F2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <LogOut size={32} color="#EF4444" />
              </div>
              <h3 style={{ margin: '0 0 8px 0', color: '#1E3A8A', fontSize: '1.25rem', fontWeight: '900' }}>ออกจากระบบ</h3>
              <p style={{ margin: '0 0 24px 0', color: '#64748B', fontSize: '0.95rem', lineHeight: '1.5' }}>คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบบัญชีนี้?</p>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setShowLogoutPopup(false)} 
                  style={{ flex: 1, padding: '14px', background: '#F1F5F9', color: '#475569', borderRadius: '16px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleLogout} 
                  style={{ flex: 1, padding: '14px', background: '#EF4444', color: '#ffffff', borderRadius: '16px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.95rem', boxShadow: '0 4px 12px rgba(239,68,68,0.2)' }}
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