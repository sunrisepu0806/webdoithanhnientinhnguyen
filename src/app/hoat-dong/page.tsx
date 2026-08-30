'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Calendar, Eye } from 'lucide-react';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export interface ActivityCardItem {
  id: string;
  tieuDe: string;
  moTaNgan: string;
  anhDaiDien: string;
  ngayDang: string;
  luotXem: number;
  rawTime?: number;
}

// Xóa sạch các thẻ BBCode thô nếu người dùng lỡ dán vào mô tả ngắn
function cleanBBCode(text: string) {
  if (!text) return '';
  return text.replace(/\[\/?(b|i|u|blue|red|green|orange|purple|quote|list)\]/gi, '').trim();
}

// Chuyển đổi định dạng DD/MM/YYYY sang timestamp để sắp xếp ngày chuẩn xác
function parseDateToTimestamp(dateStr: string, fallbackTimestamp?: any): number {
  if (dateStr && typeof dateStr === 'string') {
    const parts = dateStr.trim().split(/[\/\-\.]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      const parsedDate = new Date(year, month, day);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.getTime();
      }
    }
  }

  if (fallbackTimestamp?.seconds) {
    return fallbackTimestamp.seconds * 1000;
  }
  return 0;
}

export default function DanhSachHoatDongPage() {
  const [activities, setActivities] = useState<ActivityCardItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Hiệu ứng Spotlight, Ripple, Canvas hạt
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

  // Canvas hạt bay lơ lửng
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particleCount = 28;
    const particles = Array.from({ length: particleCount }).map(() => ({
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

  // Lấy dữ liệu và sắp xếp theo ngày mới nhất lên đầu
  const fetchActivities = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'posts_activities'));

      const list: ActivityCardItem[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const dateStr = data.ngayDang || '';
        const timestamp = parseDateToTimestamp(dateStr, data.createdAt);

        list.push({
          id: docSnap.id,
          tieuDe: cleanBBCode(data.tieuDe) || 'CHƯA CÓ TIÊU ĐỀ',
          moTaNgan: cleanBBCode(data.moTaNgan) || '',
          anhDaiDien: data.anhDaiDien || '/logo.png',
          ngayDang: dateStr,
          luotXem: Number(data.luotXem) || 0,
          rawTime: timestamp,
        });
      });

      // Sắp xếp giảm dần theo thời gian (mới nhất lên đầu)
      list.sort((a, b) => (b.rawTime || 0) - (a.rawTime || 0));

      setActivities(list);
    } catch (err) {
      console.error('Lỗi kết nối Firebase Firestore:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  return (
    <div className="flex flex-col select-none font-sans overflow-x-hidden min-h-screen bg-gradient-to-b from-[#f3f7fd] via-[#f7fafd] to-white" suppressHydrationWarning>
      
      {/* Keyframe Animations */}
      <style jsx global>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(0.5deg); }
        }
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
        .animate-float-card { animation: floatSlow 6s ease-in-out infinite; }
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
        {/* CANVAS HẠT BAY */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

        {/* GỢN SÓNG NƯỚC KHI CLICK */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="ripple-circle"
            style={{ left: `${ripple.x}px`, top: `${ripple.y}px` }}
          />
        ))}

        {/* LỚP LƯỚI HÌNH HỌC */}
        <div 
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#0284c7 1.5px, transparent 1.5px)',
            backgroundSize: '30px 30px'
          }}
        />

        {/* TIA SÁNG THEO CON TRỎ CHUỘT */}
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

        {/* CỰC QUANG NỀN */}
        <div className="absolute -top-28 -left-20 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-sky-300/30 via-blue-400/20 to-teal-200/20 blur-[110px] animate-aurora-glow pointer-events-none" />
        <div className="absolute top-1/3 -right-24 w-[460px] h-[460px] rounded-full bg-gradient-to-br from-indigo-300/20 via-sky-300/25 to-blue-200/20 blur-[120px] animate-aurora-glow pointer-events-none" style={{ animationDelay: '-6s' }} />

        {/* BONG BÓNG TRANG TRÍ */}
        <div className="absolute top-[12%] right-[8%] w-3 h-3 rounded-full bg-indigo-300/70 animate-ping duration-1000 pointer-events-none" />
        <div className="absolute bottom-[24%] right-[4%] w-2 h-2 rounded-full bg-emerald-400/70 animate-pulse pointer-events-none" />
        <div className="absolute top-[45%] left-[4%] w-2.5 h-2.5 rounded-full bg-blue-400/80 animate-bounce duration-1000 pointer-events-none" />
        <div className="absolute top-[18%] left-[10%] w-3 h-3 rounded-full bg-rose-300/60 animate-pulse pointer-events-none" />

        {/* DANH SÁCH HOẠT ĐỘNG */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 w-full relative z-20 pt-12 pb-16 space-y-10">
          
          {/* Tiêu đề chính */}
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-[42px] font-black text-[#0284c7] tracking-tight uppercase">
              HOẠT ĐỘNG CỦA CÂU LẠC BỘ
            </h1>
          </div>

          {/* Grid danh sách bài viết */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl sm:rounded-[32px] overflow-hidden border-4 border-white shadow-xl shadow-sky-950/10 p-4 space-y-4 animate-pulse">
                  <div className="w-full h-52 bg-slate-200 rounded-2xl" />
                  <div className="space-y-2">
                    <div className="h-5 bg-slate-200 rounded w-3/4" />
                    <div className="h-3.5 bg-slate-100 rounded w-full" />
                    <div className="h-3.5 bg-slate-100 rounded w-2/3" />
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex justify-between">
                    <div className="h-3 bg-slate-100 rounded w-1/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {activities.map((item) => (
                <Link
                  key={item.id}
                  href={`/hoat-dong/${item.id}`}
                  className="bg-white rounded-2xl sm:rounded-[32px] overflow-hidden border-4 border-white shadow-xl shadow-sky-950/10 hover:shadow-2xl hover:shadow-sky-950/20 transition-all duration-300 flex flex-col group hover:-translate-y-1.5"
                >
                  {/* Ảnh Card */}
                  <div className="relative w-full h-56 bg-slate-50 overflow-hidden flex items-center justify-center p-2.5">
                    <img
                      src={item.anhDaiDien}
                      alt={item.tieuDe}
                      loading="lazy"
                      className="w-full h-full object-cover rounded-2xl transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  {/* Nội dung Card (ĐÃ BỎ TRÁI TIM) */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      <h3 className="text-base font-extrabold text-slate-900 leading-snug group-hover:text-[#0284c7] transition-colors line-clamp-2">
                        {item.tieuDe}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                        {item.moTaNgan}
                      </p>
                    </div>

                    {/* Footer Card */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-[#0284c7]" /> {item.ngayDang}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye size={13} className="text-[#0284c7]" /> {item.luotXem} lượt xem
                      </span>
                      <span className="text-[#0284c7] font-bold group-hover:underline">
                        Xem chi tiết &rarr;
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 font-semibold space-y-2">
              <p className="text-base font-bold text-slate-600">Chưa có bài viết hoạt động nào</p>
              <p className="text-xs">AHIHI CHƯA CÓ BÀI VIẾT NÀO CẢ......</p>
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