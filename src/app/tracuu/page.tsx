'use client';

import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  query, 
  where, 
  limit 
} from 'firebase/firestore';
import { getGroupLink, getDeptLinksList } from '@/data/groupLinks';

export interface MemberItem {
  id?: string;
  studentId: string;
  fullName: string;
  major: string;
  group?: string;
  department?: string;
  dob?: string;
  createdAt?: string;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

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

function formatCreatedAt(createdAt: any): string {
  if (!createdAt) return '27/04/2023';

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

  return '27/04/2023';
}

export default function TraCuuThanhVienPage() {
  const [isMounted, setIsMounted] = useState(false);

  // State Tra cứu
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchedMember, setSearchedMember] = useState<MemberItem | null>(null);
  const [isSearched, setIsSearched] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

    setSearchLoading(true);
    setIsSearched(true);
    setCopiedKey(null);

    try {
      let targetDoc: any = null;
      let targetData: any = null;

      // Tìm theo Document ID (MSSV)
      const userDocRef = doc(db, "users", rawKey);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        targetDoc = userSnap;
        targetData = userSnap.data();
      } else {
        const qUser = query(collection(db, "users"), where("mssv", "==", rawKey), limit(1));
        const resUser = await getDocs(qUser);
        if (!resUser.empty) {
          targetDoc = resUser.docs[0];
          targetData = targetDoc.data();
        } else {
          const qUserSid = query(collection(db, "users"), where("studentId", "==", rawKey), limit(1));
          const resUserSid = await getDocs(qUserSid);
          if (!resUserSid.empty) {
            targetDoc = resUserSid.docs[0];
            targetData = targetDoc.data();
          }
        }
      }

      if (!targetDoc || !targetData) {
        setSearchedMember(null);
        setSearchLoading(false);
        return;
      }

      const sid = String(targetData.mssv || targetData.studentId || targetDoc.id).trim();

      const rawDept = targetData.mangChuyenMon || 
                      targetData.mang || 
                      targetData.department || 
                      targetData.ban || 
                      '';

