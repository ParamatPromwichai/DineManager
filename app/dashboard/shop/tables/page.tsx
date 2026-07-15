'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; 
import { useSession } from 'next-auth/react'; // ➕ 1. นำเข้า useSession
import { Plus, Edit2, Trash2 } from 'lucide-react';

// --- Type Definitions ---
type Table = {
  id: number;
  name: string;
  capacity: number;
  is_occupied: boolean; 
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
      const [tableRes, resRes] = await Promise.all([
        fetch('/api/tables'),
        fetch('/api/reservations')
      ]);
      if (tableRes.ok) setTables(await tableRes.json());
      if (resRes.ok) setReservations(await resRes.json());
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
      setModal({ isOpen: true, type: 'manual_clear', tableId: table.id, tableName: table.name });
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
      else if (modal.type === 'manual_clear') await updateTableStatus(modal.tableId, false);
      else if (modal.type === 'occupy') await updateTableStatus(modal.tableId, true);
      
      setModal(null);
      fetchData();
    } catch (error) { alert('เกิดข้อผิดพลาด'); }
  };

  const updateTableStatus = async (id: number, status: boolean) => {
    setTables(prev => prev.map(t => t.id === id ? { ...t, is_occupied: status } : t));
    await fetch('/api/tables', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_occupied: status }) });
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
    <div className="p-5 pb-24 min-h-screen bg-slate-50 font-sans">
      
      {/* Header & Add Button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
          🪑 จัดการโต๊ะ
        </h1>
        <button 
          onClick={() => setManageModal({ isOpen: true, type: 'add', name: '', capacity: 4 })}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-sm"
        >
          <Plus size={18} /> เพิ่มโต๊ะ
        </button>
      </div>

      {/* Grid โต๊ะ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {tables.map(table => {
          const { color, border, text, textColor } = getTableStatus(table);
          
          return (
            <div 
              key={table.id}
              className={`relative group cursor-pointer h-32 rounded-2xl flex flex-col items-center justify-center p-3 transition-all duration-200 shadow-sm hover:shadow-md ${color} border border-slate-200`}
              onClick={() => handleTableClick(table)}
            >
              {/* ปุ่มแก้ไข / ลบ */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); setManageModal({ isOpen: true, type: 'edit', tableId: table.id, name: table.name, capacity: table.capacity }); }}
                  className="p-1.5 bg-white text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg shadow-sm border border-slate-200 transition-colors"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setManageModal({ isOpen: true, type: 'delete', tableId: table.id, name: table.name, capacity: table.capacity }); }}
                  className="p-1.5 bg-white text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg shadow-sm border border-slate-200 transition-colors"
                >
                  <Trash2 size={14} />
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

      {/* --- MODAL (POPUP): เปลี่ยนสถานะโต๊ะเดิม --- */}
      {modal && modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className={`p-4 text-center ${modal.type === 'occupy' ? 'bg-blue-500' : 'bg-emerald-500'}`}>
              <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2 text-2xl">
                {modal.type === 'occupy' ? '👥' : '🍽️'}
              </div>
              <h3 className="text-white font-bold text-lg">
                {modal.type === 'occupy' ? `เปิดโต๊ะ ${modal.tableName}` : `เคลียร์โต๊ะ ${modal.tableName}`}
              </h3>
            </div>
            <div className="p-6 text-center">
              {modal.type === 'booking_clear' && (
                <><p className="text-slate-800 font-bold text-lg mb-1">ลูกค้า "{modal.customerName}" <br/> ทานเสร็จแล้วใช่ไหม?</p><p className="text-sm text-slate-500 font-medium">จบการจองและเปลี่ยนสถานะเป็น "ว่าง"</p></>
              )}
              {modal.type === 'manual_clear' && (
                <><p className="text-slate-800 font-bold text-lg mb-1">ลูกค้าเช็คบิลแล้วใช่ไหม?</p><p className="text-sm text-slate-500 font-medium">ยืนยันเพื่อเปลี่ยนสถานะเป็น "ว่าง"</p></>
              )}
              {modal.type === 'occupy' && (
                <><p className="text-slate-800 font-bold text-lg mb-1">รับลูกค้าใหม่ใช่ไหม?</p><p className="text-sm text-slate-500 font-medium">ยืนยันเพื่อเปลี่ยนสถานะเป็น <span className="text-rose-500 font-bold">"ไม่ว่าง"</span></p></>
              )}
            </div>
            <div className="flex border-t border-slate-100 bg-slate-50">
              <button onClick={() => setModal(null)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-100 transition-colors">ยกเลิก</button>
              <div className="w-[1px] bg-slate-200"></div>
              <button onClick={handleConfirmModal} className={`flex-1 py-4 font-bold transition-colors ${getConfirmButtonColor()}`}>ยืนยัน ✅</button>
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
    </div>
  );
}