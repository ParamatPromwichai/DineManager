import CustomerNavbar from './CustomerNavbar';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 1. เพิ่ม min-h-screen เพื่อให้ตัวคลุมนี้สูงเต็มจอเสมอ
    // 2. ใส่ bg-[#F4F8FF] เพื่อเทสีพื้นหลังให้เป็นสีฟ้าเดียวกับแอป
    // 3. ใช้ flex flex-col เพื่อจัดโครงสร้าง
    <div className="flex flex-col min-h-screen bg-[#F4F8FF]">
      
      {/* 4. ให้เนื้อหาหลักยืดตัวเต็มพื้นที่ว่าง (flex-1) และเว้นระยะด้านล่าง 70px (pb-[70px]) เผื่อแถบเมนู */}
      <main className="flex-1 pb-[70px]">
        {children}
      </main>
      
      <CustomerNavbar />
    </div>
  );
}