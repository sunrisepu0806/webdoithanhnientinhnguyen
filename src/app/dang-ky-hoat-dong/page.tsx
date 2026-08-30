'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Download, 
  AlertCircle, 
  GraduationCap, 
  ShieldCheck
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export interface MemberItem {
  id?: string;
  studentId: string;    // MSSV
  fullName: string;     // Họ và tên
  major: string;        // Ngành / Lớp
  group: string;        // Nhóm
  dob: string;          // Ngày sinh
  createdAt?: string;   // Ngày tham gia
  soBuoiThamGia?: number;
}

export default function TraCuuThanhVienPage() {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [searchedMember, setSearchedMember] = useState<MemberItem | null>(null);
  const [isSearched, setIsSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const qrRef = useRef<SVGSVGElement | null>(null);

  // Hàm tải dữ liệu linh hoạt từ Web B
  const loadData = async () => {
    try {
      // 1. Thử lấy từ /api/registrations
      let res = await fetch('http://localhost:3000/api/registrations', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.volunteers && Array.isArray(data.volunteers)) {
          setMembers(data.volunteers);
          return;
        }
        if (Array.isArray(data)) {
          setMembers(data);
          return;
        }
      }

      // 2. Thử lấy dự phòng từ /api/members (nếu bạn có đặt route này)
      res = await fetch('http://localhost:3000/api/members', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setMembers(data);
          return;
        }
      }
    } catch (e) {
      console.log('Lỗi kết nối Web B, đang thử lại...');
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Xử lý tra cứu cá nhân
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setIsSearched(true);

    // Tải mới dữ liệu trước khi tìm
    await loadData();

    const cleanKey = keyword.trim().toLowerCase();

    // Tìm kiếm chính xác hoặc tương đối theo MSSV hoặc Họ tên
    const found = members.find((m) => {
      const sId = String(m.studentId || '').trim().toLowerCase();
      const fName = String(m.fullName || '').trim().toLowerCase();
      return sId === cleanKey || sId.includes(cleanKey) || fName.includes(cleanKey);
    });

    setSearchedMember(found || null);
    setLoading(false);
  };

  // Tải mã QR cá nhân về máy
  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    const svgData = new XMLSerializer().serializeToString(qrRef.current);
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
        downloadLink.download = `QR-DiemDanh-${searchedMember?.studentId || 'TNTN'}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fbfe] text-slate-800 font-sans pb-24 select-none">
      
      {/* Header đồng bộ giao diện toàn trang */}
      <section className="max-w-5xl mx-auto px-6 pt-14 pb-8 text-center space-y-3">
        <h1 className="text-3xl md:text-5xl font-black text-[#0284c7] tracking-tight uppercase">
          TRA CỨU THÀNH VIÊN & ĐIỂM DANH
        </h1>
        <p className="text-sm md:text-base text-slate-500 max-w-xl mx-auto font-medium">
          Nhập mã số sinh viên (MSSV) để tra cứu thông tin cá nhân, tổng số buổi tích lũy và lấy mã QR điểm danh.
        </p>
      </section>

      {/* Khung Nhập MSSV Tra Cứu */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-8">
        
        <form onSubmit={handleSearch} className="bg-white rounded-3xl p-3 border border-slate-200/80 shadow-xl flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              required
              placeholder="Nhập mã số sinh viên (VD: 4656080003, 4851130115)..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-transparent focus:outline-none text-sm font-semibold text-slate-800"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3.5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center gap-1.5"
          >
            {loading ? 'Đang kiểm tra...' : 'Tra Cứu'}
          </button>
        </form>

        {/* ========================================================= */}
        {/* KẾT QUẢ TRA CỨU: THẺ ĐỊNH DANH & MÃ QR CÁ NHÂN           */}
        {/* ========================================================= */}
        {isSearched && (
          <div>
            {searchedMember ? (
              <div className="bg-white rounded-[34px] p-6 sm:p-9 border border-slate-200/80 shadow-2xl space-y-6">
                
                {/* Phần thông tin hồ sơ */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#0284c7] text-[11px] font-extrabold uppercase tracking-wider">
                      <ShieldCheck size={13} /> Thành Viên Chính Thức
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">
                      {searchedMember.fullName}
                    </h2>
                    <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                      <GraduationCap size={15} className="text-[#0284c7]" />
                      <span>{searchedMember.major}</span>
                    </p>
                  </div>

                  {/* Huy hiệu số buổi tích lũy */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50/70 px-5 py-3 rounded-2xl border border-blue-100 text-center shrink-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0284c7] block">
                      Tích Lũy Hoạt Động
                    </span>
                    <span className="text-2xl font-black text-slate-900">
                      {searchedMember.soBuoiThamGia || 1} <span className="text-xs font-bold text-slate-500">Buổi</span>
                    </span>
                  </div>
                </div>

                {/* Chi tiết dữ liệu Schema */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mã Số Sinh Viên</span>
                    <p className="font-mono font-bold text-slate-900 text-sm">{searchedMember.studentId}</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nhóm Sinh Hoạt</span>
                    <p className="font-bold text-blue-600 text-sm">Nhóm {searchedMember.group}</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-0.5 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ngày Sinh</span>
                    <p className="font-bold text-slate-800 text-sm">{searchedMember.dob}</p>
                  </div>
                </div>

                {/* Mã QR Điểm Danh Cá Nhân */}
                <div className="bg-gradient-to-b from-slate-50 to-blue-50/30 p-6 rounded-3xl border border-slate-200/80 text-center space-y-4">
                  <div className="bg-white p-4 rounded-2xl inline-block shadow-md">
                    <QRCodeSVG
                      ref={qrRef}
                      value={JSON.stringify({
                        studentId: searchedMember.studentId,
                        fullName: searchedMember.fullName,
                        major: searchedMember.major,
                        group: searchedMember.group,
                        dob: searchedMember.dob,
                      })}
                      size={180}
                      level="H"
                      includeMargin={false}
                    />
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700">Mã QR Điểm Danh Điện Tử</p>
                    <p className="text-[11px] text-slate-400">Xuất trình mã này cho Ban cán sự khi tham gia hoạt động</p>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleDownloadQR}
                      className="px-6 py-2.5 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 mx-auto active:scale-95"
                    >
                      <Download size={14} /> Tải Mã QR Về Điện Thoại
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-white rounded-3xl p-10 text-center text-slate-500 border border-slate-200 shadow-md space-y-2">
                <AlertCircle size={32} className="text-rose-500 mx-auto" />
                <h3 className="font-bold text-slate-900 text-base">Không Tìm Thấy Thông Tin</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Không tìm thấy thành viên có MSSV <strong>"{keyword}"</strong>. Vui lòng kiểm tra lại chính xác mã số sinh viên.
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}