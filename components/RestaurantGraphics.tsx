'use client';

import { motion } from 'framer-motion';

// ตัวละครแบบตึงๆ (สวมแว่นตาดำ ทรงผมเท่ๆ) มุมมองจากด้านบน
export function CoolCharacterSVG({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} overflow="visible">
      {/* ไหล่ / เสื้อแจ็คเก็ตเท่ๆ */}
      <rect x="15" y="30" width="70" height="45" rx="20" fill="#0f172a" />
      {/* แถบสีบนไหล่ (ดีเทลแจ็คเก็ต) */}
      <rect x="25" y="35" width="8" height="35" rx="4" fill="#38bdf8" />
      <rect x="67" y="35" width="8" height="35" rx="4" fill="#38bdf8" />
      
      {/* แขนวางบนโต๊ะ */}
      <rect x="20" y="10" width="18" height="30" rx="9" fill="#0f172a" />
      <rect x="62" y="10" width="18" height="30" rx="9" fill="#0f172a" />
      
      {/* มือ */}
      <circle cx="29" cy="15" r="7" fill="#fcd34d" />
      <circle cx="71" cy="15" r="7" fill="#fcd34d" />

      {/* หัว (Head) */}
      <circle cx="50" cy="50" r="22" fill="#fde68a" />
      
      {/* ทรงผมเท่ๆ (Hair) */}
      <path d="M 28 50 Q 50 15 72 50 Q 50 35 28 50 Z" fill="#1e293b" />
      
      {/* แว่นตาดำ (Sunglasses) แบบตึงๆ */}
      <rect x="34" y="58" width="32" height="10" rx="3" fill="#000000" />
      <path d="M 48 58 L 52 58 L 52 68 L 48 68 Z" fill="#000000" />
      {/* ขาแว่น */}
      <path d="M 30 54 Q 34 56 34 60" stroke="#000" strokeWidth="2" fill="none" />
      <path d="M 70 54 Q 66 56 66 60" stroke="#000" strokeWidth="2" fill="none" />
    </svg>
  );
}

// เก้าอี้เปล่าๆ มุมมองจากด้านบน
function EmptyChair() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* ที่นั่ง */}
      <rect x="20" y="20" width="60" height="60" rx="15" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" />
      {/* พนักพิง */}
      <rect x="25" y="80" width="50" height="15" rx="5" fill="#94a3b8" />
    </svg>
  );
}

