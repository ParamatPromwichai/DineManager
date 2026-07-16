'use client';

import { useEffect, useState, useMemo, memo, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, Utensils, Star, Plus, Minus, ShoppingCart, 
  CreditCard, MapPin, ImageOff, X, Flame, Maximize2, 
  PlusCircle, PenLine, UploadCloud, CheckCircle2, Search, SlidersHorizontal, CheckSquare, Zap, Navigation, ChevronUp, ChevronDown
} from 'lucide-react';
import dynamic from 'next/dynamic';

// 🟢 โหลด MapPicker ฝั่ง Client เท่านั้น
const MapPicker = dynamic(() => import('@/components/MapPicker'), {
  ssr: false,
  loading: () => <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>กำลังโหลดแผนที่...</div>
});

// --- Types ---
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
  avg_rating: number;   
  review_count: number; 
  order_count?: number;
  is_sold_out?: number | boolean | string; 
  options?: MenuOption[]; 
  addon_option_ids?: number[];
  globalOptions?: MenuOption[];
};

type ShopStatus = {
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  qr_image?: string;
  latitude?: string | number; 
  longitude?: string | number;
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

// ⭐ ฟังก์ชันแสดงดาว
const renderStars = (rating: number) => {
  const stars = Math.round(rating);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, marginRight: 5 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={13} color={i < stars ? "#FFB800" : "#DBEAFE"} fill={i < stars ? "#FFB800" : "none"} />
      ))}
    </span>
  );
};

