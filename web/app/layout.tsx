import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import ProductDetailModal from "./ProductModal";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Creta Shop - Bảng giá",
  description: "Bảng giá sản phẩm Creta Shop",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${geistSans.variable} h-full`} suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body className="min-h-full bg-gray-50 font-sans">
        <MantineProvider defaultColorScheme="light">
          {children}
          <ProductDetailModal />
        </MantineProvider>
      </body>
    </html>
  );
}
