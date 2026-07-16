'use client';

import { useEffect, useState, useMemo, memo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Star, ImageOff, MessageSquare, Plus, Minus, ShoppingCart, CheckSquare, CheckCircle2, X, ChevronUp, ChevronDown } from 'lucide-react';

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

type Review = {
  rating: number;
  comment: string;
  created_at: string;
  username: string;
  name: string;
};

type CartItem = Menu & { 
  cartItemId: string; 
  quantity: number;
  originalName: string;
};

// ⭐ ฟังก์ชันแสดงดาว
const renderStars = (rating: number) => {
  const stars = Math.round(rating);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={16} color={i < stars ? "#FFB800" : "#DBEAFE"} fill={i < stars ? "#FFB800" : "none"} />
      ))}
    </span>
  );
};

export default function MenuDetailPage() {
  const router = useRouter();
  const { id } = useParams();

  const [menu, setMenu] = useState<Menu | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMenuForOption, setSelectedMenuForOption] = useState<Menu | null>(null);
  const [isCartExpanded, setIsCartExpanded] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load cart
    const savedCart = localStorage.getItem('dinemanager_cart');
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); } catch (e) {}
    }

    // Load data
    Promise.all([
      fetch(`/api/customer/menus/${id}`).then(res => res.json()),
      fetch(`/api/customer/menus/${id}/reviews`).then(res => res.json())
    ]).then(([menuData, reviewsData]) => {
      setMenu(menuData);
      setReviews(reviewsData || []);
    }).catch(err => {
      console.error(err);
    }).finally(() => {
      setLoading(false);
      setIsLoaded(true);
    });
  }, [id]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('dinemanager_cart', JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

  function handleAddToCart() {
    if (menu) {
      const isMenuSoldOut = Number(menu.is_sold_out) === 1 || String(menu.is_sold_out).toLowerCase() === 'true';
      if (isMenuSoldOut) {
        alert('เมนูนี้หมดแล้วครับ');
        return;
      }
      setSelectedMenuForOption(menu);
    }
  }

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

  function removeFromCart(cartItemId: string) {
    setCart(prev => prev.map(i => (i.cartItemId === cartItemId ? { ...i, quantity: i.quantity - 1 } : i)).filter(i => i.quantity > 0));
  }

  function addToCartDirectly(cartItemId: string) {
    setCart(prev => prev.map(i => i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + 1 } : i));
  }

  const subTotal = useMemo(() => cart.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0), [cart]);

  if (loading) {
    return (
      <div style={{ padding: '20px', background: '#F4F8FF', minHeight: '100vh', fontFamily: 'sans-serif' }}>
        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          .skeleton-box { background-color: #e2e8f0; animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; border-radius: 16px; }
        `}</style>
        
        {/* Header Skeleton */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <div className="skeleton-box" style={{ height: 36, width: 70, borderRadius: 20 }}></div>
        </div>

        {/* Image Skeleton */}
        <div className="skeleton-box" style={{ height: 250, width: '100%', marginBottom: 20 }}></div>
        
        {/* Content Skeleton */}
        <div className="skeleton-box" style={{ height: 40, width: '70%', marginBottom: 15 }}></div>
        <div className="skeleton-box" style={{ height: 25, width: '40%', marginBottom: 25 }}></div>
        
        <div className="skeleton-box" style={{ height: 100, width: '100%', marginBottom: 15 }}></div>
        <div className="skeleton-box" style={{ height: 100, width: '100%', marginBottom: 15 }}></div>
      </div>
    );
  }

  if (!menu || (menu as any).message) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', marginTop: 50 }}>
        <h2>ไม่พบข้อมูลเมนูอาหาร</h2>
        <button onClick={() => router.back()} style={{ padding: '10px 20px', marginTop: 10 }}>กลับ</button>
      </div>
    );
  }

  const isMenuSoldOut = Number(menu.is_sold_out) === 1 || String(menu.is_sold_out).toLowerCase() === 'true';

  return (
    <div style={{ padding: '20px 20px 100px 20px', background: '#F4F8FF', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button 
          onClick={() => router.back()} 
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontWeight: 'bold', cursor: 'pointer', padding: '8px 14px', borderRadius: '20px', fontSize: '0.9rem' }}
        >
          <ArrowLeft size={16} /> กลับ
        </button>
        <h1 style={{ margin: 0, flex: 1, textAlign: 'center', color: '#1E3A8A', fontSize: '1.2rem', fontWeight: '900' }}>
          รายละเอียดเมนู
        </h1>
        <button 
          onClick={() => router.push('/dashboard/customer/cart')}
          style={{ position: 'relative', background: '#ffffff', border: '1px solid #DCE8FF', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#1E3A8A', boxShadow: '0 4px 10px rgba(37,99,235,0.08)' }}
        >
          <ShoppingCart size={22} />
          {isLoaded && cart.length > 0 && (
            <span style={{ position: 'absolute', top: -5, right: -5, background: '#EF4444', color: 'white', fontSize: '0.75rem', fontWeight: 'bold', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* Image */}
      <div 
        onClick={() => {
          if (menu.image) setShowImageModal(true);
        }}
        style={{ width: '100%', height: '260px', borderRadius: '24px', overflow: 'hidden', background: '#E2E8F0', position: 'relative', boxShadow: '0 10px 25px rgba(37,99,235,0.1)', cursor: menu.image ? 'pointer' : 'default' }}
      >
        {menu.image ? (
          <img src={menu.image} alt={menu.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
            <ImageOff size={40} />
          </div>
        )}
        {isMenuSoldOut && (
          <div style={{ position: 'absolute', top: 15, right: 15, background: 'rgba(239, 68, 68, 0.9)', color: 'white', padding: '6px 14px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem' }}>
            หมด
          </div>
        )}
      </div>

      {/* Details */}
      <div style={{ marginTop: 20, background: 'white', padding: 25, borderRadius: 24, boxShadow: '0 4px 15px rgba(37,99,235,0.05)', border: '1px solid #EBF1FF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', color: '#1E3A8A', fontWeight: '900' }}>{menu.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', color: '#64748B', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {renderStars(Number(menu.avg_rating))} 
                <span style={{ fontWeight: 'bold', color: '#1D4ED8' }}>{Number(menu.avg_rating).toFixed(1)}</span>
              </div>
              <span>({menu.review_count} รีวิว)</span>
              <span style={{ borderLeft: '1px solid #CBD5E1', paddingLeft: 8, color: '#94A3B8', fontWeight: 'bold' }}>ขายแล้ว {menu.order_count || 0}</span>
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#2563EB' }}>
            {Number(menu.price).toLocaleString()} ฿
          </div>
        </div>

        <button 
          onClick={handleAddToCart}
          disabled={isMenuSoldOut}
          style={{ width: '100%', marginTop: 25, padding: 16, background: isMenuSoldOut ? '#CBD5E1' : '#2563EB', color: 'white', border: 'none', borderRadius: 16, fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, cursor: isMenuSoldOut ? 'not-allowed' : 'pointer', boxShadow: isMenuSoldOut ? 'none' : '0 8px 20px rgba(37,99,235,0.25)' }}
        >
          <ShoppingCart size={20} />
          {isMenuSoldOut ? 'สินค้าหมด' : 'เพิ่มลงตะกร้า'}
        </button>
      </div>

      {/* Reviews Section */}
      <div style={{ marginTop: 25 }}>
        <h3 style={{ fontSize: '1.2rem', color: '#1E3A8A', fontWeight: '900', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 15 }}>
          <MessageSquare size={20} color="#2563EB" />
          รีวิวจากลูกค้า
        </h3>

        {reviews.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            {reviews.map((r, i) => (
              <div key={i} style={{ background: 'white', padding: 20, borderRadius: 20, border: '1px solid #EBF1FF', boxShadow: '0 2px 10px rgba(37,99,235,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EFF6FF', color: '#1D4ED8', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
                      {r.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#1E3A8A', fontSize: '0.95rem' }}>{r.username}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{new Date(r.created_at).toLocaleDateString('th-TH')}</div>
                    </div>
                  </div>
                  <div>
                    {renderStars(r.rating)}
                  </div>
                </div>
                {r.comment && (
                  <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', lineHeight: 1.5, background: '#F8FAFC', padding: 12, borderRadius: 12 }}>
                    "{r.comment}"
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: 'white', padding: 30, borderRadius: 20, textAlign: 'center', color: '#94A3B8', border: '1px dashed #CBD5E1' }}>
            <MessageSquare size={32} style={{ opacity: 0.5, marginBottom: 10 }} />
            <div>ยังไม่มีรีวิวสำหรับเมนูนี้</div>
          </div>
        )}
      </div>

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

      {/* --- Image Modal --- */}
      {showImageModal && menu.image && (
        <div 
          onClick={() => setShowImageModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 }}
        >
          <button 
            onClick={() => setShowImageModal(false)}
            style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255, 255, 255, 0.2)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}
          >
            <X size={24} />
          </button>
          <img src={menu.image} alt={menu.name} style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
        </div>
      )}
    </div>
  );
}

// 🚀 MenuOptionModal (Copied from menus/page.tsx for standalone usage)
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
                      <button key={opt.id} type="button" onClick={() => toggleOption(groupName, opt)} style={pillStyle(isSelected || false)}>
                        {opt.option_name} {priceText}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          
          <div>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'bold' }}>
              📝 บันทึกเพิ่มเติม (ถ้ามี)
            </h4>
            <input 
              type="text" 
              placeholder="เช่น ไม่ใส่ผัก, เผ็ดน้อย..." 
              value={optionNote}
              onChange={(e) => setOptionNote(e.target.value)}
              style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid #BFDBFE', outline: 'none', fontSize: '1rem', background: '#F4F8FF', color: '#1E3A8A', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F4F8FF', padding: '16px 20px', borderRadius: '20px', border: '1px solid #DCE8FF' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 'bold' }}>ราคารวม</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#2563EB' }}>{calculatedOptionPrice.toLocaleString()} ฿</div>
          </div>
          <button 
            onClick={handleConfirm}
            style={{ background: '#2563EB', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '16px', fontWeight: '900', fontSize: '1.05rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}
          >
            เพิ่มลงตะกร้า
          </button>
        </div>
      </div>
    </div>
  );
});
