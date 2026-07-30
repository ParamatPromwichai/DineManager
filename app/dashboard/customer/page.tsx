'use client';

import { useEffect, useState, useMemo, memo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react'; 
import {
  Store, Clock, Zap, Star, Utensils, ShoppingCart, CreditCard,
  MapPin, Plus, Minus, Flame, Maximize2, PlusCircle, PenLine,
  UploadCloud, CheckCircle2, ImageOff, X, ChevronRight, Timer, Navigation, CheckSquare, ChevronUp, ChevronDown
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
  order_count?: number;
  is_sold_out?: number | boolean | string;
  options?: MenuOption[]; 
  addon_option_ids?: number[];
  globalOptions?: MenuOption[];
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCartExpanded, setIsCartExpanded] = useState(false);

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

        // 🔴 ถ้าเปิดโหมดซ่อมบำรุง ให้บังคับ Log out ทันที
        if (data.maintenance_mode && status === 'authenticated') {
          fetch('/api/auth/force-logout', { method: 'POST' });
        }
      })
      .catch(() => setCheckingSystem(false)); 
  }, [status]);

  useEffect(() => {
    if (status === 'unauthenticated' && !isMaintenance) {
      fetch('/api/auth/force-logout', { method: 'POST' }).then(() => {
        document.cookie.split(";").forEach((c) => {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        window.location.href = '/login';
      });
    }
  }, [status, isMaintenance]);

  // โหลดข้อมูลจาก LocalStorage ตอนเปิดหน้าเว็บ
  useEffect(() => {
    const savedCart = localStorage.getItem('dinemanager_cart');
    const savedPhone = localStorage.getItem('dinemanager_phone');
    const savedAddress = localStorage.getItem('dinemanager_address');
    const savedShowPayment = localStorage.getItem('dinemanager_show_payment');
    
    if (savedShowPayment === 'true') setShowPayment(true);
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); } catch (e) {}
    }
    if (savedPhone) setPhone(savedPhone);
    if (savedAddress) setAddress(savedAddress);
    setIsLoaded(true);
  }, []);

  // บันทึกข้อมูลลง LocalStorage เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('dinemanager_cart', JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

  useEffect(() => {
    localStorage.setItem('dinemanager_phone', phone);
  }, [phone]);

  useEffect(() => {
    localStorage.setItem('dinemanager_address', address);
  }, [address]);

  useEffect(() => {
    localStorage.setItem('dinemanager_show_payment', showPayment.toString());
  }, [showPayment]);

  const paymentBottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (paymentMethod === 'qr' && paymentBottomRef.current) {
      setTimeout(() => {
        paymentBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, [paymentMethod]);



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
      localStorage.removeItem('dinemanager_cart');

    } catch (error) { 
      alert('เกิดข้อผิดพลาด'); 
    } finally { 
      setIsSubmitting(false); 
    }
  }

  // 🚨 ถ้าเป็นโหมดซ่อมบำรุง ให้โชว์หน้าซ่อมบำรุงเลย ไม่ต้องรอโหลดอย่างอื่น
  if (isMaintenance) {
    return (
      <div className="flex justify-center items-center h-screen bg-blue-50 dark:bg-slate-900 p-5 transition-colors">
        <div className="bg-white dark:bg-slate-800 p-10 rounded-3xl text-center shadow-[0_10px_40px_rgba(37,99,235,0.1)] dark:shadow-none border border-blue-100 dark:border-slate-700 max-w-[400px] transition-colors">
          <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400 w-[60px] h-[60px] rounded-full flex items-center justify-center mx-auto mb-5">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-amber-700 dark:text-amber-500 m-0 mb-2.5">ปิดปรับปรุงระบบชั่วคราว</h1>
          <p className="text-amber-600 dark:text-amber-400/80 leading-relaxed m-0">ขออภัยในความไม่สะดวก ขณะนี้ระบบกำลังปิดปรับปรุง กรุณากลับมาใช้งานใหม่อีกครั้งในภายหลังครับ</p>
        </div>
      </div>
    );
  }

  if (checkingSystem || status === 'loading' || loading) {
    return (
      <div className="px-5 pt-5 pb-8 min-h-[100dvh] bg-slate-50 dark:bg-slate-900 transition-colors">
        <div className="animate-pulse flex flex-col gap-6">
          {/* Header Skeleton */}
          <div className="flex items-center gap-4">
            <div className="w-[55px] h-[55px] rounded-full bg-slate-200 dark:bg-slate-800"></div>
            <div className="flex-1">
              <div className="h-[22px] w-[140px] bg-slate-200 dark:bg-slate-800 rounded-lg mb-2"></div>
              <div className="h-[14px] w-[90px] bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            </div>
            <div className="w-[45px] h-[45px] rounded-full bg-slate-200 dark:bg-slate-800"></div>
          </div>
          
          {/* Banner Skeleton */}
          <div className="w-full h-[180px] bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
          
          {/* Categories Skeleton */}
          <div className="flex gap-2.5 overflow-hidden">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="min-w-[90px] h-[40px] bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            ))}
          </div>

          {/* Title Skeleton */}
          <div className="h-[24px] w-[160px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          
          {/* Horizontal Cards Skeleton */}
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3].map(i => (
              <div key={i} className="min-w-[220px] h-[240px] bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className={`bg-blue-50 dark:bg-slate-900 px-5 pt-5 font-sans transition-all duration-300 ${cart.length > 0 ? 'pb-[160px]' : 'pb-6'}`}>

      {/* 🔴 Header สำหรับ Dashboard */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="m-0 text-xl font-black text-blue-900 dark:text-blue-50">หน้าหลัก</h2>
        <button onClick={() => router.push('/dashboard/customer/cart')} className="relative bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 text-blue-600 dark:text-blue-400 cursor-pointer p-2.5 rounded-full flex items-center justify-center shadow-sm transition-colors">
          <ShoppingCart size={22} />
          {cart.reduce((a, b) => a + b.quantity, 0) > 0 && (
            <span style={{ position: 'absolute', top: -6, right: -6, background: '#EF4444', color: 'white', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', border: '2px solid #ffffff' }}>
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {dashboardData && (
        <>
          {/* 🏪 Shop Status Card */}
          <section className="mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <Store size={22} className="text-blue-600 dark:text-blue-400" /> Status ร้านค้า
            </h3>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl mt-3 border border-blue-100 dark:border-slate-700 shadow-sm transition-colors">
              <div className="flex justify-between items-center">
                <span className={`font-black flex items-center gap-1.5 ${dashboardData.shop.is_open ? 'text-emerald-500' : 'text-red-500'}`}>
                  {dashboardData.shop.is_open ? <Zap size={18} className="fill-emerald-500" /> : <X size={18} />}
                  {dashboardData.shop.is_open ? 'เปิดให้บริการ' : 'ปิดให้บริการ'}
                </span>
                <span className="text-sm text-blue-400 flex items-center gap-1 font-bold">
                  <Clock size={14} /> ปิด {dashboardData.shop.close_time?.substring(0, 5) || '--:--'} น.
                </span>
              </div>
              <div className="h-px bg-blue-50 dark:bg-slate-700 my-4 transition-colors" />
              <p className="m-0 text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Timer size={18} className="text-blue-600 dark:text-blue-400" /> คิวที่รอขณะนี้: <strong className="text-blue-800 dark:text-blue-200 text-lg">{dashboardData.remainingQueue}</strong> คิว
              </p>
            </div>
          </section>

          {/* ⭐ Recommended Horizontal List */}
          {dashboardData.recommendedMenus.length > 0 && (
            <section className="mb-7">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-blue-900 dark:text-blue-100 m-0">
                  <Star size={22} className="text-amber-500 fill-amber-500" /> เมนูแนะนำวันนี้
                </h3>
                <button
                  onClick={() => router.push('/dashboard/customer/menus')}
                  className="bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 px-3 py-1.5 rounded-full text-blue-700 dark:text-blue-400 font-bold text-sm cursor-pointer flex items-center transition-colors"
                >
                  ดูทั้งหมด <ChevronRight size={14} />
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2.5 snap-x snap-mandatory">
                {dashboardData.recommendedMenus.map((m) => (
                  <div key={`rec-${m.id}`} onClick={() => router.push(`/dashboard/customer/menus/${m.id}`)} className="cursor-pointer w-[160px] flex-none bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-2xl p-3 snap-start shadow-sm flex flex-col transition-colors">
                    <div className="h-[100px] bg-blue-50 dark:bg-slate-700 rounded-xl mb-2.5 overflow-hidden shrink-0 transition-colors">
                      {m.image ? <img src={m.image} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center"><ImageOff size={20} className="text-blue-300 dark:text-slate-500" /></div>}
                    </div>
                    <div className="font-bold text-[0.95rem] text-blue-900 dark:text-blue-50 whitespace-nowrap overflow-hidden text-ellipsis">{m.name}</div>
                    <div className="text-blue-600 dark:text-blue-400 font-black text-[1.05rem] mt-1">{m.price} ฿</div>
                    {m.addon_option_ids && m.addon_option_ids.length > 0 && (
                      <div className="mt-1">
                        <span className="text-[0.7rem] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-md font-bold border border-blue-200 dark:border-blue-800/50">
                          + มีตัวเลือกเสริม
                        </span>
                      </div>
                    )}
                    <button disabled={dashboardData?.shop && !dashboardData.shop.is_open} onClick={(e) => { e.stopPropagation(); setSelectedMenuForOption(m); }} className={`mt-auto w-full p-2.5 rounded-xl font-bold text-sm transition-all ${
                      (dashboardData?.shop && !dashboardData.shop.is_open) 
                        ? 'bg-slate-400 dark:bg-slate-600 text-white cursor-not-allowed shadow-none' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-md shadow-blue-600/20'
                    }`}>
                      {(dashboardData?.shop && !dashboardData.shop.is_open) ? 'ร้านปิด' : '+ สั่งเลย'}
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
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-900 dark:text-blue-100">
          <Utensils size={22} className="text-blue-600 dark:text-blue-400" /> สั่งด่วน (เมนูยอดฮิต)
        </h3>
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-blue-100 dark:border-slate-700 overflow-hidden shadow-sm transition-colors">
          {allMenus.slice(0, 6).map((menu, idx) => {
            const isMenuSoldOut = Number(menu.is_sold_out) === 1 || String(menu.is_sold_out).toLowerCase() === 'true';

            return (
              <div key={menu.id} onClick={() => router.push(`/dashboard/customer/menus/${menu.id}`)} className={`cursor-pointer flex justify-between items-center py-4 px-5 ${idx === 5 ? 'border-none' : 'border-b border-blue-50 dark:border-slate-700'} transition-colors`}>
                <div className={`flex items-center gap-4 ${isMenuSoldOut ? 'opacity-60' : 'opacity-100'}`}>
                  <div className="w-[50px] h-[50px] bg-blue-50 dark:bg-slate-700 rounded-xl overflow-hidden border border-blue-100 dark:border-slate-600 shrink-0">
                    {menu.image ? <img src={menu.image} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center"><ImageOff size={16} className="text-blue-300 dark:text-slate-500" /></div>}
                  </div>
                  <div>
                    <div className={`font-bold text-[0.95rem] ${isMenuSoldOut ? 'text-slate-400 dark:text-slate-500' : 'text-blue-900 dark:text-blue-50'}`}>{menu.name}</div>
                    <div className={`font-black text-[0.9rem] ${isMenuSoldOut ? 'text-slate-400 dark:text-slate-500' : 'text-blue-600 dark:text-blue-400'}`}>{menu.price} ฿</div>
                    {menu.addon_option_ids && menu.addon_option_ids.length > 0 && (
                      <div className="mt-1">
                        <span className="text-[0.7rem] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-md font-bold border border-blue-200 dark:border-blue-800/50">
                          + มีตัวเลือกเสริม
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {isMenuSoldOut ? (
                  <span className="bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-400 border-none rounded-2xl px-3.5 py-1.5 text-[0.8rem] font-bold">
                    หมด
                  </span>
                ) : (
                  <button
                    disabled={dashboardData?.shop && !dashboardData.shop.is_open}
                    onClick={(e) => { e.stopPropagation(); setSelectedMenuForOption(menu); }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border ${
                      (dashboardData?.shop && !dashboardData.shop.is_open) 
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-transparent cursor-not-allowed' 
                        : 'bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-slate-600 cursor-pointer hover:bg-blue-100 dark:hover:bg-slate-600'
                    }`}
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
      {cart.length > 0 && (
        <div className="fixed bottom-[85px] left-4 right-4 bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-xl border border-blue-100 dark:border-slate-700 z-50 transition-colors">
          <div className={`flex justify-between items-center ${isCartExpanded ? 'mb-4' : 'mb-2.5'}`}>
            <h4 className="m-0 text-[1.1rem] flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <ShoppingCart size={20} className="text-blue-600 dark:text-blue-400" /> ตะกร้า ({cart.reduce((a, b) => a + b.quantity, 0)} ชิ้น)
            </h4>
            <div className="flex items-center gap-4">
              <span className="font-black text-xl text-blue-600 dark:text-blue-400">{subTotal.toLocaleString()} ฿</span>
              <button onClick={() => setIsCartExpanded(!isCartExpanded)} className="bg-slate-100 dark:bg-slate-700 border-none rounded-full w-8 h-8 flex items-center justify-center cursor-pointer text-slate-500 dark:text-slate-300">
                {isCartExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </button>
            </div>
          </div>

          {isCartExpanded && (
            <div className="max-h-[160px] overflow-y-auto mb-4 border-b border-blue-50 dark:border-slate-700 pb-2.5">
              {cart.map(item => (
                <div key={item.cartItemId} className="flex justify-between items-start mb-3">
                  <div className="flex-1 pr-2.5">
                    <div className="font-bold text-[0.95rem] text-blue-800 dark:text-blue-200">{item.originalName}</div>
                    <div className="text-[0.8rem] text-slate-500 dark:text-slate-400 leading-snug">{item.name.replace(item.originalName, '').trim()}</div>
                    <div className="text-blue-600 dark:text-blue-400 font-bold text-[0.85rem]">{item.price.toLocaleString()} ฿</div>
                  </div>
                  <div className="flex items-center bg-blue-50 dark:bg-slate-700 border border-blue-100 dark:border-slate-600 rounded-full overflow-hidden">
                    <button onClick={() => removeFromCart(item.cartItemId)} className="bg-transparent border-none px-3 py-1.5 cursor-pointer text-red-500 flex items-center">
                      <Minus size={14} strokeWidth={3} />
                    </button>
                    <span className="text-[0.95rem] font-bold w-5 text-center text-blue-900 dark:text-blue-100">{item.quantity}</span>
                    <button onClick={() => addToCartDirectly(item.cartItemId)} className="bg-transparent border-none px-3 py-1.5 cursor-pointer text-blue-600 dark:text-blue-400 flex items-center">
                      <Plus size={14} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button 
            disabled={dashboardData?.shop && !dashboardData.shop.is_open} 
            onClick={() => router.push('/dashboard/customer/cart')} 
            className={`w-full p-3 rounded-2xl border-none text-[1.05rem] font-bold transition-all ${
              (dashboardData?.shop && !dashboardData.shop.is_open) 
                ? 'bg-slate-400 dark:bg-slate-600 text-white cursor-not-allowed shadow-none' 
                : 'bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white cursor-pointer shadow-lg shadow-blue-600/30'
            }`}
          >
            {(dashboardData?.shop && !dashboardData.shop.is_open) ? 'ร้านปิดให้บริการ' : 'ยืนยันและไปหน้าชำระเงิน'}
          </button>
        </div>
      )}

    </div>
  );
}

// 🚀 MenuOptionModal
const MenuOptionModal = memo(({ menu, onClose, onConfirm }: { menu: Menu, onClose: () => void, onConfirm: (item: CartItem) => void }) => {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, MenuOption[]>>({});
  const [optionNote, setOptionNote] = useState('');

  // 🗂️ จัดกลุ่มตัวเลือก
  const groupedOptions = useMemo(() => {
    const optionsToUse = menu.addon_option_ids && menu.addon_option_ids.length > 0 && menu.globalOptions && menu.globalOptions.length > 0 ? menu.globalOptions : menu.options;
    if (!optionsToUse || optionsToUse.length === 0) return {};
    const groups: Record<string, MenuOption[]> = {};
    optionsToUse.forEach(opt => {
      if (!groups[opt.option_group]) groups[opt.option_group] = [];
      groups[opt.option_group].push(opt);
    });
    return groups;
  }, [menu]);

  // 🟢 1. ดักตั้งค่าเริ่มต้น (Auto-Select) ให้ตัวเลือกแบบ Radio บังคับเลือก
  useEffect(() => {
    const optionsToUse = menu.addon_option_ids && menu.addon_option_ids.length > 0 && menu.globalOptions && menu.globalOptions.length > 0 ? menu.globalOptions : menu.options;
    if (!optionsToUse) return;
    
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-end z-[1100]">
      <div className="bg-white dark:bg-slate-800 w-full max-w-[500px] rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto shadow-[0_-10px_25px_rgba(0,0,0,0.1)] transition-colors">

        <div className="flex justify-between items-center mb-6">
          <h2 className="m-0 text-xl font-black text-blue-900 dark:text-blue-50">{menu.name}</h2>
          <button onClick={onClose} className="bg-blue-50 dark:bg-slate-700 border-none cursor-pointer text-blue-600 dark:text-blue-400 w-9 h-9 rounded-full flex items-center justify-center">
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex flex-col gap-6">
          
          {/* 🔄 เรนเดอร์ออปชันแบบ Dynamic ดึงจากฐานข้อมูลมาวนลูป */}
          {Object.entries(groupedOptions).map(([groupName, options]) => {
            const isMultiple = Boolean(Number(options[0].is_multiple));
            
            return (
              <div key={groupName}>
                <h4 className="m-0 mb-3 text-base text-blue-800 dark:text-blue-200 flex items-center gap-1.5 font-bold">
                  {isMultiple ? <CheckSquare size={18} className="text-blue-600 dark:text-blue-400" /> : <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400" />} 
                  {groupName} {!isMultiple && <span className="text-red-500">*</span>}
                </h4>
                <div className="flex gap-2 flex-wrap">
                  {options.map(opt => {
                    const isSelected = selectedOptions[groupName]?.some(o => o.id === opt.id);
                    const priceText = Number(opt.extra_price) > 0 ? ` (+${opt.extra_price} ฿)` : '';
                    
                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggleOption(groupName, opt)}
                        className={`px-4 py-2.5 text-sm rounded-full cursor-pointer border-2 transition-all ${
                          isSelected 
                            ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold' 
                            : 'border-blue-100 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-normal'
                        }`}
                      >
                        {opt.option_name}{priceText}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* หมายเหตุ */}
          <div>
            <h4 className="m-0 mb-3 text-base text-blue-800 dark:text-blue-200 flex items-center gap-1.5 font-bold">
              <PenLine size={18} className="text-blue-600 dark:text-blue-400" /> หมายเหตุเพิ่มเติม
            </h4>
            <input
              type="text"
              placeholder="เช่น ไม่ใส่ผักชี, ขอช้อนส้อม..."
              value={optionNote}
              onChange={(e) => setOptionNote(e.target.value)}
              className="w-full p-3.5 rounded-2xl border border-blue-200 dark:border-slate-600 outline-none bg-blue-50 dark:bg-slate-700 text-[0.95rem] text-blue-900 dark:text-blue-50 placeholder-slate-400 dark:placeholder-slate-400 transition-colors"
            />
          </div>
        </div>

        <button
          onClick={handleConfirm}
          className="w-full p-4 bg-blue-600 hover:bg-blue-700 text-white border-none rounded-2xl text-lg font-black cursor-pointer mt-7 shadow-[0_8px_20px_rgba(37,99,235,0.3)] transition-colors"
        >
          เพิ่มลงตะกร้า • {calculatedOptionPrice.toLocaleString()} ฿
        </button>
      </div>
    </div>
  );
});

MenuOptionModal.displayName = 'MenuOptionModal';