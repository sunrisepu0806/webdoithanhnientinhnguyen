'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export default function GioiThieuPage() {
  // Hiệu ứng Spotlight theo chuột & Nghiêng 3D Tilt
  const [mousePos, setMousePos] = useState({ x: 600, y: 300 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

  // Danh sách các gợn sóng mặt nước khi click
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Xử lý tạo gợn sóng nước khi click
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

    // Tính toán góc nghiêng 3D Tilt
    const x = (mouseX / rect.width - 0.5) * 20;
    const y = (mouseY / rect.height - 0.5) * -20;
    setTilt({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
  };

  const handleMouseLeaveHero = () => {
    setTilt({ x: 0, y: 0 });
  };

  // Hiệu ứng Canvas hạt bay lơ lửng đồng bộ từ trang chủ
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
            transform: translateY(-12px) rotate(0.6deg);
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
        .animate-float-card {
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

      {/* KHỐI GIỚI THIỆU CHÍNH */}
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

        {/* CỰC QUANG NỀN */}
        <div className="absolute -top-28 -left-20 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-sky-300/30 via-blue-400/20 to-teal-200/20 blur-[110px] animate-aurora-glow pointer-events-none" />
        <div className="absolute top-1/3 -right-24 w-[460px] h-[460px] rounded-full bg-gradient-to-br from-indigo-300/20 via-sky-300/25 to-blue-200/20 blur-[120px] animate-aurora-glow pointer-events-none" style={{ animationDelay: '-6s' }} />

        {/* BONG BÓNG TRANG TRÍ */}
        <div className="absolute top-[12%] right-[8%] w-3 h-3 rounded-full bg-indigo-300/70 animate-ping duration-1000 pointer-events-none" />
        <div className="absolute bottom-[24%] right-[4%] w-2 h-2 rounded-full bg-emerald-400/70 animate-pulse pointer-events-none" />
        <div className="absolute top-[45%] left-[4%] w-2.5 h-2.5 rounded-full bg-blue-400/80 animate-bounce duration-1000 pointer-events-none" />
        <div className="absolute top-[18%] left-[10%] w-3 h-3 rounded-full bg-rose-300/60 animate-pulse pointer-events-none" />

        {/* NỘI DUNG CHÍNH */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-20 flex-1 my-auto pt-8 lg:pt-10 pb-6">
          
          {/* CỘT TRÁI: TIÊU ĐỀ & VĂN BẢN GIỚI THIỆU */}
          <div className="lg:col-span-6 space-y-5 text-left">
            <h1 className="text-3xl sm:text-4xl md:text-[42px] lg:text-[44px] font-black text-[#0284c7] tracking-tight leading-tight">
              Về Đội Tình Nguyện <br />
              <span>Thanh Niên QNU</span>
            </h1>

            <div className="space-y-4 text-justify text-sm sm:text-base leading-relaxed text-slate-700">
              <p>
                Đội Thanh niên Tình nguyện QNU được thành lập vào ngày 27/04/2023 từ tiền thân là Đội Phản ứng nhanh Trường Đại học Quy Nhơn, là nơi quy tụ những bạn trẻ có chung nhiệt huyết, tinh thần trách nhiệm và mong muốn cống hiến hết mình cho cộng đồng.
              </p>

              <p>
                Đội luôn là lực lượng nòng cốt tiên phong đồng hành cùng các chiến dịch lớn của Đoàn – Hội Sinh viên như: <em className="font-medium text-slate-900">Hội thao, Chủ nhật Xanh, Tiếp sức mùa thi, Honda Uni-Tour, Ngày hội Chào Tân sinh viên...</em> Bên cạnh đó, Đội tích cực tổ chức các chương trình thiện nguyện trao gửi hơi ấm nhân ái khắp tỉnh Bình Định.
              </p>

              <p className="font-semibold leading-relaxed text-[#0284c7]">
                Với phương châm &ldquo;Kết nối sức trẻ - lan tỏa yêu thương&rdquo;, Đội TNTN QNU không ngừng xây dựng môi trường gắn kết, sẻ chia, nơi mỗi thành viên cùng học hỏi, trưởng thành và lưu giữ những ký ức thanh xuân rực rỡ nhất dưới mái trường Đại học Quy Nhơn.
              </p>
            </div>
          </div>

          {/* CỘT PHẢI: KHUNG ẢNH ANH5 TÍCH HỢP FLOAT & TILT 3D */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end py-4">
            <div 
              style={{
                transform: `perspective(1100px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
                transition: 'transform 0.12s ease-out'
              }}
              className="relative w-full max-w-[560px] aspect-[16/11]"
            >
              <div className="w-full h-full relative animate-float-card">
                <div className="absolute inset-0 rounded-2xl sm:rounded-[32px] overflow-hidden border-4 border-white bg-slate-100 shadow-2xl shadow-sky-950/20">
                  <img
                    src="/anh5.jpg"
                    alt="Tập thể Đội Thanh Niên Tình Nguyện QNU"
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              </div>
            </div>
          </div>

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