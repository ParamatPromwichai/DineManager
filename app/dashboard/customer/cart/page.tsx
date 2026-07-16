'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingCart, CreditCard, X, MapPin, Zap, CheckCircle2, UploadCloud, ImageOff, Plus, Minus } from 'lucide-react';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('@/components/MapPicker'), {
  ssr: false,
  loading: () => <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>กำลังโหลดแผนที่...</div>
});

type CartItem = {
  cartItemId: string;
  id: number;
  name: string;
  price: number;
  quantity: number;
  originalName: string;
};

type Location = { lat: number; lng: number; };

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function CartPage() {
  const router = useRouter();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<Location | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'qr' | 'cod' | ''>('');
  const [slipImage, setSlipImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [shopData, setShopData] = useState<any>(null);
  const [baseDeliveryFee, setBaseDeliveryFee] = useState(0);
  const [deliveryFeePerKm, setDeliveryFeePerKm] = useState(0);

  const [showMapModal, setShowMapModal] = useState(false);
  const [tempLocation, setTempLocation] = useState<Location | null>(null);

  const [distance, setDistance] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);

  const paymentBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paymentMethod === 'qr' && paymentBottomRef.current) {
      setTimeout(() => {
        paymentBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, [paymentMethod]);

  useEffect(() => {
    const savedCart = localStorage.getItem('dinemanager_cart');
    if (savedCart) { try { setCart(JSON.parse(savedCart)); } catch {} }
    
    setPhone(localStorage.getItem('dinemanager_phone') || '');
    setAddress(localStorage.getItem('dinemanager_address') || '');
    
    // Fetch Shop Data & Delivery settings
    Promise.all([
      fetch('/api/customer/home').then(r => r.json()),
      fetch('/api/sysconfig').then(r => r.json()),
      fetch('/api/customer/profile').then(r => r.json())
    ]).then(([homeRes, configRes, profileRes]) => {
      setShopData(homeRes.shop);
      setBaseDeliveryFee(configRes.delivery_fee || 0);
      setDeliveryFeePerKm(configRes.delivery_fee_per_km || 0);
      if (profileRes?.phone && !localStorage.getItem('dinemanager_phone')) setPhone(profileRes.phone);
      if (profileRes?.address && !localStorage.getItem('dinemanager_address')) setAddress(profileRes.address);
      if (profileRes?.latitude && profileRes?.longitude) {
        setLocation({ lat: Number(profileRes.latitude), lng: Number(profileRes.longitude) });
      }
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('dinemanager_cart', JSON.stringify(cart));
    }
  }, [cart, isLoaded]);
  useEffect(() => { localStorage.setItem('dinemanager_phone', phone); }, [phone]);
  useEffect(() => { localStorage.setItem('dinemanager_address', address); }, [address]);

  useEffect(() => {
    if (location && shopData?.latitude && shopData?.longitude) {
      const dist = calculateDistance(location.lat, location.lng, Number(shopData.latitude), Number(shopData.longitude));
      setDistance(dist);
      let fee = baseDeliveryFee; 
      if (dist > 2) fee += Math.ceil(dist - 2) * deliveryFeePerKm; 
      setDeliveryFee(fee);
    }
  }, [location, shopData, baseDeliveryFee, deliveryFeePerKm]);

  const subTotal = useMemo(() => cart.reduce((sum, i) => sum + i.price * i.quantity, 0), [cart]);
  const total = subTotal + (location ? deliveryFee : 0);

  function requestLocation() {
    if (!navigator.geolocation) { alert('เบราว์เซอร์ไม่รองรับ location'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => alert('กรุณาอนุญาตการเข้าถึงตำแหน่ง')
    );
  }

  function removeFromCart(cartItemId: string) {
    setCart(prev => prev.map(i => (i.cartItemId === cartItemId ? { ...i, quantity: i.quantity - 1 } : i)).filter(i => i.quantity > 0));
  }

  function addToCartDirectly(cartItemId: string) {
    setCart(prev => prev.map(i => i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + 1 } : i));
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setSlipImage(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  async function handleConfirmOrder() {
    if (!phone || !address || !paymentMethod) { alert('กรุณากรอกข้อมูลให้ครบ'); return; }
    if (!location) { alert('กรุณาแนบพิกัดเพื่อคำนวณค่าส่ง'); return; }
    if (paymentMethod === 'qr' && !slipImage) { alert('กรุณาแนบสลิปโอนเงิน'); return; }
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      await fetch('/api/customer/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, address, location }) });
      const res = await fetch('/api/customer/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: cart, phone, address, location, paymentMethod, subTotal, deliveryFee, totalPrice: total, slipImage }) });
      if (!res.ok) throw new Error('Order failed');
      alert('สั่งอาหารสำเร็จ ขอบคุณที่ใช้บริการครับ!');
      setCart([]); setSlipImage(null); setPaymentMethod(''); setShowPaymentModal(false);
      localStorage.removeItem('dinemanager_cart');
      router.push('/dashboard/customer/orders');
    } catch (error) { 
      alert('เกิดข้อผิดพลาด'); 
    } finally { 
      setIsSubmitting(false); 
    }
  }

  if (cart.length === 0) {
    return (
      <div style={{ padding: '20px', background: '#F4F8FF', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <ShoppingCart size={48} color="#94A3B8" style={{ marginBottom: 15 }} />
        <h2 style={{ color: '#1E3A8A' }}>ตะกร้าว่างเปล่า</h2>
        <button onClick={() => router.push('/dashboard/customer/menus')} style={{ padding: '10px 20px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, marginTop: 15, fontWeight: 'bold', cursor: 'pointer' }}>
          ไปเลือกอาหารเลย
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 20px 100px 20px', background: '#F4F8FF', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, gap: 10 }}>
        <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontWeight: 'bold', cursor: 'pointer', padding: '8px 14px', borderRadius: '20px', fontSize: '0.9rem' }}>
          <ArrowLeft size={16} /> กลับ
        </button>
        <h1 style={{ margin: 0, flex: 1, textAlign: 'center', color: '#1E3A8A', fontSize: '1.2rem', fontWeight: '900', paddingRight: 70 }}>
          ชำระเงิน
        </h1>
      </div>

      <div style={{ background: '#ffffff', padding: 25, borderRadius: 24, boxShadow: '0 4px 15px rgba(37, 99, 235, 0.05)', border: '1px solid #EBF1FF' }}>
        {/* รายการในตะกร้า */}
        <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#1E3A8A', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShoppingCart size={20} color="#2563EB" /> รายการอาหาร
        </h3>
        <div style={{ marginBottom: 20 }}>
          {cart.map(item => (
            <div key={item.cartItemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ flex: 1, paddingRight: 10 }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#1E40AF' }}>{item.originalName}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: 1.3 }}>{item.name.replace(item.originalName, '').trim()}</div>
                <div style={{ color: '#2563EB', fontWeight: 'bold', fontSize: '0.85rem' }}>{item.price.toLocaleString()} ฿</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', background: '#F4F8FF', border: '1px solid #DCE8FF', borderRadius: '20px', overflow: 'hidden' }}>
                <button onClick={() => removeFromCart(item.cartItemId)} style={{ background: 'transparent', border: 'none', padding: '6px 12px', cursor: 'pointer', color: '#EF4444' }}><Minus size={14} strokeWidth={3} /></button>
                <span style={{ fontSize: '0.95rem', fontWeight: 'bold', width: '20px', textAlign: 'center', color: '#1E3A8A' }}>{item.quantity}</span>
                <button onClick={() => addToCartDirectly(item.cartItemId)} style={{ background: 'transparent', border: 'none', padding: '6px 12px', cursor: 'pointer', color: '#2563EB' }}><Plus size={14} strokeWidth={3} /></button>
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => setShowPaymentModal(true)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '16px 20px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: '900', fontSize: '1.1rem', boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)' }}>
          <span>สั่งซื้อและชำระเงิน</span>
          <span>{subTotal.toLocaleString()} ฿</span>
        </button>
      </div>

      {/* 🔴 Payment Modal */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', borderRadius: 28, padding: 25, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1E3A8A', fontWeight: '900' }}>ข้อมูลการจัดส่ง</h3>
              <button onClick={() => setShowPaymentModal(false)} style={{ background: '#F1F5F9', border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: '#64748B' }}><X size={18} /></button>
            </div>

            {/* ข้อมูลการจัดส่ง */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <input type="tel" placeholder="เบอร์โทรศัพท์ติดต่อ *" value={phone} onChange={e => setPhone(e.target.value)} style={{ padding: 14, border: '1px solid #BFDBFE', borderRadius: 12, outline: 'none', fontSize: '1rem', background: '#F4F8FF', color: '#1E3A8A' }} />
              <textarea placeholder="ที่อยู่จัดส่งโดยละเอียด *" value={address} onChange={e => setAddress(e.target.value)} style={{ padding: 14, minHeight: 80, border: '1px solid #BFDBFE', borderRadius: 12, outline: 'none', fontSize: '1rem', background: '#F4F8FF', color: '#1E3A8A' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <button onClick={requestLocation} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px', fontSize: '0.85rem', background: '#EFF6FF', border: '1px dashed #2563EB', color: '#1D4ED8', borderRadius: 12, cursor: 'pointer', fontWeight: 'bold' }}>
                <Zap size={16} /> ใช้ตำแหน่งปัจจุบัน
              </button>
              <button onClick={() => { setTempLocation(location || { lat: 17.1664, lng: 104.1486 }); setShowMapModal(true); }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px', fontSize: '0.85rem', background: location ? '#ECFDF5' : '#F8FAFC', border: `1px solid ${location ? '#10B981' : '#CBD5E1'}`, color: location ? '#059669' : '#475569', borderRadius: 12, cursor: 'pointer', fontWeight: 'bold' }}>
                <MapPin size={16} /> {location ? 'ปักหมุดแล้ว (คลิกแก้หมุด)' : 'ปักหมุดแผนที่'}
              </button>
            </div>

            {/* 🧾 Receipt Summary */}
            <div style={{ background: '#F4F8FF', padding: 18, borderRadius: 16, marginBottom: 25, border: '1px solid #DCE8FF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#475569', fontSize: '0.95rem' }}>
                <span>รวมค่าอาหาร:</span><strong style={{ color: '#1E3A8A' }}>{subTotal.toLocaleString()} ฿</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, color: '#475569', fontSize: '0.95rem' }}>
                <span>ค่าจัดส่ง {distance > 0 ? `(${distance.toFixed(1)} กม.)` : ''}:</span>
                <strong style={{ color: '#1E3A8A' }}>{location ? `${deliveryFee.toLocaleString()} ฿` : 'รอพิกัด...'}</strong>
              </div>
              <div style={{ height: '1px', background: '#BFDBFE', margin: '10px 0', border: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: '900', color: '#1E3A8A' }}>
                <span>ยอดรวมสุทธิ:</span><span style={{ color: '#2563EB' }}>{total.toLocaleString()} ฿</span>
              </div>
            </div>

            {/* วิธีชำระเงิน */}
            <div style={{ marginBottom: 25 }}>
              <p style={{ marginBottom: 12, fontWeight: 'bold', fontSize: '0.95rem', color: '#1E3A8A' }}>เลือกช่องทางชำระเงิน:</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <label style={{ flex: 1, padding: 15, border: paymentMethod === 'qr' ? '2px solid #2563EB' : '1px solid #DCE8FF', borderRadius: 14, textAlign: 'center', cursor: 'pointer', background: paymentMethod === 'qr' ? '#EFF6FF' : '#ffffff', color: paymentMethod === 'qr' ? '#1D4ED8' : '#475569', fontWeight: 'bold' }}>
                  <input type="radio" checked={paymentMethod === 'qr'} onChange={() => setPaymentMethod('qr')} style={{ display: 'none' }} /> โอนเงิน (QR)
                </label>
                <label style={{ flex: 1, padding: 15, border: paymentMethod === 'cod' ? '2px solid #2563EB' : '1px solid #DCE8FF', borderRadius: 14, textAlign: 'center', cursor: 'pointer', background: paymentMethod === 'cod' ? '#EFF6FF' : '#ffffff', color: paymentMethod === 'cod' ? '#1D4ED8' : '#475569', fontWeight: 'bold' }}>
                  <input type="radio" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} style={{ display: 'none' }} /> ปลายทาง
                </label>
              </div>
            </div>

            {/* QR Payment Content */}
            {paymentMethod === 'qr' && shopData && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#F4F8FF', padding: 20, borderRadius: 20, marginBottom: 25, border: '1px solid #DCE8FF' }}>
                <p style={{ margin: '0 0 15px 0', fontSize: '1rem', fontWeight: 'bold', color: '#1E3A8A' }}>สแกนเพื่อโอนเงิน <span style={{ color: '#2563EB', fontSize: '1.1rem' }}>{total.toLocaleString()} ฿</span></p>
                
                <div style={{ background: '#FFF3CD', color: '#856404', padding: '10px 15px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '15px', border: '1px solid #FFEEBA', width: '100%', textAlign: 'center' }}>
                  <strong>⚠️ หมายเหตุ:</strong> หากสแกนจ่ายเงินแล้ว ยังไม่ได้ยืนยัน คุณสามารถกลับมากดสั่งใหม่และแนบสลิปได้เลยครับ
                </div>

                {shopData.account_number ? (
                  <img src={`https://promptpay.io/${shopData.account_number}/${total}.png`} style={{ width: '180px', borderRadius: 12, border: '4px solid #fff', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.15)' }} alt="PromptPay QR" />
                ) : shopData.qr_image ? (
                  <img src={shopData.qr_image} style={{ width: '180px', borderRadius: 12, border: '4px solid #fff', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.15)' }} />
                ) : (
                  <div style={{ padding: 30, background: '#EBF1FF', color: '#93C5FD', borderRadius: 12 }}><ImageOff size={32} /></div>
                )}

                <div style={{ marginTop: 15, fontSize: '0.9rem', color: '#1E40AF', width: '100%', background: '#fff', padding: 12, borderRadius: 12, border: '1px solid #DCE8FF' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>ธนาคาร:</span> <strong>{shopData.bank_name || '-'}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>เลขบัญชี:</span> <strong style={{ color: '#2563EB', fontSize: '1rem' }}>{shopData.account_number || '-'}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>ชื่อบัญชี:</span> <strong>{shopData.account_name || '-'}</strong></div>
                </div>

                <label style={{ marginTop: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 15px', background: slipImage ? '#ECFDF5' : '#1E3A8A', color: slipImage ? '#059669' : '#fff', borderRadius: 12, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', width: '100%', border: slipImage ? '1px solid #10B981' : 'none' }}>
                  <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                  {slipImage ? <><CheckCircle2 size={18} /> เปลี่ยนรูปสลิป</> : <><UploadCloud size={18} /> อัปโหลดสลิปโอนเงิน *</>}
                </label>
                {slipImage && <img src={slipImage} style={{ marginTop: 10, height: '120px', borderRadius: 8, border: '1px solid #DCE8FF' }} />}
                <div ref={paymentBottomRef} />
              </div>
            )}

            <button disabled={isSubmitting} onClick={handleConfirmOrder} style={{ width: '100%', padding: 15, background: isSubmitting ? '#93C5FD' : '#2563EB', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: '900', fontSize: '1.05rem', boxShadow: isSubmitting ? 'none' : '0 4px 10px rgba(37, 99, 235, 0.3)' }}>
              {isSubmitting ? 'กำลังสั่ง...' : 'ยืนยันสั่งอาหาร'}
            </button>
          </div>
        </div>
      )}

      {/* 🗺️ Popup หน้าต่างปักหมุดแผนที่ */}
      {showMapModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200, padding: 20 }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '500px', borderRadius: 28, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 20px 15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EBF1FF' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#1E3A8A' }}>เลือกตำแหน่งจัดส่ง</h3>
              <button onClick={() => setShowMapModal(false)} style={{ background: '#F4F8FF', border: 'none', width: 36, height: 36, borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: '#2563EB' }}><X size={20} /></button>
            </div>
            <div style={{ height: '350px', background: '#E2E8F0', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 15, right: 15, zIndex: 400 }}>
                <button onClick={() => requestLocation()} style={{ background: 'white', border: 'none', padding: '8px 12px', borderRadius: 8, boxShadow: '0 4px 10px rgba(0,0,0,0.15)', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6, color: '#1D4ED8' }}>
                  <Zap size={16} fill="#2563EB" color="#2563EB" /> ตำแหน่งของฉัน
                </button>
              </div>
              <MapPicker tempLocation={tempLocation} setTempLocation={setTempLocation} setAddress={setAddress} />
            </div>
            <div style={{ padding: 20 }}>
              <button onClick={() => { if (tempLocation) setLocation(tempLocation); setShowMapModal(false); }} style={{ width: '100%', padding: '14px', background: '#2563EB', color: 'white', borderRadius: 14, fontWeight: '900', fontSize: '1.05rem', border: 'none', cursor: 'pointer' }}>
                ยืนยันตำแหน่งนี้
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
