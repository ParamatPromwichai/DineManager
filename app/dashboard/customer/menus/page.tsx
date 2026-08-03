'use client';

import { useEffect, useState, useMemo, memo, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
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
type Category = {
  id: number;
  name: string;
  sort_order: number;
};

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
  category_id?: number;
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
  is_open?: boolean | number;
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

const fetcher = (url: string) => fetch(url).then(res => res.json());

// 🟢 เปลี่ยนชื่อฟังก์ชันเดิมเป็น AllMenusContent
function AllMenusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCartExpanded, setIsCartExpanded] = useState(false);
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [activeFilter, setActiveFilter] = useState<'all' | 'popular' | 'rating' | 'price'>('all');
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

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

  // 📜 Infinite Scroll States
  const [displayLimit, setDisplayLimit] = useState(12);
  const observerTarget = useRef<HTMLDivElement>(null);

  // 1. Fetch Data ด้วย SWR
  const { data: sysConfig } = useSWR('/api/sysconfig', fetcher);
  useEffect(() => {
    if (sysConfig) {
      setBaseDeliveryFee(sysConfig.delivery_fee || 0);
      setDeliveryFeePerKm(sysConfig.delivery_fee_per_km || 0);
    }
  }, [sysConfig]);

  const { data: menus = [], isLoading: isMenusLoading } = useSWR<Menu[]>('/api/customer/menus', fetcher, { revalidateOnFocus: true });
  const { data: categories = [], isLoading: isCategoriesLoading } = useSWR<Category[]>('/api/categories', fetcher, { revalidateOnFocus: false });
  const { data: homeData } = useSWR('/api/customer/home', fetcher, { revalidateOnFocus: true });
  const shopData: ShopStatus | null = homeData?.shop || null;

  const { data: profileData } = useSWR('/api/customer/profile', fetcher, { revalidateOnFocus: false });

  useEffect(() => {
    if (profileData) {
      if (profileData.phone) setPhone(profileData.phone);
      if (profileData.address) setAddress(profileData.address);
      if (profileData.latitude && profileData.longitude) {
        const userLoc = { lat: Number(profileData.latitude), lng: Number(profileData.longitude) };
        setLocation(userLoc);
        setTempLocation(userLoc);
      }
    }
  }, [profileData]);

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

    if (activeCategory !== 'all') {
      result = result.filter(m => m.category_id === activeCategory);
    }

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
  }, [menus, searchQuery, activeFilter, activeCategory]);

  // รีเซ็ต Limit เมื่อตัวกรองเปลี่ยน
  useEffect(() => {
    setDisplayLimit(12);
  }, [searchQuery, activeFilter, activeCategory]);

  // ตัดแบ่งเมนูที่จะแสดง
  const displayedMenus = useMemo(() => {
    return filteredAndSortedMenus.slice(0, displayLimit);
  }, [filteredAndSortedMenus, displayLimit]);

  // Intersection Observer สำหรับโหลดเพิ่ม
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayLimit(prev => prev + 12);
        }
      },
      { rootMargin: '400px' } // โหลดล่วงหน้า 400px ก่อนถึงขอบล่าง
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    const currentTarget = observerTarget.current;
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [displayedMenus.length]);

  return (
    <div className={`p-5 bg-blue-50 dark:bg-slate-900 font-sans transition-all duration-300 ${cart.length > 0 ? 'pb-[160px]' : 'pb-6'}`}>
      {/* Header & ปุ่มย้อนกลับ */}
      <div className="flex items-center mb-5 gap-2.5">
        <button 
          onClick={() => router.push('/dashboard/customer')} 
          className="flex items-center gap-1 bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-blue-700 dark:text-blue-300 font-bold cursor-pointer px-3.5 py-2 rounded-full text-[0.9rem] transition-colors"
        >
          <ArrowLeft size={16} /> กลับ
        </button>
        <h1 className="m-0 flex-1 text-center flex items-center justify-center gap-2 text-blue-900 dark:text-blue-50 text-[1.3rem] font-black">
          <Utensils size={24} className="text-blue-600 dark:text-blue-400" /> เมนูทั้งหมด
        </h1>
        <button onClick={() => router.push('/dashboard/customer/cart')} className="relative bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 text-blue-600 dark:text-blue-400 cursor-pointer p-2.5 rounded-full flex items-center justify-center shadow-sm transition-colors">
          <ShoppingCart size={22} />
          {cart.reduce((a, b) => a + b.quantity, 0) > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-[22px] h-[22px] flex items-center justify-center text-[0.75rem] font-bold border-2 border-white dark:border-slate-800 transition-colors">
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* ช่องค้นหา */}
      <div className="flex gap-2.5 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-300 dark:text-slate-400" />
          <input 
            type="text" 
            placeholder="ค้นหาชื่ออาหารที่คุณต้องการ..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-3.5 pl-11 border border-blue-200 dark:border-slate-700 rounded-2xl outline-none bg-white dark:bg-slate-800 text-[0.95rem] text-blue-900 dark:text-blue-50 shadow-sm placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
          />
          {searchQuery && (
            <X size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-slate-500 dark:text-slate-400" onClick={() => setSearchQuery('')} />
          )}
        </div>
      </div>

      {/* หมวดหมู่อาหาร (Custom UI Dropdown) */}
      {categories.length > 0 && (
        <div className="relative mb-4">
          <div
            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
            className="w-full p-3.5 bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 rounded-2xl text-[1rem] font-bold text-blue-900 dark:text-blue-100 cursor-pointer shadow-sm flex justify-between items-center transition-colors"
          >
            <span>
              {activeCategory === 'all' 
                ? '🍽️ ทุกหมวดหมู่' 
                : `📍 ${categories.find(c => c.id === activeCategory)?.name || 'ทุกหมวดหมู่'}`}
            </span>
            <ChevronDown size={20} className={`text-blue-500 dark:text-blue-400 transition-transform duration-300 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
          </div>

          {/* เมนูที่กางออกมา */}
          {isCategoryDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-lg z-[100] border border-blue-50 dark:border-slate-700 overflow-hidden transition-colors">
              <div
                onClick={() => { setActiveCategory('all'); setIsCategoryDropdownOpen(false); }}
                className={`p-3.5 cursor-pointer border-b border-slate-100 dark:border-slate-700 transition-colors ${
                  activeCategory === 'all' ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-slate-700' : 'text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800'
                }`}
              >
                🍽️ ทุกหมวดหมู่
              </div>
              {categories.map(cat => (
                <div
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setIsCategoryDropdownOpen(false); }}
                  className={`p-3.5 cursor-pointer border-b border-slate-100 dark:border-slate-700 transition-colors ${
                    activeCategory === cat.id ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-slate-700' : 'text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800'
                  }`}
                >
                  📍 {cat.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* แถบตัวกรอง */}
      <div className="flex gap-2.5 overflow-x-auto pb-3 mb-5 snap-x snap-mandatory">
        <button onClick={() => setActiveFilter('all')} className={`px-4 py-2.5 rounded-full font-bold text-[0.85rem] whitespace-nowrap cursor-pointer transition-colors border-2 snap-start shrink-0 ${
          activeFilter === 'all' ? 'bg-blue-600 border-blue-600 text-white dark:bg-blue-500 dark:border-blue-500' : 'bg-white dark:bg-slate-800 border-blue-100 dark:border-slate-700 text-slate-600 dark:text-slate-300'
        }`}>🍛 ทั้งหมด</button>
        <button onClick={() => setActiveFilter('popular')} className={`px-4 py-2.5 rounded-full font-bold text-[0.85rem] whitespace-nowrap cursor-pointer transition-colors border-2 snap-start shrink-0 ${
          activeFilter === 'popular' ? 'bg-blue-600 border-blue-600 text-white dark:bg-blue-500 dark:border-blue-500' : 'bg-white dark:bg-slate-800 border-blue-100 dark:border-slate-700 text-slate-600 dark:text-slate-300'
        }`}>🔥 ยอดฮิต (รีวิวเยอะ)</button>
        <button onClick={() => setActiveFilter('rating')} className={`px-4 py-2.5 rounded-full font-bold text-[0.85rem] whitespace-nowrap cursor-pointer transition-colors border-2 snap-start shrink-0 ${
          activeFilter === 'rating' ? 'bg-blue-600 border-blue-600 text-white dark:bg-blue-500 dark:border-blue-500' : 'bg-white dark:bg-slate-800 border-blue-100 dark:border-slate-700 text-slate-600 dark:text-slate-300'
        }`}>⭐ เรตติ้งสูง (4.5+)</button>
        <button onClick={() => setActiveFilter('price')} className={`px-4 py-2.5 rounded-full font-bold text-[0.85rem] whitespace-nowrap cursor-pointer transition-colors border-2 snap-start shrink-0 ${
          activeFilter === 'price' ? 'bg-blue-600 border-blue-600 text-white dark:bg-blue-500 dark:border-blue-500' : 'bg-white dark:bg-slate-800 border-blue-100 dark:border-slate-700 text-slate-600 dark:text-slate-300'
        }`}>💰 ราคาประหยัด</button>
      </div>

      {/* Grid เมนูอาหาร หรือ Skeleton ถ้ายังโหลดข้อมูลไม่เสร็จ */}
      {isMenusLoading && menus.length === 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4 items-stretch">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col border border-blue-100 dark:border-slate-700 h-full animate-pulse">
              <div className="h-[130px] bg-slate-200 dark:bg-slate-700 w-full shrink-0"></div>
              <div className="p-3 flex-1 flex flex-col gap-2">
                <div className="h-4 w-[80%] bg-slate-200 dark:bg-slate-700 rounded-md"></div>
                <div className="h-3 w-[50%] bg-slate-200 dark:bg-slate-700 rounded-md mb-2"></div>
                <div className="mt-auto flex justify-between items-center">
                  <div className="h-5 w-[40%] bg-slate-200 dark:bg-slate-700 rounded-md"></div>
                  <div className="w-[34px] h-[34px] rounded-full bg-slate-200 dark:bg-slate-700"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredAndSortedMenus.length > 0 ? (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4 items-stretch">
            {displayedMenus.map(menu => {
              const isMenuSoldOut = Number(menu.is_sold_out) === 1 || String(menu.is_sold_out).toLowerCase() === 'true';

              return (
                <div key={menu.id} onClick={() => router.push(`/dashboard/customer/menus/${menu.id}`)} className={`cursor-pointer bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col border border-blue-100 dark:border-slate-700 h-full transition-colors ${isMenuSoldOut ? 'opacity-60' : 'opacity-100'}`}>
                  <div className="h-[130px] bg-blue-50 dark:bg-slate-700 relative shrink-0 transition-colors">
                    {menu.image ? (
                      <img src={menu.image} alt={menu.name} loading="lazy" className="w-full h-full object-cover" /> 
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-blue-300 dark:text-slate-500">
                      <ImageOff size={24} className="mb-1" />
                      <span className="text-[0.75rem]">ไม่มีรูปภาพ</span>
                    </div>
                  )}
                </div>

                <div className="p-3 flex-1 flex flex-col">
                  <div className={`font-bold text-[0.95rem] mb-1 whitespace-nowrap overflow-hidden text-ellipsis ${isMenuSoldOut ? 'text-slate-400 dark:text-slate-500' : 'text-blue-900 dark:text-blue-50'}`}>{menu.name}</div>
                  <div className="text-[0.8rem] text-slate-500 dark:text-slate-400 mb-2 flex items-center">
                    {renderStars(Number(menu.avg_rating))} 
                    <span className="text-blue-300 dark:text-slate-500 ml-1 font-bold">({menu.review_count})</span>
                  </div>
                  
                  {menu.addon_option_ids && menu.addon_option_ids.length > 0 && (
                    <div className="mb-2">
                      <span className="text-[0.7rem] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-md font-bold border border-blue-200 dark:border-blue-800/50">
                        + มีตัวเลือกเสริม
                      </span>
                    </div>
                  )}
                  
                  <div className="mt-auto flex justify-between items-center">
                    <span className={`font-black text-[1.1rem] ${isMenuSoldOut ? 'text-slate-400 dark:text-slate-500' : 'text-blue-600 dark:text-blue-400'}`}>{Number(menu.price).toLocaleString()} ฿</span>
                    
                    {isMenuSoldOut ? (
                      <span className="bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-400 border-none rounded-2xl px-3 py-1.5 text-[0.75rem] font-bold">หมด</span>
                    ) : (
                      <button 
                        disabled={!!(shopData && !shopData.is_open)}
                        onClick={(e) => { e.stopPropagation(); setSelectedMenuForOption(menu); }} 
                        className={`w-[34px] h-[34px] rounded-full flex items-center justify-center transition-all border ${
                          (shopData && !shopData.is_open) 
                            ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-transparent cursor-not-allowed' 
                            : 'bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-slate-600 cursor-pointer hover:bg-blue-100 dark:hover:bg-slate-600'
                        }`}
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
          
          {/* Sentinel สำหรับโหลดเมนูเพิ่ม */}
          {displayLimit < filteredAndSortedMenus.length && (
            <div ref={observerTarget} className="w-full h-24 flex flex-col items-center justify-center mt-4">
              <div className="w-6 h-6 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin mb-2"></div>
              <span className="text-xs text-blue-500 dark:text-blue-400 font-bold">กำลังโหลดเพิ่ม...</span>
            </div>
          )}
        </>
      ) : (
        <div className="text-center p-12 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-blue-100 dark:border-slate-700 transition-colors">
          <ImageOff size={40} className="mb-2.5 mx-auto text-blue-300 dark:text-slate-500" />
          <p className="m-0 font-bold">ไม่พบรายการอาหารที่ตรงกับตัวกรอง</p>
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
        <div className="fixed bottom-[85px] left-4 right-4 bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-xl border border-blue-100 dark:border-slate-700 z-[90] transition-colors">
          <div className={`flex justify-between items-center ${isCartExpanded ? 'mb-4' : 'mb-2.5'}`}>
            <h4 className="m-0 text-[1.1rem] flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <ShoppingCart size={20} className="text-blue-600 dark:text-blue-400" /> ตะกร้า ({cart.reduce((a, b) => a + b.quantity, 0)} ชิ้น)
            </h4>
            <div className="flex items-center gap-4">
              <span className="font-black text-xl text-blue-600 dark:text-blue-400">{subTotal.toLocaleString()} ฿</span>
              <button onClick={() => setIsCartExpanded(!isCartExpanded)} className="bg-slate-100 dark:bg-slate-700 border-none rounded-full w-8 h-8 flex items-center justify-center cursor-pointer text-slate-500 dark:text-slate-300 transition-colors">
                {isCartExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </button>
            </div>
          </div>

          {isCartExpanded && (
            <div className="max-h-[160px] overflow-y-auto mb-4 border-b border-blue-50 dark:border-slate-700 pb-2.5 transition-colors">
              {cart.map(item => (
                <div key={item.cartItemId} className="flex justify-between items-start mb-3">
                  <div className="flex-1 pr-2.5">
                    <div className="font-bold text-[0.95rem] text-blue-800 dark:text-blue-200">{item.originalName}</div>
                    <div className="text-[0.8rem] text-slate-500 dark:text-slate-400 leading-snug">{item.name.replace(item.originalName, '').trim()}</div>
                    <div className="text-blue-600 dark:text-blue-400 font-bold text-[0.85rem]">{item.price.toLocaleString()} ฿</div>
                  </div>
                  <div className="flex items-center bg-blue-50 dark:bg-slate-700 border border-blue-100 dark:border-slate-600 rounded-full overflow-hidden transition-colors">
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

          <button disabled={!!(shopData && !shopData.is_open)} onClick={() => router.push('/dashboard/customer/cart')} className={`w-full p-3 rounded-2xl border-none text-[1.05rem] font-bold transition-all ${
            (shopData && !shopData.is_open) 
              ? 'bg-slate-400 dark:bg-slate-600 text-white cursor-not-allowed shadow-none' 
              : 'bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white cursor-pointer shadow-lg shadow-blue-600/30'
          }`}>
            {(shopData && !shopData.is_open) ? 'ร้านปิดให้บริการ' : 'ยืนยันและไปหน้าชำระเงิน'}
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
      <div className="px-5 pt-5 pb-[100px] min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
        <div className="animate-pulse flex flex-col gap-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-2">
            <div className="w-[80px] h-[36px] bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            <div className="h-[24px] w-[120px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            <div className="w-[45px] h-[45px] bg-slate-200 dark:bg-slate-800 rounded-full"></div>
          </div>
          
          {/* Search & Categories Skeleton */}
          <div className="flex flex-col gap-4">
            <div className="w-full h-[50px] bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
            <div className="flex gap-2.5 overflow-hidden">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="min-w-[90px] h-[40px] bg-slate-200 dark:bg-slate-800 rounded-full"></div>
              ))}
            </div>
          </div>
          
          {/* Vertical List Cards Skeleton */}
          <div className="flex flex-col gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex h-[110px] bg-white dark:bg-slate-800 rounded-3xl border border-blue-50 dark:border-slate-700 overflow-hidden">
                <div className="w-[120px] h-full bg-slate-200 dark:bg-slate-700"></div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="h-[18px] w-[70%] bg-slate-200 dark:bg-slate-700 rounded-lg mb-2"></div>
                    <div className="h-[14px] w-[40%] bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                  </div>
                  <div className="h-[20px] w-[30%] bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
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

  
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-end z-[1100]">
      <div className="bg-white dark:bg-slate-800 w-full max-w-[500px] rounded-t-[32px] p-6 max-h-[85vh] overflow-y-auto shadow-[0_-10px_25px_rgba(0,0,0,0.1)] transition-colors">

        <div className="flex justify-between items-center mb-6">
          <h2 className="m-0 text-[1.35rem] font-black text-blue-900 dark:text-blue-50">{menu.name}</h2>
          <button onClick={onClose} className="bg-blue-50 dark:bg-slate-700 border-none cursor-pointer text-blue-600 dark:text-blue-400 w-9 h-9 rounded-full flex items-center justify-center transition-colors">
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {Object.entries(groupedOptions).map(([groupName, options]) => {
            const isMultiple = Boolean(Number(options[0].is_multiple));
            return (
              <div key={groupName}>
                <h4 className="m-0 mb-3 text-[1rem] text-blue-800 dark:text-blue-200 flex items-center gap-1.5 font-bold">
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
                        className={`px-4 py-2.5 text-[0.9rem] rounded-full cursor-pointer border-2 transition-all ${
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

          <div>
            <h4 className="m-0 mb-3 text-[1rem] text-blue-800 dark:text-blue-200 flex items-center gap-1.5 font-bold">
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

        <button onClick={handleConfirm} className="w-full p-4 bg-blue-600 hover:bg-blue-700 text-white border-none rounded-2xl text-[1.1rem] font-black cursor-pointer mt-7 shadow-[0_8px_20px_rgba(37,99,235,0.3)] transition-colors">
          เพิ่มลงตะกร้า • {calculatedOptionPrice.toLocaleString()} ฿
        </button>
      </div>
    </div>
  );
});

MenuOptionModal.displayName = 'MenuOptionModal';
