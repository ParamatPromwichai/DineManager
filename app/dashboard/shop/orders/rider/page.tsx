'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { MapPin, Phone, User, Check, Truck, Clock, Camera, UploadCloud, X, ImageOff, ArrowLeft, RefreshCw, AlertCircle, CookingPot, ChevronDown, ChevronUp, Flame } from 'lucide-react';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then(res => res.json());

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type OrderItem = {
  menu_name: string;
  quantity: number;
};

type Order = {
  id: number;
  status: 'pending' | 'checking_slip' | 'cooking' | 'delivery' | 'done' | 'cancel';
  total_price: number;
  created_at: string;
  payment_method?: string;
  slip_image?: string | null;
  customer_name?: string;
  phone?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  order_type?: string;
  queue_count?: number;
  user_id?: string;
  items: OrderItem[];
};

export default function RiderOrdersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isShop = status === 'authenticated' && (session?.user as any)?.role === 'shop';

  const { data: fetchedOrders, error, mutate } = useSWR<Order[]>(
    isShop ? '/api/shop/orders' : null,
    fetcher,
    { refreshInterval: 3000 }
  );

  const { data: homeData } = useSWR(isShop ? '/api/customer/home' : null, fetcher);
  const shopData = homeData?.shop;

  const { data: sysconfig } = useSWR('/api/sysconfig', fetcher);

  const orders = fetchedOrders || [];

  // COD State
  const [codPaymentOrder, setCodPaymentOrder] = useState<Order | null>(null);
  const [codPaymentMethod, setCodPaymentMethod] = useState<'qr' | 'cash' | ''>('');
  const [codSlipImage, setCodSlipImage] = useState<string | null>(null);
  const paymentBottomRef = useRef<HTMLDivElement>(null);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'cod' | 'delivery' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({});

  // Delivery Photo State
  const [notifyDeliveryOrder, setNotifyDeliveryOrder] = useState<Order | null>(null);
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);
  const [isSendingPhoto, setIsSendingPhoto] = useState(false);

  useEffect(() => {
    if (codPaymentMethod === 'qr' && paymentBottomRef.current) {
      setTimeout(() => {
        paymentBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [codPaymentMethod]);

  const startCamera = async (mode: 'cod' | 'delivery') => {
    setCameraMode(mode);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบการอนุญาตใช้งานกล้อง');
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        if (cameraMode === 'cod') setCodSlipImage(dataUrl);
        if (cameraMode === 'delivery') setDeliveryPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const handleCodFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setCodSlipImage(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const handleDeliveryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setDeliveryPhoto(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const sendDeliveryPhoto = async () => {
    if (!notifyDeliveryOrder || !deliveryPhoto || !notifyDeliveryOrder.user_id) return;
    setIsSendingPhoto(true);
    try {
      await fetch(`/api/shop/chat/${notifyDeliveryOrder.user_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `[IMAGE]${deliveryPhoto}` }),
      });
      setNotifyDeliveryOrder(null);
      setDeliveryPhoto(null);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการส่งรูป');
    } finally {
      setIsSendingPhoto(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login/shop');
    } else if (status === 'authenticated') {
      if ((session.user as any)?.role !== 'shop') {
        router.replace('/login/shop?error=wrong_role');
      }
    }
  }, [status, session, router]);

  const updateStatus = async (orderId: number, newStatus: string, slipImage?: string) => {
    const optimisticData = orders.map(o => o.id === orderId ? { ...o, status: newStatus as any, ...(slipImage ? { slip_image: slipImage } : {}) } : o);
    mutate(optimisticData, false);
    await fetch('/api/shop/orders', {
      method: 'PUT',
      body: JSON.stringify({ id: orderId, status: newStatus, slip_image: slipImage }),
      headers: { 'Content-Type': 'application/json' }
    });
    mutate();
  };

  // จัดกลุ่มออเดอร์
  const deliveryOrders = useMemo(() => {
    return orders.filter(o => o.status === 'delivery' && o.order_type !== 'dine_in').sort((a, b) => a.id - b.id);
  }, [orders]);

  const kitchenOrders = useMemo(() => {
    return orders.filter(o => ['pending', 'checking_slip', 'cooking'].includes(o.status) && o.order_type !== 'dine_in').sort((a, b) => a.id - b.id);
  }, [orders]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  if (status !== 'authenticated' || (session?.user as any)?.role !== 'shop') {
    return null;
  }

  return (
    <div className="bg-slate-50 text-slate-900 font-sans min-h-screen pb-20">
      <div className="max-w-md mx-auto px-4 pt-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/dashboard/shop/orders" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-slate-800 mb-2 transition-colors">
              <ArrowLeft size={16} className="mr-1" /> กลับไปหน้าร้าน
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <Truck size={24} className="text-blue-600" /> จัดการออเดอร์ไรเดอร์
            </h1>
          </div>
          <button onClick={() => mutate()} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors shadow-sm">
            <RefreshCw size={18} className="text-slate-600" />
          </button>
        </div>

        {/* ออเดอร์ที่พร้อมจัดส่ง (Delivery) */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg text-emerald-700 flex items-center gap-1.5">
              <Check size={18} /> พร้อมจัดส่ง
            </h2>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold">
              {deliveryOrders.length} ออเดอร์
            </span>
          </div>

          <div className="space-y-4">
            {deliveryOrders.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 shadow-sm">
                <p className="text-slate-400 font-medium text-sm">ไม่มีออเดอร์ที่รอจัดส่ง</p>
              </div>
            ) : (
              deliveryOrders.map(order => {
                let isLate = false;
                let lateMinutesStr: string | null = null;
                let remainingMinsStr: string | null = null;

                if (shopData?.latitude && shopData?.longitude && order.latitude && order.longitude) {
                  const distance = calculateDistance(Number(shopData.latitude), Number(shopData.longitude), Number(order.latitude), Number(order.longitude));
                  const speed = sysconfig?.delivery_speed_kmh || 40;
                  const time = Math.ceil((distance / speed) * 60);
                  
                  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
                  const baseCookingTimePerItem = sysconfig?.base_cooking_time_per_item || 5;
                  const baseCookingTime = baseCookingTimePerItem * totalQuantity;
                  const queueDelayPerOrder = sysconfig?.queue_delay_per_order || 1;
                  const queueDelay = (order.queue_count || 0) * queueDelayPerOrder;
                  const expectedTotalTimeMin = baseCookingTime + queueDelay + time;
                  
                  const endTime = new Date(order.created_at).getTime() + (expectedTotalTimeMin * 60 * 1000);
                  const now = Date.now();
                  if (now > endTime) {
                    isLate = true;
                    const lateMins = Math.floor((now - endTime) / 60000);
                    lateMinutesStr = `${lateMins} นาที`;
                  } else {
                    const remainingMins = Math.ceil((endTime - now) / 60000);
                    remainingMinsStr = `${remainingMins} นาที`;
                  }
                }

                return (
                <div 
                  key={order.id} 
                  className={`bg-white rounded-2xl border ${isLate ? 'border-rose-300' : 'border-emerald-200'} shadow-sm overflow-hidden relative cursor-pointer`}
                  onClick={() => setExpandedOrders(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
                >
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${isLate ? 'bg-rose-500' : 'bg-emerald-400'}`}></div>
                  
                  <div className="p-4 pl-5">
                    {/* Always visible header */}
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <div className="text-lg font-black text-slate-900">#{order.id}</div>
                          {order.payment_method === 'qr' ? (
                            <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">โอนเงิน</span>
                          ) : (
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">เงินสด</span>
                          )}
                          {!isLate && remainingMinsStr && (
                            <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 flex items-center gap-1">
                              <Clock size={12} /> เหลือ {remainingMinsStr}
                            </span>
                          )}
                          {isLate && (
                            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 flex items-center gap-1 animate-pulse">
                              <Flame size={12} /> ล่าช้า {lateMinutesStr}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-xl font-black text-emerald-600">฿{order.total_price.toLocaleString()}</div>
                        <div className="text-slate-400">
                          {expandedOrders[order.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-slate-700">
                      <MapPin size={16} className="text-red-500 mt-0.5 shrink-0" /> 
                      {order.latitude && order.longitude ? (
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="font-bold text-sm leading-snug text-blue-600 hover:underline">
                          {order.address || 'ดูแผนที่'}
                        </a>
                      ) : (
                        <span className="font-bold text-sm leading-snug">{order.address || 'ไม่ระบุที่อยู่'}</span>
                      )}
                    </div>

                    {/* Expandable Content */}
                    {expandedOrders[order.id] && (
                      <div className="mt-4 pt-4 border-t border-slate-100 cursor-default" onClick={e => e.stopPropagation()}>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4 space-y-2">
                          <div className="flex items-center gap-2 text-slate-600 text-sm">
                            <User size={14} className="text-slate-400" /> <span className="font-medium">{order.customer_name || 'ลูกค้าทั่วไป'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600 text-sm">
                            <Phone size={14} className="text-slate-400" /> <span className="font-medium">{order.phone || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600 text-sm">
                            <Clock size={14} className="text-slate-400" /> <span className="font-medium">{new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="text-xs font-bold text-slate-500 mb-2">ตรวจสอบรายการอาหาร:</div>
                          <div className="space-y-1.5 bg-white border border-slate-100 rounded-xl p-3">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm text-slate-700">
                                <span>- {item.menu_name}</span>
                                <span className="font-bold">x{item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button 
                          onClick={() => {
                            if (order.slip_image) {
                              updateStatus(order.id, 'done');
                              setNotifyDeliveryOrder(order);
                            } else {
                              setCodPaymentOrder(order);
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black shadow-md shadow-emerald-200 transition-all active:scale-[0.98]"
                        >
                          <Check size={18} /> ส่งสำเร็จ (จบงาน)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>

        {/* ออเดอร์ที่อยู่ในครัว (Kitchen) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg text-orange-600 flex items-center gap-1.5">
              <CookingPot size={18} /> กำลังทำในครัว
            </h2>
            <span className="bg-orange-100 text-orange-800 text-xs px-2.5 py-1 rounded-full font-bold">
              {kitchenOrders.length} ออเดอร์
            </span>
          </div>
          
          <div className="space-y-3">
            {kitchenOrders.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 shadow-sm">
                <p className="text-slate-400 font-medium text-sm">ไม่มีออเดอร์ในครัว</p>
              </div>
            ) : (
              kitchenOrders.map(order => (
                <div 
                  key={order.id} 
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setExpandedOrders(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-base font-black text-slate-800">#{order.id}</span>
                        <span className="text-[10px] font-bold bg-orange-50 text-orange-600 px-2 py-0.5 rounded-md border border-orange-200">
                          {order.status === 'cooking' ? 'กำลังปรุง' : order.status === 'pending' ? 'รอรับออเดอร์' : 'รอตรวจสลิป'}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 text-slate-600 pr-2">
                        <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" /> 
                        {order.latitude && order.longitude ? (
                          <a href={`https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="font-bold text-sm leading-snug text-blue-600 hover:underline">
                            {order.address || 'ดูแผนที่'}
                          </a>
                        ) : (
                          <span className="font-bold text-sm leading-snug">{order.address || 'ไม่ระบุที่อยู่'}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-slate-400 mb-1">{order.items.reduce((acc, curr) => acc + curr.quantity, 0)} รายการ</div>
                    </div>
                  </div>
                  
                  {expandedOrders[order.id] && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="text-xs font-bold text-slate-500 mb-2">รายการอาหาร:</div>
                      <div className="space-y-1.5">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm text-slate-700">
                            <span>- {item.menu_name}</span>
                            <span className="font-bold">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 💰 Popup ชำระเงินปลายทาง (เหมือนของหน้าร้าน) */}
      {codPaymentOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[9999] px-4">
          <div className="bg-white rounded-3xl w-full max-w-sm flex flex-col overflow-hidden max-h-[85vh] shadow-2xl relative">
            {showCamera && (
              <div className="absolute inset-0 bg-black z-50 flex flex-col">
                <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
                <div className="p-4 bg-black flex justify-center gap-4">
                  <button onClick={stopCamera} className="px-6 py-3 bg-slate-800 text-white rounded-full font-bold">ยกเลิก</button>
                  <button onClick={capturePhoto} className="w-16 h-16 bg-white rounded-full border-4 border-slate-300"></button>
                </div>
              </div>
            )}
            
            <div className="p-6 overflow-y-auto flex-1 text-center">
              <h3 className="text-xl font-black mb-1">ชำระเงินก่อนส่งมอบ</h3>
              <p className="text-slate-500 mb-5 font-medium">Order #{codPaymentOrder.id} • <strong className="text-slate-900 text-lg">฿{codPaymentOrder.total_price.toLocaleString()}</strong></p>

              <div className="flex gap-2 mb-4">
                <label className={`flex-1 py-3 border-2 rounded-xl cursor-pointer font-bold transition-colors ${codPaymentMethod === 'cash' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                  <input type="radio" checked={codPaymentMethod === 'cash'} onChange={() => setCodPaymentMethod('cash')} className="hidden" />
                  เงินสด
                </label>
                <label className={`flex-1 py-3 border-2 rounded-xl cursor-pointer font-bold transition-colors ${codPaymentMethod === 'qr' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                  <input type="radio" checked={codPaymentMethod === 'qr'} onChange={() => setCodPaymentMethod('qr')} className="hidden" />
                  สแกน QR
                </label>
              </div>

              {codPaymentMethod === 'qr' && shopData && (
                <div className="mb-4 flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                  {shopData.account_number ? (
                    <img src={`https://promptpay.io/${shopData.account_number}/${codPaymentOrder.total_price}.png`} className="w-48 h-48 rounded-lg border-4 border-white shadow-sm" alt="PromptPay QR" />
                  ) : shopData.qr_image ? (
                    <img src={shopData.qr_image} className="w-48 h-48 object-cover rounded-lg border-4 border-white shadow-sm" alt="Shop QR" />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center bg-slate-200 rounded-lg"><ImageOff size={24} className="text-slate-400" /></div>
                  )}
                  <div className="mt-3 text-sm text-slate-600 font-medium">
                    {shopData.bank_name && <div>{shopData.bank_name}</div>}
                    {shopData.account_number && <div className="text-indigo-600 font-bold">{shopData.account_number}</div>}
                  </div>
                </div>
              )}

              {codPaymentMethod === 'qr' && (
                <div className="mb-4 text-left">
                  <p className="text-sm font-bold text-slate-700 mb-2">อัปโหลดหลักฐานการรับเงิน *</p>
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => startCamera('cod')} className="flex-1 flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors text-slate-600 font-bold text-sm">
                      <Camera size={20} /> ถ่ายรูป
                    </button>
                    <label className="flex-1 flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors text-slate-600 font-bold text-sm">
                      <input type="file" accept="image/*" onChange={handleCodFileChange} className="hidden" />
                      <UploadCloud size={20} /> รูปในเครื่อง
                    </label>
                  </div>
                  {codSlipImage && (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200">
                      <img src={codSlipImage} className="w-full h-40 object-contain bg-slate-100" alt="Slip Preview" />
                      <button onClick={() => setCodSlipImage(null)} className="absolute top-2 right-2 p-1.5 bg-slate-900/50 text-white rounded-full hover:bg-slate-900/70"><X size={14} /></button>
                    </div>
                  )}
                </div>
              )}
              <div ref={paymentBottomRef} />
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex gap-2">
              <button onClick={() => { setCodPaymentOrder(null); setCodPaymentMethod(''); setCodSlipImage(null); }} className="flex-1 py-3.5 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors">ยกเลิก</button>
              <button
                disabled={!codPaymentMethod || (codPaymentMethod === 'qr' && !codSlipImage)}
                onClick={() => {
                  updateStatus(codPaymentOrder.id, 'done', codSlipImage || undefined);
                  const completedOrder = codPaymentOrder;
                  setCodPaymentOrder(null);
                  setCodPaymentMethod('');
                  setCodSlipImage(null);
                  setNotifyDeliveryOrder(completedOrder);
                }}
                className={`flex-1 py-3.5 text-white rounded-xl font-bold shadow-md transition-all active:scale-[0.98] ${(!codPaymentMethod || (codPaymentMethod === 'qr' && !codSlipImage)) ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'}`}
              >
                ยืนยันจบงาน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📸 Popup ถ่ายรูปจัดส่งสำเร็จ (แจ้งลูกค้าในแชท) */}
      {notifyDeliveryOrder && !codPaymentOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[9999] px-4">
          <div className="bg-white rounded-3xl w-full max-w-sm flex flex-col overflow-hidden max-h-[85vh] shadow-2xl relative">
            
            {showCamera && (
              <div className="absolute inset-0 bg-black z-50 flex flex-col">
                <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
                <div className="p-4 bg-black flex justify-center gap-4">
                  <button onClick={stopCamera} className="px-6 py-3 bg-slate-800 text-white rounded-full font-bold">ยกเลิก</button>
                  <button onClick={capturePhoto} className="w-16 h-16 bg-white rounded-full border-4 border-slate-300"></button>
                </div>
              </div>
            )}

            <div className="p-6 overflow-y-auto flex-1 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} strokeWidth={3} />
              </div>
              <h3 className="text-xl font-black mb-1">จบงานจัดส่งสำเร็จ!</h3>
              <p className="text-slate-500 mb-6 font-medium text-sm">
                ออเดอร์ #{notifyDeliveryOrder.id} ถูกส่งเรียบร้อยแล้ว<br/>ต้องการถ่ายรูปส่งให้ลูกค้าทางแชทไหม? (เช่น รูปอาหารวางไว้ที่จุดรับ)
              </p>

              <div className="mb-4 text-left">
                <div className="flex gap-2 mb-3">
                  <button onClick={() => startCamera('delivery')} className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 rounded-xl cursor-pointer transition-colors text-slate-700 font-bold text-sm group">
                    <Camera size={24} className="text-slate-400 group-hover:text-blue-500 transition-colors" /> ถ่ายรูปจากกล้อง
                  </button>
                  <label className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 rounded-xl cursor-pointer transition-colors text-slate-700 font-bold text-sm group">
                    <input type="file" accept="image/*" onChange={handleDeliveryFileChange} className="hidden" />
                    <UploadCloud size={24} className="text-slate-400 group-hover:text-blue-500 transition-colors" /> เลือกรูปในเครื่อง
                  </label>
                </div>
                {deliveryPhoto && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 mt-4 p-2">
                    <img src={deliveryPhoto} className="w-full h-48 object-contain rounded-lg" alt="Delivery Preview" />
                    <button onClick={() => setDeliveryPhoto(null)} className="absolute top-4 right-4 p-2 bg-slate-900/50 text-white rounded-full hover:bg-slate-900/70 backdrop-blur-sm"><X size={16} /></button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
              <button 
                onClick={() => { setNotifyDeliveryOrder(null); setDeliveryPhoto(null); }} 
                className="flex-1 py-3.5 text-slate-500 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl font-bold transition-colors shadow-sm"
              >
                ไม่ส่ง ข้ามไป
              </button>
              <button
                disabled={!deliveryPhoto || isSendingPhoto}
                onClick={sendDeliveryPhoto}
                className={`flex-1 py-3.5 flex items-center justify-center gap-2 text-white rounded-xl font-bold shadow-md transition-all active:scale-[0.98] ${( !deliveryPhoto || isSendingPhoto ) ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isSendingPhoto ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> กำลังส่ง...</>
                ) : (
                  <>ส่งรูปในแชท</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}