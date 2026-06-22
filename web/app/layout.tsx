import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
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
        <script
          dangerouslySetInnerHTML={{
            __html: `window.difyChatbotConfig = { token: "luejzKyagmoooiLh", baseUrl: "https://dyfi.besen.vn", dynamicScript: true };`,
          }}
        />
        <script src="https://dyfi.besen.vn/embed.min.js" id="luejzKyagmoooiLh" defer />
      </head>
      <body className="min-h-full bg-gray-50 font-sans">
        <MantineProvider defaultColorScheme="light">
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
