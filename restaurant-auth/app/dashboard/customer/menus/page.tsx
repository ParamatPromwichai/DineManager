'use client';

import { useEffect, useState, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Utensils, Star, Plus, Minus, ShoppingCart, 
  CreditCard, MapPin, ImageOff, X, Flame, Maximize2, 
  PlusCircle, PenLine, UploadCloud, CheckCircle2, Search, SlidersHorizontal
} from 'lucide-react';

// --- Types ---
type Menu = {
  id: number;
  name: string;
  price: number;
  image?: string;      
  avg_rating: number;   
  review_count: number; 
  is_sold_out?: number | boolean | string; 
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

export default function AllMenusPage() {
  const router = useRouter();

  const [menus, setMenus] = useState<Menu[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [shopData, setShopData] = useState<ShopStatus | null>(null);
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'popular' | 'rating' | 'price'>('all');

  // Form & UI States
  const [showPayment, setShowPayment] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<Location | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'qr' | 'cod' | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slipImage, setSlipImage] = useState<string | null>(null);

  // Delivery States
  const [distance, setDistance] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);

  // States สำหรับ Popup
  const [selectedMenuForOption, setSelectedMenuForOption] = useState<Menu | null>(null);

  // 1. Fetch Data
  useEffect(() => {
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
      if (data?.latitude && data?.longitude) setLocation({ lat: data.latitude, lng: data.longitude });
    }).catch(err => console.error(err));
  }, []);

  // 🚚 คำนวณค่าจัดส่ง
  useEffect(() => {
    if (location?.lat && location?.lng && shopData?.latitude && shopData?.longitude) {
      const dist = calculateDistance(location.lat, location.lng, Number(shopData.latitude), Number(shopData.longitude));
      setDistance(dist);
      let fee = 10;
      if (dist > 2) fee += Math.ceil(dist - 2) * 5;
      setDeliveryFee(fee);
    } else {
      setDeliveryFee(0);
      setDistance(0);
    }
  }, [location, shopData]);

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
      pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => alert('กรุณาอนุญาตการเข้าถึงตำแหน่ง')
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
    } catch (error) { 
      console.error(error); alert('เกิดข้อผิดพลาด กรุณาลองใหม่'); 
    } finally { setIsSubmitting(false); }
  }

  // 🔍 กรอง ค้นหา และจัดเรียงเมนู
  const filteredAndSortedMenus = useMemo(() => {
    let result = [...menus];

    // 1. ค้นหาตามชื่อ
    if (searchQuery.trim() !== '') {
      result = result.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // 2. คัดกรองตามเงื่อนไข Tab ที่เลือก
    if (activeFilter === 'popular') {
      // ยอดฮิต: เรียงตามรีวิวเยอะสุด
      result.sort((a, b) => b.review_count - a.review_count);
    } else if (activeFilter === 'rating') {
      // เรตติ้งดี: เอาเฉพาะ 4.5 ดาวขึ้นไป
      result = result.filter(m => m.avg_rating >= 4.5);
      result.sort((a, b) => b.avg_rating - a.avg_rating);
    } else if (activeFilter === 'price') {
      // ราคาประหยัด: เรียงจากถูกไปแพง
      result.sort((a, b) => a.price - b.price);
    }

    // 3. กฎเหล็ก: ดันเมนูที่หมด (Sold Out) ไปไว้ท้ายสุดเสมอ ไม่ว่าจะกรองอะไรอยู่ก็ตาม
    return result.sort((a, b) => {
      const aSoldOut = Number(a.is_sold_out) === 1 || String(a.is_sold_out).toLowerCase() === 'true';
      const bSoldOut = Number(b.is_sold_out) === 1 || String(b.is_sold_out).toLowerCase() === 'true';
      if (aSoldOut === bSoldOut) return 0;
      return aSoldOut ? 1 : -1;
    });
  }, [menus, searchQuery, activeFilter]);

  return (
    <div style={{ padding: '20px 20px 140px 20px', background: '#F4F8FF', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* 🌟 Header & ปุ่มย้อนกลับ */}
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

      {/* 🔍 ช่องค้นหาอัจฉริยะ (Search Bar) */}
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

      {/* 🧭 แถบตัวกรองดีไซน์ Horizontal Slide */}
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 12, marginBottom: 20, scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
        <button 
          onClick={() => setActiveFilter('all')} 
          style={{ padding: '10px 18px', borderRadius: '20px', border: activeFilter === 'all' ? '2px solid #2563EB' : '1px solid #DCE8FF', background: activeFilter === 'all' ? '#2563EB' : '#fff', color: activeFilter === 'all' ? '#fff' : '#475569', fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap', cursor: 'pointer', transition: '0.2s' }}
        >
          🍛 ทั้งหมด
        </button>
        <button 
          onClick={() => setActiveFilter('popular')} 
          style={{ padding: '10px 18px', borderRadius: '20px', border: activeFilter === 'popular' ? '2px solid #2563EB' : '1px solid #DCE8FF', background: activeFilter === 'popular' ? '#2563EB' : '#fff', color: activeFilter === 'popular' ? '#fff' : '#475569', fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap', cursor: 'pointer', transition: '0.2s' }}
        >
          🔥 ยอดฮิต (รีวิวเยอะ)
        </button>
        <button 
          onClick={() => setActiveFilter('rating')} 
          style={{ padding: '10px 18px', borderRadius: '20px', border: activeFilter === 'rating' ? '2px solid #2563EB' : '1px solid #DCE8FF', background: activeFilter === 'rating' ? '#2563EB' : '#fff', color: activeFilter === 'rating' ? '#fff' : '#475569', fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap', cursor: 'pointer', transition: '0.2s' }}
        >
          ⭐ เรตติ้งสูง (4.5+)
        </button>
        <button 
          onClick={() => setActiveFilter('price')} 
          style={{ padding: '10px 18px', borderRadius: '20px', border: activeFilter === 'price' ? '2px solid #2563EB' : '1px solid #DCE8FF', background: activeFilter === 'price' ? '#2563EB' : '#fff', color: activeFilter === 'price' ? '#fff' : '#475569', fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap', cursor: 'pointer', transition: '0.2s' }}
        >
          💰 ราคาประหยัด
        </button>
      </div>

      {/* --- Grid เมนูอาหาร --- */}
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
                  
                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: isMenuSoldOut ? '#94a3b8' : '#2563EB', fontWeight: '900', fontSize: '1.1rem' }}>{Number(menu.price).toLocaleString()} ฿</span>
                    
                    {isMenuSoldOut ? (
                      <span style={{ background: '#F1F5F9', color: '#94A3B8', border: 'none', borderRadius: '16px', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        หมด
                      </span>
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
                  <button onClick={() => removeFromCart(item.cartItemId)} style={{ background:'transparent', border:'none', padding: '6px 12px', cursor:'pointer', color:'#EF4444', display: 'flex', alignItems: 'center' }}>
                    <Minus size={14} strokeWidth={3} />
                  </button>
                  <span style={{ fontSize: '0.95rem', fontWeight: 'bold', width: '20px', textAlign: 'center', color: '#1E3A8A' }}>{item.quantity}</span>
                  <button onClick={() => addToCartDirectly(item.cartItemId)} style={{ background:'transparent', border:'none', padding: '6px 12px', cursor:'pointer', color: '#2563EB', display: 'flex', alignItems: 'center' }}>
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

            <button onClick={requestLocation} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20, padding: '12px', fontSize: '0.95rem', width: '100%', background: location ? '#ECFDF5' : '#EFF6FF', border: `1px dashed ${location ? '#10B981' : '#2563EB'}`, color: location ? '#059669' : '#1D4ED8', borderRadius: 12, cursor: 'pointer', fontWeight: 'bold' }}>
              <MapPin size={18} /> {location ? '✅ ปักหมุดพิกัดแล้ว' : '📍 แนบพิกัดเพื่อคำนวณค่าส่ง'}
            </button>

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
                {shopData?.qr_image ? (
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
          </div>
        </div>
      )}
    </div>
  );
}

// 🚀 MenuOptionModal (ปรับธีมน้ำเงิน-ขาว)
const MenuOptionModal = memo(({ menu, onClose, onConfirm }: { menu: Menu, onClose: () => void, onConfirm: (item: CartItem) => void }) => {
  const [optionSpicy, setOptionSpicy] = useState('ปกติ'); 
  const [optionSize, setOptionSize] = useState('ธรรมดา');
  const [optionAddons, setOptionAddons] = useState<string[]>([]);
  const [optionNote, setOptionNote] = useState('');

  const calculatedOptionPrice = useMemo(() => {
    let price = Number(menu.price);
    if (optionSize === 'พิเศษ') price += 10;
    if (optionAddons.includes('ไข่ดาว')) price += 10;
    if (optionAddons.includes('ไข่เจียว')) price += 15;
    return Math.round(price); 
  }, [menu.price, optionSize, optionAddons]);

  function toggleAddon(addon: string) {
    setOptionAddons(prev => prev.includes(addon) ? prev.filter(a => a !== addon) : [...prev, addon]);
  }

  function handleConfirm() {
    let addonsText = optionAddons.length > 0 ? ` +${optionAddons.join('+')}` : '';
    let sizeText = optionSize === 'พิเศษ' ? '(พิเศษ)' : '';
    let spicyText = `[เผ็ด${optionSpicy}]`;
    let noteText = optionNote ? ` *${optionNote}*` : '';
    
    const customName = `${menu.name} ${sizeText} ${spicyText}${addonsText}${noteText}`.trim();
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
          {/* ความเผ็ด */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'bold' }}>
              <Flame size={18} color="#2563EB" /> ระดับความเผ็ด <span style={{ color: '#EF4444' }}>*</span>
            </h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['ไม่ใส่พริก', 'น้อย', 'ปกติ', 'มาก'].map(level => (
                <button key={level} onClick={() => setOptionSpicy(level)} style={pillStyle(optionSpicy === level)}>{level}</button>
              ))}
            </div>
          </div>

          {/* ขนาด */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'bold' }}>
              <Maximize2 size={18} color="#2563EB" /> เลือกขนาด
            </h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setOptionSize('ธรรมดา')} style={pillStyle(optionSize === 'ธรรมดา')}>ธรรมดา</button>
              <button onClick={() => setOptionSize('พิเศษ')} style={pillStyle(optionSize === 'พิเศษ')}>พิเศษ (+10 ฿)</button>
            </div>
          </div>

          {/* ท็อปปิ้ง */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'bold' }}>
              <PlusCircle size={18} color="#2563EB" /> เพิ่มท็อปปิ้ง
            </h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => toggleAddon('ไข่ดาว')} style={pillStyle(optionAddons.includes('ไข่ดาว'))}>+ ไข่ดาว (+10 ฿)</button>
              <button onClick={() => toggleAddon('ไข่เจียว')} style={pillStyle(optionAddons.includes('ไข่เจียว'))}>+ ไข่เจียว (+15 ฿)</button>
            </div>
          </div>

          {/* หมายเหตุ */}
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