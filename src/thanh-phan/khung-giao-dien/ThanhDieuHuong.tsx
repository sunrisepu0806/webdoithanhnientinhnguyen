'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { name: 'Trang chủ', href: '/' },
  { name: 'Giới thiệu', href: '/gioi-thieu' },
  { name: 'Nhật ký', href: '/nhat-ky' },
  { name: 'Hoạt động', href: '/hoat-dong' },
  { name: 'Thành tích', href: '/thanh-tich' },
  { name: 'Shop TNTN QNU', href: '/shop' },
];

export default function ThanhDieuHuong() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  // Theo dõi cuộn trang: Cập nhật thanh tiến trình & trạng thái nổi của Header
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      
      if (windowHeight > 0) {
        setScrollProgress((totalScroll / windowHeight) * 100);
      }
      setIsScrolled(totalScroll > 15);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Đóng menu khi chuyển trang
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Khóa cuộn trang khi menu mobile mở
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [menuOpen]);

  return (
    <header
      className={`w-full sticky top-0 z-50 select-none transition-all duration-300 ${
        isScrolled
          ? 'bg-white/90 backdrop-blur-md shadow-md shadow-sky-950/5 border-b border-sky-100/80'
          : 'bg-[#f3f7fd]/80 backdrop-blur-sm border-b border-sky-100/50'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 h-20 flex items-center justify-between">
        
        {/* LOGO VỚI HIỆU ỨNG TƯƠNG TÁC */}
        <Link href="/" className="flex items-center gap-3 group z-50">
          <div className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center shrink-0">
            <img
              src="/logo.png"
              alt="Logo Đội TNTN QNU"
              className="w-full h-full object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-3deg]"
            />
          </div>
          <div className="leading-tight">
            <span className="block text-[10px] sm:text-[11px] font-bold text-slate-800 tracking-wider uppercase group-hover:text-slate-900 transition-colors">
              ĐỘI THANH NIÊN TÌNH NGUYỆN QNU
            </span>
            <span className="block text-sm sm:text-base font-black text-[#0284c7] group-hover:text-[#0369a1] transition-colors">
              ĐẠI HỌC QUY NHƠN
            </span>
          </div>
        </Link>

        {/* MENU ĐIỀU HƯỚNG DESKTOP */}
        <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2 bg-white/60 p-1.5 rounded-full border border-sky-100/80 shadow-sm backdrop-blur-md">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`relative px-4 py-2 rounded-full text-sm font-bold tracking-tight transition-all duration-200 flex items-center gap-1.5 ${
                  isActive
                    ? 'text-[#0284c7] bg-sky-50 shadow-sm shadow-sky-100'
                    : 'text-slate-600 hover:text-[#0284c7] hover:bg-sky-50/50'
                }`}
              >
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7] animate-pulse" />
                )}
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* CỤM NÚT ĐĂNG KÝ & NÚT 3 GẠCH */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Nút Đăng Ký với hiệu ứng Shimmer */}
          <Link
            href="/dang-ky"
            className="relative group overflow-hidden px-5 sm:px-6 py-2.5 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 transition-all duration-200 active:scale-95"
          >
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent ease-out" />
            <span className="relative z-10">Đăng Ký</span>
          </Link>

          {/* Nút Hamburger cho Mobile */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Mở menu điều hướng"
            className="lg:hidden p-2.5 rounded-2xl text-slate-700 hover:text-[#0284c7] hover:bg-white border border-slate-200/80 focus:outline-none transition-all active:scale-90 z-50 bg-white/70 backdrop-blur-sm"
          >
            <div className="w-5 h-4 flex flex-col justify-between items-center relative">
              <span
                className={`w-5 h-0.5 bg-current rounded-full transition-all duration-300 transform ${
                  menuOpen ? 'rotate-45 translate-y-1.5' : ''
                }`}
              />
              <span
                className={`w-5 h-0.5 bg-current rounded-full transition-opacity duration-300 ${
                  menuOpen ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <span
                className={`w-5 h-0.5 bg-current rounded-full transition-all duration-300 transform ${
                  menuOpen ? '-rotate-45 -translate-y-2' : ''
                }`}
              />
            </div>
          </button>
        </div>

      </div>

      {/* THANH TIẾN TRÌNH CUỘN TRANG */}
      <div className="absolute bottom-0 left-0 w-full h-[2.5px] bg-slate-200/30">
        <div
          className="h-full bg-gradient-to-r from-[#0284c7] via-[#38bdf8] to-[#60a5fa] transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* MENU MOBILE TRƯỢT XUỐNG VỚI HIỆU ỨNG SO LE */}
      <div
        className={`lg:hidden fixed inset-x-0 top-20 bg-white/95 backdrop-blur-xl border-b border-sky-100 shadow-2xl transition-all duration-300 ease-in-out origin-top ${
          menuOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto visible'
            : 'opacity-0 -translate-y-4 pointer-events-none invisible'
        }`}
        style={{ height: 'calc(100vh - 80px)' }}
      >
        <div className="flex flex-col h-full justify-between px-6 py-6 overflow-y-auto">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link, idx) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    transitionDelay: menuOpen ? `${idx * 40}ms` : '0ms',
                    transform: menuOpen ? 'translateX(0)' : 'translateX(-12px)',
                    opacity: menuOpen ? 1 : 0,
                  }}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl text-base font-bold transition-all duration-300 ${
                    isActive
                      ? 'bg-sky-50 text-[#0284c7] border border-sky-100 shadow-sm'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-[#0284c7]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
                    )}
                    {link.name}
                  </span>
                  <svg
                    className="w-4 h-4 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              );
            })}
          </nav>

          <div className="pt-6 border-t border-slate-100 text-center space-y-2">
            <p className="text-xs font-semibold text-slate-600">
              Trường Đại học Quy Nhơn
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}