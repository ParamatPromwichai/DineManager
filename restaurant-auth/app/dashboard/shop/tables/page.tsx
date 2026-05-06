'use client';

import { useEffect, useState } from 'react';

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

// ✅ ปรับ Type Modal ให้รองรับ 3 กรณี: จอง / เคลียร์ทั่วไป / รับลูกค้าใหม่
type ModalState = {
  isOpen: boolean;
  type: 'booking_clear' | 'manual_clear' | 'occupy'; 
  tableId: number;
  tableName: string;
  bookingId?: number;
  customerName?: string;
} | null;

export default function ShopTableManager() {
  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [modal, setModal] = useState<ModalState>(null);

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

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
      setCurrentTime(new Date());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // --- Logic คำนวณสถานะ ---
  const getTableStatus = (table: Table) => {
    // 1. เช็ค Reservation
    const booking = reservations.find(r => r.table_id === table.id);

    if (booking) {
      const bookTime = new Date(booking.reservation_time).getTime();
      const now = currentTime.getTime();
      const diffMinutes = (bookTime - now) / 1000 / 60;

      // ถึงเวลาจอง -> แดง (Auto)
      if (diffMinutes <= 0 && diffMinutes > -120) {
        return { 
          type: 'booking_active', 
          bookingId: booking.id,
          customerName: booking.customer_name,
          color: 'bg-red-100', border: 'border-red-500', text: `⛔ ถึงเวลาจอง (${booking.customer_name})`, textColor: 'text-red-700'
        };
      }

      // ใกล้ถึงเวลา -> เหลือง
      if (diffMinutes > 0 && diffMinutes <= 30) {
        return { 
          type: 'warning', 
          color: 'bg-yellow-50', border: 'border-yellow-400', text: `⚠️ จองแล้ว (${Math.ceil(diffMinutes)} นาที)`, textColor: 'text-yellow-700'
        };
      }
    }

    // 2. Manual Occupied
    if (table.is_occupied) {
      return { type: 'manual', color: 'bg-red-100', border: 'border-red-500', text: '⛔ ไม่ว่าง (ลูกค้าหน้าร้าน)', textColor: 'text-red-700' };
    }

    // 3. Free
    return { type: 'free', color: 'bg-green-100', border: 'border-green-500', text: '✅ ว่าง', textColor: 'text-green-700' };
  };

  // --- Handle Click ---
  const handleTableClick = (table: Table) => {
    const status = getTableStatus(table);

    // กรณี 1: ไม่ว่างเพราะ "ถึงเวลาจอง" -> เปิด Modal เคลียร์จอง
    if (status.type === 'booking_active' && status.bookingId) {
      setModal({
        isOpen: true,
        type: 'booking_clear',
        tableId: table.id,
        bookingId: status.bookingId,
        tableName: table.name,
        customerName: status.customerName
      });
      return; 
    }

    // กรณี 2: ไม่ว่างเพราะ "Manual" -> เปิด Modal เคลียร์โต๊ะ
    if (table.is_occupied) {
      setModal({
        isOpen: true,
        type: 'manual_clear',
        tableId: table.id,
        tableName: table.name,
      });
      return;
    }

    // ✅ กรณี 3: โต๊ะว่างอยู่ -> เปิด Modal ยืนยันรับลูกค้า (Walk-in)
    setModal({
      isOpen: true,
      type: 'occupy',
      tableId: table.id,
      tableName: table.name
    });
  };

  // --- ฟังก์ชันทำงานเมื่อกด "ยืนยัน" ---
  const handleConfirmModal = async () => {
    if (!modal) return;

    try {
      if (modal.type === 'booking_clear') {
        // จบงานจอง
        await fetch('/api/reservations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: modal.bookingId, status: 'completed' }),
        });
        // เคลียร์โต๊ะเป็นว่าง
        await updateTableStatus(modal.tableId, false);
      } 
      else if (modal.type === 'manual_clear') {
        // เคลียร์โต๊ะเป็นว่าง
        await updateTableStatus(modal.tableId, false);
      } 
      else if (modal.type === 'occupy') {
        // ✅ เปลี่ยนโต๊ะเป็น "ไม่ว่าง"
        await updateTableStatus(modal.tableId, true);
      }

      setModal(null);
      fetchData(); // โหลดข้อมูลใหม่
    } catch (error) {
      alert('เกิดข้อผิดพลาด');
    }
  };

  // Helper อัปเดต API
  const updateTableStatus = async (id: number, status: boolean) => {
    // Optimistic Update เพื่อความลื่นไหล
    setTables(prev => prev.map(t => t.id === id ? { ...t, is_occupied: status } : t));
    
    await fetch('/api/tables', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_occupied: status }),
    });
  };

  // Helper สำหรับสีปุ่มยืนยัน
  const getConfirmButtonColor = () => {
    if (modal?.type === 'occupy') return 'text-red-600 hover:bg-red-50'; // ปุ่มแดง (ยืนยันรับลูกค้า/ไม่ว่าง)
    return 'text-green-600 hover:bg-green-50'; // ปุ่มเขียว (ยืนยันเคลียร์โต๊ะ/ว่าง)
  };

  return (
    <div className="p-5 pb-24 min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">🪑 จัดการโต๊ะ</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {tables.map(table => {
          const { color, border, text, textColor } = getTableStatus(table);
          
          return (
            <button
              key={table.id}
              onClick={() => handleTableClick(table)}
              className={`
                h-32 rounded-xl flex flex-col items-center justify-center p-3 transition-all duration-200 shadow-sm hover:shadow-md
                ${color} border-2 ${border}
              `}
            >
              <span className="text-xl font-bold text-gray-800 mb-1">{table.name}</span>
              <span className="text-sm text-gray-600 mb-2">👥 {table.capacity} ที่นั่ง</span>
              <span className={`text-xs font-bold px-2 py-1 rounded bg-white/80 ${textColor}`}>{text}</span>
            </button>
          );
        })}
      </div>

      {/* --- MODAL (POPUP) --- */}
      {modal && modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
            
            {/* Header: เปลี่ยนสีตามสถานะ */}
            <div className={`p-4 text-center ${modal.type === 'occupy' ? 'bg-blue-500' : 'bg-green-500'}`}>
              <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                <span className="text-2xl">
                  {modal.type === 'occupy' ? '👥' : '🍽️'}
                </span>
              </div>
              <h3 className="text-white font-bold text-lg">
                {modal.type === 'occupy' ? `เปิดโต๊ะ ${modal.tableName}` : `เคลียร์โต๊ะ ${modal.tableName}`}
              </h3>
            </div>

            {/* Content */}
            <div className="p-6 text-center">
              {modal.type === 'booking_clear' && (
                <>
                  <p className="text-gray-700 font-medium text-lg mb-2">ลูกค้า "{modal.customerName}" <br/> ทานเสร็จแล้วใช่ไหม?</p>
                  <p className="text-sm text-gray-500">จบการจองและเปลี่ยนสถานะเป็น "ว่าง"</p>
                </>
              )}
              {modal.type === 'manual_clear' && (
                <>
                  <p className="text-gray-700 font-medium text-lg mb-2">ลูกค้าเช็คบิลแล้วใช่ไหม?</p>
                  <p className="text-sm text-gray-500">ยืนยันเพื่อเปลี่ยนสถานะเป็น "ว่าง"</p>
                </>
              )}
              {modal.type === 'occupy' && (
                <>
                  <p className="text-gray-700 font-medium text-lg mb-2">รับลูกค้าใหม่ใช่ไหม?</p>
                  <p className="text-sm text-gray-500">ยืนยันเพื่อเปลี่ยนสถานะเป็น <span className="text-red-500 font-bold">"ไม่ว่าง"</span></p>
                </>
              )}
            </div>

            {/* Buttons */}
            <div className="flex border-t border-gray-100">
              <button 
                onClick={() => setModal(null)}
                className="flex-1 py-4 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <div className="w-[1px] bg-gray-100"></div>
              <button 
                onClick={handleConfirmModal}
                className={`flex-1 py-4 font-bold transition-colors ${getConfirmButtonColor()}`}
              >
                ยืนยัน ✅
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}