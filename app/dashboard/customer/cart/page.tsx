'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingCart, CreditCard, X, MapPin, Zap, CheckCircle2, UploadCloud, ImageOff, Plus, Minus } from 'lucide-react';
import dynamic from 'next/dynamic';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

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
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);
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

  const { data: homeData } = useSWR('/api/customer/home', fetcher);
  const { data: sysConfig } = useSWR('/api/sysconfig', fetcher);
  const { data: profileData } = useSWR('/api/customer/profile', fetcher);

  useEffect(() => {
    if (homeData?.shop) setShopData(homeData.shop);
    if (sysConfig) {
      setBaseDeliveryFee(sysConfig.delivery_fee || 0);
      setDeliveryFeePerKm(sysConfig.delivery_fee_per_km || 0);
    }
  }, [homeData, sysConfig]);

  useEffect(() => {
    if (profileData && !isLoaded) {
      if (profileData.phone) setPhone(profileData.phone);
      if (profileData.address) setAddress(profileData.address);
      if (profileData.latitude && profileData.longitude) {
        setLocation({ lat: Number(profileData.latitude), lng: Number(profileData.longitude) });
      }
      setIsLoaded(true);
    }
  }, [profileData, isLoaded]);

  useEffect(() => {
    const savedCart = localStorage.getItem('dinemanager_cart');
    if (savedCart) { try { setCart(JSON.parse(savedCart)); } catch {} }
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('dinemanager_cart', JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

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
      setSlipImage(null); setPaymentMethod(''); setShowPaymentModal(false);
      localStorage.removeItem('dinemanager_cart');
      setShowSuccessSheet(true);

    } catch (error) { 
      alert('เกิดข้อผิดพลาด'); 
    } finally { 
      setIsSubmitting(false); 
    }
  }

  if (cart.length === 0) {
    return (
      <div className="p-5 bg-blue-50 dark:bg-slate-900 min-h-screen flex flex-col items-center justify-center transition-colors">
        <ShoppingCart size={48} className="text-slate-400 dark:text-slate-500 mb-4" />
        <h2 className="text-blue-900 dark:text-blue-200">ตะกร้าว่างเปล่า</h2>
        <button onClick={() => router.push('/dashboard/customer/menus')} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white border-none rounded-xl mt-4 font-bold cursor-pointer shadow-md shadow-blue-600/20 transition-all">
          ไปเลือกอาหารเลย
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 pb-[120px] bg-blue-50 dark:bg-slate-900 font-sans transition-colors min-h-screen">
      {/* Header */}
      <div className="flex items-center mb-5 gap-2.5">
        <button onClick={() => router.back()} className="flex items-center gap-1 bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-blue-700 dark:text-blue-300 font-bold cursor-pointer px-3.5 py-2 rounded-full text-[0.9rem] transition-colors">
          <ArrowLeft size={16} /> กลับ
        </button>
        <h1 className="m-0 flex-1 text-center text-blue-900 dark:text-blue-50 text-[1.2rem] font-black pr-[70px]">
          ชำระเงิน
        </h1>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-blue-50 dark:border-slate-700 transition-colors">
        {/* รายการในตะกร้า */}
        <h3 className="m-0 mb-4 text-[1.1rem] text-blue-900 dark:text-blue-100 flex items-center gap-2 font-bold">
          <ShoppingCart size={20} className="text-blue-600 dark:text-blue-400" /> รายการอาหาร
        </h3>
        <div className="mb-5">
          {cart.map(item => (
            <div key={item.cartItemId} className="flex justify-between items-start mb-3 pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex-1 pr-2.5">
                <div className="font-bold text-[0.95rem] text-blue-800 dark:text-blue-200">{item.originalName}</div>
                <div className="text-[0.8rem] text-slate-500 dark:text-slate-400 leading-snug">{item.name.replace(item.originalName, '').trim()}</div>
                <div className="text-blue-600 dark:text-blue-400 font-bold text-[0.85rem]">{item.price.toLocaleString()} ฿</div>
              </div>
              <div className="flex items-center bg-blue-50 dark:bg-slate-700 border border-blue-200 dark:border-slate-600 rounded-full overflow-hidden transition-colors">
                <button onClick={() => removeFromCart(item.cartItemId)} className="bg-transparent border-none px-3 py-1.5 cursor-pointer text-red-500 flex items-center"><Minus size={14} strokeWidth={3} /></button>
                <span className="text-[0.95rem] font-bold w-5 text-center text-blue-900 dark:text-blue-100">{item.quantity}</span>
                <button onClick={() => addToCartDirectly(item.cartItemId)} className="bg-transparent border-none px-3 py-1.5 cursor-pointer text-blue-600 dark:text-blue-400 flex items-center"><Plus size={14} strokeWidth={3} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Checkout Button */}
      <div className="fixed bottom-[64px] left-0 right-0 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-blue-100 dark:border-slate-800 z-40 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="max-w-[800px] mx-auto">
          <button disabled={shopData && !shopData.is_open} onClick={() => setShowPaymentModal(true)} className={`flex justify-between items-center w-full p-4 border-none rounded-2xl cursor-pointer font-black text-[1.1rem] transition-all ${
            (shopData && !shopData.is_open) 
              ? 'bg-slate-400 dark:bg-slate-600 text-white cursor-not-allowed shadow-none' 
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-[0_4px_15px_rgba(37,99,235,0.3)]'
          }`}>
            <span>{(shopData && !shopData.is_open) ? 'ร้านปิดให้บริการ' : 'สั่งซื้อและชำระเงิน'}</span>
            <span>{subTotal.toLocaleString()} ฿</span>
          </button>
        </div>
      </div>

      {/* 🔴 Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[1000] p-5">
          <div className="bg-white dark:bg-slate-800 w-full max-w-[500px] max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl transition-colors">
            
            <div className="flex justify-between items-center mb-5">
              <h3 className="m-0 text-[1.2rem] text-blue-900 dark:text-blue-50 font-black">ข้อมูลการจัดส่ง</h3>
              <button onClick={() => setShowPaymentModal(false)} className="bg-slate-100 dark:bg-slate-700 border-none w-8 h-8 rounded-full flex justify-center items-center cursor-pointer text-slate-500 dark:text-slate-400 transition-colors"><X size={18} /></button>
            </div>

            {/* ข้อมูลการจัดส่ง */}
            <div className="flex flex-col gap-3 mb-5">
              <input type="tel" placeholder="เบอร์โทรศัพท์ติดต่อ *" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} className="p-3.5 border border-blue-200 dark:border-slate-600 rounded-xl outline-none text-[1rem] bg-blue-50 dark:bg-slate-700 text-blue-900 dark:text-blue-50 placeholder-slate-400 dark:placeholder-slate-400 transition-colors" />
              <textarea placeholder="ที่อยู่จัดส่งโดยละเอียด *" value={address} onChange={e => setAddress(e.target.value)} className="p-3.5 min-h-[80px] border border-blue-200 dark:border-slate-600 rounded-xl outline-none text-[1rem] bg-blue-50 dark:bg-slate-700 text-blue-900 dark:text-blue-50 placeholder-slate-400 dark:placeholder-slate-400 transition-colors" />
            </div>
            <div className="flex gap-2.5 mb-5">
              <button onClick={requestLocation} className="flex-1 flex items-center justify-center gap-1.5 p-3 text-[0.85rem] bg-blue-50 dark:bg-blue-900/30 border border-dashed border-blue-600 text-blue-700 dark:text-blue-400 rounded-xl cursor-pointer font-bold transition-colors">
                <Zap size={16} /> ใช้ตำแหน่งปัจจุบัน
              </button>
              <button onClick={() => { setTempLocation(location || { lat: 17.1664, lng: 104.1486 }); setShowMapModal(true); }} className={`flex-1 flex items-center justify-center gap-1.5 p-3 text-[0.85rem] rounded-xl cursor-pointer font-bold transition-all border ${
                location ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
              }`}>
                <MapPin size={16} /> {location ? 'ปักหมุดแล้ว (คลิกแก้หมุด)' : 'ปักหมุดแผนที่'}
              </button>
            </div>

            {/* 🧾 Receipt Summary */}
            <div className="bg-blue-50 dark:bg-slate-700 p-4 rounded-2xl mb-6 border border-blue-100 dark:border-slate-600 transition-colors">
              <div className="flex justify-between mb-1.5 text-slate-600 dark:text-slate-300 text-[0.95rem]">
                <span>รวมค่าอาหาร:</span><strong className="text-blue-900 dark:text-blue-100">{subTotal.toLocaleString()} ฿</strong>
              </div>
              <div className="flex justify-between mb-2.5 text-slate-600 dark:text-slate-300 text-[0.95rem]">
                <span>ค่าจัดส่ง {distance > 0 ? `(${distance.toFixed(1)} กม.)` : ''}:</span>
                <strong className="text-blue-900 dark:text-blue-100">{location ? `${deliveryFee.toLocaleString()} ฿` : 'รอพิกัด...'}</strong>
              </div>
              <div className="h-px bg-blue-200 dark:bg-slate-600 my-2.5 border-none transition-colors" />
              <div className="flex justify-between text-[1.25rem] font-black text-blue-900 dark:text-blue-50">
                <span>ยอดรวมสุทธิ:</span><span className="text-blue-600 dark:text-blue-400">{total.toLocaleString()} ฿</span>
              </div>
            </div>

            {/* วิธีชำระเงิน */}
            <div className="mb-6">
              <p className="mb-3 font-bold text-[0.95rem] text-blue-900 dark:text-blue-100">เลือกช่องทางชำระเงิน:</p>
              <div className="flex gap-2.5">
                <label className={`flex-1 p-3.5 rounded-2xl text-center cursor-pointer font-bold border-2 transition-all ${
                  paymentMethod === 'qr' 
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                    : 'border-blue-100 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}>
                  <input type="radio" checked={paymentMethod === 'qr'} onChange={() => setPaymentMethod('qr')} className="hidden" /> โอนเงิน (QR)
                </label>
                <label className={`flex-1 p-3.5 rounded-2xl text-center cursor-pointer font-bold border-2 transition-all ${
                  paymentMethod === 'cod' 
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                    : 'border-blue-100 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}>
                  <input type="radio" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="hidden" /> ปลายทาง
                </label>
              </div>
            </div>

            {/* QR Payment Content */}
            {paymentMethod === 'qr' && shopData && (
              <div className="flex flex-col items-center bg-blue-50 dark:bg-slate-700 p-5 rounded-2xl mb-6 border border-blue-100 dark:border-slate-600 transition-colors">
                <p className="m-0 mb-4 text-[1rem] font-bold text-blue-900 dark:text-blue-100">สแกนเพื่อโอนเงิน <span className="text-blue-600 dark:text-blue-400 text-[1.1rem]">{total.toLocaleString()} ฿</span></p>
                
                <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-500 px-4 py-2.5 rounded-xl text-[0.85rem] mb-4 border border-amber-200 dark:border-amber-800/50 w-full text-center">
                  <strong>⚠️ หมายเหตุ:</strong> หากสแกนจ่ายเงินแล้ว ยังไม่ได้ยืนยัน คุณสามารถกลับมากดสั่งใหม่และแนบสลิปได้เลยครับ
                </div>

                {shopData.account_number ? (
                  <img src={`https://promptpay.io/${shopData.account_number}/${total}.png`} className="w-[180px] rounded-xl border-4 border-white dark:border-slate-800 shadow-[0_4px_10px_rgba(37,99,235,0.15)] dark:shadow-[0_4px_10px_rgba(0,0,0,0.5)]" alt="PromptPay QR" />
                ) : shopData.qr_image ? (
                  <img src={shopData.qr_image} className="w-[180px] rounded-xl border-4 border-white dark:border-slate-800 shadow-[0_4px_10px_rgba(37,99,235,0.15)] dark:shadow-[0_4px_10px_rgba(0,0,0,0.5)]" />
                ) : (
                  <div className="p-7 bg-blue-100 dark:bg-slate-600 text-blue-300 dark:text-slate-400 rounded-xl"><ImageOff size={32} /></div>
                )}

                <div className="mt-4 text-[0.9rem] text-blue-900 dark:text-blue-100 w-full bg-white dark:bg-slate-800 p-3 rounded-xl border border-blue-100 dark:border-slate-600 transition-colors">
                  <div className="flex justify-between mb-1.5"><span>ธนาคาร:</span> <strong>{shopData.bank_name || '-'}</strong></div>
                  <div className="flex justify-between mb-1.5"><span>เลขบัญชี:</span> <strong className="text-blue-600 dark:text-blue-400 text-[1rem]">{shopData.account_number || '-'}</strong></div>
                  <div className="flex justify-between"><span>ชื่อบัญชี:</span> <strong>{shopData.account_name || '-'}</strong></div>
                </div>

                <label className={`mt-4 flex items-center justify-center gap-2 p-3 rounded-xl cursor-pointer text-[0.9rem] font-bold w-full transition-all border ${
                  slipImage ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-500' : 'bg-blue-900 dark:bg-blue-600 text-white border-transparent'
                }`}>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  {slipImage ? <><CheckCircle2 size={18} /> เปลี่ยนรูปสลิป</> : <><UploadCloud size={18} /> อัปโหลดสลิปโอนเงิน *</>}
                </label>
                {slipImage && <img src={slipImage} className="mt-2.5 h-[120px] rounded-lg border border-blue-100 dark:border-slate-600" />}
                <div ref={paymentBottomRef} />
              </div>
            )}

            <button disabled={isSubmitting || (shopData && !shopData.is_open)} onClick={handleConfirmOrder} className={`w-full p-4 border-none rounded-2xl cursor-pointer font-black text-[1.05rem] transition-all ${
              (isSubmitting || (shopData && !shopData.is_open)) 
                ? 'bg-slate-400 dark:bg-slate-600 text-white cursor-not-allowed shadow-none' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-[0_4px_10px_rgba(37,99,235,0.3)]'
            }`}>
              {isSubmitting ? 'กำลังสั่ง...' : ((shopData && !shopData.is_open) ? 'ร้านปิดให้บริการ' : 'ยืนยันสั่งอาหาร')}
            </button>
          </div>
        </div>
      )}

      {/* 🗺️ Popup หน้าต่างปักหมุดแผนที่ */}
      {showMapModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex justify-center items-center z-[1200] p-5">
          <div className="bg-white dark:bg-slate-800 w-full max-w-[500px] rounded-3xl overflow-hidden flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.2)] transition-colors">
            <div className="p-5 pb-4 flex justify-between items-center border-b border-blue-50 dark:border-slate-700 transition-colors">
              <h3 className="m-0 text-[1.2rem] font-bold text-blue-900 dark:text-blue-50">เลือกตำแหน่งจัดส่ง</h3>
              <button onClick={() => setShowMapModal(false)} className="bg-blue-50 dark:bg-slate-700 border-none w-9 h-9 rounded-full flex justify-center items-center cursor-pointer text-blue-600 dark:text-blue-400 transition-colors"><X size={20} /></button>
            </div>
            <div className="h-[350px] bg-slate-200 dark:bg-slate-700 relative transition-colors">
              <div className="absolute top-4 right-4 z-[400]">
                <button onClick={() => requestLocation()} className="bg-white dark:bg-slate-800 border-none px-3 py-2 rounded-xl shadow-md cursor-pointer font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-400 transition-colors">
                  <Zap size={16} className="fill-blue-600 dark:fill-blue-500 text-blue-600 dark:text-blue-500" /> ตำแหน่งของฉัน
                </button>
              </div>
              <MapPicker tempLocation={tempLocation} setTempLocation={setTempLocation} setAddress={setAddress} />
            </div>
            <div className="p-5">
              <button onClick={() => { if (tempLocation) setLocation(tempLocation); setShowMapModal(false); }} className="w-full p-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[1.05rem] border-none cursor-pointer transition-colors">
                ยืนยันตำแหน่งนี้
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎉 Success Sheet */}
      {showSuccessSheet && (
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-t-[32px] pt-[35px] px-[25px] pb-[40px] flex flex-col items-center shadow-[0_-10px_40px_rgba(0,0,0,0.2)] animate-[slideUp_0.3s_ease-out] transition-colors">
            <div className="w-[60px] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-[25px] transition-colors" />
            
            <div className="w-[80px] h-[80px] bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5 text-white shadow-[0_10px_25px_rgba(16,185,129,0.3)] animate-[bounceIn_0.5s_ease-out]">
              <CheckCircle2 size={44} strokeWidth={2.5} />
            </div>
            
            <h2 className="text-blue-900 dark:text-blue-50 m-0 mb-2.5 text-[1.6rem] font-black text-center">สั่งอาหารสำเร็จ!</h2>
            <p className="text-slate-500 dark:text-slate-400 m-0 mb-[30px] text-center text-[1rem] leading-relaxed">
              ขอบคุณที่ใช้บริการค่ะ <br/> ทางร้านได้รับออเดอร์แล้ว และกำลังเตรียมอาหารให้คุณ
            </p>
            
            <button 
              onClick={() => {
                setShowSuccessSheet(false);
                setCart([]);
                router.push('/dashboard/customer/orders');
              }}
              className="w-full p-4 bg-blue-600 hover:bg-blue-700 text-white border-none rounded-2xl text-[1.1rem] font-bold cursor-pointer shadow-[0_6px_15px_rgba(37,99,235,0.25)] transition-all"
            >
              ดูสถานะออเดอร์
            </button>
            
            <style>{`
              @keyframes slideUp {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
              }
              @keyframes bounceIn {
                0% { transform: scale(0.5); opacity: 0; }
                70% { transform: scale(1.1); opacity: 1; }
                100% { transform: scale(1); opacity: 1; }
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
}
