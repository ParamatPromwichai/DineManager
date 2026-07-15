'use client';

import { useEffect, useState, useMemo, memo, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, Utensils, Star, Plus, Minus, ShoppingCart, 
  CreditCard, MapPin, ImageOff, X, Flame, Maximize2, 
  PlusCircle, PenLine, UploadCloud, CheckCircle2, Search, SlidersHorizontal, CheckSquare, Zap, Navigation
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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [shopData, setShopData] = useState<ShopStatus | null>(null);
  
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
      })
      .catch(err => console.error(err));
      
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
  }, []);

  // บันทึกข้อมูลลง LocalStorage เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    localStorage.setItem('dinemanager_cart', JSON.stringify(cart));
  }, [cart]);

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
    <div style={{ padding: '20px 20px 140px 20px', background: '#F4F8FF', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* Header & ปุ่มย้อนกลับ */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, gap: 10 }}>
        <button 
          onClick={() => router.push('/dashboard/customer')} 
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontWeight: 'bold', cursor: 'pointer', padding: '8px 14px', borderRadius: '20px', fontSize: '0.9rem' }}
        >
          <ArrowLeft size={16} /> กลับ
        </button>
        <h1 style={{ margin: 0, flex: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, paddingRight: 70, color: '#1E3A8A', fontSize: '1.3rem', fontWeight: '900' }}>
          <Utensils size={24} color="#2563EB" /> เมนูทั้งหมด
        </h1>
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
              <div key={menu.id} style={{ background: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.04)', display: 'flex', flexDirection: 'column', opacity: isMenuSoldOut ? 0.6 : 1, border: '1px solid #DCE8FF' }}>
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
                        onClick={() => setSelectedMenuForOption(menu)} 
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
            <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: '1.3rem', fontWeight: '900', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#1E3A8A' }}>
              <CreditCard size={24} color="#2563EB" /> ชำระเงิน
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <input type="tel" placeholder="เบอร์โทรศัพท์ติดต่อ *" value={phone} onChange={e => setPhone(e.target.value)} style={{ padding: 14, border: '1px solid #BFDBFE', borderRadius: 12, outline: 'none', fontSize: '1rem', background: '#F4F8FF', color: '#1E3A8A' }} />
              <textarea placeholder="ที่อยู่จัดส่งโดยละเอียด *" value={address} onChange={e => setAddress(e.target.value)} style={{ padding: 14, minHeight: 80, border: '1px solid #BFDBFE', borderRadius: 12, outline: 'none', fontSize: '1rem', background: '#F4F8FF', color: '#1E3A8A' }} />
            </div>

            {/* 🟢 เปลี่ยนปุ่มแบบเก่าเป็นปุ่มแบบ 2 ทางเลือก (พิกัดปัจจุบัน / ปักหมุดแผนที่แมนนวล) */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <button type="button" onClick={requestLocation} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', gap: 6, padding: '12px', fontSize: '0.85rem', background: '#EFF6FF', border: '1px dashed #2563EB', color: '#1D4ED8', borderRadius: 12, cursor: 'pointer', fontWeight: 'bold' }}>
                <Zap size={16} /> ใช้ตำแหน่งปัจจุบัน
              </button>
              <button
                type="button"
                onClick={() => {
                  setTempLocation(location || { lat: 17.1664, lng: 104.1486 });
                  setShowMapModal(true);
                }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', gap: 6, padding: '12px', fontSize: '0.85rem', background: location ? '#ECFDF5' : '#F8FAFC', border: `1px solid ${location ? '#10B981' : '#CBD5E1'}`, color: location ? '#059669' : '#475569', borderRadius: 12, cursor: 'pointer', fontWeight: 'bold' }}
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
                
                <div style={{ background: '#FFF3CD', color: '#856404', padding: '10px 15px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '15px', border: '1px solid #FFEEBA', width: '100%', textAlign: 'center' }}>
                  <strong>⚠️ หมายเหตุ:</strong> หากสแกนจ่ายเงินแล้ว ยังไม่ได้ยืนยัน คุณสามารถกลับมากดสั่งใหม่และแนบสลิปได้เลยครับ
                </div>
                {shopData?.account_number ? (
                  <img src={`https://promptpay.io/${shopData.account_number}/${total}.png`} style={{ width: '180px', borderRadius: 12, border: '4px solid #fff', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.15)' }} alt="PromptPay QR" />
                ) : shopData?.qr_image ? (
                  <img src={shopData.qr_image} style={{ width: '180px', borderRadius: 12, border: '4px solid #fff', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.15)' }} />
                ) : (
                  <div style={{ padding: 30, background: '#EBF1FF', color: '#93C5FD', borderRadius: 12 }}><ImageOff size={32} /></div>
                )}
                
                <div style={{ marginTop: 15, fontSize: '0.9rem', color: '#1E40AF', width: '100%', background: '#fff', padding: 12, borderRadius: 12, border: '1px solid #DCE8FF' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>ธนาคาร:</span> <strong>{shopData?.bank_name || '-'}</strong></div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>เลขบัญชี:</span> <strong style={{ color: '#2563EB', fontSize: '1rem' }}>{shopData?.account_number || '-'}</strong></div>
                   <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>ชื่อบัญชี:</span> <strong>{shopData?.account_name || '-'}</strong></div>
                </div>

                <label style={{ marginTop: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 15px', background: slipImage ? '#ECFDF5' : '#1E3A8A', color: slipImage ? '#059669' : '#fff', borderRadius: 12, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', width: '100%', border: slipImage ? '1px solid #10B981' : 'none' }}>
                  <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                  {slipImage ? <><CheckCircle2 size={18} /> เปลี่ยนรูปสลิป</> : <><UploadCloud size={18} /> อัปโหลดสลิปโอนเงิน *</>}
                </label>
                {slipImage && <img src={slipImage} style={{ marginTop: 10, height: '120px', borderRadius: 8, border: '1px solid #DCE8FF' }} />}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button disabled={isSubmitting} onClick={() => { setShowPayment(false); setSlipImage(null); }} style={{ flex: 1, padding: 15, background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 'bold' }}>ปิด</button>
              <button disabled={isSubmitting} onClick={handleConfirmOrder} style={{ flex: 2, padding: 15, background: isSubmitting ? '#93C5FD' : '#2563EB', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: '900', fontSize: '1.05rem', boxShadow: isSubmitting ? 'none' : '0 4px 10px rgba(37, 99, 235, 0.3)' }}>
                {isSubmitting ? 'กำลังสั่ง...' : 'ยืนยันสั่งอาหาร'}
              </button>
            </div>
            <div ref={paymentBottomRef} style={{ height: '20px' }}></div>
          </div>
        </div>
      )}

      {/* 🟢 🗺️ Popup หน้าต่างปักหมุดแผนที่เสริมเข้ามาท้ายสุด */}
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

// 🟢 สร้าง Component หน้าหลักตัวใหม่ ที่ครอบด้วย Suspense
export default function AllMenusPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', fontWeight: 'bold' }}>กำลังโหลดหน้าเมนูอาหาร...</div>}>
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
