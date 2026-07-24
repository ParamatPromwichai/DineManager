import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./Providers"; // ➕ 1. นำเข้า Providers ที่เราสร้างไว้

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ระบบจัดการร้านอาหาร ครบวงจร | DineManager",
  description: "เว็บจัดการร้านอาหารและระบบจัดการร้านอาหารที่ดีที่สุด รองรับการสั่งอาหารผ่าน QR Code พนักงาน จัดการสต๊อก และรายงานยอดขาย",
  keywords: ["เว็บจัดการร้านอาหาร", "ระบบจัดการร้านอาหาร", "โปรแกรมร้านอาหาร", "จัดการร้านอาหาร", "POS"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* ➕ 2. เอา Providers มาครอบ children เอาไว้ */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}