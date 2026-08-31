'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Calendar, User, Phone, BookOpen, Send, Eye, CheckCircle2, AlertCircle } from 'lucide-react';

// Danh sách hoạt động (Khi Admin chưa đăng bài thì để mảng rỗng [])
const hoatDongList = [
  {
    id: 'tiep-suc-mua-thi-2026',
    tieuDe: 'Chiến dịch Tiếp Sức Mùa Thi 2026',
    moTa: 'Địa điểm: Các điểm trường THPT tại TP. Quy Nhơn. Gồm 2 ca phục vụ. Bấm để đăng ký tham gia.',
    hinhAnh: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80',
    ngayDang: '28/08/2026',
    trangThai: 'ĐANG NHẬN ĐƠN',
    luotXem: 40,
  },
  {
    id: 'chu-nhat-xanh-2026',
    tieuDe: 'Ngày Hội Chủ Nhật Xanh – Làm Sạch Bờ Biển',
    moTa: 'Địa điểm: Bờ biển Quy Nhơn. Thu gom rác thải và tuyên truyền bảo vệ môi trường sinh thái biển.',
    hinhAnh: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
    ngayDang: '28/08/2026',
    trangThai: 'ĐANG NHẬN ĐƠN',
    luotXem: 57,
  },
  {
    id: 'ho-tro-k49',
    tieuDe: 'Đội Hình Hỗ Trợ Tân Sinh Viên Nhập Học',
    moTa: 'Địa điểm: Sảnh nhà A, Trường ĐH Quy Nhơn. Hướng dẫn hồ sơ, tìm kiếm nhà trọ và giải đáp thắc mắc.',
    hinhAnh: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=800&q=80',
    ngayDang: '28/08/2026',
    trangThai: 'ĐANG NHẬN ĐƠN',
    luotXem: 74,
  },
];

