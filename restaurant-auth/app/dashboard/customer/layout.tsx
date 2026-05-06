import CustomerNavbar from './CustomerNavbar';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ paddingBottom: 70 }}>
      {children}
      <CustomerNavbar />
    </div>
  );
}
