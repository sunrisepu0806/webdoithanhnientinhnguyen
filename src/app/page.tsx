'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
interface Ripple {
  id: number;
  x: number;
  y: number;
}

export default function TrangChu() {
  const cacCauSlogan = [
    'Nhìn bằng mắt, nghe bằng tai, cảm nhận bằng trái tim và hành động',
    'Kết nối sức trẻ, lan tỏa yêu thương',
    'Nhiệt huyết – Tiên phong – Phụng sự cộng đồng',
  ];

  // 3 ảnh trong thư mục public/
  const danhSachAnh = ['/anh1.jpg', '/anh4.jpg', '/anh2.jpg'];

  const [dongHienTai, setDongHienTai] = useState(0);
  const [chuoiHienThi, setChuoiHienThi] = useState('');
  const [dangXoa, setDangXoa] = useState(false);

  // Chỉ số ảnh đang hiển thị tự động
  const [activeSlide, setActiveSlide] = useState(0);

  // Trạng thái hover
  const [isHoveringGroup, setIsHoveringGroup] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<'trai' | 'chinh' | 'phai' | null>(null);

  // Hiệu ứng Spotlight theo chuột & Nghiêng 3D Tilt
  const [mousePos, setMousePos] = useState({ x: 600, y: 300 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

  // Danh sách các gợn sóng mặt nước khi click
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Xử lý tạo gợn sóng nước gọn gàng, thanh thoát khi click
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

    // Tính toán góc nghiêng 3D
    const x = (mouseX / rect.width - 0.5) * 22;
    const y = (mouseY / rect.height - 0.5) * -22;
    setTilt({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
  };

  const handleMouseLeaveHero = () => {
    setTilt({ x: 0, y: 0 });
  };

  // 1. Hiệu ứng gõ máy Typewriter
  useEffect(() => {
    const cau = cacCauSlogan[dongHienTai];
    const tocDo = dangXoa ? 25 : 55;

    const timer = setTimeout(() => {
      if (!dangXoa && chuoiHienThi === cau) {
        setTimeout(() => setDangXoa(true), 2500);
      } else if (dangXoa && chuoiHienThi === '') {
        setDangXoa(false);
        setDongHienTai((prev) => (prev + 1) % cacCauSlogan.length);
      } else {
        setChuoiHienThi(
          dangXoa ? cau.substring(0, chuoiHienThi.length - 1) : cau.substring(0, chuoiHienThi.length + 1)
        );
      }
    }, tocDo);

    return () => clearTimeout(timer);
  }, [chuoiHienThi, dangXoa, dongHienTai]);

  // 2. Hiệu ứng chuyển ảnh tự động
  useEffect(() => {
    if (isHoveringGroup) return;

    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % danhSachAnh.length);
    }, 2800);

    return () => clearInterval(interval);
  }, [isHoveringGroup, danhSachAnh.length]);

  // 3. Hiệu ứng hạt Canvas bay nhẹ theo chiều cuộn và tương tác chuột
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

  return (
    <div className="flex flex-col select-none font-sans overflow-x-hidden">
      {/* Keyframe Animations */}
      <style jsx global>{`
        @keyframes floatSlow {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-14px) rotate(1deg);
          }
        }
        @keyframes rippleCompact {
          0% {
            transform: translate(-50%, -50%) scale(0.2);
            opacity: 0.9;
          }
          100% {
            transform: translate(-50%, -50%) scale(5.5);
            opacity: 0;
          }
        }
        @keyframes auroraMove {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.45;
          }
          50% {
            transform: translate(30px, -20px) scale(1.15);
            opacity: 0.75;
          }
        }
        @keyframes waveMoveFront {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes waveMoveBack {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-float-group {
          animation: floatSlow 6s ease-in-out infinite;
        }
        .animate-aurora-glow {
          animation: auroraMove 12s ease-in-out infinite alternate;
        }
        .animate-wave-front {
          display: flex;
          width: 200%;
          animation: waveMoveFront 13s linear infinite;
        }
        .animate-wave-back {
          display: flex;
          width: 200%;
          animation: waveMoveBack 21s linear infinite;
        }
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

      {/* KHỐI HERO CHÍNH */}
      <div 
        ref={heroRef}
        onClick={handleHeroClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeaveHero}
        className="min-h-[calc(100vh-80px)] flex flex-col justify-between relative bg-gradient-to-b from-[#f3f7fd] via-[#f7fafd] to-white overflow-hidden cursor-default"
      >
        {/* CANVAS HẠT BAY LƠ LỬNG */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />

        {/* VÒNG GỢN SÓNG GỌN GÀNG KHI CLICK */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="ripple-circle"
            style={{ left: `${ripple.x}px`, top: `${ripple.y}px` }}
          />
        ))}

        {/* LỚP LƯỚI HÌNH HỌC CÔNG NGHỆ */}
        <div 
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#0284c7 1.5px, transparent 1.5px)',
            backgroundSize: '30px 30px'
          }}
        />

        {/* TIA SÁNG RỌI THEO CON TRỎ CHUỘT */}
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

        {/* CỰC QUANG CHUYỂN MÀU NỀN */}
        <div className="absolute -top-28 -left-20 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-sky-300/30 via-blue-400/20 to-teal-200/20 blur-[110px] animate-aurora-glow pointer-events-none" />
        <div className="absolute top-1/3 -right-24 w-[460px] h-[460px] rounded-full bg-gradient-to-br from-indigo-300/20 via-sky-300/25 to-blue-200/20 blur-[120px] animate-aurora-glow pointer-events-none" style={{ animationDelay: '-6s' }} />

        {/* BONG BÓNG TRANG TRÍ */}
        <div className="absolute top-[12%] right-[8%] w-3 h-3 rounded-full bg-indigo-300/70 animate-ping duration-1000 pointer-events-none" />
        <div className="absolute bottom-[24%] right-[4%] w-2 h-2 rounded-full bg-emerald-400/70 animate-pulse pointer-events-none" />
        <div className="absolute top-[45%] left-[4%] w-2.5 h-2.5 rounded-full bg-blue-400/80 animate-bounce duration-1000 pointer-events-none" />
        <div className="absolute top-[18%] left-[10%] w-3 h-3 rounded-full bg-rose-300/60 animate-pulse pointer-events-none" />

        {/* Nội dung chính */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center relative z-20 flex-1 my-auto pt-6 lg:pt-8 pb-4">
          
          {/* Cột trái: Tiêu đề 1 hàng chuẩn, Slogan & Nút */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-6 text-center lg:text-left flex flex-col items-center lg:items-start">
            <div className="space-y-2 flex flex-col items-center lg:items-start w-full">
              <h2 className="text-sm sm:text-base md:text-lg font-black text-slate-800 tracking-wider uppercase">
                ĐỘI THANH NIÊN TÌNH NGUYỆN QNU
              </h2>
              
              {/* CHỮ ĐẠI HỌC QUY NHƠN TRÊN 1 HÀNG DUY NHẤT CÂN ĐỐI */}
              <h1 className="text-3xl sm:text-4xl md:text-[42px] lg:text-[44px] xl:text-[48px] font-black text-[#0284c7] tracking-tight whitespace-nowrap leading-tight">
                ĐẠI HỌC QUY NHƠN
              </h1>
            </div>

            {/* Slogan typewriter */}
            <div className="min-h-[48px] sm:min-h-[56px] flex items-center justify-center lg:justify-start">
              <p className="text-sm sm:text-base md:text-lg font-semibold text-slate-600 leading-relaxed px-2 sm:px-0">
                {chuoiHienThi}
                <span className="inline-block w-[2px] sm:w-[2.5px] h-4 sm:h-5 bg-[#0284c7] ml-1.5 translate-y-[2px] animate-pulse"></span>
              </p>
            </div>

            {/* Nút chuyển trang */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-1">
              <Link
                href="/hoat-dong"
                className="relative group overflow-hidden px-6 sm:px-8 py-3 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 transition-all duration-200 active:scale-95"
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent ease-out" />
                <span className="relative z-10">Xem Hoạt Động</span>
              </Link>
              <a
                href="/tracuudiemdanh"
                className="px-6 sm:px-8 py-3 rounded-full bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm shadow-sm hover:shadow border border-slate-200 hover:scale-105 transition-all duration-200 active:scale-95"
              >
                Cấp Mã QR Điểm Danh
              </a>
            </div>
          </div>

          {/* Cột phải: Cụm ảnh xòe rộng 3 cánh */}
          <div className="lg:col-span-7 flex justify-center lg:justify-end py-6 sm:py-10">
            <div 
              style={{
                transform: !isHoveringGroup 
                  ? `perspective(1100px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)` 
                  : 'perspective(1100px) rotateX(0deg) rotateY(0deg)',
                transition: isHoveringGroup ? 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'transform 0.12s ease-out'
              }}
              className="relative w-[92vw] max-w-[440px] sm:max-w-[540px] md:max-w-[600px] aspect-[16/11]"
            >
              <div
                className={`w-full h-full relative ${!isHoveringGroup ? 'animate-float-group' : ''}`}
                onMouseEnter={() => setIsHoveringGroup(true)}
                onMouseLeave={() => {
                  setIsHoveringGroup(false);
                  setHoveredCard(null);
                }}
                onClick={() => setIsHoveringGroup((prev) => !prev)}
              >
                {/* 1. Ảnh bên trái (xòe rộng sang trái khi mở) */}
                <div 
                  onMouseEnter={() => setHoveredCard('trai')}
                  onMouseLeave={() => setHoveredCard(null)}
                  className={`absolute inset-0 rounded-2xl sm:rounded-[28px] overflow-hidden bg-slate-100 shadow-xl cursor-pointer transition-all duration-500 ease-out transform ${
                    !isHoveringGroup
                      ? 'z-0 translate-x-0 translate-y-0 rotate-0 scale-95 opacity-0 pointer-events-none'
                      : hoveredCard === 'trai'
                      ? 'z-30 -translate-x-20 sm:-translate-x-36 -translate-y-3 sm:-translate-y-6 rotate-0 scale-105 sm:scale-110 shadow-2xl opacity-100 blur-0'
                      : 'z-10 -translate-x-14 sm:-translate-x-28 -translate-y-2 sm:-translate-y-3 -rotate-6 sm:-rotate-8 scale-95 opacity-90 blur-[0.4px] shadow-lg'
                  }`}
                >
                  <img
                    src={danhSachAnh[0]}
                    alt="Ảnh 1"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* 2. Ảnh bên phải (xòe rộng sang phải khi mở) */}
                <div 
                  onMouseEnter={() => setHoveredCard('phai')}
                  onMouseLeave={() => setHoveredCard(null)}
                  className={`absolute inset-0 rounded-2xl sm:rounded-[28px] overflow-hidden bg-slate-100 shadow-lg cursor-pointer transition-all duration-500 ease-out transform ${
                    !isHoveringGroup
                      ? 'z-0 translate-x-0 translate-y-0 rotate-0 scale-95 opacity-0 pointer-events-none'
                      : hoveredCard === 'phai'
                      ? 'z-30 translate-x-20 sm:translate-x-36 -translate-y-3 sm:-translate-y-6 rotate-0 scale-105 sm:scale-110 shadow-2xl opacity-100 blur-0'
                      : 'z-10 translate-x-14 sm:translate-x-28 -translate-y-2 sm:-translate-y-3 rotate-6 sm:rotate-8 scale-95 opacity-90 blur-[0.4px] shadow-lg'
                  }`}
                >
                  <img
                    src={danhSachAnh[2]}
                    alt="Ảnh 3"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* 3. Khung ảnh chính ở giữa */}
                <div 
                  onMouseEnter={() => setHoveredCard('chinh')}
                  onMouseLeave={() => setHoveredCard(null)}
                  className={`absolute inset-0 rounded-2xl sm:rounded-[28px] overflow-hidden cursor-pointer shadow-2xl shadow-sky-950/20 transition-all duration-500 ease-out transform ${
                    !isHoveringGroup
                      ? 'z-20 translate-x-0 translate-y-0 rotate-0 scale-100 opacity-100'
                      : hoveredCard === 'chinh'
                      ? 'z-30 scale-105 sm:scale-110 -translate-y-2 sm:-translate-y-4 shadow-2xl opacity-100 blur-0'
                      : hoveredCard !== null
                      ? 'z-20 scale-100 translate-y-0 opacity-75 blur-[0.5px]'
                      : 'z-20 scale-100 translate-y-0 opacity-100'
                  }`}
                >
                  {isHoveringGroup ? (
                    <img
                      src={danhSachAnh[1]}
                      alt="Ảnh chính"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    danhSachAnh.map((src, idx) => (
                      <div
                        key={src}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                          idx === activeSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                      >
                        <img
                          src={src}
                          alt={`Slide ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))
                  )}
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* Dải sóng biển chân trang */}
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