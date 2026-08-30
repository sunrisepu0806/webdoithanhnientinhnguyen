'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Calendar, Users, ArrowLeft, ArrowRight, Clock } from 'lucide-react';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export interface ActivityRegisterItem {
  id: string;
  tieuDe: string;
  moTaNgan: string;
  anhDaiDien: string;
  ngayDang: string;
  startDate?: string;
  endDate?: string;
  soNguoiDangKy: number;
  maxParticipants: number;
  isOpen: boolean;
  rawTime?: number;
}

// Chuẩn hóa mọi định dạng về timestamp để so sánh/sắp xếp
function parseDateToTimestamp(dateStr: string, fallbackTimestamp?: any): number {
  if (fallbackTimestamp?.toMillis) {
    return fallbackTimestamp.toMillis();
  }
  if (fallbackTimestamp?.seconds) {
    return fallbackTimestamp.seconds * 1000;
  }
  if (dateStr && typeof dateStr === 'string') {
    const trimmed = dateStr.trim();
    const directParsed = new Date(trimmed).getTime();
    if (!isNaN(directParsed)) return directParsed;

    const parts = trimmed.split(/[\/\-\.]/);
    if (parts.length === 3) {
      let day = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      const parsedDate = new Date(year, month, day);
      if (!isNaN(parsedDate.getTime())) return parsedDate.getTime();
    }
  }
  return 0;
}

// Hàm chuẩn hóa chuỗi ngày bất kỳ thành chuẩn Ngày/Tháng/Năm (DD/MM/YYYY)
function formatToVietnameseDate(dateVal?: string): string {
  if (!dateVal || typeof dateVal !== 'string') return '';
  const trimmed = dateVal.trim();
  if (!trimmed) return '';

  // 1. Nếu là chuỗi ISO hoặc datetime-local (VD: 2026-08-30T14:30 hoặc 2026-08-30)
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime()) && (trimmed.includes('T') || trimmed.includes('-'))) {
    const day = parsed.getDate().toString().padStart(2, '0');
    const month = (parsed.getMonth() + 1).toString().padStart(2, '0');
    const year = parsed.getFullYear();
    const hours = parsed.getHours().toString().padStart(2, '0');
    const minutes = parsed.getMinutes().toString().padStart(2, '0');

    if (trimmed.includes('T') && (hours !== '00' || minutes !== '00')) {
      return `${hours}:${minutes} ${day}/${month}/${year}`;
    }
    return `${day}/${month}/${year}`;
  }

  // 2. Nếu là chuỗi phân tách bằng gạch chéo / gạch ngang
  const parts = trimmed.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let p1 = parseInt(parts[0], 10);
    let p2 = parseInt(parts[1], 10);
    let p3 = parseInt(parts[2], 10);

    // Dạng YYYY/MM/DD
    if (p1 > 1000) {
      const year = p1;
      const month = p2.toString().padStart(2, '0');
      const day = p3.toString().padStart(2, '0');
      return `${day}/${month}/${year}`;
    }

    // Dạng MM/DD/YYYY (nếu tháng > 12 thì p1 là ngày)
    if (p1 <= 12 && p2 > 12) {
      const day = p2.toString().padStart(2, '0');
      const month = p1.toString().padStart(2, '0');
      const year = p3 < 100 ? p3 + 2000 : p3;
      return `${day}/${month}/${year}`;
    }

    // Mặc định xem p1 là ngày, p2 là tháng
    const day = p1.toString().padStart(2, '0');
    const month = p2.toString().padStart(2, '0');
    const year = p3 < 100 ? p3 + 2000 : p3;
    return `${day}/${month}/${year}`;
  }

  return trimmed;
}

