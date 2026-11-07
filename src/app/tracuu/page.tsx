'use client';

import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getDeptLinksList } from '@/data/groupLinks';

export interface MemberItem {
  id?: string;
  studentId: string;
  fullName: string;
  major: string;
  groupSessions?: number;
  departmentSessions?: number;
  totalSessions?: number;
  totalPoints?: number;
  group?: string;
  department?: string;
  records?: {date:string;shift:string;name:string;type:string;units:number;points:number}[];
  createdAt?: string;
}

function AttendanceSummary({ member }: { member: MemberItem }) {
  const sessions = member.totalSessions ?? (
    typeof member.groupSessions === 'number' && typeof member.departmentSessions === 'number'
      ? member.groupSessions + member.departmentSessions
      : undefined
  );
  const metrics = [
    { label: 'Tổng số buổi', value: sessions, unit: 'buổi' },
    { label: 'Tổng điểm', value: member.totalPoints, unit: 'điểm' },
    { label: 'Hoạt động Đội', value: member.groupSessions, unit: 'buổi' },
    { label: 'Công việc mảng', value: member.departmentSessions, unit: 'buổi' },
  ];
  return (
    <section aria-labelledby="attendance-title">
      <h3 id="attendance-title" className="mb-3 text-lg font-bold text-ink">Kết quả tham gia</h3>
      <dl className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {metrics.map(({ label, value, unit }, index) => (
          <div key={label} className={index < 2
            ? 'rounded-2xl bg-sky-700 p-4 text-white'
            : 'rounded-2xl border border-sky-100 bg-sky-50 p-4 text-brand-strong'}>
            <dt className="text-sm font-medium">{label}</dt>
            <dd className="mt-2">
              {value != null && Number.isFinite(Number(value)) && String(value).trim() !== '' ? (
                <><strong className="text-3xl font-bold tabular-nums">{Number(value)}</strong> <span className="text-sm">{unit}</span></>
              ) : <span className="text-sm">Chưa cập nhật</span>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

function formatCreatedAt(createdAt: any): string {
  if (!createdAt) return 'Chưa cập nhật';

  if (typeof createdAt === 'object' && createdAt.seconds) {
    const date = new Date(createdAt.seconds * 1000);
    return date.toLocaleDateString('vi-VN');
  }

  if (typeof createdAt === 'string') {
    const date = new Date(createdAt);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('vi-VN');
    }
    return createdAt;
  }

  return 'Chưa cập nhật';
}

export default function TraCuuThanhVienPage() {
  const [isMounted, setIsMounted] = useState(false);

  // State Tra cứu
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchedMember, setSearchedMember] = useState<MemberItem | null>(null);
  const [submittedId, setSubmittedId] = useState('');
  const [lookupFailed, setLookupFailed] = useState(false);
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

  // Tra cứu theo MSSV
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawKey = searchKeyword.trim();
    if (!rawKey) return;

    setSubmittedId(rawKey);
    setLookupFailed(false);
    setSearchLoading(true);
    setIsSearched(true);

    try {
      const response = await fetch('/api/tra-cuu?mssv=' + encodeURIComponent(rawKey));
      if (!response.ok) throw new Error('Lookup failed');
      const { member, records } = await response.json();
      setSearchedMember(member ? { ...member, records, createdAt: formatCreatedAt(member.createdAt) } : null);
    } catch (err) {
      setLookupFailed(true);
      console.error("Lỗi tra cứu:", err);
      setSearchedMember(null);
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

  const deptList = searchedMember ? getDeptLinksList(searchedMember.department) : [];

  return (
    <div className="flex flex-col font-sans overflow-x-hidden bg-slate-50" suppressHydrationWarning>
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
        className="relative min-h-[70svh] flex flex-col justify-between overflow-hidden cursor-default flex-1"
      >
        {ripples.map((ripple) => (
          <span key={ripple.id} className="ripple-circle" style={{ left: `${ripple.x}px`, top: `${ripple.y}px` }} />
        ))}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#0284c7 1.5px, transparent 1.5px)', backgroundSize: '30px 30px' }} />
        
        <div
          className="pointer-events-none absolute rounded-full blur-[100px] transition-opacity duration-300"
          style={{ width: '500px', height: '500px', left: `${mousePos.x - 250}px`, top: `${mousePos.y - 250}px`, background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, rgba(99, 102, 241, 0.05) 50%, transparent 70%)', zIndex: 1 }}
        />
        
        <div className="pointer-events-none absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-sky-300/20 blur-[120px] animate-aurora-glow" />
        <div className="pointer-events-none absolute top-1/2 -right-32 h-[500px] w-[500px] rounded-full bg-blue-300/15 blur-[120px] animate-aurora-glow" style={{ animationDelay: '-4s' }} />

        {/* Khung nội dung */}
        <div className="relative z-20 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-10 flex-1 flex flex-col justify-start">
          
          <div className="mb-7 sm:mb-9 text-center space-y-3">
            <p className="text-xs font-semibold tracking-widest text-brand-ink">DÀNH CHO THÀNH VIÊN</p>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-brand-ink">
              Tra cứu thành viên
            </h1>
            <p className="mx-auto max-w-lg text-sm sm:text-base text-muted-ink font-medium">
              Nhập mã số sinh viên để xem số buổi, điểm và tải báo cáo hoạt động.
            </p>
          </div>

          <div className="w-full max-w-4xl mx-auto space-y-8">
            {/* Form Tra Cứu */}
            <form role="search" aria-label="Tra cứu thành viên theo mã số sinh viên" onSubmit={handleSearch} className="max-w-xl mx-auto bg-white rounded-full p-1.5 sm:p-2 border border-sky-200 shadow-md shadow-sky-900/5 flex items-center gap-2 transition-all focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
              <div className="relative min-w-0 flex-1 flex items-center pl-2 sm:pl-4">
                <svg className="w-5 h-5 text-muted-ink shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <input
                  type="text"
                  required
                  aria-label="Mã số sinh viên" placeholder="Nhập mã số sinh viên"
                  className="w-full min-w-0 pl-2 pr-1 py-2 bg-transparent focus:outline-none text-base font-medium text-ink placeholder:text-muted-ink"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={searchLoading} aria-label={searchLoading ? "Đang tra cứu" : "Tra cứu"}
                className="px-4 sm:px-6 min-h-11 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-full text-sm transition-all active:scale-95 flex items-center justify-center shrink-0 disabled:opacity-70 disabled:active:scale-100 sm:min-w-[110px]"
              >
                {searchLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Tra cứu'}
              </button>
            </form>

            {/* CHỈ XUẤT HIỆN KHI ĐÃ BẤM TRA CỨU */}
            {searchLoading && <p role="status" className="text-center text-sm text-muted-ink">Đang tìm thông tin thành viên…</p>}
            {isSearched && !searchLoading && (
              <div className="animate-in fade-in duration-200">
                {searchedMember ? (
                  <div className="bg-white rounded-2xl p-4 sm:p-8 border border-slate-200/80 shadow-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      
                      {/* Cột Trái: Thông tin thành viên */}
                      <div className="lg:col-span-8 space-y-6">
                        <div className="pb-4 border-b border-slate-100">
                          <span className="inline-block px-2.5 py-0.5 bg-sky-100 text-brand-ink text-xs font-semibold rounded-md mb-2">
                            Thành viên Đội TNTN
                          </span>
                          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight leading-tight mb-1">
                            {searchedMember.fullName}
                          </h2>
                          <p className="text-muted-ink text-sm font-medium">{searchedMember.major || "Chưa cập nhật ngành học"}</p>
                        </div>

                        <AttendanceSummary member={searchedMember} />

                          <a href={`/api/tra-cuu?mssv=${encodeURIComponent(searchedMember.studentId)}&format=xlsx`} download
                            className="inline-flex rounded-full bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2">
                            Xuất Excel chi tiết hoạt động
                          </a>

                        <details className="rounded-xl border border-sky-100 p-4">
                          <summary className="cursor-pointer font-semibold text-brand-ink">Lịch sử tham gia ({searchedMember.records?.length ?? 0} lượt)</summary>
                          {searchedMember.records?.length ? <ul className="mt-3 divide-y divide-slate-100">{searchedMember.records.slice().reverse().map((row,index) =>
                            <li key={index} className="py-2 text-sm">
                              <strong>{row.name}</strong>
                              <p className="text-muted-ink">{[row.date.split('-').reverse().join('/'), row.shift, row.type].filter(Boolean).join(' · ')} · {row.units} buổi · {row.points} điểm</p>
                            </li>)}</ul> : <p className="mt-2 text-sm text-muted-ink">Chưa có lượt điểm danh được ghi nhận.</p>}
                        </details>

                        {/* Bảng thông tin */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                            <span className="text-[11px] font-bold text-muted-ink uppercase tracking-wider block mb-1">Mã Số Sinh Viên</span>
                            <p className="font-mono font-bold text-ink text-sm">{searchedMember.studentId}</p>
                          </div>
                          
                          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                            <span className="text-[11px] font-bold text-muted-ink uppercase tracking-wider block mb-1">Ngày Tham Gia</span>
                            <p className="font-mono font-bold text-ink text-sm">{searchedMember.createdAt || 'Chưa cập nhật'}</p>
                          </div>

                          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                            <span className="text-[11px] font-bold text-brand-ink uppercase tracking-wider block mb-1">Tổ Hoạt Động</span>
                            <p className="font-bold text-ink text-sm">{searchedMember.group ? 'Tổ ' + searchedMember.group : 'Chưa cập nhật'}</p>
                          </div>

                          {/* Mảng Chuyên Môn */}
                          <div className="col-span-1 sm:col-span-2 p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                            <span className="text-[11px] font-bold text-brand-ink uppercase tracking-wider block mb-1.5">Mảng Chuyên Môn</span>
                            <div className="flex flex-wrap gap-1.5">
                              {deptList.length > 0 ? (
                                deptList.map((item, idx) => (
                                  <span key={idx} className="inline-block px-2.5 py-1 rounded-lg bg-white text-body-ink border border-slate-200 text-xs font-semibold">
                                    {item.name}
                                  </span>
                                ))
                              ) : (
                                <p className="font-semibold text-ink text-sm">{searchedMember.department || 'Chưa cập nhật mảng'}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Cột Phải: QR Code cá nhân */}
                      <div className="lg:col-span-4 flex flex-col items-center">
                        <div className="w-full bg-white p-5 rounded-xl border border-slate-200 text-center flex flex-col items-center gap-3">
                          <div className="p-3 rounded-lg border border-slate-100">
                            <QRCodeSVG
                              ref={qrSearchRef}
                              value={searchedMember.studentId}
                              size={150}
                              level="H"
                              includeMargin={false}
                            />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-sm font-bold text-ink">Mã QR Định Danh</p>
                            <p className="text-[11px] text-muted-ink max-w-[190px] leading-tight mx-auto">
                              Xuất trình mã này khi điểm danh hoạt động.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDownloadQR(qrSearchRef.current, searchedMember.studentId)}
                            className="w-full mt-1 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                            </svg>
                            Tải Mã QR
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-xl mx-auto bg-white rounded-xl p-8 text-center border border-slate-200 shadow-sm">
                    <div className="w-10 h-10 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">!</div>
                    <h3 className="font-bold text-ink text-base mb-1">{lookupFailed ? "Chưa thể tra cứu" : "Không tìm thấy kết quả"}</h3>
                    <p className="text-sm text-muted-ink">
                      {lookupFailed ? "Vui lòng thử lại sau ít phút." : <>Không tìm thấy thành viên có mã <strong>{submittedId}</strong>. Bạn kiểm tra lại mã số sinh viên nhé.</>}
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