// 🟢 เปลี่ยนชื่อฟังก์ชันเดิมเป็น AllMenusContent
function AllMenusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [shopData, setShopData] = useState<ShopStatus | null>(null);
  const [isCartExpanded, setIsCartExpanded] = useState(false);
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [activeFilter, setActiveFilter] = useState<'all' | 'popular' | 'rating' | 'price'>('all');

  // Form & UI States
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

  // 🟢 🗺️ Map States สำหรับควบคุมป๊อปอัปแผนที่
  const [showMapModal, setShowMapModal] = useState(false);
  const [tempLocation, setTempLocation] = useState<Location | null>(null);

  // States สำหรับ Popup ตัวเลือกอาหาร
  const [selectedMenuForOption, setSelectedMenuForOption] = useState<Menu | null>(null);

  // 1. Fetch Data
  useEffect(() => {
    // ดึงเรทตั้งค่าระบบจัดส่งชั่วคราว
    fetch('/api/sysconfig')
      .then(res => res.json())
      .then(data => {
        setBaseDeliveryFee(data.delivery_fee || 0);
        setDeliveryFeePerKm(data.delivery_fee_per_km || 0);
      }).catch(err => console.error(err));

    fetch('/api/customer/menus')
      .then(res => res.json())
      .then((data: Menu[]) => {
        setMenus(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
      
    fetch('/api/customer/home').then(res => res.json()).then(data => { if (data?.shop) setShopData(data.shop); }).catch(err => console.error(err));
    fetch('/api/customer/profile').then(res => res.json()).then(data => {
      if (data?.phone) setPhone(data.phone);
      if (data?.address) setAddress(data.address);
      if (data?.latitude && data?.longitude) {
        const userLoc = { lat: Number(data.latitude), lng: Number(data.longitude) };
        setLocation(userLoc);
        setTempLocation(userLoc);
      }
    }).catch(err => console.error(err));
  }, []);

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


  // 🚚 คำนวณค่าจัดส่งอิงตามสูตรใหม่ระบบหลังบ้าน
  useEffect(() => {
    if (location?.lat && location?.lng && shopData?.latitude && shopData?.longitude) {
      const dist = calculateDistance(location.lat, location.lng, Number(shopData.latitude), Number(shopData.longitude));
      setDistance(dist);
      
      let fee = baseDeliveryFee; 
      if (dist > 2) {
        fee += Math.ceil(dist - 2) * deliveryFeePerKm; 
      }
      setDeliveryFee(fee);
    } else {
      setDeliveryFee(0);
      setDistance(0);
    }
  }, [location, shopData, baseDeliveryFee, deliveryFeePerKm]);

  // 💰 คำนวณยอดเงินรวม
  const subTotal = useMemo(() => cart.reduce((sum, i) => sum + i.price * i.quantity, 0), [cart]);
  const total = subTotal + (location ? deliveryFee : 0);

  // --- Handlers ---
  function handleConfirmAddToCart(newItem: CartItem) {
    setCart(prev => {
      const found = prev.find(i => i.cartItemId === newItem.cartItemId);
      if (found) {
        return prev.map(i => i.cartItemId === newItem.cartItemId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, newItem];
    });
    setSelectedMenuForOption(null); 
  }

  function addToCartDirectly(cartItemId: string) {
    setCart(prev => prev.map(i => i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + 1 } : i));
  }

  function removeFromCart(cartItemId: string) {
    setCart(prev => prev.map(i => (i.cartItemId === cartItemId ? { ...i, quantity: i.quantity - 1 } : i)).filter(i => i.quantity > 0));
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

  // ฟังก์ชันหาตำแหน่งปัจจุบัน (สำหรับใช้ในแผนที่)
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
    if (!phone || !address || !paymentMethod) { 
      alert('กรุณากรอกข้อมูลให้ครบ (เบอร์, ที่อยู่, วิธีชำระ)'); 
      return; 
    }
    if (!location) {
      alert('กรุณาแนบตำแหน่งปัจจุบัน (GPS) เพื่อคำนวณค่าจัดส่ง');
      return;
    }
    if (paymentMethod === 'qr' && !slipImage) {
      alert('กรุณาแนบสลิปโอนเงินเพื่อยืนยันการชำระเงินด้วยครับ');
      return;
    }
    if (cart.length === 0) return;
    setIsSubmitting(true);

    try {
      await fetch('/api/customer/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, address, location }) });
      const res = await fetch('/api/customer/order', { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ items: cart, phone, address, location, paymentMethod, subTotal, deliveryFee, totalPrice: total, slipImage }) 
      });

      if (!res.ok) throw new Error('Failed to create order');
      
      alert('สั่งอาหารสำเร็จ ขอบคุณที่ใช้บริการครับ!');
      setCart([]); setShowPayment(false); setSlipImage(null); setPaymentMethod('');
      localStorage.removeItem('dinemanager_cart');
    } catch (error) { 
      console.error(error); alert('เกิดข้อผิดพลาด กรุณาลองใหม่'); 
    } finally { setIsSubmitting(false); }
  }

  // 🔍 กรอง ค้นหา และจัดเรียงเมนู
  const filteredAndSortedMenus = useMemo(() => {
    let result = [...menus];

    if (searchQuery.trim() !== '') {
      result = result.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (activeFilter === 'popular') {
      result.sort((a, b) => b.review_count - a.review_count);
    } else if (activeFilter === 'rating') {
      result = result.filter(m => m.avg_rating >= 4.5);
      result.sort((a, b) => b.avg_rating - a.avg_rating);
    } else if (activeFilter === 'price') {
      result.sort((a, b) => a.price - b.price);
    }

    return result.sort((a, b) => {
      const aSoldOut = Number(a.is_sold_out) === 1 || String(a.is_sold_out).toLowerCase() === 'true';
      const bSoldOut = Number(b.is_sold_out) === 1 || String(b.is_sold_out).toLowerCase() === 'true';
      if (aSoldOut === bSoldOut) return 0;
      return aSoldOut ? 1 : -1;
    });
  }, [menus, searchQuery, activeFilter]);

  return (
    <div style={{ padding: '20px 20px 280px 20px', background: '#F4F8FF', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* Header & ปุ่มย้อนกลับ */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, gap: 10 }}>
        <button 
          onClick={() => router.push('/dashboard/customer')} 
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontWeight: 'bold', cursor: 'pointer', padding: '8px 14px', borderRadius: '20px', fontSize: '0.9rem' }}
        >
          <ArrowLeft size={16} /> กลับ
        </button>
        <h1 style={{ margin: 0, flex: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#1E3A8A', fontSize: '1.3rem', fontWeight: '900' }}>
          <Utensils size={24} color="#2563EB" /> เมนูทั้งหมด
        </h1>
        <button onClick={() => router.push('/dashboard/customer/cart')} style={{ position: 'relative', background: '#ffffff', border: '1px solid #DCE8FF', color: '#2563EB', cursor: 'pointer', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(37,99,235,0.05)' }}>
          <ShoppingCart size={22} />
          {cart.reduce((a, b) => a + b.quantity, 0) > 0 && (
            <span style={{ position: 'absolute', top: -6, right: -6, background: '#EF4444', color: 'white', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', border: '2px solid #ffffff' }}>
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* ช่องค้นหา */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} color="#93C5FD" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="ค้นหาชื่ออาหารที่คุณต้องการ..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '14px 14px 14px 42px', border: '1px solid #BFDBFE', borderRadius: '16px', outline: 'none', background: '#ffffff', fontSize: '0.95rem', boxSizing: 'border-box', color: '#1E3A8A', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.02)' }}
          />
          {searchQuery && (
            <X size={16} color="#64748B" onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }} />
          )}
        </div>
      </div>

      {/* แถบตัวกรอง */}
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 12, marginBottom: 20, scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
        <button onClick={() => setActiveFilter('all')} style={{ padding: '10px 18px', borderRadius: '20px', border: activeFilter === 'all' ? '2px solid #2563EB' : '1px solid #DCE8FF', background: activeFilter === 'all' ? '#2563EB' : '#fff', color: activeFilter === 'all' ? '#fff' : '#475569', fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap', cursor: 'pointer', transition: '0.2s' }}>🍛 ทั้งหมด</button>
        <button onClick={() => setActiveFilter('popular')} style={{ padding: '10px 18px', borderRadius: '20px', border: activeFilter === 'popular' ? '2px solid #2563EB' : '1px solid #DCE8FF', background: activeFilter === 'popular' ? '#2563EB' : '#fff', color: activeFilter === 'popular' ? '#fff' : '#475569', fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap', cursor: 'pointer', transition: '0.2s' }}>🔥 ยอดฮิต (รีวิวเยอะ)</button>
        <button onClick={() => setActiveFilter('rating')} style={{ padding: '10px 18px', borderRadius: '20px', border: activeFilter === 'rating' ? '2px solid #2563EB' : '1px solid #DCE8FF', background: activeFilter === 'rating' ? '#2563EB' : '#fff', color: activeFilter === 'rating' ? '#fff' : '#475569', fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap', cursor: 'pointer', transition: '0.2s' }}>⭐ เรตติ้งสูง (4.5+)</button>
        <button onClick={() => setActiveFilter('price')} style={{ padding: '10px 18px', borderRadius: '20px', border: activeFilter === 'price' ? '2px solid #2563EB' : '1px solid #DCE8FF', background: activeFilter === 'price' ? '#2563EB' : '#fff', color: activeFilter === 'price' ? '#fff' : '#475569', fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap', cursor: 'pointer', transition: '0.2s' }}>💰 ราคาประหยัด</button>
      </div>

      {/* Grid เมนูอาหาร */}
      {filteredAndSortedMenus.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
          {filteredAndSortedMenus.map(menu => {
            const isMenuSoldOut = Number(menu.is_sold_out) === 1 || String(menu.is_sold_out).toLowerCase() === 'true';

            return (
              <div key={menu.id} onClick={() => router.push(`/dashboard/customer/menus/${menu.id}`)} style={{ cursor: 'pointer', background: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.04)', display: 'flex', flexDirection: 'column', opacity: isMenuSoldOut ? 0.6 : 1, border: '1px solid #DCE8FF' }}>
                <div style={{ height: '130px', background: '#F0F5FF', position: 'relative' }}>
                  {menu.image ? (
                    <img src={menu.image} alt={menu.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> 
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#93C5FD' }}>
                      <ImageOff size={24} style={{ marginBottom: 5 }} />
                      <span style={{ fontSize: '0.75rem' }}>ไม่มีรูปภาพ</span>
                    </div>
                  )}
                </div>

                <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: 4, color: isMenuSoldOut ? '#94a3b8' : '#1E3A8A' }}>{menu.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                    {renderStars(Number(menu.avg_rating))} 
                    <span style={{ color: '#93C5FD', marginLeft: 4, fontWeight: 'bold' }}>({menu.review_count})</span>
                  </div>
                  
                  {menu.addon_option_ids && menu.addon_option_ids.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: '0.7rem', background: '#dbeafe', color: '#1d4ed8', padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold', border: '1px solid #bfdbfe' }}>
                        + มีตัวเลือกเสริม
                      </span>
                    </div>
                  )}
                  
                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: isMenuSoldOut ? '#94a3b8' : '#2563EB', fontWeight: '900', fontSize: '1.1rem' }}>{Number(menu.price).toLocaleString()} ฿</span>
                    
                    {isMenuSoldOut ? (
                      <span style={{ background: '#F1F5F9', color: '#94A3B8', border: 'none', borderRadius: '16px', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold' }}>หมด</span>
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedMenuForOption(menu); }} 
                        style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(37,99,235,0.15)', transition: '0.2s' }}
                      >
                        <Plus size={18} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748B', background: '#fff', borderRadius: '20px', border: '1px solid #DCE8FF' }}>
          <ImageOff size={40} color="#93C5FD" style={{ marginBottom: 10 }} />
          <p style={{ margin: 0, fontWeight: 'bold' }}>ไม่พบรายการอาหารที่ตรงกับตัวกรอง</p>
        </div>
      )}

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
        <div style={{ position: 'fixed', bottom: 85, left: 15, right: 15, background: '#ffffff', borderRadius: 20, padding: '15px 20px', boxShadow: '0 10px 25px rgba(37, 99, 235, 0.15)', zIndex: 90, border: '1px solid #DCE8FF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isCartExpanded ? 15 : 10 }}>
            <h4 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8, color: '#1E3A8A' }}>
              <ShoppingCart size={20} color="#2563EB" /> ตะกร้า ({cart.reduce((a, b) => a + b.quantity, 0)} ชิ้น)
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
              <span style={{ fontWeight: '900', fontSize: '1.3em', color: '#2563EB' }}>{subTotal.toLocaleString()} ฿</span>
              <button onClick={() => setIsCartExpanded(!isCartExpanded)} style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
                {isCartExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </button>
            </div>
          </div>

          {isCartExpanded && (
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
          )}

          <button onClick={() => router.push('/dashboard/customer/cart')} style={{ width: '100%', padding: '12px', background: 'linear-gradient(90deg, #1D4ED8, #2563EB)', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '1.05em', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}>
            ยืนยันและไปหน้าชำระเงิน
          </button>
        </div>
      )}

    </div>
  );
}

// 🟢 สร้าง Component หน้าหลักตัวใหม่ ที่ครอบด้วย Suspense
export default function AllMenusPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '20px 20px 100px 20px', minHeight: '100vh', background: '#F8FAFC' }}>
        <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {/* Header Skeleton */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ width: '80px', height: '36px', backgroundColor: '#E2E8F0', borderRadius: '20px' }}></div>
            <div style={{ height: '24px', width: '120px', backgroundColor: '#E2E8F0', borderRadius: '12px' }}></div>
            <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#E2E8F0' }}></div>
          </div>
          
          {/* Search & Categories Skeleton */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ width: '100%', height: '50px', backgroundColor: '#E2E8F0', borderRadius: '25px' }}></div>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'hidden' }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ minWidth: '90px', height: '40px', backgroundColor: '#E2E8F0', borderRadius: '20px' }}></div>
              ))}
            </div>
          </div>
          
          {/* Vertical List Cards Skeleton */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ display: 'flex', height: '110px', backgroundColor: '#ffffff', borderRadius: '24px', border: '1px solid #EBF1FF', overflow: 'hidden' }}>
                <div style={{ width: '120px', height: '100%', backgroundColor: '#E2E8F0' }}></div>
                <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ height: '18px', width: '70%', backgroundColor: '#E2E8F0', borderRadius: '8px', marginBottom: '8px' }}></div>
                    <div style={{ height: '14px', width: '40%', backgroundColor: '#E2E8F0', borderRadius: '8px' }}></div>
                  </div>
                  <div style={{ height: '20px', width: '30%', backgroundColor: '#E2E8F0', borderRadius: '8px' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    }>
      <AllMenusContent />
    </Suspense>
  );
}

// 🚀 MenuOptionModal (ดึงตัวเลือก Dynamic จาก Database แบบหน้าแรก)
const MenuOptionModal = memo(({ menu, onClose, onConfirm }: { menu: Menu, onClose: () => void, onConfirm: (item: CartItem) => void }) => {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, MenuOption[]>>({});
  const [optionNote, setOptionNote] = useState('');

  // จัดกลุ่มตัวเลือก
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

  // ตั้งค่าเริ่มต้น Auto-Select
  useEffect(() => {
    const optionsToUse = menu.addon_option_ids && menu.addon_option_ids.length > 0 && menu.globalOptions && menu.globalOptions.length > 0 ? menu.globalOptions : menu.options;
    if (!optionsToUse) return;
    
    const initialSelections: Record<string, MenuOption[]> = {};
    Object.entries(groupedOptions).forEach(([groupName, options]) => {
      const isMultiple = Boolean(Number(options[0].is_multiple));
      if (!isMultiple && options.length > 0) {
        initialSelections[groupName] = [options[0]];
      }
    });

    setSelectedOptions(initialSelections);
  }, [menu, groupedOptions]);

  function toggleOption(group: string, option: MenuOption) {
    setSelectedOptions(prev => {
      const currentSelected = prev[group] || [];
      const isMultiple = Boolean(Number(option.is_multiple));

      if (isMultiple) {
        const isSelected = currentSelected.some(o => o.id === option.id);
        if (isSelected) {
          return { ...prev, [group]: currentSelected.filter(o => o.id !== option.id) };
        } else {
          return { ...prev, [group]: [...currentSelected, option] };
        }
      } else {
        return { ...prev, [group]: [option] };
      }
    });
  }

  const calculatedOptionPrice = useMemo(() => {
    let price = Number(menu.price);
    Object.values(selectedOptions).flat().forEach(opt => {
      price += Number(opt.extra_price || 0);
    });
    return Math.round(price);
  }, [menu.price, selectedOptions]);

  function handleConfirm() {
    for (const [groupName, options] of Object.entries(groupedOptions)) {
      const isMultiple = Boolean(Number(options[0].is_multiple));
      if (!isMultiple) {
        if (!selectedOptions[groupName] || selectedOptions[groupName].length === 0) {
          alert(`กรุณาเลือกตัวเลือกในหมวดหมู่ "${groupName}" ด้วยครับ`);
          return;
        }
      }
    }

    let customName = menu.name;
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
                      <button key={opt.id} onClick={() => toggleOption(groupName, opt)} style={pillStyle(isSelected)}>
                        {opt.option_name}{priceText}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

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

        <button onClick={handleConfirm} style={{ width: '100%', padding: '16px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '1.1rem', fontWeight: '900', cursor: 'pointer', marginTop: 30, boxShadow: '0 8px 20px rgba(37, 99, 235, 0.3)' }}>
          เพิ่มลงตะกร้า • {calculatedOptionPrice.toLocaleString()} ฿
        </button>
      </div>
    </div>
  );
});

MenuOptionModal.displayName = 'MenuOptionModal';
