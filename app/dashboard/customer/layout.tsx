import CustomerNavbar from './CustomerNavbar';


export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-blue-50 dark:bg-slate-900 transition-colors">
      
      <main className="flex-1 pb-[70px]">
        {children}
      </main>
      
      <CustomerNavbar />
    </div>
  );
}