export default function DanhSachDangKyPage() {
  const [activities, setActivities] = useState<ActivityRegisterItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Hiệu ứng Spotlight & Canvas hạt rơi
  const [mousePos, setMousePos] = useState({ x: 600, y: 300 });
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple: Ripple = { id: Date.now(), x, y };
    setRipples((prev) => [...prev, newRipple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 700);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles = Array.from({ length: 24 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 1,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: Math.random() * 0.5 + 0.2,
      opacity: Math.random() * 0.5 + 0.2,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.y > height) {
          p.y = 0;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(2, 132, 199, ${p.opacity})`;
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Tải dữ liệu biểu mẫu
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const [formsSnap, actRegSnap] = await Promise.all([
          getDocs(collection(db, 'activity_forms')).catch(() => ({ docs: [] })),
          getDocs(collection(db, 'activity_registrations')).catch(() => ({ docs: [] })),
        ]);

        const allRegistrations = actRegSnap.docs.map((d) => d.data());
        const list: ActivityRegisterItem[] = [];

        formsSnap.docs.forEach((d) => {
          const data = d.data() as any;
          const regCount = allRegistrations.filter((r: any) => r.activityId === d.id).length;
          const rawDateStr = data.dateStr || data.ngayDang || '';

          list.push({
            id: d.id,
            tieuDe: data.title || data.tieuDe || 'HOẠT ĐỘNG TÌNH NGUYỆN',
            moTaNgan: data.description || data.moTaNgan || '',
            anhDaiDien: data.bannerImage || data.anhDaiDien || '/logo.png',
            ngayDang: formatToVietnameseDate(rawDateStr),
            startDate: data.startDate || '',
            endDate: data.endDate || '',
            soNguoiDangKy: regCount,
            maxParticipants: Number(data.maxParticipants) || Number(data.gioiHanNguoi) || 0,
            isOpen: data.isOpen !== undefined ? data.isOpen : true,
            rawTime: parseDateToTimestamp(rawDateStr, data.createdAt),
          });
        });

        list.sort((a, b) => (b.rawTime || 0) - (a.rawTime || 0));
        setActivities(list);
      } catch (err) {
        console.error('Lỗi khi tải hoạt động:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  return (
    <div className="flex flex-col select-none font-sans overflow-x-hidden min-h-screen bg-gradient-to-b from-[#f3f7fd] via-[#f7fafd] to-white" suppressHydrationWarning>
      
      <style jsx global>{`
        @keyframes rippleCompact {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(5.5); opacity: 0; }
        }
        @keyframes auroraMove {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.45; }
          50% { transform: translate(30px, -20px) scale(1.15); opacity: 0.75; }
        }
        @keyframes waveMoveFront {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes waveMoveBack {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-aurora-glow { animation: auroraMove 12s ease-in-out infinite alternate; }
        .animate-wave-front { display: flex; width: 200%; animation: waveMoveFront 13s linear infinite; }
        .animate-wave-back { display: flex; width: 200%; animation: waveMoveBack 21s linear infinite; }
        .ripple-circle {
          position: absolute;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid rgba(2, 132, 199, 0.6);
          background: radial-gradient(circle, rgba(186, 230, 253, 0.35) 0%, transparent 70%);
          pointer-events: none;
          animation: rippleCompact 0.7s cubic-bezier(0.1, 0.5, 0.4, 1) forwards;
          z-index: 25;
        }
      `}</style>

      {/* KHỐI NỘI DUNG CHÍNH */}
      <div 
        ref={containerRef}
        onClick={handleContainerClick}
        onMouseMove={handleMouseMove}
        className="flex-1 flex flex-col justify-between relative overflow-hidden cursor-default"
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="ripple-circle"
            style={{ left: `${ripple.x}px`, top: `${ripple.y}px` }}
          />
        ))}

        <div 
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#0284c7 1.5px, transparent 1.5px)',
            backgroundSize: '30px 30px'
          }}
        />

        <div 
          className="absolute pointer-events-none rounded-full blur-[110px] transition-opacity duration-300"
          style={{
            width: '560px',
            height: '560px',
            left: `${mousePos.x - 280}px`,
            top: `${mousePos.y - 280}px`,
            background: 'radial-gradient(circle, rgba(2, 132, 199, 0.22) 0%, rgba(99, 102, 241, 0.12) 45%, transparent 70%)',
            zIndex: 1
          }}
        />

        <div className="absolute -top-28 -left-20 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-sky-300/30 via-blue-400/20 to-teal-200/20 blur-[110px] animate-aurora-glow pointer-events-none" />
        <div className="absolute top-1/3 -right-24 w-[460px] h-[460px] rounded-full bg-gradient-to-br from-indigo-300/20 via-sky-300/25 to-blue-200/20 blur-[120px] animate-aurora-glow pointer-events-none" style={{ animationDelay: '-6s' }} />

        {/* NỘI DUNG DANH SÁCH CARD NGANG */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-20 pt-8 pb-16 space-y-6">
          
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0284c7] transition"
            >
              <ArrowLeft size={14} /> Về Trang Chủ
            </Link>
          </div>

          <div className="text-center space-y-1.5 pb-2">
            <h1 className="text-3xl sm:text-4xl md:text-[40px] font-black text-[#0284c7] tracking-tight uppercase">
              ĐĂNG KÝ THAM GIA HOẠT ĐỘNG
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
              Danh sách các hoạt động thiện nguyện và chương trình đang mở đăng ký của Đội TNTN QNU.
            </p>
          </div>

          {/* DANH SÁCH CÁC CARD */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 animate-pulse">
                  <div className="w-full md:w-80 h-44 bg-slate-200 rounded-2xl shrink-0" />
                  <div className="flex-1 space-y-3 py-2">
                    <div className="h-4 bg-slate-200 rounded w-1/4" />
                    <div className="h-6 bg-slate-200 rounded w-3/4" />
                    <div className="h-4 bg-slate-100 rounded w-full" />
                    <div className="h-4 bg-slate-100 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-5">
              {activities.map((item) => {
                const now = new Date().getTime();
                const endTimestamp = item.endDate ? new Date(item.endDate).getTime() : NaN;
                const startTimestamp = item.startDate ? new Date(item.startDate).getTime() : NaN;

                const isExpired = !isNaN(endTimestamp) && now > endTimestamp;
                const isNotStarted = !isNaN(startTimestamp) && now < startTimestamp;
                const hasLimit = item.maxParticipants > 0;
                const isFull = hasLimit && item.soNguoiDangKy >= item.maxParticipants;
                const isClosed = !item.isOpen || isFull || isExpired || isNotStarted;

                const formattedEndDate = formatToVietnameseDate(item.endDate);

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 border border-slate-200 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col md:flex-row items-center gap-6 group"
                  >
                    {/* KHỐI ẢNH BÊN TRÁI */}
                    <div className="w-full md:w-[360px] h-52 sm:h-56 bg-slate-100 rounded-2xl overflow-hidden shrink-0 border border-slate-100">
                      <img
                        src={item.anhDaiDien || '/logo.png'}
                        alt={item.tieuDe}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>

                    {/* KHỐI THÔNG TIN Ở GIỮA */}
                    <div className="flex-1 min-w-0 space-y-2.5 text-left w-full">
                      <span className="text-xs font-black uppercase text-[#0284c7] tracking-wider block">
                        ĐĂNG KÝ CHƯƠNG TRÌNH
                      </span>

                      <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 leading-snug uppercase tracking-tight group-hover:text-[#0284c7] transition-colors line-clamp-2">
                        {item.tieuDe}
                      </h2>

                      <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 leading-relaxed font-normal">
                        {item.moTaNgan || 'Chào mừng bạn tham gia hoạt động cùng Đội Thanh niên Tình nguyện QNU.'}
                      </p>

                      {/* HÀNG THÔNG TIN: NGÀY/THÁNG/NĂM CHUẨN XÁC */}
                      <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-semibold text-slate-400 pt-1">
                        {item.ngayDang && (
                          <span className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-[#0284c7]" /> {item.ngayDang}
                          </span>
                        )}

                        <span className="flex items-center gap-1.5">
                          <Users size={14} className="text-[#0284c7]" /> 
                          {hasLimit ? (
                            <span>
                              <strong className={isFull ? 'text-rose-600' : 'text-slate-700'}>{item.soNguoiDangKy}/{item.maxParticipants}</strong> đã đăng ký
                            </span>
                          ) : (
                            <span>{item.soNguoiDangKy} đã đăng ký</span>
                          )}
                        </span>

                        {formattedEndDate && (
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <Clock size={14} className="text-[#0284c7]" />
                            <span>Hạn chót: <strong>{formattedEndDate}</strong></span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* NÚT HÀNH ĐỘNG BÊN PHẢI */}
                    <div className="shrink-0 w-full md:w-auto pt-2 md:pt-0">
                      {isClosed ? (
                        <div className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider text-center border border-slate-200 cursor-not-allowed">
                          {isExpired
                            ? 'Đã hết hạn'
                            : isNotStarted
                            ? 'Chưa mở'
                            : isFull
                            ? 'Đã đủ số lượng'
                            : 'Đã đóng'}
                        </div>
                      ) : (
                        <Link
                          href={`/dang-ky/${item.id}`}
                          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all active:scale-95 cursor-pointer"
                        >
                          <span>Đăng ký ngay</span>
                          <ArrowRight size={14} />
                        </Link>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 font-semibold space-y-2">
              <p className="text-base font-bold text-slate-600">Hiện tại chưa có hoạt động nào mở đăng ký</p>
              <p className="text-xs">Vui lòng quay lại sau khi Ban tổ chức phát hành biểu mẫu mới!</p>
            </div>
          )}

        </div>

        {/* DẢI SÓNG BIỂN CHÂN TRANG */}
        <div className="w-full overflow-hidden leading-none shrink-0 relative z-20 pointer-events-none h-10 sm:h-14 md:h-20">
          <div className="absolute inset-0 animate-wave-back opacity-60">
            <svg viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none" className="w-1/2 h-full block">
              <path d="M0,30 C320,65 420,10 720,25 C1020,40 1140,55 1440,30 L1440,90 L0,90 Z" fill="#dbeafe" />
            </svg>
            <svg viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none" className="w-1/2 h-full block">
              <path d="M0,30 C320,65 420,10 720,25 C1020,40 1140,55 1440,30 L1440,90 L0,90 Z" fill="#dbeafe" />
            </svg>
          </div>

          <div className="absolute inset-0 animate-wave-front opacity-85">
            <svg viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none" className="w-1/2 h-full block">
              <path d="M0,50 C360,75 500,35 800,45 C1100,55 1250,70 1440,50 L1440,90 L0,90 Z" fill="#bfdbfe" />
            </svg>
            <svg viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none" className="w-1/2 h-full block">
              <path d="M0,50 C360,75 500,35 800,45 C1100,55 1250,70 1440,50 L1440,90 L0,90 Z" fill="#bfdbfe" />
            </svg>
          </div>
        </div>

      </div>
    </div>
  );
}