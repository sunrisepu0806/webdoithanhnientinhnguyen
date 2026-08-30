'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Calendar, Eye, ArrowLeft } from 'lucide-react';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export interface ActivityDetail {
  id: string;
  tieuDe: string;
  moTaNgan: string;
  noiDung: string;
  anhDaiDien: string;
  ngayDang: string;
  luotXem: number;
  viTriAnh?: 'trai' | 'phai' | 'giua';
  danhSachAnhPhu?: string[];
}

function renderFormattedContent(text: string) {
  if (!text) return null;

  const paragraphs = text.split('\n\n');

  return paragraphs.map((para, pIdx) => {
    const html = para
      .replace(/\[b\](.*?)\[\/b\]/gi, '<strong class="font-extrabold text-slate-900">$1</strong>')
      .replace(/\[i\](.*?)\[\/i\]/gi, '<em class="italic text-slate-700">$1</em>')
      .replace(/\[u\](.*?)\[\/u\]/gi, '<u class="underline decoration-[#0284c7] decoration-2">$1</u>')
      .replace(/\[blue\](.*?)\[\/blue\]/gi, '<span class="text-[#0284c7] font-semibold">$1</span>')
      .replace(/\[red\](.*?)\[\/red\]/gi, '<span class="text-rose-600 font-semibold">$1</span>')
      .replace(/\[green\](.*?)\[\/green\]/gi, '<span class="text-emerald-600 font-semibold">$1</span>')
      .replace(/\[orange\](.*?)\[\/orange\]/gi, '<span class="text-amber-500 font-semibold">$1</span>')
      .replace(/\[purple\](.*?)\[\/purple\]/gi, '<span class="text-purple-600 font-semibold">$1</span>')
      .replace(/\[quote\](.*?)\[\/quote\]/gi, '<div class="p-4 my-4 border-l-4 border-[#0284c7] bg-blue-50/80 text-slate-800 font-medium italic rounded-r-2xl shadow-xs leading-relaxed clear-both">$1</div>')
      .replace(/\[list\](.*?)\[\/list\]/gi, '<div class="flex items-start gap-2.5 my-2.5 text-slate-700"><span class="text-[#0284c7] font-black text-base leading-none">•</span><span>$1</span></div>');

    return (
      <div
        key={pIdx}
        className="text-sm sm:text-base leading-relaxed text-slate-700 text-justify mb-4 font-sans"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  });
}

export default function ChiTietHoatDongPage() {
  const params = useParams();
  const rawId = params?.id;
  const postId = Array.isArray(rawId) ? rawId[0] : (typeof rawId === 'string' ? rawId : '');

  const [post, setPost] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Hiệu ứng Spotlight & Nghiêng 3D Tilt
  const [mousePos, setMousePos] = useState({ x: 600, y: 300 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

  // Gợn sóng nước khi click
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleHeroClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple: Ripple = { id: Date.now(), x, y };
    setRipples((prev) => [...prev, newRipple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 700);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setMousePos({ x: mouseX, y: mouseY });

    const x = (mouseX / rect.width - 0.5) * 16;
    const y = (mouseY / rect.height - 0.5) * -16;
    setTilt({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
  };

  const handleMouseLeaveHero = () => {
    setTilt({ x: 0, y: 0 });
  };

  // Canvas hiệu ứng hạt rơi lơ lửng
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

    const particleCount = 32;
    const particles = Array.from({ length: particleCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.2 + 1,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: Math.random() * 0.6 + 0.25,
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

  // Tải dữ liệu từ Firestore
  useEffect(() => {
    if (!postId) {
      setLoading(false);
      return;
    }

    const fetchPost = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, 'posts_activities', String(postId));
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setPost({ id: docSnap.id, ...docSnap.data() } as ActivityDetail);
          try {
            updateDoc(docRef, { luotXem: increment(1) });
          } catch (e) {
            console.warn(e);
          }
        } else {
          setPost(null);
        }
      } catch (e) {
        console.error('Lỗi khi tải bài viết:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  const isImageLeft = post?.viTriAnh === 'trai';
  const isImageCenter = post?.viTriAnh === 'giua';

  return (
    <div className="flex flex-col select-none font-sans overflow-x-hidden min-h-screen relative" suppressHydrationWarning>
      
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

      {/* KHỐI NỀN VÀ CONTAINER TƯƠNG TÁC */}
      <div 
        ref={heroRef}
        onClick={handleHeroClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeaveHero}
        className="min-h-[calc(100vh-80px)] flex flex-col justify-between relative bg-gradient-to-b from-[#f3f7fd] via-[#f7fafd] to-white overflow-hidden cursor-default flex-1"
      >
        {/* CANVAS HẠT BAY LƠ LỬNG */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

        {/* VÒNG GỢN SÓNG NƯỚC KHI CLICK */}
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

        {/* TIA SÁNG CON TRỎ CHUỘT */}
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

        {/* KHỐI NỘI DUNG CHÍNH */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center relative z-20 py-24 text-slate-400">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-[#0284c7] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Đang tải nội dung...</p>
            </div>
          </div>
        ) : !post ? (
          <div className="flex-1 flex flex-col items-center justify-center relative z-20 space-y-4 p-6 py-24">
            <h2 className="text-2xl font-black text-slate-800">Không tìm thấy bài viết!</h2>
            <p className="text-xs text-slate-400">Bài viết không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
            <Link href="/hoat-dong" className="px-6 py-3 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition shadow-md">
              Quay lại danh sách
            </Link>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 w-full relative z-20 flex-1 my-auto pt-6 pb-8 space-y-6">
            
            {/* Nút quay lại */}
            <div>
              <Link
                href="/hoat-dong"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0284c7] transition"
              >
                <ArrowLeft size={14} /> Quay lại danh sách hoạt động
              </Link>
            </div>

            {isImageCenter ? (
              <div className="space-y-6">
                <div className="space-y-2 border-b border-slate-200 pb-4">
                  <h1 className="text-3xl sm:text-4xl md:text-[42px] font-black text-[#0284c7] tracking-tight leading-tight uppercase">
                    {post.tieuDe}
                  </h1>

                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 pt-1">
                    {post.ngayDang && (
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-[#0284c7]" /> {post.ngayDang}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Eye size={13} className="text-[#0284c7]" /> {post.luotXem || 0} lượt xem
                    </span>
                  </div>
                </div>

                {post.anhDaiDien && (
                  <div 
                    style={{
                      transform: `perspective(1100px) rotateX(${tilt.y * 0.3}deg) rotateY(${tilt.x * 0.3}deg)`,
                      transition: 'transform 0.12s ease-out'
                    }}
                    className="w-full aspect-[16/9] md:aspect-[21/9] rounded-2xl sm:rounded-[32px] overflow-hidden border-4 border-white bg-slate-100 shadow-2xl shadow-sky-950/20 animate-float-card my-4"
                  >
                    <img
                      src={post.anhDaiDien}
                      alt={post.tieuDe}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  </div>
                )}

                <div className="space-y-4 max-w-4xl text-slate-700">
                  {renderFormattedContent(post.noiDung)}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Tiêu đề & Ngày đăng */}
                <div className="space-y-2 max-w-3xl">
                  <h1 className="text-3xl sm:text-4xl md:text-[42px] lg:text-[44px] font-black text-[#0284c7] tracking-tight leading-tight">
                    {post.tieuDe}
                  </h1>

                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 pt-1">
                    {post.ngayDang && (
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-[#0284c7]" /> {post.ngayDang}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Eye size={13} className="text-[#0284c7]" /> {post.luotXem || 0} lượt xem
                    </span>
                  </div>
                </div>

                {/* Bố cục float: ảnh nổi, chữ ôm sát & tự tràn xuống dưới ảnh */}
                <div className="pt-2 block">
                  <div 
                    style={{
                      transform: `perspective(1100px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
                      transition: 'transform 0.12s ease-out'
                    }}
                    className={`w-full lg:w-[48%] aspect-[16/11] mb-6 animate-float-card ${
                      isImageLeft ? 'lg:float-left lg:mr-8' : 'lg:float-right lg:ml-8'
                    }`}
                  >
                    <div className="w-full h-full rounded-2xl sm:rounded-[32px] overflow-hidden border-4 border-white bg-slate-100 shadow-2xl shadow-sky-950/20">
                      <img
                        src={post.anhDaiDien || '/logo.png'}
                        alt={post.tieuDe}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                    </div>
                  </div>

                  <div className="text-slate-700">
                    {renderFormattedContent(post.noiDung)}
                  </div>

                  <div className="clear-both" />
                </div>

              </div>
            )}

            {/* Danh sách ảnh phụ */}
            {post.danhSachAnhPhu && post.danhSachAnhPhu.length > 0 && (
              <div className="pt-8 border-t border-slate-200/80 space-y-5 clear-both">
                <h3 className="text-xl font-black text-[#0284c7] uppercase tracking-wide flex items-center gap-2">
                  <span>HÌNH ẢNH HOẠT ĐỘNG</span>
                  <span className="text-xs font-extrabold text-[#0284c7] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                    {post.danhSachAnhPhu.length}
                  </span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {post.danhSachAnhPhu.map((imgSrc, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-[16/10] rounded-2xl sm:rounded-[24px] overflow-hidden shadow-lg border-2 border-white bg-white group"
                    >
                      <img
                        src={imgSrc}
                        alt={`Ảnh hoạt động ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

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