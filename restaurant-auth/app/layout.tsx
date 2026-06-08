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
  title: "DineManager", // ปรับชื่อ Title ให้เข้ากับร้านคุณได้นะ
  description: "Restaurant Management System",
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