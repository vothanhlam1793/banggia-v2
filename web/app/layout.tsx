import type { Metadata } from 'next'
import Script from 'next/script'
import { Geist } from 'next/font/google'
import { ColorSchemeScript, MantineProvider } from '@mantine/core'
import { Providers } from './providers'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Creta Shop - Bảng giá',
  description: 'Bảng giá sản phẩm Creta Shop',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <Script
            defer
            src="/_u/script.js"
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
          />
        )}
      </head>
      <body className="min-h-full bg-gray-50 font-sans">
        <MantineProvider defaultColorScheme="light">
          <Providers>{children}</Providers>
        </MantineProvider>
      </body>
    </html>
  )
}
