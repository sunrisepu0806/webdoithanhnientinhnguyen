import type { Metadata } from 'next';
import Header from '../thanh-phan/khung-giao-dien/ThanhDieuHuong'; 
import ChanTrang from '../thanh-phan/khung-giao-dien/ChanTrang'; 
import './globals.css';

export const metadata: Metadata = {
  title: 'Đội Thanh Niên Tình Nguyện QNU - Đại Học Quy Nhơn',
  description: 'Nhiệt huyết – Tiên phong – Phụng sự cộng đồng',
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