export function TopDownTable({ 
  capacity, 
  isOccupied, 
  name, 
  index, 
  children,
  customStatus 
}: { 
  capacity: number;
  isOccupied: boolean;
  name: string;
  index: number;
  children?: React.ReactNode;
  customStatus?: { text: string; bg: string; border: string; dot: string; containerBg: string; containerBorder: string };
}) {
  // สร้างการจัดวางเก้าอี้ (ย่อขนาดลงเพื่อให้พอดีกับการแสดง 2 โต๊ะต่อแถวบนมือถือ)
  let tableWidth = 72;
  let tableHeight = 72;
  let tableShape = "circle";
  
  if (capacity > 4) {
    tableShape = "rect";
    tableWidth = 144;
    tableHeight = 66;
  } else if (capacity === 2) {
    tableShape = "rect";
    tableWidth = 66;
    tableHeight = 54;
  }

  // ตำแหน่งของที่นั่งสัมพันธ์กับจุดศูนย์กลางของโต๊ะ
  // หันเก้าอี้และคนให้หันเข้าหาโต๊ะ (โดยสลับมุมหมุน +180 องศา)
  const seats = [];
  if (capacity === 2) {
    seats.push({ x: 0, y: -42, rotate: 180 }); // บน (หันหน้าเข้าโต๊ะ)
    seats.push({ x: 0, y: 42, rotate: 0 }); // ล่าง
  } else if (capacity === 4) {
    seats.push({ x: 0, y: -48, rotate: 180 }); // บน
    seats.push({ x: 0, y: 48, rotate: 0 }); // ล่าง
    seats.push({ x: -48, y: 0, rotate: 90 }); // ซ้าย
    seats.push({ x: 48, y: 0, rotate: 270 }); // ขวา
  } else {
    // 8 ที่นั่ง (โต๊ะยาว)
    seats.push({ x: -42, y: -45, rotate: 180 });
    seats.push({ x: 0, y: -45, rotate: 180 });
    seats.push({ x: 42, y: -45, rotate: 180 });
    seats.push({ x: -42, y: 45, rotate: 0 });
    seats.push({ x: 0, y: 45, rotate: 0 });
    seats.push({ x: 42, y: 45, rotate: 0 });
    seats.push({ x: -84, y: 0, rotate: 90 }); // หัวโต๊ะซ้าย
    seats.push({ x: 84, y: 0, rotate: 270 }); // หัวโต๊ะขวา
  }

  // แอนิเมชันหน่วงเวลาตามโต๊ะ
  const tableDelay = index * 0.1;

  const containerBgClass = customStatus 
    ? `${customStatus.containerBg} ${customStatus.containerBorder}`
    : isOccupied 
      ? "bg-rose-100 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900" 
      : "bg-emerald-100 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900";

  return (
    <div className={`relative flex items-center justify-center w-full min-h-[160px] h-full overflow-hidden rounded-[20px] border shadow-inner p-2 transition-colors duration-300 ${containerBgClass}`}>
      
      {/* ป้ายบอกสถานะ ว่าง / ไม่ว่าง หรือ สถานะแบบ Custom */}
      {customStatus ? (
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm z-40 border flex items-center gap-1 ${customStatus.bg} ${customStatus.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${customStatus.dot} animate-pulse`}></span>
          <span className="text-white">{customStatus.text}</span>
        </div>
      ) : (
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm z-40 border flex items-center gap-1 ${
          isOccupied 
            ? "bg-rose-500 text-white border-rose-600" 
            : "bg-emerald-500 text-white border-emerald-600"
        }`}>
          {isOccupied ? (
            <><span className="w-1.5 h-1.5 rounded-full bg-rose-200 animate-pulse"></span>ไม่ว่าง</>
          ) : (
            <><span className="w-1.5 h-1.5 rounded-full bg-emerald-200"></span>ว่าง</>
          )}
        </div>
      )}
      
      {/* Admin Buttons / Additional Elements */}
      {children && (
        <div className="absolute inset-0 z-50 pointer-events-none">
          {children}
        </div>
      )}

      {/* ภาชนะ/เก้าอี้/คน ที่จัดวางรอบโต๊ะ */}
      <div className="relative flex items-center justify-center w-full h-full">
        
        {/* เงาโต๊ะ */}
        <div 
          className="absolute bg-black/15 blur-xl translate-y-2"
          style={{
            width: tableWidth + 12,
            height: tableHeight + 12,
            borderRadius: tableShape === "circle" ? "50%" : "20px",
          }}
        />

        {/* เก้าอี้และผู้คน */}
        {seats.map((seat, i) => {
          if (i >= capacity) return null;

          // จุดเริ่มต้นของการเดิน (เดินมาจากขอบจอ)
          const startX = seat.x * 3;
          const startY = seat.y * 3;

          return (
            <div 
              key={i} 
              className="absolute w-7 h-7 flex items-center justify-center"
              style={{ 
                transform: `translate(${seat.x}px, ${seat.y}px) rotate(${seat.rotate}deg)`,
                zIndex: 10
              }}
            >
              {/* เก้าอี้เปล่า */}
              <div className="absolute inset-0 opacity-70"><EmptyChair /></div>
              
              {/* ตัวละครที่เคลื่อนที่มานั่ง */}
              {isOccupied && (
                <motion.div
                  initial={{ x: startX, y: startY, opacity: 0, scale: 0.5 }}
                  animate={{ x: 0, y: 0, opacity: 1, scale: 1.25 }}
                  transition={{ 
                    type: 'spring', 
                    stiffness: 50, 
                    damping: 12, 
                    delay: tableDelay + (i * 0.15) // เดินมาทีละคน
                  }}
                  className="absolute inset-0 z-20 origin-center"
                  style={{ transformOrigin: 'center center' }}
                >
                  <CoolCharacterSVG />
                </motion.div>
              )}
            </div>
          );
        })}

        {/* พื้นผิวโต๊ะ (Table Top) */}
        <div 
          className="absolute z-30 flex flex-col items-center justify-center shadow-xl border-[3px] border-amber-800/80 dark:border-amber-900/80"
          style={{
            width: tableWidth,
            height: tableHeight,
            borderRadius: tableShape === "circle" ? "50%" : "16px",
            background: "linear-gradient(135deg, #d97706 0%, #92400e 100%)", // ลายไม้สีเข้ม
          }}
        >
          {/* ป้ายชื่อโต๊ะที่วางอยู่บนโต๊ะ */}
          <div className="bg-amber-900/40 backdrop-blur-md px-2 py-0.5 rounded-lg border border-amber-500/30 flex flex-col items-center shadow-lg">
            <span className="font-black text-sm text-amber-50 drop-shadow-md leading-none">
              {name}
            </span>
            <span className="text-amber-200/90 font-bold text-[8px] mt-0.5 tracking-wider">
              {capacity} SEATS
            </span>
          </div>

        </div>
        
      </div>
    </div>
  );
}
