'use client';

import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
export interface AdmissionResultItem {
  id?: string;
  studentId: string;
  fullName: string;
  major: string;
  group?: string;
  isPassed: boolean | null;
  note?: string;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

function checkPassedStatus(value: unknown): boolean | null {
  const status = String(value ?? '').trim().toLowerCase();
  if (['true','1','đạt','đậu','đỗ','trúng tuyển','passed','pass','trung tuyen'].includes(status)) return true;
  if (['false','0','trượt','rớt','không đạt','không trúng tuyển','fail','failed','loại'].includes(status)) return false;
  return null;
}

export default function TraCuuTrungTuyenPage() {
  const [isMounted, setIsMounted] = useState(false);

  // State Tra cứu
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchedResult, setSearchedResult] = useState<AdmissionResultItem | null>(null);
  const [lookupFailed,setLookupFailed] = useState(false);
  const [isSearched, setIsSearched] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const qrSearchRef = useRef<SVGSVGElement | null>(null);

  // Hiệu ứng Spotlight & Ripple Click
  const [mousePos, setMousePos] = useState({ x: 600, y: 300 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);

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

  // Tra cứu kết quả theo MSSV
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawKey = searchKeyword.trim();
    if (!rawKey) return;

    setSearchLoading(true);
    setIsSearched(true);
    setLookupFailed(false);


    try {
      const response = await fetch('/api/tra-cuu?view=admission&mssv=' + encodeURIComponent(rawKey));
      if (!response.ok) throw new Error();
      const {member} = await response.json();
      setSearchedResult(member ? {...member, isPassed:checkPassedStatus(member.status)} : null);
    } catch (err) {
      setLookupFailed(true);
      setSearchedResult(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleDownloadQR = (element: SVGSVGElement | null, fileName: string) => {
    if (!element) return;
    const svgData = new XMLSerializer().serializeToString(element);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `QR-${fileName}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
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
        {ripples.map((ripple) => (
          <span key={ripple.id} className="ripple-circle" style={{ left: `${ripple.x}px`, top: `${ripple.y}px` }} />
        ))}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(#0284c7 1.5px, transparent 1.5px)', backgroundSize: '30px 30px' }}
        />

        <div
          className="pointer-events-none absolute rounded-full blur-[100px] transition-opacity duration-300"
          style={{
            width: '500px',
            height: '500px',
            left: `${mousePos.x - 250}px`,
            top: `${mousePos.y - 250}px`,
            background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, rgba(99, 102, 241, 0.05) 50%, transparent 70%)',
            zIndex: 1,
          }}
        />

        <div className="pointer-events-none absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-sky-300/20 blur-[120px] animate-aurora-glow" />
        <div
          className="pointer-events-none absolute top-1/2 -right-32 h-[500px] w-[500px] rounded-full bg-blue-300/15 blur-[120px] animate-aurora-glow"
          style={{ animationDelay: '-4s' }}
        />

        {/* Khung nội dung */}
        <div className="relative z-20 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 pt-12 pb-16 flex-1 flex flex-col justify-start">
          <div className="mb-10 text-center space-y-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-brand-ink drop-shadow-sm uppercase">
              Tra Cứu Kết Quả Trúng Tuyển
            </h1>
            <p className="mx-auto max-w-lg text-sm sm:text-base text-muted-ink font-medium">
              Nhập mã số sinh viên của bạn để kiểm tra kết quả phỏng vấn do Đội công bố.
            </p>
          </div>

          <div className="w-full max-w-4xl mx-auto space-y-8">
            {/* Form Tra Cứu */}
            <form
              onSubmit={handleSearch}
              className="max-w-xl mx-auto bg-white rounded-xl p-2.5 border border-slate-200 shadow-sm flex items-center gap-2 transition-all focus-within:border-sky-400"
            >
              <div className="relative flex-1 flex items-center pl-3">
                <svg className="w-5 h-5 text-muted-ink shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  required
                  placeholder="Nhập mã số sinh viên"
                  className="w-full pl-3 pr-4 py-2 bg-transparent focus:outline-none text-sm font-semibold text-ink placeholder:text-muted-ink"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={searchLoading}
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-sm transition-all active:scale-95 flex items-center justify-center shrink-0 disabled:opacity-70 disabled:active:scale-100 min-w-[110px]"
              >
                {searchLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Tra Cứu'
                )}
              </button>
            </form>

            {/* KẾT QUẢ TRA CỨU */}
            {isSearched && !searchLoading && (
              <div className="animate-in fade-in duration-200">
                {searchedResult ? (
                  searchedResult.isPassed === null ? (
                    <p className="rounded-xl border bg-white p-6 text-center">Đội chưa công bố kết quả cho hồ sơ này.</p>
                  ) : searchedResult.isPassed ? (
                    /* ================= TRƯỜNG HỢP 1: TRÚNG TUYỂN ================= */
                    <div className="bg-white rounded-2xl overflow-hidden border border-emerald-200/90 shadow-sm">
                      {/* Banner Chúc mừng */}
                      <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-600 px-6 py-5 text-white flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100 block">
                            Kết quả phỏng vấn
                          </span>
                          <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
                            CHÚC MỪNG BẠN ĐÃ TRÚNG TUYỂN!
                          </h3>
                        </div>
                      </div>

                      <div className="p-6 sm:p-8">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                          {/* Cột Trái: Thông tin ứng viên & Link nhóm */}
                          <div className="lg:col-span-8 space-y-6">
                            <div className="pb-4 border-b border-slate-100">
                              <p className="text-xs font-semibold text-emerald-600 mb-1">
                                Chào mừng bạn chính thức gia nhập ngôi nhà chung Đội Thanh niên Tình nguyện QNU!
                              </p>
                              <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight leading-tight mb-1">
                                {searchedResult.fullName}
                              </h2>
                              <p className="text-muted-ink text-sm font-medium">
                                {searchedResult.major || 'Chưa cập nhật ngành học'}
                              </p>
                            </div>

                            {/* Bảng thông tin phân công (4 ô cân đối) */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                                <span className="text-[11px] font-bold text-muted-ink uppercase tracking-wider block mb-1">
                                  Mã Số SV
                                </span>
                                <p className="font-mono font-bold text-ink text-sm">{searchedResult.studentId}</p>
                              </div>

                              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
                                  Trạng Thái
                                </span>
                                <p className="font-bold text-emerald-700 text-sm">Trúng tuyển</p>
                              </div>

                              <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-100">
                                <span className="text-[11px] font-bold text-brand-ink uppercase tracking-wider block mb-1">
                                  Tổ Hoạt Động
                                </span>
                                <p className="font-bold text-ink text-sm">{searchedResult.group ? 'Tổ ' + searchedResult.group : 'Chưa cập nhật'}</p>
                              </div>
                            </div>

                            {searchedResult.note && (
                              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/70 text-xs text-amber-800 font-medium">
                                <strong className="font-bold uppercase tracking-wider block mb-0.5 text-[11px] text-amber-600">
                                  Ghi chú từ Ban Tổ Chức:
                                </strong>
                                {searchedResult.note}
                              </div>
                            )}

                          </div>

                          {/* Cột Phải: QR Code Định Danh */}
                          <div className="lg:col-span-4 flex flex-col items-center">
                            <div className="w-full bg-white p-5 rounded-xl border border-slate-200 text-center flex flex-col items-center gap-3">
                              <div className="p-3 rounded-lg border border-slate-100">
                                <QRCodeSVG
                                  ref={qrSearchRef}
                                  value={searchedResult.studentId}
                                  size={150}
                                  level="H"
                                  includeMargin={false}
                                />
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-sm font-bold text-ink">Mã QR Định Danh</p>
                                <p className="text-[11px] text-muted-ink max-w-[190px] leading-tight mx-auto">
                                  Lưu lại mã này để điểm danh khi tham gia các hoạt động của Đội
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDownloadQR(qrSearchRef.current, searchedResult.studentId)}
                                className="w-full mt-1 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                  />
                                </svg>
                                Tải Mã QR
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ================= TRƯỜNG HỢP 2: KHÔNG TRÚNG TUYỂN ================= */
                    <div className="max-w-2xl mx-auto bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm text-center space-y-4">
                      <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-ink">
                          Kết quả tuyển thành viên
                        </span>
                        <h3 className="text-xl font-extrabold text-ink">
                          Cảm ơn {searchedResult.fullName} đã quan tâm đến Đội!
                        </h3>
                      </div>
                      <p className="text-sm text-muted-ink max-w-lg mx-auto leading-relaxed">
                        Rất tiếc trong đợt tuyển quân lần này, Đội chưa thể đồng hành cùng bạn. Sự nhiệt huyết của bạn là điều Đội rất trân trọng, hẹn gặp lại bạn ở các chương trình tình nguyện mở rộng và đợt tuyển tiếp theo nhé!
                      </p>
                      {searchedResult.note && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-muted-ink max-w-md mx-auto">
                          <strong>Lời nhắn:</strong> {searchedResult.note}
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  /* ================= TRƯỜNG HỢP 3: KHÔNG TÌM THẤY MSSV ================= */
                  <div className="max-w-xl mx-auto bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm space-y-3">
                    <div className="w-11 h-11 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto text-lg font-bold">
                      !
                    </div>
                    <h3 className="font-bold text-ink text-base">
                      {lookupFailed ? 'Chưa tải được kết quả' : 'Chưa có kết quả cho mã sinh viên này'}
                    </h3>
                    <p className="text-sm text-muted-ink leading-relaxed">
                      {lookupFailed ? 'Vui lòng thử lại sau.' : 'Vui lòng kiểm tra mã sinh viên hoặc liên hệ Đội nếu cần đối chiếu.'}
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
            <svg viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none" className="block h-full w-1/2">
              <path d="M0,30 C320,65 420,10 720,25 C1020,40 1140,55 1440,30 L1440,90 L0,90 Z" fill="#bae6fd" />
            </svg>
            <svg viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none" className="block h-full w-1/2">
              <path d="M0,30 C320,65 420,10 720,25 C1020,40 1140,55 1440,30 L1440,90 L0,90 Z" fill="#bae6fd" />
            </svg>
          </div>
          <div className="absolute inset-0 animate-wave-front opacity-70">
            <svg viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none" className="block h-full w-1/2">
              <path d="M0,50 C360,75 500,35 800,45 C1100,55 1250,70 1440,50 L1440,90 L0,90 Z" fill="#7dd3fc" />
            </svg>
            <svg viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none" className="block h-full w-1/2">
              <path d="M0,50 C360,75 500,35 800,45 C1100,55 1250,70 1440,50 L1440,90 L0,90 Z" fill="#7dd3fc" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}