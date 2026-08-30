'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Download, 
  AlertCircle, 
  GraduationCap, 
  Calendar,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs 
} from 'firebase/firestore';

export interface ActivityHistoryItem {
  id: string;
  name: string;
  date: string;
  points: number;
}

export interface MemberItem {
  id?: string;
  studentId: string;
  fullName: string;
  major: string;
  group?: string;
  dob?: string;
  createdAt?: string;
  soBuoiThamGia?: number;
  tongDiem?: number;
  history?: ActivityHistoryItem[];
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
  const [members, setMembers] = useState<MemberItem[]>([]);
  
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

  // Nạp dữ liệu đồng bộ
  const loadData = async (): Promise<MemberItem[]> => {
    try {
      const [memSnap, actSnap, attSnap] = await Promise.all([
        getDocs(collection(db, "members")),
        getDocs(collection(db, "activities")).catch(() => ({ docs: [] })),
        getDocs(collection(db, "attendance")).catch(() => ({ docs: [] }))
      ]);

      const actData = actSnap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        points: Number((d.data() as any).points || 10) 
      }));

      const allAtt = attSnap.docs.map(d => d.data());

      const normalized: MemberItem[] = memSnap.docs.map((doc) => {
        const item = doc.data();
        const sid = cleanId(item.studentId || item.msv || item.studentCode);
        
        const myAtt = allAtt.filter((a: any) => {
          const aSid = cleanId(a.studentId || a.msv);
          return (aSid && aSid === sid) || (a.memberId && a.memberId === doc.id);
        });

        let totalPoints = 0;
        const historyList: ActivityHistoryItem[] = myAtt.map((att: any, index: number) => {
          const act = actData.find(a => a.id === att.activityId);
          const pts = act?.points || 10;
          totalPoints += pts;
          return {
            id: att.activityId || `hist-${index}`,
            name: (act as any)?.name || (act as any)?.title || "Hoạt động Đội TNTN",
            date: (act as any)?.date || att.timestamp?.toDate?.()?.toLocaleDateString('vi-VN') || "Chưa cập nhật ngày",
            points: pts
          };
        });

        return {
          id: doc.id,
          studentId: String(item.studentId || item.msv || '').trim(),
          fullName: String(item.fullName || item.hoTen || item.name || '').trim(),
          major: String(item.major || item.Major || item.nganhHoc || item.lop || '').trim(),
          group: String(item.group || item.to || '1').replace(/[^0-9]/g, "") || "1",
          dob: formatBirthDate(item.dob || item.ngaySinh),
          createdAt: formatCreatedAt(item.createdAt),
          soBuoiThamGia: myAtt.length,
          tongDiem: totalPoints,
          history: historyList
        };
      });

      setMembers(normalized);
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

  // Tra cứu theo MSSV hoặc Họ tên
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = searchKeyword.trim().toLowerCase();
    if (!cleanKey) return;

    setSearchLoading(true);
    setIsSearched(true);
    setShowHistory(false);
    
    const currentList = await loadData();

    const found = currentList.find((m) => {
      const sId = cleanId(m.studentId);
      const sName = (m.fullName || "").toLowerCase();

      if (sId === cleanKey) return true;

      if (cleanKey.length >= 2 && isNaN(Number(cleanKey)) && sName.includes(cleanKey)) {
        return true;
      }

      return false;
    });

    setSearchedMember(found || null);
    setSearchLoading(false);
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

  // Xuất file Excel thông tin cá nhân và lịch sử hoạt động
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
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>LichSuHoatDong</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
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
      link.download = `Lich_Su_Hoat_Dong_${searchedMember.studentId}_${searchedMember.fullName.replace(/[\s/\\?%*:|"<>]/g, '_')}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Lỗi xuất file Excel:', err);
      alert('Không thể xuất file Excel. Vui lòng thử lại!');
    } finally {
      setIsExportingExcel(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f7fd]">
        <Loader2 className="w-8 h-8 text-[#0284c7] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col select-none font-sans overflow-x-hidden min-h-screen" suppressHydrationWarning>
      <style jsx global>{`
        @keyframes rippleCompact {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(5.5); opacity: 0; }
        }
        @keyframes auroraMove {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.45; }
          50% { transform: translate(30px, -20px) scale(1.15); opacity: 0.75; }
        }
        @keyframes textShine {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
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
        .gradient-shine-title {
          background: linear-gradient(135deg, #0284c7 0%, #2563eb 35%, #06b6d4 70%, #0284c7 100%);
          background-size: 250% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: textShine 6s ease-in-out infinite;
          filter: drop-shadow(0 2px 8px rgba(2, 132, 199, 0.18));
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

      {/* KHỐI CHÍNH */}
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        onMouseMove={handleMouseMove}
        className="relative min-h-[calc(100vh-80px)] flex flex-col justify-between bg-gradient-to-b from-[#f3f7fd] via-[#f7fafd] to-white overflow-hidden cursor-default flex-1"
      >
        {/* CANVAS HẠT BAY */}
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 z-10 h-full w-full"
        />

        {/* VÒNG GỢN SÓNG KHI CLICK */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="ripple-circle"
            style={{ left: `${ripple.x}px`, top: `${ripple.y}px` }}
          />
        ))}

        {/* LƯỚI NỀN CÔNG NGHỆ */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'radial-gradient(#0284c7 1.5px, transparent 1.5px)',
            backgroundSize: '30px 30px',
          }}
        />

        {/* SPOTLIGHT THEO CHUỘT */}
        <div
          className="pointer-events-none absolute rounded-full blur-[110px] transition-opacity duration-300"
          style={{
            width: '560px',
            height: '560px',
            left: `${mousePos.x - 280}px`,
            top: `${mousePos.y - 280}px`,
            background: 'radial-gradient(circle, rgba(2, 132, 199, 0.22) 0%, rgba(99, 102, 241, 0.12) 45%, transparent 70%)',
            zIndex: 1,
          }}
        />

        {/* CỰC QUANG BACKGROUND */}
        <div className="pointer-events-none absolute -top-28 -left-20 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-sky-300/30 via-blue-400/20 to-teal-200/20 blur-[110px] animate-aurora-glow" />
        <div className="pointer-events-none absolute top-1/3 -right-24 h-[460px] w-[460px] rounded-full bg-gradient-to-br from-indigo-300/20 via-sky-300/25 to-blue-200/20 blur-[120px] animate-aurora-glow" style={{ animationDelay: '-6s' }} />

        {/* NỘI DUNG CHÍNH */}
        <div className="relative z-20 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-10 pt-4 sm:pt-8 pb-10 flex-1 flex flex-col justify-start">
          
          {/* HEADER SECTION */}
          <div className="mb-6 sm:mb-8 space-y-2 text-center">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase gradient-shine-title leading-tight">
              TRA CỨU THÔNG TIN THÀNH VIÊN
            </h1>
            <p className="mx-auto max-w-xl text-xs sm:text-sm font-medium text-slate-500 leading-relaxed px-2">
              Cổng tra cứu thông tin điểm danh, số buổi tham gia và tải mã QR định danh cá nhân dành cho tình nguyện viên.
            </p>
          </div>

          {/* KHU VỰC TRA CỨU */}
          <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8">
            
            {/* THANH TÌM KIẾM */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-2 sm:p-2.5 border border-slate-200/80 shadow-xl shadow-sky-950/5 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
                <input
                  type="text"
                  required
                  placeholder="Nhập chính xác MSSV (hoặc Họ tên)..."
                  className="w-full pl-10 sm:pl-12 pr-3 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-transparent focus:outline-none text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={searchLoading}
                suppressHydrationWarning
                className="px-5 sm:px-6 py-2.5 sm:py-3 bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold rounded-xl sm:rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {searchLoading ? <Loader2 size={15} className="animate-spin" /> : <Search size={14} />}
                <span>{searchLoading ? 'Đang tìm...' : 'Tra Cứu'}</span>
              </button>
            </form>

            {/* KẾT QUẢ TÌM KIẾM */}
            {isSearched && (
              <div className="animate-in fade-in zoom-in-95 duration-200">
                {searchedMember ? (
                  <div className="bg-white/95 backdrop-blur-md rounded-[28px] sm:rounded-[36px] p-5 sm:p-8 border border-sky-100 shadow-2xl shadow-sky-950/10">
                    
                    {/* BỐ CỤC TRÊN: THÔNG TIN VÀ MÃ QR */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
                      
                      {/* CỘT TRÁI: THÔNG TIN CÁ NHÂN */}
                      <div className="lg:col-span-7 space-y-4 sm:space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-100">
                          <div className="space-y-1">
                            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">
                              {searchedMember.fullName}
                            </h2>

                            <p className="text-xs sm:text-sm text-slate-600 font-semibold flex items-center gap-1.5">
                              <GraduationCap size={16} className="text-[#0284c7]" />
                              <span>{searchedMember.major || "Chưa cập nhật"}</span>
                            </p>
                          </div>

                          {/* KHỐI TÍCH LŨY HOẠT ĐỘNG */}
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/80 p-3.5 sm:p-4 rounded-2xl border border-blue-100 text-center shrink-0 sm:min-w-[140px]">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0284c7] block mb-0.5">
                              Tích Lũy Hoạt Động
                            </span>
                            <span className="text-2xl sm:text-3xl font-black text-slate-900 block leading-tight">
                              {searchedMember.soBuoiThamGia || 0} <span className="text-xs font-bold text-slate-500">Buổi</span>
                            </span>
                            
                            <button
                              type="button"
                              onClick={() => setShowHistory((prev) => !prev)}
                              className="mt-1.5 text-[11px] font-extrabold text-[#0284c7] hover:text-[#0369a1] inline-flex items-center gap-1 transition-colors underline-offset-2 hover:underline cursor-pointer"
                            >
                              {showHistory ? 'Thu gọn' : 'Xem chi tiết'}
                              {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          </div>
                        </div>

                        {/* Grid chi tiết hồ sơ */}
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs">
                          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mã Số Sinh Viên</span>
                            <p className="font-mono font-bold text-slate-900 text-xs sm:text-sm">{searchedMember.studentId}</p>
                          </div>

                          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ngày Sinh</span>
                            <p className="font-bold text-slate-800 text-xs sm:text-sm font-mono">{formatBirthDate(searchedMember.dob)}</p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                          <div className="rounded-2xl bg-sky-50/60 border border-sky-100 p-3 sm:p-3.5 text-xs text-slate-600 flex items-center gap-2 flex-1">
                            <Calendar size={15} className="text-[#0284c7] shrink-0" />
                            <span>Ngày tham gia: <strong className="text-slate-800">{searchedMember.createdAt || '27/04/2023'}</strong></span>
                          </div>

                          {/* NÚT XUẤT FILE EXCEL CHO THÀNH VIÊN */}
                          <button
                            type="button"
                            onClick={handleExportMemberHistoryExcel}
                            disabled={isExportingExcel}
                            className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                          >
                            {isExportingExcel ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={15} />}
                            <span>Xuất File Excel</span>
                          </button>
                        </div>
                      </div>

                      {/* CỘT PHẢI: MÃ QR ĐIỂM DANH */}
                      <div className="lg:col-span-5 flex flex-col items-center justify-center">
                        <div className="w-full bg-gradient-to-b from-slate-50 to-blue-50/50 p-5 sm:p-6 rounded-3xl border border-slate-200/80 text-center space-y-3.5 shadow-sm">
                          <div className="bg-white p-3.5 sm:p-4 rounded-2xl inline-block shadow-md border border-slate-100 transition-transform duration-300 hover:scale-105">
                            <QRCodeSVG
                              ref={qrSearchRef}
                              value={searchedMember.studentId}
                              size={150}
                              level="H"
                              includeMargin={false}
                            />
                          </div>

                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-slate-800">Mã QR Điểm Danh Cá Nhân</p>
                            <p className="text-[11px] text-slate-400">Xuất trình mã này cho Ban cán sự khi tham gia hoạt động</p>
                          </div>

                          <div>
                            <button
                              type="button"
                              suppressHydrationWarning
                              onClick={() => handleDownloadQR(qrSearchRef.current, searchedMember.studentId)}
                              className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                            >
                              <Download size={14} /> Tải Mã QR Về Điện Thoại
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* PHẦN DƯỚI: LỊCH SỬ THAM GIA HOẠT ĐỘNG */}
                    {showHistory && (
                      <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-slate-100 animate-in fade-in duration-200">
                        <div className="mb-3 sm:mb-4 flex items-center justify-between">
                          <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs sm:text-sm">
                            Lịch Sử Tham Gia Hoạt Động ({searchedMember.history?.length || 0})
                          </h3>
                        </div>

                        {searchedMember.history && searchedMember.history.length > 0 ? (
                          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                            {searchedMember.history.map((act, index) => (
                              <div 
                                key={act.id || index} 
                                className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between hover:bg-blue-50/40 transition"
                              >
                                <div className="space-y-0.5">
                                  <p className="font-black text-slate-800 text-xs sm:text-sm uppercase tracking-tight">
                                    {act.name}
                                  </p>
                                  <p className="text-[10px] font-semibold text-slate-400">
                                    Ngày: {act.date}
                                  </p>
                                </div>
                                <span className="text-xs font-black text-[#0284c7] px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-100">
                                  +{act.points} điểm
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-6 sm:p-8 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                              Chưa có dữ liệu điểm danh hoạt động
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto bg-white/95 backdrop-blur-md rounded-3xl p-8 sm:p-10 text-center text-slate-500 border border-slate-200 shadow-md space-y-2">
                    <AlertCircle size={36} className="text-rose-500 mx-auto" />
                    <h3 className="font-bold text-slate-900 text-base">Không Tìm Thấy Thông Tin</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                      Không tìm thấy thành viên có thông tin <strong>"{searchKeyword}"</strong> trên hệ thống. Vui lòng kiểm tra lại chính xác Mã số sinh viên.
                    </p>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

        {/* DẢI SÓNG BIỂN CHÂN TRANG */}
        <div className="pointer-events-none relative z-20 h-10 sm:h-14 md:h-20 w-full shrink-0 overflow-hidden leading-none">
          <div className="absolute inset-0 animate-wave-back opacity-60">
            <svg viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none" className="block h-full w-1/2">
              <path d="M0,30 C320,65 420,10 720,25 C1020,40 1140,55 1440,30 L1440,90 L0,90 Z" fill="#dbeafe" />
            </svg>
            <svg viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none" className="block h-full w-1/2">
              <path d="M0,30 C320,65 420,10 720,25 C1020,40 1140,55 1440,30 L1440,90 L0,90 Z" fill="#dbeafe" />
            </svg>
          </div>

          <div className="absolute inset-0 animate-wave-front opacity-85">
            <svg viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none" className="block h-full w-1/2">
              <path d="M0,50 C360,75 500,35 800,45 C1100,55 1250,70 1440,50 L1440,90 L0,90 Z" fill="#bfdbfe" />
            </svg>
            <svg viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none" className="block h-full w-1/2">
              <path d="M0,50 C360,75 500,35 800,45 C1100,55 1250,70 1440,50 L1440,90 L0,90 Z" fill="#bfdbfe" />
            </svg>
          </div>
        </div>

      </div>
    </div>
  );
}