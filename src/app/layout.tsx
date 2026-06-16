import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ticket sales',
  description: 'ระบบจำหน่ายบัตรงานประชุมและอีเว้นต์',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  themeColor: '#1e40af',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <meta name="color-scheme" content="light"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
      </head>
      <body className="bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  )
}
