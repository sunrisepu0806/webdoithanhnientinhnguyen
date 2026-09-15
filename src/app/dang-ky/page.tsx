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

function parseDateToTimestamp(dateStr: string, fallbackTimestamp?: any): number {
  if (fallbackTimestamp?.toMillis) return fallbackTimestamp.toMillis();
  if (fallbackTimestamp?.seconds) return fallbackTimestamp.seconds * 1000;
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

function formatToVietnameseDate(dateVal?: string): string {
  if (!dateVal || typeof dateVal !== 'string') return '';
  const trimmed = dateVal.trim();
  if (!trimmed) return '';

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

  const parts = trimmed.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let p1 = parseInt(parts[0], 10);
    let p2 = parseInt(parts[1], 10);
    let p3 = parseInt(parts[2], 10);

    if (p1 > 1000) {
      return `${p3.toString().padStart(2, '0')}/${p2.toString().padStart(2, '0')}/${p1}`;
    }
    return `${p1.toString().padStart(2, '0')}/${p2.toString().padStart(2, '0')}/${p3 < 100 ? p3 + 2000 : p3}`;
  }

  return trimmed;
}

export default function DanhSachDangKyPage() {
  const [activities, setActivities] = useState<ActivityRegisterItem[]>([]);
  const [loading, setLoading] = useState(true);

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

    const particles = Array.from({ length: 22 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 1,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: Math.random() * 0.4 + 0.2,
      opacity: Math.random() * 0.4 + 0.15,
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
            anhDaiDien: data.bannerImage || data.anhDaiDien || '/icon.png',
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
    <div className="flex flex-col select-none font-sans overflow-x-hidden min-h-screen bg-[#f3f8fd]/70" suppressHydrationWarning>
      <style jsx global>{`
        @keyframes rippleCompact {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(5.5); opacity: 0; }
        }
        @keyframes waveMoveFront {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes waveMoveBack {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-wave-front { display: flex; width: 200%; animation: waveMoveFront 14s linear infinite; }
        .animate-wave-back { display: flex; width: 200%; animation: waveMoveBack 22s linear infinite; }
        .ripple-circle {
          position: absolute;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid rgba(2, 132, 199, 0.4);
          background: radial-gradient(circle, rgba(186, 230, 253, 0.35) 0%, transparent 70%);
          pointer-events: none;
          animation: rippleCompact 0.7s cubic-bezier(0.1, 0.5, 0.4, 1) forwards;
          z-index: 25;
        }
      `}</style>

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

        {/* Ánh sáng nền nhẹ nhàng */}
        <div 
          className="absolute pointer-events-none rounded-full blur-[110px] transition-opacity duration-300"
          style={{
            width: '480px',
            height: '480px',
            left: `${mousePos.x - 240}px`,
            top: `${mousePos.y - 240}px`,
            background: 'radial-gradient(circle, rgba(2, 132, 199, 0.15) 0%, transparent 70%)',
            zIndex: 1
          }}
        />

        {/* NỘI DUNG CHÍNH */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 w-full relative z-20 pt-8 pb-20 space-y-8">
          
          {/* Nút quay lại */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0284c7] transition bg-white/70 backdrop-blur-xs px-3.5 py-1.5 rounded-full border border-slate-200/70 shadow-xs"
            >
              <ArrowLeft size={13} /> Về Trang Chủ
            </Link>
          </div>

          {/* TIÊU ĐỀ THEO PHONG CÁCH BÀI VIẾT (TƯƠNG ĐỒNG ẢNH MẪU) */}
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h1 className="text-2xl sm:text-3xl md:text-[34px] font-extrabold text-[#0284c7] tracking-tight leading-tight">
              Đăng Ký Tham Gia Hoạt Động
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-500 italic font-normal leading-relaxed">
              Danh sách các hoạt động thiện nguyện, chiến dịch và chương trình đang mở đăng ký của <strong className="font-semibold not-italic text-slate-700">Đội TNTN QNU</strong>.
            </p>
          </div>

          {/* DANH SÁCH CARD THEO PHONG CÁCH BO GÓC LỚN & ĐỔ BÓNG MỀM */}
          {loading ? (
            <div className="space-y-6">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white/90 rounded-[28px] p-6 border border-slate-200/80 shadow-[0_8px_25px_rgba(2,132,199,0.06)] flex flex-col md:flex-row items-center gap-6 animate-pulse">
                  <div className="w-full md:w-72 h-44 bg-slate-200 rounded-2xl shrink-0" />
                  <div className="flex-1 space-y-3 w-full">
                    <div className="h-5 bg-slate-200 rounded w-1/2" />
                    <div className="h-3.5 bg-slate-100 rounded w-full" />
                    <div className="h-3.5 bg-slate-100 rounded w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-6">
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
                const isDefaultLogo = item.anhDaiDien.includes('icon.png') || item.anhDaiDien.includes('logo.png');

                return (
                  <div
                    key={item.id}
                    className="bg-white/90 backdrop-blur-xs rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 border border-slate-200/80 shadow-[0_8px_30px_rgba(2,132,199,0.06)] hover:shadow-[0_12px_36px_rgba(2,132,199,0.12)] transition-all duration-300 flex flex-col md:flex-row items-center gap-6 group"
                  >
                    {/* KHỐI ẢNH ĐẠI DIỆN BO CONG */}
                    <div className="w-full md:w-[280px] lg:w-[320px] h-48 sm:h-52 rounded-[22px] overflow-hidden shrink-0 border border-slate-100 bg-slate-50 flex items-center justify-center relative">
                      {isDefaultLogo ? (
                        <div className="w-24 h-24 rounded-full bg-white p-2.5 shadow-sm border border-slate-100 flex items-center justify-center">
                          <img
                            src={item.anhDaiDien}
                            alt="Logo"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <img
                          src={item.anhDaiDien}
                          alt={item.tieuDe}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )}

                      {/* Trạng thái đè lên ảnh */}
                      <div className="absolute top-3 left-3">
                        {isClosed ? (
                          <span className="px-3 py-1 rounded-full bg-slate-900/70 backdrop-blur-xs text-white text-[10px] font-bold uppercase tracking-wider">
                            {isExpired ? 'Đã hết hạn' : isNotStarted ? 'Sắp diễn ra' : isFull ? 'Đủ số lượng' : 'Tạm đóng'}
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-[#0284c7] text-white text-[10px] font-bold uppercase tracking-wider shadow-xs flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            Đang mở
                          </span>
                        )}
                      </div>
                    </div>

                    {/* KHỐI THÔNG TIN VĂN BẢN (TYPOGRAPHY THEO MẪU) */}
                    <div className="flex-1 min-w-0 space-y-2.5 text-left w-full">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#0284c7] block">
                        ĐĂNG KÝ CHƯƠNG TRÌNH
                      </span>

                      <h2 className="text-lg sm:text-xl font-bold text-[#0284c7] leading-snug tracking-tight group-hover:text-[#0369a1] transition-colors">
                        {item.tieuDe}
                      </h2>

                      {/* Đoạn mô tả với font chữ nghiêng và màu xám thanh lịch */}
                      <p className="text-xs sm:text-[13px] text-slate-600 italic leading-relaxed font-normal">
                        {item.moTaNgan || (
                          <>
                            Chào mừng bạn tham gia hoạt động cùng <strong className="font-semibold not-italic text-slate-800">Đội Thanh niên Tình nguyện QNU</strong>, nơi gắn kết và lưu giữ những kỷ niệm nhiệt huyết của tuổi trẻ.
                          </>
                        )}
                      </p>

                      {/* Hàng thông số ngày tháng và số lượng đăng ký */}
                      <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-slate-500 pt-2 border-t border-slate-100/90 font-medium">
                        {item.ngayDang && (
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-[#0284c7]" />
                            <span>{item.ngayDang}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          <Users size={13} className="text-[#0284c7]" />
                          <span>
                            {hasLimit ? (
                              <>
                                <strong className={isFull ? 'text-rose-600' : 'text-slate-800'}>
                                  {item.soNguoiDangKy}/{item.maxParticipants}
                                </strong>{' '}
                                đã đăng ký
                              </>
                            ) : (
                              `${item.soNguoiDangKy} đã đăng ký`
                            )}
                          </span>
                        </div>

                        {formattedEndDate && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Clock size={13} className="text-[#0284c7]" />
                            <span>Hạn chót: <strong className="text-slate-800">{formattedEndDate}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* NÚT THAO TÁC BÊN PHẢI */}
                    <div className="shrink-0 w-full md:w-auto pt-2 md:pt-0">
                      {isClosed ? (
                        <div className="w-full md:w-auto px-6 py-3 rounded-full bg-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider text-center border border-slate-200/80 cursor-not-allowed">
                          Đã đóng đăng ký
                        </div>
                      ) : (
                        <Link
                          href={`/dang-ky/${item.id}`}
                          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-full text-xs uppercase tracking-wider shadow-md shadow-sky-500/20 transition-all active:scale-95 cursor-pointer"
                        >
                          <span>Đăng ký ngay</span>
                          <ArrowRight size={13} />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-white/80 rounded-[32px] border border-dashed border-slate-200 text-slate-400 font-medium space-y-1.5 max-w-md mx-auto">
              <p className="text-sm font-bold text-slate-700">Chưa có hoạt động mở đăng ký</p>
              <p className="text-xs">Hiện tại danh sách biểu mẫu đang được cập nhật, vui lòng quay lại sau!</p>
            </div>
          )}

        </div>

        {/* DẢI SÓNG BIỂN MỀM CHÂN TRANG */}
        <div className="w-full overflow-hidden leading-none shrink-0 relative z-20 pointer-events-none h-12 sm:h-16">
          <div className="absolute inset-0 animate-wave-back opacity-55">
            <svg viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none" className="w-1/2 h-full block">
              <path d="M0,30 C320,65 420,10 720,25 C1020,40 1140,55 1440,30 L1440,90 L0,90 Z" fill="#dbeafe" />
            </svg>
            <svg viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none" className="w-1/2 h-full block">
              <path d="M0,30 C320,65 420,10 720,25 C1020,40 1140,55 1440,30 L1440,90 L0,90 Z" fill="#dbeafe" />
            </svg>
          </div>

          <div className="absolute inset-0 animate-wave-front opacity-80">
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