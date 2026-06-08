import CustomerNavbar from './CustomerNavbar';
// ➕ 1. นำเข้า Providers ที่เราสร้างไว้ (อย่าลืมเช็ค Path ให้ตรงกับที่คุณเซฟไฟล์ไว้นะครับ เช่น '../../Providers')
import Providers from '../../Providers';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // ➕ 2. เอา <Providers> มาครอบ div หลักทั้งหมดไว้
    <Providers>
      <div className="flex flex-col min-h-screen bg-[#F4F8FF]">
        
        <main className="flex-1 pb-[70px]">
          {children}
        </main>
        
        <CustomerNavbar />
      </div>
    </Providers>
  );
}