export default function DangKyPage() {
  const [selectedHoatDong, setSelectedHoatDong] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    maSinhVien: '',
    hoVaTen: '',
    ngaySinh: '',
    gioiTinh: '',
    cccd: '',
    soDienThoai: '',
    email: '',
    banNguyenVong: 'Ban Sự kiện',
    kinhNghiem: '',
  });

  const [submitted, setSubmitted] = useState(false);

  const currentSelectedHoatDong = hoatDongList.find((item) => item.id === selectedHoatDong);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="w-full min-h-screen bg-[#f3f9fe] text-slate-800 py-12 md:py-16">
      <div className="max-w-6xl mx-auto px-6 md:px-10">
        
        {/* 1. KHỐI CHỌN HOẠT ĐỘNG */}
        <div className="space-y-4 mb-12">
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-black text-[#0f2d4a] uppercase tracking-tight">
              CHỌN HOẠT ĐỘNG THAM GIA
            </h1>
            <p className="text-xs md:text-sm text-slate-500">
              Nhấp chọn một hoạt động bên dưới để mở form điền thông tin đăng ký
            </p>
            <div className="w-16 h-1 bg-[#0284c7] mx-auto rounded-full mt-2" />
          </div>

          {hoatDongList.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 max-w-2xl mx-auto space-y-3 mt-6">
              <AlertCircle size={36} className="text-slate-400 mx-auto" />
              <p className="text-base font-bold text-slate-700">Hiện chưa có hoạt động nào mở đơn đăng ký</p>
              <p className="text-xs text-slate-400">Vui lòng quay lại sau khi Ban cán sự mở đợt đăng ký mới.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
              {hoatDongList.map((item) => {
                const isSelected = selectedHoatDong === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedHoatDong(item.id);
                      setSubmitted(false);
                    }}
                    className={`cursor-pointer bg-white rounded-3xl overflow-hidden transition-all duration-300 border flex flex-col group relative ${
                      isSelected
                        ? 'border-[#0284c7] ring-4 ring-sky-200 shadow-2xl scale-[1.02]'
                        : 'border-slate-100 shadow-md hover:shadow-xl hover:-translate-y-1'
                    }`}
                  >
                    {/* Ảnh hoạt động */}
                    <div className="relative w-full h-52 bg-slate-200 overflow-hidden">
                      <Image
                        src={item.hinhAnh}
                        alt={item.tieuDe}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      
                      <span className="absolute top-3.5 right-3.5 text-[10px] font-extrabold px-3 py-1 rounded-full bg-[#0060b9] text-white shadow">
                        {item.trangThai}
                      </span>

                      {isSelected && (
                        <div className="absolute top-3.5 left-3.5 bg-[#0284c7] text-white text-xs font-bold px-3 py-1 rounded-full shadow flex items-center gap-1">
                          <CheckCircle2 size={14} /> Đang chọn
                        </div>
                      )}
                    </div>

                    {/* Nội dung card */}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-extrabold text-base text-slate-900 flex items-start gap-1.5 leading-snug group-hover:text-[#0284c7] transition-colors">
                          <span className="text-[#0284c7] shrink-0">💙</span> 
                          <span>{item.tieuDe}</span>
                        </h3>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {item.moTa}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} className="text-[#0284c7]" /> {item.ngayDang}
                        </span>
                        <span className="flex items-center gap-1 text-[#0284c7]">
                          <Eye size={13} /> {item.luotXem} lượt xem
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. FORM ĐĂNG KÝ CHỈ HIỆN KHI ĐÃ CHỌN HOẠT ĐỘNG */}
        {selectedHoatDong && (
          <div className="pt-6 border-t border-slate-200/80 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {submitted ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-xl text-center space-y-4 max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
                  ✓
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Đăng ký thành công!</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Đơn đăng ký tham gia <strong className="text-slate-800">{currentSelectedHoatDong?.tieuDe}</strong> của bạn đã được gửi thành công. Ban cán sự sẽ sớm liên hệ qua thông tin bạn đã cung cấp!
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedHoatDong(null)}
                  className="px-6 py-2.5 bg-[#0284c7] text-white text-xs font-bold rounded-full hover:bg-blue-700 transition-colors"
                >
                  Chọn hoạt động khác
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
                
                {/* Banner hoạt động đang chọn */}
                <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-slate-500">Đang đăng ký hoạt động:</span>
                    <p className="text-sm font-extrabold text-[#0284c7]">{currentSelectedHoatDong?.tieuDe}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedHoatDong(null)}
                    className="text-xs text-slate-400 hover:text-red-500 font-semibold underline"
                  >
                    Đổi hoạt động
                  </button>
                </div>

                {/* MỤC 1: THÔNG TIN CÁ NHÂN */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-5">
                  <div className="flex items-center gap-2.5 text-[#0284c7] font-black text-sm uppercase tracking-wide border-b border-slate-100 pb-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                      <User size={16} />
                    </div>
                    1. THÔNG TIN CÁ NHÂN
                  </div>

                  <div className="space-y-4 text-xs md:text-sm">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">Mã sinh viên *</label>
                      <input
                        type="text"
                        required
                        placeholder="Nhập mã sinh viên (VD: 4751180...)"
                        className="w-full p-3 bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                        value={formData.maSinhVien}
                        onChange={(e) => setFormData({ ...formData, maSinhVien: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1.5">Họ và tên *</label>
                        <input
                          type="text"
                          required
                          placeholder="Nhập họ và tên"
                          className="w-full p-3 bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                          value={formData.hoVaTen}
                          onChange={(e) => setFormData({ ...formData, hoVaTen: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1.5">Ngày sinh *</label>
                        <input
                          type="date"
                          required
                          className="w-full p-3 bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                          value={formData.ngaySinh}
                          onChange={(e) => setFormData({ ...formData, ngaySinh: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1.5">Giới tính *</label>
                        <select
                          required
                          className="w-full p-3 bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                          value={formData.gioiTinh}
                          onChange={(e) => setFormData({ ...formData, gioiTinh: e.target.value })}
                        >
                          <option value="">Chọn giới tính</option>
                          <option value="Nam">Nam</option>
                          <option value="Nữ">Nữ</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1.5">Số CCCD *</label>
                        <input
                          type="text"
                          required
                          placeholder="Nhập số CCCD"
                          className="w-full p-3 bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                          value={formData.cccd}
                          onChange={(e) => setFormData({ ...formData, cccd: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* MỤC 2: THÔNG TIN LIÊN HỆ */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-5">
                  <div className="flex items-center gap-2.5 text-[#0284c7] font-black text-sm uppercase tracking-wide border-b border-slate-100 pb-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Phone size={16} />
                    </div>
                    2. THÔNG TIN LIÊN HỆ
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">Số điện thoại *</label>
                      <input
                        type="tel"
                        required
                        placeholder="037xxxxxxx"
                        className="w-full p-3 bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                        value={formData.soDienThoai}
                        onChange={(e) => setFormData({ ...formData, soDienThoai: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">Email liên hệ *</label>
                      <input
                        type="email"
                        required
                        placeholder="example@gmail.com"
                        className="w-full p-3 bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* MỤC 3: NGUYỆN VỌNG & KỸ NĂNG */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-5">
                  <div className="flex items-center gap-2.5 text-[#0284c7] font-black text-sm uppercase tracking-wide border-b border-slate-100 pb-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                      <BookOpen size={16} />
                    </div>
                    3. NGUYỆN VỌNG BAN CHUYÊN MÔN
                  </div>

                  <div className="space-y-4 text-xs md:text-sm">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">Nguyện vọng vào Ban *</label>
                      <select
                        className="w-full p-3 bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                        value={formData.banNguyenVong}
                        onChange={(e) => setFormData({ ...formData, banNguyenVong: e.target.value })}
                      >
                        <option value="Ban Sự kiện">Ban Sự kiện (Tổ chức hoạt động, điều phối)</option>
                        <option value="Ban Truyền thông">Ban Truyền thông (Thiết kế, viết bài, media)</option>
                        <option value="Ban Hậu cần">Ban Hậu cần (Chuẩn bị cơ sở vật chất, hậu cần)</option>
                        <option value="Ban Đối ngoại">Ban Đối ngoại (Vận động tài trợ, kết nối đơn vị)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">Kỹ năng / Kinh nghiệm hoạt động</label>
                      <textarea
                        rows={3}
                        placeholder="Sở trường, kỹ năng hoặc các hoạt động bạn từng tham gia..."
                        className="w-full p-3 bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                        value={formData.kinhNghiem}
                        onChange={(e) => setFormData({ ...formData, kinhNghiem: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* NÚT GỬI ĐƠN */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-4 bg-[#ea580c] hover:bg-[#c2410c] text-white font-extrabold rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-base"
                  >
                    <Send size={18} /> Gửi Đơn Đăng Ký
                  </button>
                </div>

              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
}