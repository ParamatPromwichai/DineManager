import CustomerNavbar from './CustomerNavbar';


export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-[#F4F8FF]">
      
      <main className="flex-1 pb-[70px]">
        {children}
      </main>
      
      <CustomerNavbar />
    </div>
  );
}