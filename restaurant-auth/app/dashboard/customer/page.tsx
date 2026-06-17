'use client';

import { useEffect, useState, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react'; 
import {
  Store, Clock, Zap, Star, Utensils, ShoppingCart, CreditCard,
  MapPin, Plus, Minus, Flame, Maximize2, PlusCircle, PenLine,
  UploadCloud, CheckCircle2, ImageOff, X, ChevronRight, Timer, Navigation, CheckSquare
} from 'lucide-react';
import dynamic from 'next/dynamic';

// โหลด MapPicker ฝั่ง Client เท่านั้น
const MapPicker = dynamic(() => import('@/components/MapPicker'), {
  ssr: false,
  loading: () => <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>กำลังโหลดแผนที่...</div>
});

// --- Type Definitions ---
type MenuOption = {
  id: number;
  menu_id: number;
  option_group: string;
  option_name: string;
  extra_price: number | string;
  is_multiple: boolean | number;
};

type Menu = {
  id: number;
  name: string;
  price: number;
  image?: string;
  is_recommended?: boolean | number;
  avg_rating?: number;
  review_count?: number;
  is_sold_out?: number | boolean | string;
  options?: MenuOption[]; 
};

type ShopStatus = {
  is_open: boolean;
  open_time: string;
  close_time: string;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  qr_image?: string;
  latitude?: string | number;
  longitude?: string | number;
};

type DashboardData = {
  shop: ShopStatus;
  popularMenus: Menu[];
  remainingQueue: number;
  recommendedMenus: Menu[];
};

type CartItem = Menu & {
  cartItemId: string;
  quantity: number;
  originalName: string;
};

type Location = {
  lat: number;
  lng: number;
};

// 🧮 ฟังก์ชันคำนวณระยะทาง
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function CustomerHome() {
  const router = useRouter();
  
  const { data: session, status } = useSession();

  // --- States ---
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [allMenus, setAllMenus] = useState<Menu[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form & Payment States
  const [showPayment, setShowPayment] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<Location | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'qr' | 'cod' | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slipImage, setSlipImage] = useState<string | null>(null);

  // 🟢 State สำหรับค่าจัดส่งที่ดึงจากระบบ
  const [baseDeliveryFee, setBaseDeliveryFee] = useState<number>(0);
  const [deliveryFeePerKm, setDeliveryFeePerKm] = useState<number>(0);

  // Delivery States
  const [distance, setDistance] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);

  // 🗺️ Map States 
  const [showMapModal, setShowMapModal] = useState(false);
  const [tempLocation, setTempLocation] = useState<Location | null>(null);

  // State สำหรับ Popup ตัวเลือก
  const [selectedMenuForOption, setSelectedMenuForOption] = useState<Menu | null>(null);

  // 🟢 State สำหรับเช็คโหมดปรับปรุง
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [checkingSystem, setCheckingSystem] = useState(true);

  // 🛡️ ดึงข้อมูลตั้งค่าระบบก่อนว่าเว็บปิดปรับปรุงอยู่ไหม และดึงเรทค่าจัดส่ง
  useEffect(() => {
    fetch('/api/sysconfig')
      .then(res => res.json())
      .then(data => {
        setIsMaintenance(data.maintenance_mode);
        setBaseDeliveryFee(data.delivery_fee || 0);
        setDeliveryFeePerKm(data.delivery_fee_per_km || 0);
        setCheckingSystem(false);
      })
      .catch(() => setCheckingSystem(false)); 
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchData = async () => {
      try {
        const [homeRes, menusRes, profileRes] = await Promise.all([
          fetch('/api/customer/home'), 
          fetch('/api/customer/menus'),
          fetch('/api/customer/profile')
        ]);

        if (homeRes.ok && menusRes.ok) {
          const homeData = await homeRes.json();
          const menusData = await menusRes.json();

          // 🟢 แก้ไขตรงนี้: แมปข้อมูลให้สมบูรณ์ โดยดึงเมนูแนะนำทั้งหมดมาจาก menusData โดยตรงเลย 
          // จะได้แน่ใจว่า options และฟิลด์อื่นๆ ถูกติดมาครบถ้วน 100%
          homeData.recommendedMenus = menusData.filter((m: Menu) => {
            // เช็คว่าเป็นเมนูแนะนำ และไม่ได้หมดสต๊อก
            const isRec = Number(m.is_recommended) === 1 || String(m.is_recommended).toLowerCase() === 'true';
            const isSoldOut = Number(m.is_sold_out) === 1 || String(m.is_sold_out).toLowerCase() === 'true';
            return isRec && !isSoldOut;
          });

          setDashboardData(homeData);
          setAllMenus(menusData);
        }
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData?.phone) setPhone(profileData.phone);
          if (profileData?.address) setAddress(profileData.address);
          if (profileData?.latitude && profileData?.longitude) {
            setLocation({
              lat: Number(profileData.latitude),
              lng: Number(profileData.longitude)
            });
          }
        }
      } catch (error) { 
        console.error(error); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchData();
  }, [status]);

  // 🧮 คำนวณระยะทางและค่าจัดส่งใหม่
  useEffect(() => {
    if (location?.lat && location?.lng && dashboardData?.shop?.latitude && dashboardData?.shop?.longitude) {
      const dist = calculateDistance(location.lat, location.lng, Number(dashboardData.shop.latitude), Number(dashboardData.shop.longitude));
      setDistance(dist);
      
      let fee = baseDeliveryFee; 
      if (dist > 2) {
        fee += Math.ceil(dist - 2) * deliveryFeePerKm; 
      }
      setDeliveryFee(fee);
    }
  }, [location, dashboardData, baseDeliveryFee, deliveryFeePerKm]);

  const subTotal = useMemo(() => cart.reduce((sum, i) => sum + i.price * i.quantity, 0), [cart]);
  const total = subTotal + (location ? deliveryFee : 0);

  // --- Handlers ---
  function handleConfirmAddToCart(newItem: CartItem) {
    setCart(prev => {
      const found = prev.find(i => i.cartItemId === newItem.cartItemId);
      if (found) return prev.map(i => i.cartItemId === newItem.cartItemId ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, newItem];
    });
    setSelectedMenuForOption(null);
  }

  function removeFromCart(cartItemId: string) {
    setCart(prev => prev.map(i => (i.cartItemId === cartItemId ? { ...i, quantity: i.quantity - 1 } : i)).filter(i => i.quantity > 0));
  }

  function addToCartDirectly(cartItemId: string) {
    setCart(prev => prev.map(i => i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + 1 } : i));
  }

  function requestLocation() {
    if (!navigator.geolocation) { alert('เบราว์เซอร์ไม่รองรับ location'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setTempLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => alert('กรุณาอนุญาตการเข้าถึงตำแหน่ง')
    );
  }

  function requestLocationForMap() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setTempLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    );
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
      await fetch('/api/customer/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone, address, location })
      });

      const res = await fetch('/api/customer/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items: cart, phone, address, location, paymentMethod, subTotal, deliveryFee, totalPrice: total, slipImage })
      });

      if (!res.ok) throw new Error('Order failed');
      alert('สั่งอาหารสำเร็จ ขอบคุณที่ใช้บริการครับ!');
      setCart([]); setShowPayment(false); setSlipImage(null); setPaymentMethod('');
    } catch (error) { 
      alert('เกิดข้อผิดพลาด'); 
    } finally { 
      setIsSubmitting(false); 
    }
  }

  if (checkingSystem || status === 'loading' || loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#2563eb', fontWeight: 'bold' }}>กำลังโหลดข้อมูล...</div>;
  }

  if (isMaintenance) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4F8FF', padding: 20 }}>
        <div style={{ background: '#fff', padding: 40, borderRadius: 20, textAlign: 'center', boxShadow: '0 10px 40px rgba(37, 99, 235, 0.1)', maxWidth: 400 }}>
          <div style={{ background: '#fffbeb', color: '#d97706', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#b45309', margin: '0 0 10px 0' }}>ปิดปรับปรุงระบบชั่วคราว</h1>
          <p style={{ color: '#d97706', lineHeight: '1.6', margin: 0 }}>ขออภัยในความไม่สะดวก ขณะนี้ระบบกำลังปิดปรับปรุง กรุณากลับมาใช้งานใหม่อีกครั้งในภายหลังครับ</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#F4F8FF] px-5 pt-5 font-sans transition-all duration-300 ${cart.length > 0 && !showPayment ? 'pb-48' : 'pb-24'}`}>

      {dashboardData && (
        <>
          {/* 🏪 Shop Status Card */}
          <section style={{ marginBottom: 25 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8, color: '#1E3A8A' }}>
              <Store size={22} color="#2563eb" /> Status ร้านค้า
            </h3>
            <div style={{ background: '#ffffff', padding: 20, borderRadius: 16, marginTop: 12, border: '1px solid #DCE8FF', boxShadow: '0 4px 15px rgba(37, 99, 235, 0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: dashboardData.shop.is_open ? '#10b981' : '#ef4444', fontWeight: '800', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {dashboardData.shop.is_open ? <Zap size={18} fill="#10b981" /> : <X size={18} />}
                  {dashboardData.shop.is_open ? 'เปิดให้บริการ' : 'ปิดให้บริการ'}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#60A5FA', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 'bold' }}>
                  <Clock size={14} /> ปิด {dashboardData.shop.close_time?.substring(0, 5) || '--:--'} น.
                </span>
              </div>
              <div style={{ height: '1px', background: '#E0EFFF', margin: '15px 0' }} />
              <p style={{ margin: 0, color: '#475569', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Timer size={18} color="#2563EB" /> คิวที่รอขณะนี้: <strong style={{ color: '#1E40AF', fontSize: '1.2rem' }}>{dashboardData.remainingQueue}</strong> คิว
              </p>
            </div>
          </section>

          {/* ⭐ Recommended Horizontal List */}
          {dashboardData.recommendedMenus.length > 0 && (
            <section style={{ marginBottom: 30 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8, color: '#1E3A8A', margin: 0 }}>
                  <Star size={22} color="#F59E0B" fill="#F59E0B" /> เมนูแนะนำวันนี้
                </h3>
                <button
                  onClick={() => router.push('/dashboard/customer/menus')}
                  style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '6px 12px', borderRadius: 20, color: '#1D4ED8', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  ดูทั้งหมด <ChevronRight size={14} />
                </button>
              </div>
              <div style={{ display: 'flex', gap: 15, overflowX: 'auto', paddingBottom: 10, scrollSnapType: 'x mandatory' }}>
                {dashboardData.recommendedMenus.map((m) => (
                  <div key={`rec-${m.id}`} style={{ minWidth: '160px', background: '#ffffff', border: '1px solid #DCE8FF', borderRadius: 16, padding: 12, scrollSnapAlign: 'start', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.04)' }}>
                    <div style={{ height: '100px', background: '#F0F5FF', borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
                      {m.image ? <img src={m.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageOff size={20} color="#93C5FD" /></div>}
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#1E3A8A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                    <div style={{ color: '#2563EB', fontWeight: '900', fontSize: '1.05rem', marginTop: 4 }}>{m.price} ฿</div>
                    <button onClick={() => setSelectedMenuForOption(m)} style={{ marginTop: 12, width: '100%', padding: '10px', background: '#2563EB', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)' }}>
                      + สั่งเลย
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* 🍽️ Quick Order List */}
      <section>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: 15, display: 'flex', alignItems: 'center', gap: 8, color: '#1E3A8A' }}>
          <Utensils size={22} color="#2563eb" /> สั่งด่วน (เมนูยอดฮิต)
        </h3>
        <div style={{ background: '#ffffff', borderRadius: 20, border: '1px solid #DCE8FF', overflow: 'hidden', boxShadow: '0 4px 15px rgba(37, 99, 235, 0.03)' }}>
          {allMenus.slice(0, 6).map((menu, idx) => {
            const isMenuSoldOut = Number(menu.is_sold_out) === 1 || String(menu.is_sold_out).toLowerCase() === 'true';

            return (
              <div key={menu.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: idx === 5 ? 'none' : '1px solid #EBF1FF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15, opacity: isMenuSoldOut ? 0.6 : 1 }}>
                  <div style={{ width: 50, height: 50, background: '#F4F8FF', borderRadius: 12, overflow: 'hidden', border: '1px solid #DCE8FF' }}>
                    {menu.image ? <img src={menu.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageOff size={16} color="#93C5FD" /></div>}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', color: isMenuSoldOut ? '#94a3b8' : '#1E3A8A', fontSize: '0.95rem' }}>{menu.name}</div>
                    <div style={{ color: isMenuSoldOut ? '#94a3b8' : '#2563EB', fontWeight: '900', fontSize: '0.9rem' }}>{menu.price} ฿</div>
                  </div>
                </div>

                {isMenuSoldOut ? (
                  <span style={{ background: '#F1F5F9', color: '#94A3B8', border: 'none', borderRadius: '16px', padding: '6px 14px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    หมด
                  </span>
                ) : (
                  <button
                    onClick={() => setSelectedMenuForOption(menu)}
                    style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: '50%', width: 38, height: 38, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }}
                  >
                    <Plus size={20} strokeWidth={3} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* --- 📝 Popup เลือก Options --- */}
      {selectedMenuForOption && (
        <MenuOptionModal
          menu={selectedMenuForOption}
          onClose={() => setSelectedMenuForOption(null)}
          onConfirm={handleConfirmAddToCart}
        />
      )}

      {/* --- ตะกร้า (Cart Overlay) --- */}
      {cart.length > 0 && !showPayment && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#ffffff', borderTop: '2px solid #2563EB', padding: '15px 20px', paddingBottom: 'env(safe-area-inset-bottom, 20px)', boxShadow: '0 -10px 20px rgba(37, 99, 235, 0.1)', zIndex: 90 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <h4 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8, color: '#1E3A8A' }}>
              <ShoppingCart size={20} color="#2563EB" /> ตะกร้า ({cart.reduce((a, b) => a + b.quantity, 0)} ชิ้น)
            </h4>
            <span style={{ fontWeight: '900', fontSize: '1.3em', color: '#2563EB' }}>{subTotal.toLocaleString()} ฿</span>
          </div>

          <div style={{ maxHeight: '160px', overflowY: 'auto', marginBottom: 15, borderBottom: '1px solid #EBF1FF', paddingBottom: 10 }}>
            {cart.map(item => (
              <div key={item.cartItemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1, paddingRight: 10 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#1E40AF' }}>{item.originalName}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: 1.3 }}>{item.name.replace(item.originalName, '').trim()}</div>
                  <div style={{ color: '#2563EB', fontWeight: 'bold', fontSize: '0.85rem' }}>{item.price.toLocaleString()} ฿</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', background: '#F4F8FF', border: '1px solid #DCE8FF', borderRadius: '20px', overflow: 'hidden' }}>
                  <button onClick={() => removeFromCart(item.cartItemId)} style={{ background: 'transparent', border: 'none', padding: '6px 12px', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center' }}>
                    <Minus size={14} strokeWidth={3} />
                  </button>
                  <span style={{ fontSize: '0.95rem', fontWeight: 'bold', width: '20px', textAlign: 'center', color: '#1E3A8A' }}>{item.quantity}</span>
                  <button onClick={() => addToCartDirectly(item.cartItemId)} style={{ background: 'transparent', border: 'none', padding: '6px 12px', cursor: 'pointer', color: '#2563EB', display: 'flex', alignItems: 'center' }}>
                    <Plus size={14} strokeWidth={3} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => setShowPayment(true)} style={{ width: '100%', padding: '14px', background: 'linear-gradient(90deg, #1D4ED8, #2563EB)', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '1.1em', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}>
            ยืนยันและดำเนินการชำระเงิน
          </button>
        </div>
      )}

      {/* ✅ Payment Modal */}
      {showPayment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#ffffff', padding: 25, width: '100%', maxWidth: '450px', borderRadius: 28, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: 10, color: '#1E3A8A' }}>
                <CreditCard size={24} color="#2563EB" /> ชำระเงิน
              </h3>
              <button onClick={() => setShowPayment(false)} style={{ background: '#F4F8FF', border: 'none', borderRadius: '50%', padding: 8, cursor: 'pointer', color: '#2563EB' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <input type="tel" placeholder="เบอร์โทรศัพท์ติดต่อ *" value={phone} onChange={e => setPhone(e.target.value)} style={{ padding: 14, border: '1px solid #BFDBFE', borderRadius: 12, outline: 'none', fontSize: '1rem', background: '#F4F8FF', color: '#1E3A8A' }} />
              <textarea placeholder="ที่อยู่จัดส่งโดยละเอียด *" value={address} onChange={e => setAddress(e.target.value)} style={{ padding: 14, minHeight: 80, border: '1px solid #BFDBFE', borderRadius: 12, outline: 'none', fontSize: '1rem', background: '#F4F8FF', color: '#1E3A8A' }} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <button onClick={requestLocation} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px', fontSize: '0.85rem', background: '#EFF6FF', border: '1px dashed #2563EB', color: '#1D4ED8', borderRadius: 12, cursor: 'pointer', fontWeight: 'bold' }}>
                <Zap size={16} /> ใช้ตำแหน่งปัจจุบัน
              </button>
              <button
                onClick={() => {
                  setTempLocation(location || { lat: 17.1664, lng: 104.1486 });
                  setShowMapModal(true);
                }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px', fontSize: '0.85rem', background: location ? '#ECFDF5' : '#F8FAFC', border: `1px solid ${location ? '#10B981' : '#CBD5E1'}`, color: location ? '#059669' : '#475569', borderRadius: 12, cursor: 'pointer', fontWeight: 'bold' }}
              >
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
            {paymentMethod === 'qr' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#F4F8FF', padding: 20, borderRadius: 20, marginBottom: 25, border: '1px solid #DCE8FF' }}>
                <p style={{ margin: '0 0 15px 0', fontSize: '1rem', fontWeight: 'bold', color: '#1E3A8A' }}>สแกนเพื่อโอนเงิน <span style={{ color: '#2563EB', fontSize: '1.1rem' }}>{total.toLocaleString()} ฿</span></p>
                {dashboardData?.shop.qr_image ? (
                  <img src={dashboardData.shop.qr_image} style={{ width: '180px', borderRadius: 12, border: '4px solid #fff', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.15)' }} />
                ) : (
                  <div style={{ padding: 30, background: '#EBF1FF', color: '#93C5FD', borderRadius: 12 }}><ImageOff size={32} /></div>
                )}

                <div style={{ marginTop: 15, fontSize: '0.9rem', color: '#1E40AF', width: '100%', background: '#fff', padding: 12, borderRadius: 12, border: '1px solid #DCE8FF' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>ธนาคาร:</span> <strong>{dashboardData?.shop.bank_name || '-'}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>เลขบัญชี:</span> <strong style={{ color: '#2563EB', fontSize: '1rem' }}>{dashboardData?.shop.account_number || '-'}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>ชื่อบัญชี:</span> <strong>{dashboardData?.shop.account_name || '-'}</strong></div>
                </div>

                <label style={{ marginTop: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 15px', background: slipImage ? '#ECFDF5' : '#1E3A8A', color: slipImage ? '#059669' : '#fff', borderRadius: 12, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', width: '100%', border: slipImage ? '1px solid #10B981' : 'none' }}>
                  <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                  {slipImage ? <><CheckCircle2 size={18} /> เปลี่ยนรูปสลิป</> : <><UploadCloud size={18} /> อัปโหลดสลิปโอนเงิน *</>}
                </label>
                {slipImage && <img src={slipImage} style={{ marginTop: 10, height: '120px', borderRadius: 8, border: '1px solid #DCE8FF' }} />}
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
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#1E3A8A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Navigation size={22} color="#2563EB" /> เลือกตำแหน่งจัดส่ง
              </h3>
              <button onClick={() => setShowMapModal(false)} style={{ background: '#F4F8FF', border: 'none', width: 36, height: 36, borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: '#2563EB' }}>
                <X size={20} />
              </button>
            </div>

            {/* พื้นที่แสดงแผนที่ */}
            <div style={{ height: '350px', background: '#E2E8F0', position: 'relative' }}>

              {/* ปุ่มดึงตำแหน่งปัจจุบันมาลงแผนที่ */}
              <div style={{ position: 'absolute', top: 15, right: 15, zIndex: 400 }}>
                <button onClick={requestLocationForMap} style={{ background: 'white', border: 'none', padding: '8px 12px', borderRadius: 8, boxShadow: '0 4px 10px rgba(0,0,0,0.15)', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6, color: '#1D4ED8' }}>
                  <Zap size={16} fill="#2563EB" color="#2563EB" /> ตำแหน่งของฉัน
                </button>
              </div>

              <MapPicker
                tempLocation={tempLocation}
                setTempLocation={setTempLocation}
                setAddress={setAddress}
              />
            </div>

            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 15, fontSize: '0.9rem', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F4F8FF', padding: 12, borderRadius: 12 }}>
                <span>พิกัดละติจูด-ลองจิจูด:</span>
                <strong style={{ color: '#1E3A8A' }}>
                  {tempLocation ? `${Number(tempLocation.lat).toFixed(4)}, ${Number(tempLocation.lng).toFixed(4)}` : 'กำลังค้นหา...'}
                </strong>
              </div>
              <button
                onClick={() => {
                  if (tempLocation) setLocation(tempLocation);
                  setShowMapModal(false);
                }}
                style={{ width: '100%', padding: '14px', background: '#2563EB', color: 'white', borderRadius: 14, fontWeight: '900', fontSize: '1.05rem', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}
              >
                ยืนยันตำแหน่งนี้
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// 🚀 MenuOptionModal
const MenuOptionModal = memo(({ menu, onClose, onConfirm }: { menu: Menu, onClose: () => void, onConfirm: (item: CartItem) => void }) => {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, MenuOption[]>>({});
  const [optionNote, setOptionNote] = useState('');

  // 🗂️ จัดกลุ่มตัวเลือก (เช่น จับกลุ่ม "ขนาด" มารวมกัน)
  const groupedOptions = useMemo(() => {
    if (!menu.options || menu.options.length === 0) return {};
    const groups: Record<string, MenuOption[]> = {};
    menu.options.forEach(opt => {
      if (!groups[opt.option_group]) groups[opt.option_group] = [];
      groups[opt.option_group].push(opt);
    });
    return groups;
  }, [menu.options]);

  // 🟢 1. ดักตั้งค่าเริ่มต้น (Auto-Select) ให้ตัวเลือกแบบ Radio บังคับเลือก
  useEffect(() => {
    if (!menu.options) return;
    
    const initialSelections: Record<string, MenuOption[]> = {};
    Object.entries(groupedOptions).forEach(([groupName, options]) => {
      const isMultiple = Boolean(Number(options[0].is_multiple));
      
      // ถ้าเป็น Radio (เลือกได้ข้อเดียว) ให้ยัดข้อแรกใส่ไปเลย จะได้ไม่ Error เวลาลูกค้าไม่กด
      if (!isMultiple && options.length > 0) {
        initialSelections[groupName] = [options[0]];
      }
    });

    setSelectedOptions(initialSelections);
  }, [menu, groupedOptions]);

  // ✨ ฟังก์ชันเมื่อผู้ใช้กดเลือก/ยกเลิก ตัวเลือก
  function toggleOption(group: string, option: MenuOption) {
    setSelectedOptions(prev => {
      const currentSelected = prev[group] || [];
      const isMultiple = Boolean(Number(option.is_multiple));

      if (isMultiple) {
        // เช็คบ็อกซ์: กดซ้ำเพื่อเอาออกได้
        const isSelected = currentSelected.some(o => o.id === option.id);
        if (isSelected) {
          return { ...prev, [group]: currentSelected.filter(o => o.id !== option.id) };
        } else {
          return { ...prev, [group]: [...currentSelected, option] };
        }
      } else {
        // เรดิโอ: บังคับสลับข้ออย่างเดียว
        return { ...prev, [group]: [option] };
      }
    });
  }

  // 🧮 คำนวณราคา (ราคาตั้งต้น + ราคาออปชันทั้งหมดที่เลือก)
  const calculatedOptionPrice = useMemo(() => {
    let price = Number(menu.price);
    Object.values(selectedOptions).flat().forEach(opt => {
      price += Number(opt.extra_price || 0);
    });
    return Math.round(price);
  }, [menu.price, selectedOptions]);

  // ✅ ยืนยันการสั่งซื้อและจัดรูปแบบชื่อ
  function handleConfirm() {
    // 🟢 2. ตรวจสอบการ Validation ว่ากลุ่มที่เป็น Radio โดนเลือกครบไหม
    for (const [groupName, options] of Object.entries(groupedOptions)) {
      const isMultiple = Boolean(Number(options[0].is_multiple));
      if (!isMultiple) {
        if (!selectedOptions[groupName] || selectedOptions[groupName].length === 0) {
          alert(`กรุณาเลือกตัวเลือกในหมวดหมู่ "${groupName}" ด้วยครับ`);
          return; // หยุดการทำงานถ้าไม่เลือก
        }
      }
    }

    let customName = menu.name;
    
    // เอาตัวเลือกที่เลือกมาเรียงต่อกันให้สวยงาม (เช่น [พิเศษ, ไข่ดาว])
    Object.entries(selectedOptions).forEach(([group, opts]) => {
      if (opts.length > 0) {
        const optionNames = opts.map(o => o.option_name).join(', ');
        customName += ` [${optionNames}]`;
      }
    });

    if (optionNote) customName += ` *${optionNote}*`;

    const cartItemId = `${menu.id}-${customName}`;

    onConfirm({
      ...menu,
      cartItemId,
      name: customName,
      originalName: menu.name,
      price: calculatedOptionPrice,
      quantity: 1
    });
  }

  const pillStyle = (active: boolean) => ({
    padding: '10px 16px', fontSize: '0.9rem', borderRadius: '20px', cursor: 'pointer',
    border: active ? '2px solid #2563EB' : '1px solid #DCE8FF',
    background: active ? '#EFF6FF' : '#ffffff',
    color: active ? '#1D4ED8' : '#475569',
    fontWeight: active ? 'bold' : 'normal',
    transition: 'all 0.2s ease-in-out'
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 1100 }}>
      <div style={{ background: '#ffffff', width: '100%', maxWidth: '500px', borderRadius: '32px 32px 0 0', padding: '25px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 -10px 25px rgba(37, 99, 235, 0.15)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '900', color: '#1E3A8A' }}>{menu.name}</h2>
          <button onClick={onClose} style={{ background: '#F4F8FF', border: 'none', cursor: 'pointer', color: '#2563EB', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 25 }}>
          
          {/* 🔄 เรนเดอร์ออปชันแบบ Dynamic ดึงจากฐานข้อมูลมาวนลูป */}
          {Object.entries(groupedOptions).map(([groupName, options]) => {
            const isMultiple = Boolean(Number(options[0].is_multiple));
            
            return (
              <div key={groupName}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'bold' }}>
                  {isMultiple ? <CheckSquare size={18} color="#2563EB" /> : <CheckCircle2 size={18} color="#2563EB" />} 
                  {groupName} {!isMultiple && <span style={{ color: '#EF4444' }}>*</span>}
                </h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {options.map(opt => {
                    const isSelected = selectedOptions[groupName]?.some(o => o.id === opt.id);
                    const priceText = Number(opt.extra_price) > 0 ? ` (+${opt.extra_price} ฿)` : '';
                    
                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggleOption(groupName, opt)}
                        style={pillStyle(isSelected)}
                      >
                        {opt.option_name}{priceText}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* หมายเหตุ (ยังคงอยู่เหมือนเดิม) */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'bold' }}>
              <PenLine size={18} color="#2563EB" /> หมายเหตุเพิ่มเติม
            </h4>
            <input
              type="text"
              placeholder="เช่น ไม่ใส่ผักชี, ขอช้อนส้อม..."
              value={optionNote}
              onChange={(e) => setOptionNote(e.target.value)}
              style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid #BFDBFE', outline: 'none', background: '#F4F8FF', boxSizing: 'border-box', fontSize: '0.95rem', color: '#1E3A8A' }}
            />
          </div>
        </div>

        <button
          onClick={handleConfirm}
          style={{ width: '100%', padding: '16px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '1.1rem', fontWeight: '900', cursor: 'pointer', marginTop: 30, boxShadow: '0 8px 20px rgba(37, 99, 235, 0.3)' }}
        >
          เพิ่มลงตะกร้า • {calculatedOptionPrice.toLocaleString()} ฿
        </button>
      </div>
    </div>
  );
});

MenuOptionModal.displayName = 'MenuOptionModal';