      setSearchedMember({
        id: targetDoc.id,
        studentId: sid,
        fullName: String(targetData.name || targetData.fullName || targetData.hoTen || '').trim(),
        major: String(targetData.majorAndClass || targetData.major || targetData.nganhHoc || targetData.lop || '').trim(),
        group: String(targetData.to_id || targetData.group || targetData.to || '').replace(/[^0-9]/g, "") || "1",
        department: String(rawDept).trim(),
        dob: formatBirthDate(targetData.ngaySinh || targetData.dob),
        createdAt: formatCreatedAt(targetData.createdAt),
      });

    } catch (err) {
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

  const handleCopy = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isMounted) return null;

  const groupUrl = searchedMember ? getGroupLink(searchedMember.group) : '';
  const deptList = searchedMember ? getDeptLinksList(searchedMember.department) : [];

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
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#0284c7 1.5px, transparent 1.5px)', backgroundSize: '30px 30px' }} />
        
        <div
          className="pointer-events-none absolute rounded-full blur-[100px] transition-opacity duration-300"
          style={{ width: '500px', height: '500px', left: `${mousePos.x - 250}px`, top: `${mousePos.y - 250}px`, background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, rgba(99, 102, 241, 0.05) 50%, transparent 70%)', zIndex: 1 }}
        />
        
        <div className="pointer-events-none absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-sky-300/20 blur-[120px] animate-aurora-glow" />
        <div className="pointer-events-none absolute top-1/2 -right-32 h-[500px] w-[500px] rounded-full bg-blue-300/15 blur-[120px] animate-aurora-glow" style={{ animationDelay: '-4s' }} />

        {/* Khung nội dung */}
        <div className="relative z-20 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 pt-12 pb-16 flex-1 flex flex-col justify-start">
          
          <div className="mb-10 text-center space-y-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-sky-600 drop-shadow-sm uppercase">
              Tra Cứu Link Nhóm
            </h1>
            <p className="mx-auto max-w-lg text-sm sm:text-base text-slate-500 font-medium">
              Nhập mã số sinh viên để nhận liên kết vào nhóm Tổ và các Mảng hoạt động của bạn.
            </p>
          </div>

          <div className="w-full max-w-4xl mx-auto space-y-8">
            {/* Form Tra Cứu */}
            <form onSubmit={handleSearch} className="max-w-xl mx-auto bg-white rounded-xl p-2.5 border border-slate-200 shadow-sm flex items-center gap-2 transition-all focus-within:border-sky-400">
              <div className="relative flex-1 flex items-center pl-3">
                <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <input
                  type="text"
                  required
                  placeholder="Nhập MSSV (ví dụ: 4751130041)..."
                  className="w-full pl-3 pr-4 py-2 bg-transparent focus:outline-none text-sm font-semibold text-slate-800 placeholder:text-slate-400"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={searchLoading}
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-sm transition-all active:scale-95 flex items-center justify-center shrink-0 disabled:opacity-70 disabled:active:scale-100 min-w-[110px]"
              >
                {searchLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Tra Cứu'}
              </button>
            </form>

            {/* CHỈ XUẤT HIỆN KHI ĐÃ BẤM TRA CỨU */}
            {isSearched && (
              <div className="animate-in fade-in duration-200">
                {searchedMember ? (
                  <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      
                      {/* Cột Trái: Thông tin & Link nhóm */}
                      <div className="lg:col-span-8 space-y-6">
                        <div className="pb-4 border-b border-slate-100">
                          <span className="inline-block px-2.5 py-0.5 bg-sky-100 text-sky-700 text-xs font-semibold rounded-md mb-2">
                            Thành viên Đội TNTN
                          </span>
                          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight mb-1">
                            {searchedMember.fullName}
                          </h2>
                          <p className="text-slate-500 text-sm font-medium">{searchedMember.major || "Chưa cập nhật ngành học"}</p>
                        </div>

                        {/* Bảng thông tin: Tối giản phẳng và đồng bộ */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mã Số Sinh Viên</span>
                            <p className="font-mono font-bold text-slate-800 text-sm">{searchedMember.studentId}</p>
                          </div>
                          
                          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ngày Sinh</span>
                            <p className="font-mono font-bold text-slate-800 text-sm">{formatBirthDate(searchedMember.dob)}</p>
                          </div>

                          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ngày Tham Gia</span>
                            <p className="font-mono font-bold text-slate-800 text-sm">{searchedMember.createdAt || '27/04/2023'}</p>
                          </div>

                          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                            <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider block mb-1">Tổ Hoạt Động</span>
                            <p className="font-bold text-slate-800 text-sm">Tổ {searchedMember.group || '1'}</p>
                          </div>

                          {/* Mảng Chuyên Môn */}
                          <div className="col-span-1 sm:col-span-2 p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                            <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider block mb-1.5">Mảng Chuyên Môn</span>
                            <div className="flex flex-wrap gap-1.5">
                              {deptList.length > 0 ? (
                                deptList.map((item, idx) => (
                                  <span key={idx} className="inline-block px-2.5 py-1 rounded-lg bg-white text-slate-700 border border-slate-200 text-xs font-semibold">
                                    {item.name}
                                  </span>
                                ))
                              ) : (
                                <p className="font-semibold text-slate-800 text-sm">{searchedMember.department || 'Chưa cập nhật mảng'}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* LIÊN KẾT NHÓM ZALO */}
                        <div className="p-4 sm:p-5 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-sky-500" />
                            Liên Kết Nhóm Zalo Dành Riêng Cho Bạn
                          </h4>

                          <div className="space-y-2.5">
                            {/* Nhóm Tổ */}
                            {groupUrl && (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
                                <div>
                                  <div className="font-bold text-slate-800 text-sm">Nhóm Zalo Tổ {searchedMember.group}</div>
                                  <div className="text-xs text-slate-400">Dành riêng cho thành viên Tổ {searchedMember.group}</div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(groupUrl, 'to')}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg text-xs transition"
                                  >
                                    {copiedKey === 'to' ? "Đã copy" : "Copy"}
                                  </button>
                                  <a
                                    href={groupUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg text-xs transition flex items-center gap-1.5"
                                  >
                                    <span>Vào Nhóm</span>
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                  </a>
                                </div>
                              </div>
                            )}

                            {/* Các Nhóm Mảng Chuyên Môn */}
                            {deptList.map((item, idx) => {
                              const deptKey = `dept-${idx}`;
                              return (
                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
                                  <div>
                                    <div className="font-bold text-slate-800 text-sm">Nhóm Zalo: {item.name}</div>
                                    <div className="text-xs text-slate-400">Mảng chuyên môn của bạn</div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {item.link ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleCopy(item.link!, deptKey)}
                                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg text-xs transition"
                                        >
                                          {copiedKey === deptKey ? "Đã copy" : "Copy"}
                                        </button>
                                        <a
                                          href={item.link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition flex items-center gap-1.5"
                                        >
                                          <span>Vào Nhóm</span>
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                          </svg>
                                        </a>
                                      </>
                                    ) : (
                                      <span className="text-xs text-slate-400 italic py-1">Chưa cập nhật link</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
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
                            <p className="text-sm font-bold text-slate-800">Mã QR Định Danh</p>
                            <p className="text-[11px] text-slate-500 max-w-[190px] leading-tight mx-auto">
                              Xuất trình mã này cho Ban cán sự khi điểm danh hoạt động
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
                    <h3 className="font-bold text-slate-900 text-base mb-1">Không Tìm Thấy Kết Quả</h3>
                    <p className="text-sm text-slate-500">
                      Không tìm thấy thành viên mang mã <strong>"{searchKeyword}"</strong>. Vui lòng kiểm tra lại chính xác Mã số sinh viên.
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