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
import { getGroupLink, getDeptLink } from '@/data/groupLinks';

export interface ActivityHistoryItem {
  id: string;
  name: string;
  date: string;
  points: number;
}

export interface CertificateDisplayItem {
  id: string;
  campaignName: string;
  fileUrl: string;
}

export interface MemberItem {
  id?: string;
  studentId: string;
  fullName: string;
  major: string;
  group?: string;
  department?: string;
  dob?: string;
  createdAt?: string;
  soBuoiThamGia?: number;
  tongDiem?: number;
  history?: ActivityHistoryItem[];
  certificates?: CertificateDisplayItem[];
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
  const [showHistory, setShowHistory] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const qrSearchRef = useRef<SVGSVGElement | null>(null);

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

  // Tra cứu dữ liệu từ Firestore
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawKey = searchKeyword.trim();
    if (!rawKey) return;

    setSearchLoading(true);
    setIsSearched(true);
    setShowHistory(false);

    try {
      let targetDoc: any = null;
      let targetData: any = null;

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

      const [attSnap, certSnap] = await Promise.all([
        getDocs(query(collection(db, "attendance"), where("studentId", "==", sid))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, "certificates"), where("studentId", "==", sid.toUpperCase()))).catch(() => ({ docs: [] } as any)),
      ]);

      const historyList: ActivityHistoryItem[] = attSnap.docs.map((d: any, index: number) => {
        const att = d.data();
        return {
          id: att.activityId || `hist-${index}`,
          name: att.activityName || att.name || "Hoạt động Đội TNTN",
          date: att.date || att.timestamp?.toDate?.()?.toLocaleDateString('vi-VN') || "Chưa cập nhật ngày",
          points: Number(att.points || 10),
        };
      });

      const certList: CertificateDisplayItem[] = certSnap.docs.map((d: any) => ({
        id: d.id,
        campaignName: d.data().campaignName || "Chứng nhận hoạt động tình nguyện",
        fileUrl: d.data().fileUrl || "",
      }));

      const totalPoints = historyList.reduce((acc, cur) => acc + cur.points, 0);

      setSearchedMember({
        id: targetDoc.id,
        studentId: sid,
        fullName: String(targetData.name || targetData.fullName || targetData.hoTen || '').trim(),
        major: String(targetData.majorAndClass || targetData.major || targetData.nganhHoc || targetData.lop || '').trim(),
        group: String(targetData.to_id || targetData.group || targetData.to || '1').replace(/[^0-9]/g, "") || "1",
        department: String(targetData.department || targetData.mang || targetData.ban || '').trim(),
        dob: formatBirthDate(targetData.ngaySinh || targetData.dob),
        createdAt: formatCreatedAt(targetData.createdAt),
        soBuoiThamGia: attSnap.docs.length || Number(targetData.soBuoiDiemDanh || 0),
        tongDiem: totalPoints,
        history: historyList,
        certificates: certList,
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

  const handleExportMemberHistoryExcel = () => {
    if (!searchedMember) return;
    setIsExportingExcel(true);

    try {
      const historyRows = (searchedMember.history || []).map((act, index) => `
        <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: 600;">${act.name}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${act.date}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold; color: #0284c7;">+${act.points}</td>
        </tr>
      `).join('');

      const excelTemplate = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        </head>
        <body>
          <table style="border-collapse: collapse; font-family: Calibri, sans-serif; font-size: 13px;">
            <tr>
              <th colspan="4" style="background-color: #0284c7; color: #ffffff; font-size: 16px; font-weight: bold; padding: 12px; text-align: center;">
                THÔNG TIN TÌNH NGUYỆN VIÊN & LỊCH SỬ THAM GIA HOẠT ĐỘNG
              </th>
            </tr>
            <tr><td colspan="4" style="padding: 4px;"></td></tr>
            <tr>
              <td style="font-weight: bold; width: 160px;">Họ và Tên:</td>
              <td style="font-weight: bold; color: #0284c7;">${searchedMember.fullName}</td>
              <td style="font-weight: bold; width: 140px;">Mã Số Sinh Viên:</td>
              <td style="font-weight: bold; mso-number-format:'\\@';">${searchedMember.studentId}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Ngành / Lớp:</td>
              <td>${searchedMember.major || 'Chưa cập nhật'}</td>
              <td style="font-weight: bold;">Ngày Sinh:</td>
              <td style="mso-number-format:'\\@';">${formatBirthDate(searchedMember.dob)}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Đơn Vị (Tổ):</td>
              <td>Tổ ${searchedMember.group || '1'}</td>
              <td style="font-weight: bold;">Ngày Tham Gia:</td>
              <td>${searchedMember.createdAt || '27/04/2023'}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Tổng số buổi:</td>
              <td style="font-weight: bold; color: #059669;">${searchedMember.soBuoiThamGia || 0} buổi</td>
              <td style="font-weight: bold;">Tổng điểm tích lũy:</td>
              <td style="font-weight: bold; color: #059669;">${searchedMember.tongDiem || 0} điểm</td>
            </tr>
            <tr><td colspan="4" style="padding: 10px;"></td></tr>
            <tr style="background-color: #e0f2fe; color: #0369a1; font-weight: bold; text-align: center;">
              <th style="border: 1px solid #cbd5e1; padding: 10px; width: 50px;">STT</th>
              <th style="border: 1px solid #cbd5e1; padding: 10px; width: 350px;">Tên Hoạt Động / Chiến Dịch</th>
              <th style="border: 1px solid #cbd5e1; padding: 10px; width: 160px;">Thời Gian Tham Gia</th>
              <th style="border: 1px solid #cbd5e1; padding: 10px; width: 100px;">Điểm Cộng</th>
            </tr>
            ${historyRows || `
              <tr>
                <td colspan="4" style="border: 1px solid #cbd5e1; padding: 12px; text-align: center; color: #94a3b8;">
                  Chưa có lịch sử tham gia hoạt động nào.
                </td>
              </tr>
            `}
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Lich_Su_Hoat_Dong_${searchedMember.studentId}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Không thể xuất file Excel. Vui lòng thử lại!');
    } finally {
      setIsExportingExcel(false);
    }
  };

  if (!isMounted) return null;

  // Lấy link tương ứng từ file groupLinks.ts
  const groupUrl = searchedMember ? getGroupLink(searchedMember.group) : '';
  const deptUrl = searchedMember ? getDeptLink(searchedMember.department) : null;

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

        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
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
        <div className="pointer-events-none absolute top-1/2 -right-32 h-[500px] w-[500px] rounded-full bg-blue-300/15 blur-[120px] animate-aurora-glow" style={{ animationDelay: '-4s' }} />

        {/* Nội dung chính */}
        <div className="relative z-20 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 pt-12 pb-16 flex-1 flex flex-col justify-start">
          
          <div className="mb-10 text-center space-y-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-sky-600 drop-shadow-sm uppercase">
              Tra Cứu Thông Tin
            </h1>
            <p className="mx-auto max-w-lg text-sm sm:text-base text-slate-500 font-medium">
              Nhập mã số sinh viên để tra cứu thông tin hoạt động, link nhóm tổ và mã QR cá nhân.
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
                  placeholder="Nhập MSSV (ví dụ: 4751180032)..."
                  className="w-full pl-3 pr-4 py-2.5 bg-transparent focus:outline-none text-sm font-semibold text-slate-800 placeholder:text-slate-400"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={searchLoading}
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-sm transition-all shadow-md active:scale-95 flex items-center justify-center shrink-0 disabled:opacity-70 disabled:active:scale-100 min-w-[110px]"
              >
                {searchLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Tra Cứu'}
              </button>
            </form>

            {isSearched && (
              <div className="animate-in fade-in zoom-in-95 duration-300">
                {searchedMember ? (
                  <div className="bg-white rounded-[2rem] p-6 sm:p-10 border border-slate-100 shadow-xl shadow-slate-200/50">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                      
                      {/* Cột Trái: Thông tin cá nhân & Link nhóm */}
                      <div className="lg:col-span-8 space-y-8">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-100">
                          <div>
                            <span className="inline-block px-3 py-1 bg-sky-100 text-sky-700 text-xs font-bold rounded-lg mb-3">Thành viên Đội TNTN</span>
                            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight mb-1">
                              {searchedMember.fullName}
                            </h2>
                            <p className="text-slate-500 font-medium">{searchedMember.major || "Chưa cập nhật ngành học"}</p>
                          </div>
                          
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center min-w-[130px]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Tổng Tích Lũy</span>
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="text-3xl font-black text-sky-600">{searchedMember.soBuoiThamGia || 0}</span>
                              <span className="text-sm font-bold text-slate-400">buổi</span>
                            </div>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded mt-2 inline-block">
                              {searchedMember.tongDiem || 0} điểm
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mã Số Sinh Viên</span>
                            <p className="font-mono font-bold text-slate-800 text-sm">{searchedMember.studentId}</p>
                          </div>
                          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ngày Sinh</span>
                            <p className="font-mono font-bold text-slate-800 text-sm">{formatBirthDate(searchedMember.dob)}</p>
                          </div>
                          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tổ Hoạt Động</span>
                            <p className="font-bold text-slate-800 text-sm">Tổ {searchedMember.group || '1'}</p>
                          </div>
                          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ngày Tham Gia</span>
                            <p className="font-mono font-bold text-slate-800 text-sm">{searchedMember.createdAt || '27/04/2023'}</p>
                          </div>
                        </div>

                        {/* KHU VỰC THAM GIA NHÓM (Lấy link từ file groupLinks.ts) */}
                        <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-3">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-sky-800">
                            Liên kết nhóm hoạt động của bạn
                          </h4>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <a
                              href={groupUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-all shadow-md shadow-sky-600/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                              <span>Tham gia Nhóm Tổ {searchedMember.group || '1'}</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>

                            {deptUrl && (
                              <a
                                href={deptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-sky-700 border border-sky-200 font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-2"
                              >
                                <span>Nhóm {searchedMember.department}</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            type="button"
                            onClick={() => setShowHistory(!showHistory)}
                            className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                          >
                            <svg className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            {showHistory ? 'Đóng Lịch Sử Hoạt Động' : 'Xem Lịch Sử Hoạt Động'}
                          </button>
                          
                          <button
                            type="button"
                            onClick={handleExportMemberHistoryExcel}
                            disabled={isExportingExcel}
                            className="flex-1 py-3 px-4 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            {isExportingExcel ? 'Đang Xuất...' : 'Xuất File Excel'}
                          </button>
                        </div>
                      </div>

                      {/* Cột Phải: QR Code */}
                      <div className="lg:col-span-4 flex flex-col items-center">
                        <div className="w-full bg-white p-6 rounded-2xl border-2 border-dashed border-slate-200 text-center flex flex-col items-center gap-4">
                          <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                            <QRCodeSVG
                              ref={qrSearchRef}
                              value={searchedMember.studentId}
                              size={160}
                              level="H"
                              includeMargin={false}
                            />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-800">Mã QR Định Danh</p>
                            <p className="text-[11px] text-slate-500 max-w-[200px] leading-tight mx-auto">
                              Xuất trình mã này cho Ban cán sự khi điểm danh hoạt động
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDownloadQR(qrSearchRef.current, searchedMember.studentId)}
                            className="w-full mt-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            Tải Mã QR
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Lịch Sử Tham Gia */}
                    {showHistory && (
                      <div className="mt-8 pt-8 border-t border-slate-100 animate-in slide-in-from-top-4 duration-300">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-sky-500" />
                          Lịch Sử Hoạt Động ({searchedMember.history?.length || 0})
                        </h3>
                        
                        {searchedMember.history && searchedMember.history.length > 0 ? (
                          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                            {searchedMember.history.map((act, idx) => (
                              <div key={act.id || idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-sky-200 transition-colors">
                                <div>
                                  <p className="font-semibold text-slate-800 text-sm mb-1">{act.name}</p>
                                  <p className="text-xs text-slate-500 font-medium">Thời gian: {act.date}</p>
                                </div>
                                <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold whitespace-nowrap self-start sm:self-auto">
                                  +{act.points} điểm
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 rounded-xl bg-slate-50 border border-slate-100 text-center text-slate-500 text-sm font-medium">
                            Chưa có dữ liệu tham gia hoạt động.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Giấy Chứng Nhận */}
                    <div className="mt-8 pt-8 border-t border-slate-100">
                      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        Giấy Chứng Nhận ({searchedMember.certificates?.length || 0})
                      </h3>
                      
                      {searchedMember.certificates && searchedMember.certificates.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {searchedMember.certificates.map((cert) => (
                            <div key={cert.id} className="p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow bg-white">
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 text-sm truncate" title={cert.campaignName}>
                                  {cert.campaignName}
                                </p>
                              </div>
                              <a
                                href={cert.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold text-xs transition-colors shrink-0 text-center"
                              >
                                Xem Online
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 rounded-xl bg-slate-50 border border-slate-100 text-center text-slate-500 text-sm font-medium">
                          Chưa có chứng nhận nào trên hệ thống.
                        </div>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="max-w-xl mx-auto bg-white rounded-2xl p-10 text-center border border-slate-100 shadow-lg shadow-slate-200/50">
                    <div className="w-12 h-12 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">!</div>
                    <h3 className="font-bold text-slate-900 text-lg mb-2">Không Tìm Thấy Kết Quả</h3>
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