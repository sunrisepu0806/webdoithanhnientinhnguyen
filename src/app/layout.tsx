import type { Metadata } from 'next';
import Header from '../thanh-phan/khung-giao-dien/ThanhDieuHuong'; 
import ChanTrang from '../thanh-phan/khung-giao-dien/ChanTrang'; 
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://doithanhnientinhnguyenqnu.io.vn'),
  title: 'Đội Thanh Niên Tình Nguyện QNU - Đại Học Quy Nhơn',
  description: 'Kết nối sức trẻ – Lan tỏa yêu thương',
  icons: {
    icon: '/logo.png?v=2',
    shortcut: '/logo.png?v=2',
    apple: '/logo.png?v=2',
  },
  openGraph: {
    title: 'Đội Thanh Niên Tình Nguyện QNU - Đại Học Quy Nhơn',
    description: 'Kết nối sức trẻ – Lan tỏa yêu thương',
    url: 'https://doithanhnientinhnguyenqnu.io.vn',
    siteName: 'Đội Thanh Niên Tình Nguyện QNU',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'Logo Đội TNTN QNU',
      },
    ],
    locale: 'vi_VN',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" style={{ colorScheme: 'light' }} className="light">
      <body 
        style={{ colorScheme: 'light' }} 
        className="min-h-screen flex flex-col justify-between bg-white text-slate-800 antialiased selection:bg-[#0284c7] selection:text-white"
      >
        <Header />
        
        <main className="flex-1 w-full bg-white">
          {children}
        </main>

        <ChanTrang />
      </body>
    </html>
  );
}