'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Mail, Phone, ChevronRight } from 'lucide-react';

const quickLinks = [
  { name: 'Trang chủ', href: '/' },
  { name: 'Giới thiệu', href: '/gioi-thieu' },
  { name: 'Hoạt động', href: '/hoat-dong' },
];

const joinLinks = [
  { name: 'Tra cứu ', href: '/tracuudiemdanh' },
];

export default function ChanTrang() {
  return (
    <footer className="w-full bg-[#0a2540] text-white border-t border-slate-800 relative overflow-hidden select-none">
      {/* Cực quang hắt sáng nền mờ đồng bộ */}
      <div className="absolute -top-24 -left-20 w-80 h-80 bg-sky-500/10 blur-[90px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-80 h-80 bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-12 pb-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 pb-10 border-b border-blue-900/60">
          
          {/* Cột 1: Thông tin CLB / Đội */}
          <div className="lg:col-span-4 space-y-4">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-11 h-11 flex items-center justify-center shrink-0">
                <img
                  src="/logo.png"
                  alt="Logo Đội TNTN QNU"
                  className="w-full h-full object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="leading-tight">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-300 group-hover:text-white transition-colors">
                  ĐỘI Thanh Niên Tình Nguyện QNU
                </p>
                <p className="text-base font-black text-white tracking-tight group-hover:text-blue-400 transition-colors">
                  ĐẠI HỌC QUY NHƠN
                </p>
              </div>
            </Link>

            <p className="text-xs text-slate-300 italic">
              Kết nối sức trẻ – Lan tỏa yêu thương
            </p>

            <div className="pt-2">
              <a
                href="https://www.facebook.com/DTNTNQNU/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-blue-600 text-xs font-semibold text-white transition-all duration-300 hover:scale-105 shadow-sm border border-white/10"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Fanpage Đội
              </a>
            </div>
          </div>

          {/* Cột 2: Thông tin liên hệ */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-white border-b border-white/10 pb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              THÔNG TIN LIÊN HỆ
            </h3>
            <div className="space-y-2.5 text-xs text-slate-300">
              <p className="flex items-start gap-2.5">
                <MapPin size={16} className="text-blue-400 shrink-0 mt-0.5" />
                <span>Trường Đại học Quy Nhơn, 170 An Dương Vương, Quy Nhơn</span>
              </p>
              <p className="flex items-center gap-2.5">
                <Mail size={16} className="text-blue-400 shrink-0" />
                <a
                  href="mailto:doithanhnientinhnguyenqnu23@gmail.com"
                  className="hover:text-blue-300 transition-colors truncate"
                >
                  doitntnqnu2023@gmail.com
                </a>
              </p>
              <p className="flex items-center gap-2.5">
                <Phone size={16} className="text-blue-400 shrink-0" />
                <a
                  href="tel:0376217236"
                  className="hover:text-blue-300 transition-colors"
                >
                  0376217236 (Đỗ Minh Tú)
                </a>
              </p>
            </div>
          </div>

          {/* Cột 3: Liên kết nhanh */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-white border-b border-white/10 pb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              LIÊN KẾT NHANH
            </h3>
            <ul className="space-y-2 text-xs text-slate-300">
              {quickLinks.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="hover:text-blue-400 hover:translate-x-1 transition-all flex items-center gap-1.5 group"
                  >
                    <ChevronRight size={12} className="text-slate-400 group-hover:text-blue-400 transition-colors shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Cột 4: Tham gia Đội */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-white border-b border-white/10 pb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              THAM GIA ĐỘI
            </h3>
            <ul className="space-y-2 text-xs text-slate-300">
              {joinLinks.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="hover:text-blue-400 hover:translate-x-1 transition-all flex items-center gap-1.5 group"
                  >
                    <ChevronRight size={12} className="text-slate-400 group-hover:text-blue-400 transition-colors shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bản quyền & Tác giả */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
          <p>© 2026 Đội Thanh Niên Tình Nguyện QNU. All rights reserved.</p>
          <p className="flex items-center gap-1">
            <span>Developed by</span>
            <a
              href="https://www.facebook.com/pupipupipupi08"
              target="_blank"
              rel="noreferrer"
              className="text-slate-300 hover:text-blue-400 font-medium transition-colors underline-offset-2 hover:underline"
            >
              obi.phu08
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}