'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { collection, onSnapshot, addDoc, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface HoatDongItem {
  id: string;
  tieuDe: string;
  moTa: string;
  hinhAnh: string;
  ngayDang: string;
  trangThai: string;
}

export default function DangKyPage() {
  const [hoatDongList, setHoatDongList] = useState<HoatDongItem[]>([]);
  const [loadingHoatDong, setLoadingHoatDong] = useState(true);
  const [selectedHoatDong, setSelectedHoatDong] = useState<string | null>(null);

  // Trạng thái thành viên đã tồn tại hay mới
  const [isExistingMember, setIsExistingMember] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    maSinhVien: '',
    hoVaTen: '',
    ngaySinh: '',
    gioiTinh: 'Nam',
    soDienThoai: '',
    email: '',
    nganhHoc: '',
    banHienTai: 'Không',
    toHienTai: 'Tổ 6 (Thành viên mới)',
    to_id: 'to_6',
    banNguyenVong: 'Ban Sự kiện',
    ghiChu: '',
  });

  // 1. Tải danh sách hoạt động từ Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'events'), (snap) => {
      const list: HoatDongItem[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          tieuDe: data.name || data.title || data.tieuDe || 'Hoạt động tình nguyện',
          moTa: data.description || data.moTa || 'Tham gia các hoạt động thiện nguyện, rèn luyện kỹ năng và cống hiến cho cộng đồng.',
          hinhAnh: data.imageUrl || data.hinhAnh || 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80',
          ngayDang: data.date || data.ngay || 'Đang mở',
          trangThai: data.status || 'ĐANG NHẬN ĐƠN',
        });
      });
      setHoatDongList(list);
      setLoadingHoatDong(false);
    });

    return () => unsub();
  }, []);

  // 2. Hàm trích xuất Ban chuyên môn chuẩn
  const extractBan = (data: any): string => {
    if (Array.isArray(data.ban_id)) {
      if (data.ban_id.includes('bantruyenthong')) return 'Ban Truyền thông';
      if (data.ban_id.includes('bansukien')) return 'Ban Sự kiện';
    }
    const raw = String(data.ban || data.department || data.ban_id || '').trim();
    if (!raw || raw.toLowerCase() === 'chưa xếp ban' || raw.toLowerCase() === 'none') {
      return 'Không';
    }
    if (raw.toLowerCase().includes('truyền thông')) return 'Ban Truyền thông';
    if (raw.toLowerCase().includes('sự kiện')) return 'Ban Sự kiện';
    return raw;
  };

  // 3. Hàm trích xuất Tổ
  const extractTo = (data: any): { toText: string; toId: string } => {
    const rawToId = String(data.to_id || data.to || data.group || '').trim().toLowerCase();
    const match = rawToId.match(/[1-6]/);
    if (match) {
      return { toText: `Tổ ${match[0]}`, toId: `to_${match[0]}` };
    }
    return { toText: 'Tổ 6 (Thành viên mới)', toId: 'to_6' };
  };

  // 4. Tra cứu thông tin MSSV chuẩn khớp cấu trúc Firestore
  const handleCheckMssv = async (inputMssv: string) => {
    const clean = inputMssv.trim();
    if (!clean || clean.length < 5) {
      setIsExistingMember(false);
      setFormData((prev) => ({
        ...prev,
        banHienTai: 'Không',
        toHienTai: 'Tổ 6 (Thành viên mới)',
        to_id: 'to_6',
      }));
      return;
    }

    setAutoFilling(true);
    try {
      let foundData: any = null;

      // Tìm trực tiếp theo ID Document
      const docDirect = await getDoc(doc(db, 'users', clean));
      if (docDirect.exists()) {
        foundData = docDirect.data();
      } else {
        // Query theo trường mssv
        const qSnap = await getDocs(query(collection(db, 'users'), where('mssv', '==', clean)));
        if (!qSnap.empty) {
          foundData = qSnap.docs[0].data();
        } else {
          // Kiểm tra fallback sang members
          const memDirect = await getDoc(doc(db, 'members', clean));
          if (memDirect.exists()) {
            foundData = memDocDirectData(memDirect.data());
          } else {
            const memQ = await getDocs(query(collection(db, 'members'), where('mssv', '==', clean)));
            if (!memQ.empty) {
              foundData = memDocDirectData(memQ.docs[0].data());
            }
          }
        }
      }

      if (foundData) {
        // ĐÃ TỒN TẠI: Tự động điền và KHÓA CHỈNH SỬA
        const toInfo = extractTo(foundData);
        setIsExistingMember(true);
        setFormData((prev) => ({
          ...prev,
          maSinhVien: clean,
          hoVaTen: foundData.name || foundData.fullName || foundData.hoTen || '',
          nganhHoc: foundData.majorAndClass || foundData.major || foundData.lop || '',
          ngaySinh: foundData.ngaySinh || foundData.dob || '',
          gioiTinh: foundData.gioiTinh || foundData.gender || 'Nam',
          soDienThoai: foundData.soDienThoai || foundData.phone || prev.soDienThoai,
          email: foundData.email || prev.email,
          banHienTai: extractBan(foundData),
          toHienTai: toInfo.toText,
          to_id: toInfo.toId,
        }));
      } else {
        // CHƯA CÓ: MẶC ĐỊNH LÀ TỔ 6, BAN LÀ KHÔNG, MỞ FORM CHO NHẬP
        setIsExistingMember(false);
        setFormData((prev) => ({
          ...prev,
          maSinhVien: clean,
          banHienTai: 'Không',
          toHienTai: 'Tổ 6 (Thành viên mới)',
          to_id: 'to_6',
        }));
      }
    } catch (err) {
      console.error('Lỗi nạp thông tin thành viên:', err);
    } finally {
      setAutoFilling(false);
    }
  };

  const memDocDirectData = (data: any) => ({
    name: data.fullName || data.name || data.hoTen,
    majorAndClass: data.majorAndClass || data.major || data.nganhHoc,
    ngaySinh: data.ngaySinh || data.dob,
    to_id: data.to_id || data.to || data.group,
    ban: data.ban || data.department,
    ban_id: data.ban_id,
    soDienThoai: data.soDienThoai || data.phone,
    email: data.email,
  });

  const currentSelectedHoatDong = hoatDongList.find((item) => item.id === selectedHoatDong);

  // 5. Gửi đơn đăng ký
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHoatDong || submitting) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'registrations'), {
        activityId: selectedHoatDong,
        activityTitle: currentSelectedHoatDong?.tieuDe || '',
        mssv: formData.maSinhVien.trim().toUpperCase(),
        name: formData.hoVaTen.trim(),
        majorAndClass: formData.nganhHoc.trim(),
        ngaySinh: formData.ngaySinh,
        gioiTinh: formData.gioiTinh,
        soDienThoai: formData.soDienThoai.trim(),
        email: formData.email.trim(),
        ban: formData.banHienTai,
        to_id: formData.to_id,
        isExistingMember: isExistingMember,
        targetDepartment: formData.banHienTai === 'Không' ? formData.banNguyenVong : formData.banHienTai,
        ghiChu: formData.ghiChu.trim(),
        createdAt: new Date(),
        status: 'Đã gửi đơn',
      });

      setSubmitted(true);
    } catch (err: any) {
      alert('Lỗi gửi đơn: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f3f9fe] font-sans text-slate-800 py-10 md:py-14 select-none">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10">
        
        {/* KHỐI CHỌN HOẠT ĐỘNG */}
        <div className="space-y-4 mb-10">
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tight">
              Chọn Hoạt Động Tham Gia
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Nhấp chọn một hoạt động bên dưới để mở form đăng ký
            </p>
            <div className="w-12 h-1 bg-[#0284c7] mx-auto rounded-full mt-2" />
          </div>

          {loadingHoatDong ? (
            <div className="py-16 text-center text-xs font-bold text-slate-400">
              Đang tải danh sách hoạt động...
            </div>
          ) : hoatDongList.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 max-w-xl mx-auto space-y-2 mt-6 shadow-xs">
              <p className="text-sm font-bold text-slate-700">Hiện chưa có hoạt động nào mở đơn đăng ký</p>
              <p className="text-xs text-slate-400">Vui lòng quay lại sau khi Ban cán sự mở đợt đăng ký mới.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
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
                        ? 'border-[#0284c7] ring-4 ring-sky-100 shadow-xl scale-[1.01]'
                        : 'border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-1'
                    }`}
                  >
                    <div className="relative w-full h-48 bg-slate-100 overflow-hidden">
                      <Image
                        src={item.hinhAnh}
                        alt={item.tieuDe}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      <span className="absolute top-3 right-3 text-[10px] font-black px-2.5 py-1 rounded-full bg-[#0284c7] text-white shadow-xs uppercase tracking-wider">
                        {item.trangThai}
                      </span>
                      {isSelected && (
                        <div className="absolute top-3 left-3 bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                          ✓ Đang chọn
                        </div>
                      )}
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <h3 className="font-bold text-sm text-slate-900 leading-snug group-hover:text-[#0284c7] transition-colors">
                          {item.tieuDe}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {item.moTa}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-400">
                        <span>Thời gian: {item.ngayDang}</span>
                        <span className="text-[#0284c7] font-bold">Chi tiết →</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FORM ĐĂNG KÝ */}
        {selectedHoatDong && (
          <div className="pt-4 border-t border-slate-200">
            {submitted ? (
              <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-xs text-center space-y-3 max-w-xl mx-auto">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                  ✓
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase">Đăng Ký Thành Công!</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Đơn đăng ký tham gia <strong>{currentSelectedHoatDong?.tieuDe}</strong> của bạn đã được lưu thành công.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedHoatDong(null)}
                  className="mt-2 px-5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Chọn hoạt động khác
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl mx-auto">
                
                {/* Banner hoạt động */}
                <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-slate-500 font-medium">Hoạt động đang chọn:</span>
                    <p className="text-sm font-black text-[#0284c7]">{currentSelectedHoatDong?.tieuDe}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedHoatDong(null)}
                    className="text-xs text-slate-400 hover:text-rose-600 font-bold transition cursor-pointer"
                  >
                    Đổi hoạt động ✕
                  </button>
                </div>

                {/* MỤC 1: THÔNG TIN CÁ NHÂN */}
                <div className="bg-white p-6 md:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      1. Thông Tin Thành Viên
                    </h2>
                    {isExistingMember ? (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                        Đã là thành viên (Khóa sửa thông tin)
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                        Đăng ký mới (Biên chế Tổ 6)
                      </span>
                    )}
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 uppercase text-[11px]">
                          Mã Số Sinh Viên (MSSV) *
                        </label>
                        {autoFilling && (
                          <span className="text-[11px] font-medium text-[#0284c7] animate-pulse">
                            Đang kiểm tra hồ sơ hệ thống...
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Nhập MSSV (VD: 3851190026, 4751180...)"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs focus:bg-white focus:border-[#0284c7] outline-none transition"
                        value={formData.maSinhVien}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({ ...formData, maSinhVien: val });
                          if (val.trim().length >= 7) {
                            handleCheckMssv(val);
                          } else {
                            setIsExistingMember(false);
                          }
                        }}
                        onBlur={() => handleCheckMssv(formData.maSinhVien)}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 uppercase text-[11px]">
                          Họ và Tên *
                        </label>
                        <input
                          type="text"
                          required
                          readOnly={isExistingMember}
                          placeholder="Họ và tên sinh viên"
                          className={`w-full p-2.5 border rounded-xl font-bold text-xs outline-none transition ${
                            isExistingMember
                              ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed'
                              : 'bg-slate-50 focus:bg-white focus:border-[#0284c7] border-slate-200'
                          }`}
                          value={formData.hoVaTen}
                          onChange={(e) => setFormData({ ...formData, hoVaTen: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 uppercase text-[11px]">
                          Ngành / Lớp Học *
                        </label>
                        <input
                          type="text"
                          required
                          readOnly={isExistingMember}
                          placeholder="VD: Kỹ Thuật Phần Mềm K48"
                          className={`w-full p-2.5 border rounded-xl font-bold text-xs outline-none transition ${
                            isExistingMember
                              ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed'
                              : 'bg-slate-50 focus:bg-white focus:border-[#0284c7] border-slate-200'
                          }`}
                          value={formData.nganhHoc}
                          onChange={(e) => setFormData({ ...formData, nganhHoc: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 uppercase text-[11px]">
                          Ngày Sinh *
                        </label>
                        <input
                          type="text"
                          required
                          readOnly={isExistingMember}
                          placeholder="VD: 31/10/07"
                          className={`w-full p-2.5 border rounded-xl font-mono text-xs outline-none transition ${
                            isExistingMember
                              ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed font-bold'
                              : 'bg-slate-50 focus:bg-white focus:border-[#0284c7] border-slate-200'
                          }`}
                          value={formData.ngaySinh}
                          onChange={(e) => setFormData({ ...formData, ngaySinh: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 uppercase text-[11px]">
                          Giới Tính
                        </label>
                        <select
                          disabled={isExistingMember}
                          className={`w-full p-2.5 border rounded-xl font-medium text-xs outline-none transition ${
                            isExistingMember
                              ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed font-bold'
                              : 'bg-slate-50 focus:bg-white focus:border-[#0284c7] border-slate-200 cursor-pointer'
                          }`}
                          value={formData.gioiTinh}
                          onChange={(e) => setFormData({ ...formData, gioiTinh: e.target.value })}
                        >
                          <option value="Nam">Nam</option>
                          <option value="Nữ">Nữ</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* MỤC 2: CƠ CẤU BAN & ĐƠN VỊ TỔ */}
                <div className="bg-white p-6 md:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 pb-2.5">
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      2. Đơn Vị & Ban Chuyên Môn
                    </h2>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    {/* BẢNG THÔNG TIN TỔ VÀ BAN */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          Tổ Sinh Hoạt:
                        </span>
                        <p className="text-sm font-black text-slate-900 mt-0.5">
                          {formData.toHienTai}
                        </p>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          Ban Chuyên Môn:
                        </span>
                        <p className="text-sm font-black text-slate-900 mt-0.5">
                          {formData.banHienTai}
                        </p>
                      </div>
                    </div>

                    {/* NẾU BAN LÀ KHÔNG THÌ CHỌN NGUYỆN VỌNG */}
                    {formData.banHienTai === 'Không' && (
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 uppercase text-[11px]">
                          Nguyện Vọng Vào Ban Chuyên Môn *
                        </label>
                        <select
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs focus:bg-white focus:border-[#0284c7] outline-none transition cursor-pointer"
                          value={formData.banNguyenVong}
                          onChange={(e) => setFormData({ ...formData, banNguyenVong: e.target.value })}
                        >
                          <option value="Ban Sự kiện">Ban Sự kiện (Tổ chức, điều phối, hậu cần)</option>
                          <option value="Ban Truyền thông">Ban Truyền thông (Thiết kế, media, nội dung)</option>
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 uppercase text-[11px]">
                          Số Điện Thoại Liên Hệ *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="VD: 037xxxxxxx"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:border-[#0284c7] outline-none transition"
                          value={formData.soDienThoai}
                          onChange={(e) => setFormData({ ...formData, soDienThoai: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 uppercase text-[11px]">
                          Email
                        </label>
                        <input
                          type="email"
                          placeholder="example@gmail.com"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs focus:bg-white focus:border-[#0284c7] outline-none transition"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1 uppercase text-[11px]">
                        Ghi Chú / Đề Xuất Ca Hoạt Động
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Đăng ký ca trực, thời gian rảnh hoặc đề xuất thêm..."
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs focus:bg-white focus:border-[#0284c7] outline-none transition resize-none"
                        value={formData.ghiChu}
                        onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* NÚT GỬI ĐƠN */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-black rounded-2xl shadow-xs transition uppercase text-xs tracking-wider cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Đang gửi thông tin...' : 'Xác Nhận Gửi Đơn Đăng Ký'}
                </button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
}