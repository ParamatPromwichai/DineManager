'use client';

import { useEffect, useState, useMemo, memo, Suspense, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, Utensils, Star, Plus, Minus, ShoppingCart, 
  ImageOff, X, CheckCircle2, Search, CheckSquare, ChevronUp, ChevronDown, Receipt
} from 'lucide-react';

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

type CartItem = Menu & { 
  cartItemId: string; 
  quantity: number;
  originalName: string;
};

type TableData = {
  id: number;
  name: string;
};

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

function DineInContent({ tableId }: { tableId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionToken = searchParams.get('session');

  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCartExpanded, setIsCartExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'popular' | 'rating' | 'price'>('all');
  const [selectedMenuForOption, setSelectedMenuForOption] = useState<Menu | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [tableData, setTableData] = useState<TableData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!sessionToken) {
      setErrorMsg('เซสชั่นสั่งอาหารไม่ถูกต้อง กรุณาสแกน QR Code ใหม่อีกครั้ง');
      setLoading(false);
      return;
    }

    Promise.all([
      fetch(`/api/dine-in/tables/${tableId}?session=${sessionToken}`).then(res => res.json()),
      fetch('/api/customer/menus').then(res => res.json())
    ]).then(([tableRes, menusRes]) => {
      if (!tableRes.valid) {
        setErrorMsg('เซสชั่นสั่งอาหารหมดอายุแล้ว กรุณาสแกน QR Code ใหม่ หรือติดต่อพนักงาน');
      } else {
        setTableData(tableRes.table);
        setMenus(menusRes);
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setErrorMsg('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      setLoading(false);
    });
  }, [tableId, sessionToken]);

  // Load cart from session storage (so it resets when browser closes)
  useEffect(() => {
    const savedCart = sessionStorage.getItem(`dinemanager_cart_${tableId}`);
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); } catch (e) {}
    }
    setIsLoaded(true);
  }, [tableId]);

  useEffect(() => {
    if (isLoaded) {
      sessionStorage.setItem(`dinemanager_cart_${tableId}`, JSON.stringify(cart));
    }
  }, [cart, isLoaded, tableId]);

  const subTotal = useMemo(() => cart.reduce((sum, i) => sum + i.price * i.quantity, 0), [cart]);

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

  async function handleConfirmOrder() {
    if (cart.length === 0) return;
    if (!confirm('ยืนยันการสั่งอาหารใช่หรือไม่?')) return;
    
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/dine-in/orders', { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          table_id: tableId, 
          session_token: sessionToken, 
          items: cart, 
          total_price: subTotal,
          payment_method: 'cod' // จ่ายเงินสด/ที่เคาน์เตอร์
        }) 
      });

      if (!res.ok) throw new Error('Failed to create order');
      
      alert('สั่งอาหารสำเร็จ รายการอาหารจะถูกส่งไปที่ห้องครัวครับ!');
      setCart([]);
      sessionStorage.removeItem(`dinemanager_cart_${tableId}`);
      router.push(`/dine-in/${tableId}/orders?session=${sessionToken}`);
    } catch (error) { 
      console.error(error); alert('เกิดข้อผิดพลาด กรุณาลองใหม่'); 
    } finally { setIsSubmitting(false); }
  }

  const filteredAndSortedMenus = useMemo(() => {
    let result = [...menus];
    if (searchQuery.trim() !== '') {
      result = result.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (activeFilter === 'popular') result.sort((a, b) => b.review_count - a.review_count);
    else if (activeFilter === 'rating') {
      result = result.filter(m => m.avg_rating >= 4.5);
      result.sort((a, b) => b.avg_rating - a.avg_rating);
    } else if (activeFilter === 'price') result.sort((a, b) => a.price - b.price);

    return result.sort((a, b) => {
      const aSoldOut = Number(a.is_sold_out) === 1 || String(a.is_sold_out).toLowerCase() === 'true';
      const bSoldOut = Number(b.is_sold_out) === 1 || String(b.is_sold_out).toLowerCase() === 'true';
      if (aSoldOut === bSoldOut) return 0;
      return aSoldOut ? 1 : -1;
    });
  }, [menus, searchQuery, activeFilter]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen bg-slate-50"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;
  }

  if (errorMsg || !tableData) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-slate-50 p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm border border-slate-100">
          <X size={64} className="text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-800 mb-2">ไม่สามารถสั่งอาหารได้</h2>
          <p className="text-slate-500 font-medium">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 20px 280px 20px', background: '#F4F8FF', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, gap: 10 }}>
        <h1 style={{ margin: 0, flex: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#1E3A8A', fontSize: '1.3rem', fontWeight: '900' }}>
          <Utensils size={24} color="#2563EB" /> โต๊ะ {tableData.name}
        </h1>
        <button 
          onClick={() => router.push(`/dine-in/${tableId}/orders?session=${sessionToken}`)}
          style={{ position: 'relative', background: '#ffffff', border: '1px solid #DCE8FF', color: '#2563EB', cursor: 'pointer', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(37,99,235,0.05)' }}
        >
          <Receipt size={22} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} color="#93C5FD" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="ค้นหาชื่ออาหาร..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '14px 14px 14px 42px', border: '1px solid #BFDBFE', borderRadius: '16px', outline: 'none', background: '#ffffff', fontSize: '0.95rem', boxSizing: 'border-box', color: '#1E3A8A' }}
          />
          {searchQuery && (
            <X size={16} color="#64748B" onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }} />
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 12, marginBottom: 20, scrollSnapType: 'x mandatory' }}>
        <button onClick={() => setActiveFilter('all')} style={{ padding: '10px 18px', borderRadius: '20px', border: activeFilter === 'all' ? '2px solid #2563EB' : '1px solid #DCE8FF', background: activeFilter === 'all' ? '#2563EB' : '#fff', color: activeFilter === 'all' ? '#fff' : '#475569', fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap', cursor: 'pointer', transition: '0.2s' }}>🍛 ทั้งหมด</button>
        <button onClick={() => setActiveFilter('popular')} style={{ padding: '10px 18px', borderRadius: '20px', border: activeFilter === 'popular' ? '2px solid #2563EB' : '1px solid #DCE8FF', background: activeFilter === 'popular' ? '#2563EB' : '#fff', color: activeFilter === 'popular' ? '#fff' : '#475569', fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap', cursor: 'pointer', transition: '0.2s' }}>🔥 ยอดฮิต</button>
      </div>

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
                    </div>
                  )}
                </div>

                <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: 4, color: isMenuSoldOut ? '#94a3b8' : '#1E3A8A' }}>{menu.name}</div>
                  
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
          <p style={{ margin: 0, fontWeight: 'bold' }}>ไม่พบรายการอาหารที่ตรงกับตัวกรอง</p>
        </div>
      )}

      {selectedMenuForOption && (
        <MenuOptionModal 
          menu={selectedMenuForOption}
          onClose={() => setSelectedMenuForOption(null)}
          onConfirm={handleConfirmAddToCart}
        />
      )}

      {cart.length > 0 && (
        <div style={{ position: 'fixed', bottom: 20, left: 15, right: 15, background: '#ffffff', borderRadius: 20, padding: '15px 20px', boxShadow: '0 10px 30px rgba(37, 99, 235, 0.2)', zIndex: 90, border: '1px solid #DCE8FF' }}>
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

          <button onClick={handleConfirmOrder} disabled={isSubmitting} style={{ width: '100%', padding: '12px', background: 'linear-gradient(90deg, #1D4ED8, #2563EB)', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '1.05em', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)', opacity: isSubmitting ? 0.7 : 1 }}>
            {isSubmitting ? 'กำลังสั่งอาหาร...' : 'สั่งอาหารเลย'}
          </button>
        </div>
      )}
    </div>
  );
}

const MenuOptionModal = memo(({ menu, onClose, onConfirm }: { menu: Menu, onClose: () => void, onConfirm: (item: CartItem) => void }) => {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, MenuOption[]>>({});
  const [optionNote, setOptionNote] = useState('');

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
            <input
              type="text"
              placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)..."
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

export default function DineInPage(props: { params: Promise<{ table_id: string }> }) {
  const params = use(props.params);
  
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen bg-slate-50"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>}>
      <DineInContent tableId={params.table_id} />
    </Suspense>
  );
}
