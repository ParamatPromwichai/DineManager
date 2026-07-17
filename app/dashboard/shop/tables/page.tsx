'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation'; 
import { useSession } from 'next-auth/react'; // ➕ 1. นำเข้า useSession
import { Plus, Edit2, Trash2, QrCode, X, Camera, UploadCloud, Users, Utensils, LayoutGrid } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

// --- Type Definitions ---
type Table = {
  id: number;
  name: string;
  capacity: number;
  is_occupied: boolean; 
  session_token?: string;
};

type Reservation = {
  id: number;
  customer_name: string;
  reservation_time: string;
  table_id: number;
};

type ModalState = {
  isOpen: boolean;
  type: 'booking_clear' | 'manual_clear' | 'occupy'; 
  tableId: number;
  tableName: string;
  bookingId?: number;
  customerName?: string;
  sessionToken?: string;
} | null;

type ManageModalState = {
  isOpen: boolean;
  type: 'add' | 'edit' | 'delete';
  tableId?: number;
  name: string;
  capacity: number;
} | null;

export default function ShopTableManager() {
  const router = useRouter(); 
  
  // 🚨 2. เรียกใช้งาน Session
  const { data: session, status } = useSession();

  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [modal, setModal] = useState<ModalState>(null);
  const [manageModal, setManageModal] = useState<ManageModalState>(null);
  const [qrModal, setQrModal] = useState<{ isOpen: boolean; table: Table | null }>({ isOpen: false, table: null });
  const [shopData, setShopData] = useState<any>(null);
  const [billData, setBillData] = useState<{ total: number, items: any[], loading: boolean } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'qr'>('cash');
  
  const [codSlipImage, setCodSlipImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const paymentBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paymentMethod === 'qr' && paymentBottomRef.current) {
      setTimeout(() => {
        paymentBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [paymentMethod]);

  const startCamera = async () => {
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
        setCodSlipImage(canvas.toDataURL('image/jpeg', 0.8));
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
  // 🛡️ 3. ตรวจสอบสิทธิ์ผ่าน NextAuth
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login/shop'); // ไม่มีสิทธิ์ เตะกลับหน้าล็อกอินร้านค้า
    } else if (status === 'authenticated') {
      if ((session.user as any)?.role !== 'shop') {
        router.replace('/login/shop?error=wrong_role'); // Role ไม่ใช่ร้านค้า เตะออก
      }
    }
  }, [status, session, router]);

  const fetchData = async () => {
    try {
      const [tableRes, resRes, shopRes] = await Promise.all([
        fetch('/api/tables'),
        fetch('/api/reservations'),
        fetch('/api/shop/dashboard')
      ]);
      if (tableRes.ok) setTables(await tableRes.json());
      if (resRes.ok) setReservations(await resRes.json());
      if (shopRes.ok) {
        const data = await shopRes.json();
        setShopData(data.shop);
      }
    } catch (err) { console.error(err); }
  };

  // 🚨 4. โหลดข้อมูลเมื่อผ่านการตรวจสอบสิทธิ์แล้วว่าเป็นร้านค้า
  useEffect(() => {
    if (status !== 'authenticated' || (session?.user as any)?.role !== 'shop') return; 

    fetchData();
    const interval = setInterval(() => {
      fetchData();
      setCurrentTime(new Date());
    }, 5000);
    return () => clearInterval(interval);
  }, [status, session]);

  // --- Logic คำนวณสถานะ ---
  const getTableStatus = (table: Table) => {
    const booking = reservations.find(r => r.table_id === table.id);

    if (booking) {
      const bookTime = new Date(booking.reservation_time).getTime();
      const now = currentTime.getTime();
      const diffMinutes = (bookTime - now) / 1000 / 60;

      if (diffMinutes <= 0 && diffMinutes > -120) {
        return { type: 'booking_active', bookingId: booking.id, customerName: booking.customer_name, color: 'bg-red-100', border: 'border-red-500', text: `⛔ ถึงเวลาจอง (${booking.customer_name})`, textColor: 'text-red-700' };
      }
      if (diffMinutes > 0 && diffMinutes <= 30) {
        return { type: 'warning', color: 'bg-yellow-50', border: 'border-yellow-400', text: `⚠️ จองแล้ว (${Math.ceil(diffMinutes)} นาที)`, textColor: 'text-yellow-700' };
      }
    }

    if (table.is_occupied) return { type: 'manual', color: 'bg-red-100', border: 'border-red-500', text: '⛔ ไม่ว่าง', textColor: 'text-red-700' };
    return { type: 'free', color: 'bg-green-100', border: 'border-green-500', text: '✅ ว่าง', textColor: 'text-green-700' };
  };

  // --- Handle Click ของสถานะโต๊ะ ---
  const handleTableClick = (table: Table) => {
    const status = getTableStatus(table);
    if (status.type === 'booking_active' && status.bookingId) {
      setModal({ isOpen: true, type: 'booking_clear', tableId: table.id, bookingId: status.bookingId, tableName: table.name, customerName: status.customerName });
      return; 
    }
    if (table.is_occupied) {
      setModal({ isOpen: true, type: 'manual_clear', tableId: table.id, tableName: table.name, sessionToken: table.session_token });
      setPaymentMethod('cash');
      setCodSlipImage(null);
      setBillData({ total: 0, items: [], loading: true });
      fetch(`/api/dine-in/tables/${table.id}/orders?session=${table.session_token}`)
        .then(res => res.json())
        .then(orders => {
          if (Array.isArray(orders)) {
            let total = 0;
            const itemMap = new Map<string, { quantity: number, price: number }>();
            orders.forEach(o => {
              total += Number(o.total_price);
              if (o.items) {
                o.items.forEach((item: any) => {
                  const existing = itemMap.get(item.menu_name);
                  if (existing) {
                    existing.quantity += item.quantity;
                  } else {
                    itemMap.set(item.menu_name, { quantity: item.quantity, price: item.price });
                  }
                });
              }
            });
            const items = Array.from(itemMap.entries()).map(([name, data]) => ({ name, ...data }));
            setBillData({ total, items, loading: false });
          } else {
            setBillData({ total: 0, items: [], loading: false });
          }
        }).catch(() => setBillData({ total: 0, items: [], loading: false }));
      return;
    }
    setModal({ isOpen: true, type: 'occupy', tableId: table.id, tableName: table.name });
  };

  const handleConfirmModal = async () => {
    if (!modal) return;
    try {
      if (modal.type === 'booking_clear') {
        await fetch('/api/reservations', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: modal.bookingId, status: 'completed' }) });
        await updateTableStatus(modal.tableId, false);
      } 
      else if (modal.type === 'manual_clear') await updateTableStatus(modal.tableId, false, codSlipImage || undefined);
      else if (modal.type === 'occupy') await updateTableStatus(modal.tableId, true);
      
      setModal(null);
      fetchData();
    } catch (error: any) { alert(error.message || 'เกิดข้อผิดพลาด'); }
  };

  const updateTableStatus = async (id: number, status: boolean, slipImage?: string) => {
    const res = await fetch('/api/tables', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_occupied: status, slip_image: slipImage }) });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'เกิดข้อผิดพลาดในการอัปเดตสถานะโต๊ะ');
    }
    setTables(prev => prev.map(t => t.id === id ? { ...t, is_occupied: status } : t));
  };

  const getConfirmButtonColor = () => modal?.type === 'occupy' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50';

  // 🛠️ --- จัดการเพิ่ม/แก้ไข/ลบ โต๊ะ ---
  const handleSaveTable = async () => {
    if (!manageModal) return;
    
    if (manageModal.type !== 'delete' && (!manageModal.name || manageModal.capacity < 1)) {
      alert('กรุณากรอกชื่อโต๊ะและจำนวนที่นั่งให้ถูกต้อง');
      return;
    }

    try {
      if (manageModal.type === 'add') {
        await fetch('/api/tables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: manageModal.name, capacity: manageModal.capacity })
        });
      } else if (manageModal.type === 'edit') {
        await fetch('/api/tables', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: manageModal.tableId, name: manageModal.name, capacity: manageModal.capacity }) 
        });
      } else if (manageModal.type === 'delete') {
        await fetch('/api/tables', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: manageModal.tableId })
        });
      }
      setManageModal(null);
      fetchData(); 
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการจัดการโต๊ะ');
    }
  };

  // ⏳ 5. โชว์หน้าโหลดดิ้งระหว่างรอเช็คสิทธิ์ (อยู่หลัง Hooks ทั้งหมด)
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-slate-400 tracking-wider">กำลังตรวจสอบสิทธิ์...</span>
        </div>
      </div>
    );
  }

  // ป้องกันหน้ากระพริบกรณีที่เตะ User ออก
  if (status !== 'authenticated' || (session?.user as any)?.role !== 'shop') {
    return null; 
  }

  return (
    <div className="bg-slate-50 text-slate-900 font-sans h-[calc(100vh-80px)] flex flex-col overflow-hidden">
      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 pt-6 flex flex-col h-full min-h-0">
        
        {/* Header & Add Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <span className="bg-blue-600 text-white p-2 rounded-xl"><LayoutGrid size={24} /></span>
              จัดการโต๊ะ
            </h1>
            <p className="text-sm font-bold text-slate-500 mt-1">อัปเดตอัตโนมัติ • วันที่ {currentTime.toLocaleDateString('th-TH', { dateStyle: 'medium' })}</p>
          </div>
          <button 
            onClick={() => setManageModal({ isOpen: true, type: 'add', name: '', capacity: 4 })}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95"
          >
            <Plus size={18} /> เพิ่มโต๊ะ
          </button>
        </div>

      {/* พื้นหลังใหญ่สำหรับใส่โต๊ะ */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 mb-6 flex flex-col overflow-y-auto">
        <div className="w-full">
          {/* Grid โต๊ะ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {tables.map(table => {
          const { color, border, text, textColor } = getTableStatus(table);
          
          return (
            <div 
              key={table.id}
              className={`relative group cursor-pointer min-h-[144px] rounded-2xl flex flex-col items-center justify-end pb-5 pt-14 transition-all duration-200 shadow-sm hover:shadow-md ${color} border border-slate-200`}
              onClick={() => handleTableClick(table)}
            >
              {/* ปุ่มสแกน QR Code (แสดงตลอดเมื่อโต๊ะไม่ว่าง) */}
              {Boolean(table.is_occupied) && table.session_token && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setQrModal({ isOpen: true, table }); }}
                  className="absolute top-2 left-2 p-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-md transition-colors z-10 flex items-center gap-1 px-2"
                  title="ดู QR Code"
                >
                  <QrCode size={14} /> <span className="text-xs font-bold">QR</span>
                </button>
              )}

              {/* ปุ่มแก้ไข / ลบ */}
              <div className="absolute top-2 right-2 flex gap-1.5 z-10">
                <button 
                  onClick={(e) => { e.stopPropagation(); setManageModal({ isOpen: true, type: 'edit', tableId: table.id, name: table.name, capacity: table.capacity }); }}
                  className="p-2 bg-white/90 backdrop-blur text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl shadow border border-slate-200/60 transition-all hover:scale-105 active:scale-95"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setManageModal({ isOpen: true, type: 'delete', tableId: table.id, name: table.name, capacity: table.capacity }); }}
                  className="p-2 bg-white/90 backdrop-blur text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl shadow border border-slate-200/60 transition-all hover:scale-105 active:scale-95"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <span className="text-xl font-black text-slate-800 mb-1">{table.name}</span>
              <span className="text-sm font-semibold text-slate-500 mb-2">👥 {table.capacity} ที่นั่ง</span>
              <span className={`text-[10px] font-bold px-2 py-1 rounded border ${border} bg-white/80 ${textColor}`}>
                {text}
              </span>
            </div>
          );
        })}
          </div>
        </div>
      </div>

      {/* --- MODAL (POPUP): เปลี่ยนสถานะโต๊ะเดิม --- */}
      {modal && modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden max-h-[600px]">
            <div className={`p-4 shrink-0 flex items-center justify-center gap-2 ${modal.type === 'occupy' ? 'bg-blue-500' : 'bg-emerald-500'}`}>
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white">
                {modal.type === 'occupy' ? <Users size={18} /> : <Utensils size={18} />}
              </div>
              <h3 className="text-white font-bold text-lg">
                {modal.type === 'occupy' ? `เปิดโต๊ะ ${modal.tableName}` : `เคลียร์โต๊ะ ${modal.tableName}`}
              </h3>
            </div>
            
            <div className="p-5 text-center overflow-y-auto">
              {modal.type === 'booking_clear' && (
                <><p className="text-slate-800 font-bold text-lg mb-1">ลูกค้า "{modal.customerName}" <br/> ทานเสร็จแล้วใช่ไหม?</p><p className="text-sm text-slate-500 font-medium">จบการจองและเปลี่ยนสถานะเป็น "ว่าง"</p></>
              )}
              {modal.type === 'manual_clear' && (
                <>
                  <p className="text-slate-800 font-bold text-xl mb-4">ชำระเงินและปิดโต๊ะ</p>
                  
                  {billData?.loading ? (
                    <div className="py-8">
                      <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p className="text-slate-500 font-bold text-sm">กำลังคำนวณยอดชำระ...</p>
                    </div>
                  ) : (
                    <>
                      {/* รายการอาหาร */}
                      {billData?.items && billData.items.length > 0 && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl mb-4 text-left p-3 max-h-40 overflow-y-auto text-sm shadow-inner">
                          {billData.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start mb-2 last:mb-0 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                              <div className="flex-1 pr-2">
                                <span className="font-bold text-slate-700 block">{item.name}</span>
                                <span className="text-slate-400 text-xs">x{item.quantity}</span>
                              </div>
                              <div className="font-bold text-slate-700 whitespace-nowrap">{(item.price * item.quantity).toLocaleString()} ฿</div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="bg-slate-50 p-3 rounded-xl mb-4 border border-slate-200 flex justify-between items-center shadow-sm">
                        <p className="text-sm text-slate-500 font-bold">ยอดชำระรวม</p>
                        <p className="text-2xl font-black text-indigo-600">{billData?.total?.toLocaleString()} ฿</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <button 
                          onClick={() => setPaymentMethod('cash')}
                          className={`py-2 rounded-xl font-bold transition-all text-sm ${paymentMethod === 'cash' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                        >
                          💵 จ่ายสด
                        </button>
                        <button 
                          onClick={() => setPaymentMethod('qr')}
                          className={`py-2 rounded-xl font-bold transition-all text-sm ${paymentMethod === 'qr' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                        >
                          📱 สแกน QR
                        </button>
                      </div>

                      {paymentMethod === 'qr' && (
                        shopData?.account_number ? (
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl mb-4 text-center">
                            <p className="text-slate-800 font-bold mb-3">แสกน PromptPay เพื่อชำระเงิน</p>
                            <div className="bg-white border-2 border-indigo-100 p-2 rounded-xl inline-block shadow-sm">
                              <img src={`https://promptpay.io/${shopData.account_number}/${billData?.total || 0}.png`} alt="PromptPay QR Code" className="w-32 h-32 object-contain mx-auto" />
                            </div>
                            <p className="text-sm font-bold text-slate-500 mt-3">ยอดชำระ: {billData?.total?.toLocaleString()} บาท</p>
                          </div>
                        ) : (
                          <div className="p-4 bg-amber-50 text-amber-700 rounded-xl text-sm font-bold border border-amber-200 mb-4 text-center">
                            ยังไม่ได้ตั้งค่าเบอร์พร้อมเพย์ในตั้งค่าร้านค้า
                          </div>
                        )
                      )}

                      {/* อัปโหลดสลิป */}
                      {paymentMethod === 'qr' && (
                        <div className="mb-4 text-left">
                          <p className="text-sm font-bold text-slate-700 mb-2">อัปโหลดหลักฐานการรับเงิน *</p>
                          <div className="flex gap-2 mb-3">
                            <button onClick={startCamera} className="flex-1 flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors text-slate-600 font-bold text-sm">
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
                    </>
                  )}
                </>
              )}
              {modal.type === 'occupy' && (
                <><p className="text-slate-800 font-bold text-lg mb-1">รับลูกค้าใหม่ใช่ไหม?</p><p className="text-sm text-slate-500 font-medium">ยืนยันเพื่อเปลี่ยนสถานะเป็น <span className="text-rose-500 font-bold">"ไม่ว่าง"</span></p></>
              )}
            </div>
            <div className="p-4 bg-white border-t border-slate-100 flex gap-2 shrink-0">
              <button onClick={() => setModal(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold transition-colors">ยกเลิก</button>
              <button 
                onClick={handleConfirmModal} 
                disabled={billData?.loading || (modal.type === 'manual_clear' && paymentMethod === 'qr' && !codSlipImage)} 
                className={`flex-1 py-3 text-white rounded-xl font-bold shadow-md transition-colors ${billData?.loading || (modal.type === 'manual_clear' && paymentMethod === 'qr' && !codSlipImage) ? 'bg-slate-300 cursor-not-allowed' : modal.type === 'manual_clear' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                {modal.type === 'manual_clear' ? 'ยืนยันรับชำระเงิน' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🛠️ --- MODAL: เพิ่ม/แก้ไข/ลบ โต๊ะ --- */}
      {manageModal && manageModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 relative">
            <h3 className={`text-xl font-black mb-4 ${manageModal.type === 'delete' ? 'text-rose-600' : 'text-slate-800'}`}>
              {manageModal.type === 'add' ? '➕ เพิ่มโต๊ะใหม่' : manageModal.type === 'edit' ? `✏️ แก้ไขโต๊ะ ${manageModal.name}` : '🗑️ ลบโต๊ะ'}
            </h3>

            {manageModal.type === 'delete' ? (
              <p className="text-slate-600 font-medium mb-6">คุณแน่ใจหรือไม่ว่าต้องการลบโต๊ะ <strong className="text-slate-900">{manageModal.name}</strong>? การกระทำนี้ไม่สามารถย้อนกลับได้</p>
            ) : (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">ชื่อโต๊ะ (เช่น T1, A1)</label>
                  <input 
                    type="text" 
                    value={manageModal.name} 
                    onChange={e => setManageModal({ ...manageModal, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">จำนวนที่นั่ง</label>
                  <input 
                    type="number" 
                    min="1"
                    value={manageModal.capacity} 
                    onChange={e => setManageModal({ ...manageModal, capacity: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setManageModal(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors">
                ยกเลิก
              </button>
              <button 
                onClick={handleSaveTable} 
                className={`flex-1 py-3 text-white font-bold rounded-xl transition-colors shadow-sm ${manageModal.type === 'delete' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {manageModal.type === 'delete' ? 'ลบทิ้ง' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📱 --- MODAL: แสดง QR Code --- */}
      {qrModal.isOpen && qrModal.table && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center relative overflow-hidden">
            
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-t-3xl -z-0"></div>
            
            <button 
              onClick={() => setQrModal({ isOpen: false, table: null })}
              className="absolute top-4 right-4 bg-white/20 text-white hover:bg-white/40 p-1.5 rounded-full transition-colors z-10"
            >
              <X size={20} />
            </button>

            <div className="relative z-10 pt-4">
              <h3 className="text-2xl font-black text-white mb-1">
                สแกนเพื่อสั่งอาหาร
              </h3>
              <p className="text-indigo-100 text-sm font-medium mb-8">
                โต๊ะ {qrModal.table.name}
              </p>

              <div className="bg-white p-4 rounded-2xl shadow-lg inline-block border-4 border-white mb-6">
                <QRCodeSVG 
                  value={`${window.location.origin}/dine-in/${qrModal.table.id}?session=${qrModal.table.session_token}`}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="bg-indigo-50 text-indigo-700 text-xs font-bold px-4 py-3 rounded-xl">
                ⚠️ QR Code นี้จะเปลี่ยนไปเมื่อเปิดโต๊ะครั้งหน้า
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📸 Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-slate-900 z-[10000] flex flex-col">
          <div className="flex-1 relative flex items-center justify-center bg-black">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            
            <div className="absolute top-4 right-4">
              <button onClick={stopCamera} className="p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full backdrop-blur-sm transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-6 px-6">
              <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-[0_0_0_4px_rgba(255,255,255,0.3)] hover:scale-105 transition-transform">
                <div className="w-16 h-16 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center">
                  <Camera size={32} className="text-slate-800" />
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}