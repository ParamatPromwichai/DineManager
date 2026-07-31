'use client';

import { useEffect, useState, useMemo, memo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Star, ImageOff, MessageSquare, Plus, Minus, ShoppingCart, CheckSquare, CheckCircle2, X, ChevronUp, ChevronDown, CornerDownRight, Loader2 } from 'lucide-react';

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
  shop_reply?: string;
  is_edited?: boolean | number;
  is_shop_reply_edited?: boolean | number;
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
  const [shopData, setShopData] = useState<any>(null);
  
  const [page, setPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
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
      fetch(`/api/customer/menus/${id}/reviews?page=1`).then(res => res.json()),
      fetch('/api/customer/home').then(res => res.json())
    ]).then(([menuData, reviewsData, homeData]) => {
      setMenu(menuData);
      setReviews(reviewsData.reviews || []);
      setHasMoreReviews(reviewsData.hasMore || false);
      if (homeData?.shop) setShopData(homeData.shop);
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

  const loadMoreReviews = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/customer/menus/${id}/reviews?page=${nextPage}`);
      const data = await res.json();
      setReviews(prev => [...prev, ...(data.reviews || [])]);
      setHasMoreReviews(data.hasMore);
      setPage(nextPage);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMore(false);
    }
  };

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
      <div className="p-5 bg-blue-50 dark:bg-slate-900 min-h-screen font-sans transition-colors">
        <div className="animate-pulse">
          {/* Header Skeleton */}
          <div className="flex items-center mb-5">
            <div className="h-9 w-[70px] rounded-full bg-slate-200 dark:bg-slate-800"></div>
          </div>

          {/* Image Skeleton */}
          <div className="h-[250px] w-full mb-5 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
          
          {/* Content Skeleton */}
          <div className="h-10 w-[70%] mb-4 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
          <div className="h-6 w-[40%] mb-6 rounded-lg bg-slate-200 dark:bg-slate-800"></div>
          
          <div className="h-[100px] w-full mb-4 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
          <div className="h-[100px] w-full mb-4 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
        </div>
      </div>
    );
  }

  if (!menu || (menu as any).message) {
    return (
      <div className="p-5 text-center mt-12 text-slate-600 dark:text-slate-400">
        <h2 className="text-blue-900 dark:text-blue-100">ไม่พบข้อมูลเมนูอาหาร</h2>
        <button onClick={() => router.back()} className="px-5 py-2.5 mt-2.5 bg-blue-100 dark:bg-slate-800 text-blue-700 dark:text-blue-300 rounded-full font-bold transition-colors hover:bg-blue-200 dark:hover:bg-slate-700">กลับ</button>
      </div>
    );
  }

  const isMenuSoldOut = Number(menu.is_sold_out) === 1 || String(menu.is_sold_out).toLowerCase() === 'true';

  return (
    <div className="bg-blue-50 dark:bg-slate-900 font-sans pb-6 transition-colors">
      <div className="max-w-5xl mx-auto p-5 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 gap-2.5">
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-1 bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-blue-700 dark:text-blue-300 font-bold cursor-pointer px-3.5 py-2 rounded-full text-[0.9rem] transition-colors hover:bg-blue-100 dark:hover:bg-slate-700"
          >
            <ArrowLeft size={16} /> กลับ
          </button>
          <h1 className="m-0 flex-1 text-center text-blue-900 dark:text-blue-50 text-[1.2rem] font-black">
            รายละเอียดเมนู
          </h1>
          <button 
            onClick={() => router.push('/dashboard/customer/cart')}
            className="relative bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-full w-11 h-11 flex items-center justify-center cursor-pointer text-blue-900 dark:text-blue-100 shadow-sm transition-colors hover:bg-blue-50 dark:hover:bg-slate-700"
          >
            <ShoppingCart size={22} />
            {isLoaded && cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[0.75rem] font-bold w-[22px] h-[22px] rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 transition-colors">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </span>
            )}
          </button>
        </div>

        <div className="md:grid md:grid-cols-2 md:gap-10 md:items-start">
          {/* Left / Top: Image */}
          <div 
            onClick={() => {
              if (menu.image) setShowImageModal(true);
            }}
            className={`w-full h-[260px] md:h-[400px] rounded-3xl overflow-hidden bg-slate-200 dark:bg-slate-700 relative shadow-lg transition-transform hover:scale-[1.01] ${menu.image ? 'cursor-pointer' : 'cursor-default'}`}
          >
            {menu.image ? (
              <img src={menu.image} alt={menu.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                <ImageOff size={40} />
              </div>
            )}
            {isMenuSoldOut && (
              <div className="absolute top-4 right-4 bg-red-500/90 dark:bg-red-600/90 text-white px-3.5 py-1.5 rounded-full font-bold text-[0.85rem] backdrop-blur-sm shadow-md">
                หมด
              </div>
            )}
          </div>

          {/* Right / Bottom: Details & Reviews */}
          <div className="mt-5 md:mt-0 flex flex-col gap-6">
            
            {/* Details Box */}
            <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-blue-50 dark:border-slate-700 transition-colors">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h2 className="m-0 mb-2 text-[1.3rem] text-blue-900 dark:text-blue-50 font-black">{menu.name}</h2>
                  <div className="flex items-center gap-2 text-[0.9rem] text-slate-500 dark:text-slate-400 flex-wrap">
                    <div className="flex items-center gap-1">
                      {renderStars(Number(menu.avg_rating))} 
                      <span className="font-bold text-blue-700 dark:text-blue-400">{Number(menu.avg_rating).toFixed(1)}</span>
                    </div>
                    <span>({menu.review_count} รีวิว)</span>
                    <span className="border-l border-slate-300 dark:border-slate-600 pl-2 text-slate-400 dark:text-slate-500 font-bold">ขายแล้ว {menu.order_count || 0}</span>
                  </div>
                </div>
                <div className="text-[1.4rem] font-black text-blue-600 dark:text-blue-400 whitespace-nowrap">
                  {Number(menu.price).toLocaleString()} ฿
                </div>
              </div>

              <button 
                onClick={handleAddToCart}
                disabled={isMenuSoldOut || (shopData && !shopData.is_open)}
                className={`w-full mt-6 p-4 rounded-2xl text-[1.1rem] font-bold flex justify-center items-center gap-2.5 transition-all ${
                  (isMenuSoldOut || (shopData && !shopData.is_open)) 
                    ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-[0_8px_20px_rgba(37,99,235,0.25)]'
                }`}
              >
                <ShoppingCart size={20} />
                {isMenuSoldOut ? 'สินค้าหมด' : ((shopData && !shopData.is_open) ? 'ร้านปิดให้บริการ' : 'เพิ่มลงตะกร้า')}
              </button>
            </div>

            {/* Reviews Section */}
            <div>
              <h3 className="text-[1.2rem] text-blue-900 dark:text-blue-100 font-black flex items-center gap-2 mb-4 transition-colors">
                <MessageSquare size={20} className="text-blue-600 dark:text-blue-400" />
                รีวิวจากลูกค้า
              </h3>

              {reviews.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {reviews.map((r, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-blue-50 dark:border-slate-700 shadow-sm transition-colors">
                      <div className="flex justify-between mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-slate-700 text-blue-700 dark:text-blue-300 flex justify-center items-center font-bold transition-colors">
                            {r.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-blue-900 dark:text-blue-100 text-[0.95rem]">{r.username}</div>
                            <div className="text-[0.75rem] text-slate-400 dark:text-slate-500">
                              {new Date(r.created_at).toLocaleDateString('th-TH')}
                              {Boolean(r.is_edited) && <span className="ml-1 text-slate-400 italic">(แก้ไขแล้ว)</span>}
                            </div>
                          </div>
                        </div>
                        <div>
                          {renderStars(r.rating)}
                        </div>
                      </div>
                      {r.comment && (
                        <p className="m-0 text-slate-600 dark:text-slate-300 text-[0.95rem] leading-relaxed bg-slate-50 dark:bg-slate-700 p-3 rounded-2xl transition-colors">
                          "{r.comment}"
                        </p>
                      )}
                      
                      {r.shop_reply && (
                        <div className="mt-3 bg-blue-50/50 dark:bg-slate-700/50 border border-blue-100 dark:border-slate-600 p-3 rounded-2xl flex gap-2">
                          <CornerDownRight size={16} className="text-blue-400 dark:text-blue-500 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-0.5">
                              ตอบกลับจากร้านค้า:
                              {Boolean(r.is_shop_reply_edited) && <span className="ml-1 text-[9px] text-blue-400 font-normal italic">(แก้ไขแล้ว)</span>}
                            </div>
                            <p className="m-0 text-slate-700 dark:text-slate-300 text-[0.85rem] font-semibold">{r.shop_reply}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {hasMoreReviews && (
                    <button 
                      onClick={loadMoreReviews} 
                      disabled={loadingMore}
                      className="w-full mt-2 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingMore ? <Loader2 className="animate-spin" size={20} /> : 'ดูรีวิวเพิ่มเติม'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-300 dark:border-slate-600 transition-colors">
                  <MessageSquare size={32} className="opacity-50 mb-2.5 mx-auto" />
                  <div>ยังไม่มีรีวิวสำหรับเมนูนี้</div>
                </div>
              )}
            </div>
          </div>
        </div>
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
        <div className="fixed bottom-[85px] left-4 right-4 mx-auto max-w-[800px] bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-xl border border-blue-100 dark:border-slate-700 z-[90] transition-colors">
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

      {/* --- Image Modal --- */}
      {showImageModal && menu.image && (
        <div 
          onClick={() => setShowImageModal(false)}
          className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm flex justify-center items-center z-[1000] p-2.5 transition-opacity"
        >
          <button 
            onClick={() => setShowImageModal(false)}
            className="absolute top-5 right-5 bg-white/20 border-none rounded-full w-10 h-10 flex items-center justify-center text-white cursor-pointer z-[1001] hover:bg-white/30 transition-colors"
          >
            <X size={24} />
          </button>
          <img src={menu.image} alt={menu.name} className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl shadow-2xl" />
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
                        type="button" 
                        onClick={() => toggleOption(groupName, opt)} 
                        className={`px-4 py-2.5 text-[0.9rem] rounded-full cursor-pointer border-2 transition-all ${
                          isSelected 
                            ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold' 
                            : 'border-blue-100 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-normal'
                        }`}
                      >
                        {opt.option_name} {priceText}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          
          <div>
            <h4 className="m-0 mb-3 text-[1rem] text-blue-800 dark:text-blue-200 flex items-center gap-1.5 font-bold">
              📝 บันทึกเพิ่มเติม (ถ้ามี)
            </h4>
            <input 
              type="text" 
              placeholder="เช่น ไม่ใส่ผัก, เผ็ดน้อย..." 
              value={optionNote}
              onChange={(e) => setOptionNote(e.target.value)}
              className="w-full p-3.5 rounded-2xl border border-blue-200 dark:border-slate-600 outline-none text-[1rem] bg-blue-50 dark:bg-slate-700 text-blue-900 dark:text-blue-50 placeholder-slate-400 dark:placeholder-slate-400 transition-colors"
            />
          </div>
        </div>

        <div className="mt-7 flex justify-between items-center bg-blue-50 dark:bg-slate-700/50 p-4 rounded-2xl border border-blue-100 dark:border-slate-600 transition-colors">
          <div>
            <div className="text-[0.85rem] text-slate-500 dark:text-slate-400 font-bold">ราคารวม</div>
            <div className="text-[1.6rem] font-black text-blue-600 dark:text-blue-400">{calculatedOptionPrice.toLocaleString()} ฿</div>
          </div>
          <button 
            onClick={handleConfirm}
            className="bg-blue-600 hover:bg-blue-700 text-white border-none py-3.5 px-7 rounded-2xl font-black text-[1.05rem] cursor-pointer shadow-[0_4px_12px_rgba(37,99,235,0.3)] transition-colors"
          >
            เพิ่มลงตะกร้า
          </button>
        </div>
      </div>
    </div>
  );
});
