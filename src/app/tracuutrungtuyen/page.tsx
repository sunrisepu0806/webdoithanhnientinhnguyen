'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs
} from 'firebase/firestore';

export interface CandidateItem {
  id?: string;
  studentId: string;
  fullName: string;
  major: string;
  dob?: string;
  status?: string;
  zaloLink?: string;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

const cleanId = (val: any) => String(val || "").trim().toLowerCase();

function formatBirthDate(dobStr?: any): string {
  if (!dobStr || String(dobStr).trim() === '' || dobStr === 'Chưa cập nhật') {
    return 'Chưa cập nhật';
  }

  const clean = String(dobStr).trim();

  if (/^\d{4,6}$/.test(clean)) {
    const excelDays = parseInt(clean, 10);
    const dateObj = new Date((excelDays - 25569) * 86400 * 1000);
    if (!isNaN(dateObj.getTime())) {
      const d = String(dateObj.getUTCDate()).padStart(2, '0');
      const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const y = dateObj.getUTCFullYear();
      return `${d}/${m}/${y}`;
    }
  }

  return clean;
}

export default function TraCuuTuyenSinhPage() {
  const [isMounted, setIsMounted] = useState(false);

  // State Tra cứu
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchedCandidate, setSearchedCandidate] = useState<CandidateItem | null>(null);
  const [isSearched, setIsSearched] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Hiệu ứng Spotlight & Canvas & Ripple Click
  const [mousePos, setMousePos] = useState({ x: 600, y: 300 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  const loadData = async (): Promise<CandidateItem[]> => {
    try {
      const memSnap = await getDocs(collection(db, "users")).then((s) => s.empty ? getDocs(collection(db, "members")) : s);

      const normalized: CandidateItem[] = memSnap.docs.map((doc) => {
        const item = doc.data();
        
        // Chuẩn hóa link Zalo
        let rawZaloLink = String(item.zaloLink || '').trim();
        if (rawZaloLink && !rawZaloLink.startsWith('http')) {
          rawZaloLink = 'https://' + rawZaloLink;
        }

        return {
          id: doc.id,
          studentId: String(item.mssv || item.studentId || '').trim(),
          fullName: String(item.name || item.fullName || '').trim(),
          major: String(item.majorAndClass || item.major || '').trim(),
          dob: formatBirthDate(item.ngaySinh || item.dob),
          status: 'trung_tuyen',
          zaloLink: rawZaloLink || 'https://zalo.me/g/02queaqgniqosgjsjq7p'
        };
      });

      return normalized;
    } catch (e) {
      console.error("Lỗi lấy dữ liệu từ Firebase:", e);
      return [];
    }
  };

  useEffect(() => {
    if (isMounted) {
      loadData();
    }
  }, [isMounted]);

  // Canvas hạt bay
  useEffect(() => {
    if (!isMounted) return;
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
  }, [isMounted]);

  // Tra cứu
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = searchKeyword.trim().toLowerCase();
    if (!cleanKey) return;

    setSearchLoading(true);
    setIsSearched(true);

    const currentList = await loadData();

    const found = currentList.find((c) => {
      const sId = cleanId(c.studentId);
      const sName = c.fullName.toLowerCase();

      if (sId === cleanKey) return true;
      if (cleanKey.length >= 2 && isNaN(Number(cleanKey)) && sName.includes(cleanKey)) {
        return true;
      }
      return false;
    });

    setSearchedCandidate(found || null);
    setSearchLoading(false);
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col select-none font-sans overflow-x-hidden min-h-screen bg-slate-50" suppressHydrationWarning>
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

      <div
        ref={containerRef}
        onClick={handleContainerClick}
        onMouseMove={handleMouseMove}
        className="relative min-h-screen flex flex-col justify-between overflow-hidden cursor-default flex-1"
      >
        {/* Hạt & Ánh sáng Nền */}
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-10 h-full w-full" />
        {ripples.map((ripple) => (
          <span key={ripple.id} className="ripple-circle" style={{ left: `${ripple.x}px`, top: `${ripple.y}px` }} />
        ))}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#0284c7 1.5px, transparent 1.5px)', backgroundSize: '30px 30px' }} />
        
        <div
          className="pointer-events-none absolute rounded-full blur-[100px] transition-opacity duration-300"
          style={{ width: '500px', height: '500px', left: `${mousePos.x - 250}px`, top: `${mousePos.y - 250}px`, background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, rgba(99, 102, 241, 0.05) 50%, transparent 70%)', zIndex: 1 }}
        />
        
        <div className="pointer-events-none absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-sky-300/20 blur-[120px] animate-aurora-glow" />
        <div className="pointer-events-none absolute top-1/2 -right-32 h-[500px] w-[500px] rounded-full bg-sky-300/15 blur-[120px] animate-aurora-glow" style={{ animationDelay: '-4s' }} />

        {/* Nội dung chính */}
        <div className="relative z-20 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 pt-12 pb-16 flex-1 flex flex-col justify-start">
          
          <div className="mb-10 text-center space-y-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-sky-600 drop-shadow-sm uppercase">
              Kết Quả Tuyển Thành Viên Đội Thanh Niên Tình Nguyện QNU
            </h1>
            <p className="mx-auto max-w-lg text-sm sm:text-base text-slate-500 font-medium">
              Nhập mã số sinh viên hoặc họ tên để tra cứu kết quả phỏng vấn và tham gia nhóm cộng đồng.
            </p>
          </div>

          <div className="w-full max-w-4xl mx-auto space-y-8">
            <form onSubmit={handleSearch} className="max-w-xl mx-auto bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-lg shadow-sky-900/5 flex items-center gap-2 transition-all focus-within:shadow-sky-900/10 focus-within:border-sky-300">
              <div className="relative flex-1 flex items-center pl-3">
                <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <input
                  type="text"
                  required
                  placeholder="Nhập MSSV hoặc Họ tên..."
                  className="w-full pl-3 pr-4 py-2.5 bg-transparent focus:outline-none text-sm font-semibold text-slate-800 placeholder:text-slate-400"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={searchLoading}
                className="px-6 py-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-xl text-sm transition-all shadow-md active:scale-95 flex items-center justify-center shrink-0 disabled:opacity-70 disabled:active:scale-100 min-w-[110px]"
              >
                {searchLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Tra Cứu'}
              </button>
            </form>

            {isSearched && (
              <div className="animate-in fade-in zoom-in-95 duration-300">
                {searchedCandidate ? (
                  <div className="bg-white rounded-[2rem] p-6 sm:p-10 border border-sky-100 shadow-xl shadow-sky-200/40 relative overflow-hidden">
                    
                    {/* Background Pattern Nhẹ nhàng */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-sky-50 rounded-full blur-3xl opacity-60"></div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                      
                      {/* Cột Trái: Thông tin cá nhân */}
                      <div className="lg:col-span-7 space-y-6">
                        <div className="border-b border-slate-100 pb-5">
                          <span className="inline-flex items-center justify-center px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg mb-3 uppercase tracking-wider">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Đã Trúng Tuyển
                          </span>
                          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight mb-1 uppercase">
                            {searchedCandidate.fullName}
                          </h2>
                          <p className="text-slate-500 font-medium">{searchedCandidate.major || "Chưa cập nhật ngành học"}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mã Số Sinh Viên</span>
                            <p className="font-mono font-bold text-slate-800 text-sm">{searchedCandidate.studentId}</p>
                          </div>
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ngày Sinh</span>
                            <p className="font-mono font-bold text-slate-800 text-sm">{formatBirthDate(searchedCandidate.dob)}</p>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100/50 flex items-start gap-3">
                          <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            Chúc mừng bạn đã chính thức trở thành thành viên! Vui lòng tham gia nhóm Zalo bên cạnh để nhận thông báo mới nhất từ Ban Cán Sự.
                          </p>
                        </div>
                      </div>

                      {/* Cột Phải: Trạng Thái & Nút Zalo */}
                      <div className="lg:col-span-5 flex flex-col items-center justify-center">
                        <div className="w-full bg-gradient-to-b from-white to-sky-50/30 p-6 sm:p-8 rounded-3xl border border-slate-100 text-center flex flex-col items-center gap-5 shadow-sm">
                          
                          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
                            </svg>
                          </div>
                          
                          <div className="space-y-1.5">
                            <h3 className="text-lg font-black text-slate-800 uppercase">Kết Quả Đã Trúng Tuyển</h3>
                            <p className="text-xs text-slate-500 max-w-[200px] leading-tight mx-auto">
                              Nhấn vào nút bên dưới để truy cập nhóm Zalo kết nối thành viên.
                            </p>
                          </div>

                          <a
                            href={searchedCandidate.zaloLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full mt-2 py-3.5 rounded-xl bg-[#0068ff] hover:bg-[#0055d4] text-white font-bold text-sm transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-blue-500/30 active:scale-95"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M21.384 10.32c-.084-5.268-4.224-8.88-9.36-8.88-5.328 0-9.624 3.792-9.624 8.76 0 2.82 1.488 5.436 3.936 7.152l-.66 2.472a.48.48 0 0 0 .612.576l2.844-.888c.9.264 1.836.408 2.784.408 5.376 0 9.54-3.852 9.468-9.6z"/>
                            </svg>
                            Tham Gia Nhóm Zalo
                          </a>
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="max-w-xl mx-auto bg-white rounded-2xl p-10 text-center border border-slate-100 shadow-lg shadow-slate-200/50">
                    <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-5 text-2xl font-bold">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg mb-2">Chưa Trúng Tuyển / Không Tìm Thấy</h3>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto">
                      Không tìm thấy thông tin trúng tuyển của <strong>"{searchKeyword}"</strong> trong danh sách đợt này.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Waves */}
        <div className="pointer-events-none relative z-20 h-16 sm:h-24 w-full shrink-0 overflow-hidden leading-none opacity-80">
          <div className="absolute inset-0 animate-wave-back opacity-50">
            <svg viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none" className="block h-full w-1/2"><path d="M0,30 C320,65 420,10 720,25 C1020,40 1140,55 1440,30 L1440,90 L0,90 Z" fill="#bae6fd" /></svg>
            <svg viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none" className="block h-full w-1/2"><path d="M0,30 C320,65 420,10 720,25 C1020,40 1140,55 1440,30 L1440,90 L0,90 Z" fill="#bae6fd" /></svg>
          </div>
          <div className="absolute inset-0 animate-wave-front opacity-70">
            <svg viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none" className="block h-full w-1/2"><path d="M0,50 C360,75 500,35 800,45 C1100,55 1250,70 1440,50 L1440,90 L0,90 Z" fill="#7dd3fc" /></svg>
            <svg viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none" className="block h-full w-1/2"><path d="M0,50 C360,75 500,35 800,45 C1100,55 1250,70 1440,50 L1440,90 L0,90 Z" fill="#7dd3fc" /></svg>
          </div>
        </div>
      </div>
    </div>
  );
}