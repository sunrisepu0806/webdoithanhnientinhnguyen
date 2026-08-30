'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  doc, 
  getDoc, 
  getDocs,
  collection, 
  addDoc, 
  setDoc,
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  Loader2, 
  Calendar, 
  Users,
  Download,
  MessageCircle,
  QrCode
} from 'lucide-react';

export interface FormQuestion {
  id: string;
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'select';
  title: string;
  required: boolean;
  options?: string[];
  maxSelect?: number;
}

const cleanId = (val: any) => String(val || '').trim().toLowerCase();

export default function FormDangKyChiTietPage() {
  const params = useParams();
  const rawId = params?.id;
  const activityId = Array.isArray(rawId) ? rawId[0] : (typeof rawId === 'string' ? rawId : '');

  const [activity, setActivity] = useState<any>(null);
  const [currentRegisteredCount, setCurrentRegisteredCount] = useState<number>(0);
  const [loadingActivity, setLoadingActivity] = useState(true);

  // Form State - Mặc định group là 'Tổ 6'
  const [fullName, setFullName] = useState('');
  const [mssv, setMssv] = useState('');
  const [major, setMajor] = useState('');
  const [group, setGroup] = useState('Tổ 6');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [answers, setAnswers] = useState<{ [key: string]: any }>({});

  // Trạng thái kiểm tra MSSV trong database
  const [isMemberExists, setIsMemberExists] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const qrRef = useRef<SVGSVGElement | null>(null);

  // Canvas hạt rơi & Spotlight chuột
  const [mousePos, setMousePos] = useState({ x: 600, y: 300 });
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
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
        if (p.y > height) { p.y = 0; p.x = Math.random() * width; }
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

  // Lấy thông tin hoạt động từ Firebase
  useEffect(() => {
    if (!activityId) return;

    const fetchActivity = async () => {
      try {
        setLoadingActivity(true);
        let docRef = doc(db, 'posts_activities', activityId);
        let snap = await getDoc(docRef);

        if (!snap.exists()) {
          docRef = doc(db, 'activity_forms', activityId);
          snap = await getDoc(docRef);
        }

        if (snap.exists()) {
          const data = snap.data();
          setActivity({
            id: snap.id,
            tieuDe: data.tieuDe || data.title || 'Hoạt động tình nguyện',
            anhDaiDien: data.anhDaiDien || data.bannerImage || '/logo.png',
            ngayDang: data.ngayDang || data.dateStr || '',
            moTaNgan: data.moTaNgan || data.description || '',
            questions: Array.isArray(data.questions) ? data.questions : [],
            maxParticipants: Number(data.maxParticipants) || Number(data.gioiHanNguoi) || 0,
            isOpen: data.isOpen !== undefined ? data.isOpen : true,
            zaloLink: data.zaloLink || data.linkZalo || 'https://zalo.me/g/volunteer-qnu',
          });
        } else {
          setActivity(null);
        }
      } catch (err) {
        console.error('Lỗi khi tải hoạt động:', err);
      } finally {
        setLoadingActivity(false);
      }
    };

    const fetchRegisteredCount = async () => {
      try {
        const actRegSnap = await getDocs(
          query(collection(db, 'activity_registrations'), where('activityId', '==', activityId))
        );
        setCurrentRegisteredCount(actRegSnap.size);
      } catch (e) {
        console.warn(e);
      }
    };

    fetchActivity();
    fetchRegisteredCount();
  }, [activityId]);

  // Kiểm tra MSSV tồn tại để tự điền & khóa trường
  const autoFetchMemberInfo = async (inputMssv: string) => {
    const cleanInputSid = cleanId(inputMssv);
    if (!cleanInputSid || cleanInputSid.length < 4) {
      setIsMemberExists(false);
      setGroup('Tổ 6');
      return;
    }

    try {
      // 1. Tìm trong collection members
      const memberSnap = await getDocs(collection(db, 'members'));
      const foundMember = memberSnap.docs.find((d) => {
        const data = d.data();
        const sid = cleanId(data.studentId || data.msv || data.studentCode || data.mssv);
        return sid === cleanInputSid;
      });

      if (foundMember) {
        const data = foundMember.data();
        setFullName(data.fullName || data.hoTen || data.name || '');
        setMajor(data.major || data.nganhHoc || data.lop || '');
        setGroup(String(data.group || data.to || 'Tổ 6'));
        setDob(String(data.dob || data.ngaySinh || ''));
        if (data.phone || data.soDienThoai) setPhone(String(data.phone || data.soDienThoai));
        setIsMemberExists(true);
        return;
      }

      // 2. Tìm trong danh sách đăng ký trước đó
      const regSnap = await getDocs(collection(db, 'activity_registrations'));
      const foundReg = regSnap.docs.find((d) => {
        const data = d.data();
        const sid = cleanId(data.studentId || data.mssv);
        return sid === cleanInputSid;
      });

      if (foundReg) {
        const data = foundReg.data();
        setFullName(data.fullName || data.hoTen || '');
        setMajor(data.major || data.lopKhoa || '');
        setGroup(String(data.group || data.to || 'Tổ 6'));
        setDob(String(data.dob || ''));
        if (data.phone || data.soDienThoai) setPhone(String(data.phone || data.soDienThoai));
        setIsMemberExists(true);
        return;
      }

      // Chưa có trong hệ thống => Mở khóa cho nhập mới và giữ nguyên mặc định Tổ 6
      setIsMemberExists(false);
      setGroup('Tổ 6');
    } catch (err) {
      console.error('Lỗi tự điền thông tin:', err);
    }
  };

  const handleMssvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMssv(val);
    autoFetchMemberInfo(val);
  };

  const handleCheckboxChange = (qId: string, option: string, maxSelect?: number) => {
    const currentSelected: string[] = answers[qId] || [];
    if (currentSelected.includes(option)) {
      setAnswers({ ...answers, [qId]: currentSelected.filter((item) => item !== option) });
    } else {
      if (maxSelect && currentSelected.length >= maxSelect) {
        alert(`Bạn chỉ được chọn tối đa ${maxSelect} lựa chọn cho câu hỏi này!`);
        return;
      }
      setAnswers({ ...answers, [qId]: [...currentSelected, option] });
    }
  };

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
        downloadLink.download = `QR-DiemDanh-${mssv.trim()}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim() || !mssv.trim() || !phone.trim() || !major.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ các trường thông tin bắt buộc (*)!');
      return;
    }

    for (const q of activity?.questions || []) {
      if (q.required) {
        const ans = answers[q.id];
        if (!ans || (Array.isArray(ans) && ans.length === 0) || (typeof ans === 'string' && !ans.trim())) {
          setErrorMsg(`Vui lòng trả lời câu hỏi: "${q.title}"`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);

      // Kiểm tra xem đã đăng ký hoạt động này chưa
      const checkDupQ = query(
        collection(db, 'activity_registrations'),
        where('activityId', '==', activity?.id || activityId),
        where('studentId', '==', mssv.trim())
      );
      const dupSnap = await getDocs(checkDupQ);
      if (!dupSnap.empty) {
        setErrorMsg('Mã số sinh viên này đã đăng ký tham gia hoạt động này trước đó rồi!');
        setSubmitting(false);
        return;
      }

      const assignedGroup = group.trim() || 'Tổ 6';

      // Nếu MSSV chưa có trong bảng thành viên, tự động thêm mới vào collection members với Tổ 6
      if (!isMemberExists) {
        try {
          const newMemberId = `mem_${cleanId(mssv)}`;
          await setDoc(doc(db, 'members', newMemberId), {
            studentId: mssv.trim(),
            fullName: fullName.trim(),
            major: major.trim(),
            group: assignedGroup,
            dob: dob.trim() || 'Chưa cập nhật',
            phone: phone.trim(),
            createdAt: serverTimestamp(),
          });
        } catch (memErr) {
          console.warn('Lỗi ghi đè thành viên:', memErr);
        }
      }

      // Lưu đơn đăng ký hoạt động
      await addDoc(collection(db, 'activity_registrations'), {
        activityId: activity?.id || activityId,
        activityTitle: activity?.tieuDe || 'Hoạt động TNTN',
        studentId: mssv.trim(),
        fullName: fullName.trim(),
        major: major.trim(),
        group: assignedGroup,
        phone: phone.trim(),
        dob: dob.trim(),
        answers: answers || {},
        registeredAt: serverTimestamp(),
      });

      setSuccess(true);
      setCurrentRegisteredCount((prev) => prev + 1);
    } catch (err: any) {
      console.error('Lỗi khi gửi form:', err);
      setErrorMsg('Có lỗi xảy ra khi gửi form đăng ký. Vui lòng thử lại!');
    } finally {
      setSubmitting(false);
    }
  };

  const isFull = activity && activity.maxParticipants > 0 && currentRegisteredCount >= activity.maxParticipants;
  const isClosed = activity && (!activity.isOpen || isFull);

  if (loadingActivity) {
    return (
      <div className="min-h-screen bg-[#f8fbfe] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#0284c7] animate-spin" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Đang tải biểu mẫu đăng ký...</p>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-[#f8fbfe] flex flex-col items-center justify-center font-sans space-y-4 p-6">
        <h2 className="text-xl font-black text-slate-800">Không tìm thấy hoạt động!</h2>
        <Link href="/dang-ky" className="px-5 py-2.5 bg-[#0284c7] text-white font-bold rounded-xl text-xs uppercase">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f3f7fd] via-[#f7fafd] to-white font-sans text-slate-800 select-none flex flex-col justify-between overflow-x-hidden" suppressHydrationWarning>
      
      <div ref={containerRef} onMouseMove={handleMouseMove} className="flex-1 flex flex-col justify-between relative overflow-hidden">
        
        {/* Background Hạt & Spotlight */}
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10 w-full h-full" />
        <div
          className="pointer-events-none absolute rounded-full blur-[110px]"
          style={{
            width: '560px',
            height: '560px',
            left: `${mousePos.x - 280}px`,
            top: `${mousePos.y - 280}px`,
            background: 'radial-gradient(circle, rgba(2, 132, 199, 0.22) 0%, rgba(99, 102, 241, 0.12) 45%, transparent 70%)',
            zIndex: 1,
          }}
        />

        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 pt-10 pb-16 relative z-20 space-y-6">
          
          <div>
            <Link
              href="/dang-ky"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0284c7] transition cursor-pointer"
            >
              <ArrowLeft size={14} /> Chọn hoạt động khác
            </Link>
          </div>

          {/* Banner & Chi tiết hoạt động */}
          <div className="bg-white/95 backdrop-blur-md rounded-[32px] overflow-hidden border border-slate-200/80 shadow-xl">
            {activity.anhDaiDien && (
              <div className="w-full aspect-[21/9] bg-slate-100 overflow-hidden">
                <img
                  src={activity.anhDaiDien}
                  alt={activity.tieuDe}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-6 sm:p-8 space-y-3">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase leading-tight">
                {activity.tieuDe}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-semibold border-b border-slate-100 pb-4">
                {activity.ngayDang && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-[#0284c7]" /> {activity.ngayDang}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Users size={14} className="text-[#0284c7]" /> 
                  {activity.maxParticipants > 0 ? (
                    <span>Chỉ tiêu: <strong className="text-slate-900">{currentRegisteredCount}/{activity.maxParticipants}</strong> người</span>
                  ) : (
                    <span>Đã đăng ký: <strong className="text-slate-900">{currentRegisteredCount}</strong> người</span>
                  )}
                </span>
              </div>

              {activity.moTaNgan && (
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line pt-1">
                  {activity.moTaNgan}
                </p>
              )}
            </div>
          </div>

          {/* MÀN HÌNH ĐĂNG KÝ THÀNH CÔNG */}
          {success ? (
            <div className="bg-white/95 backdrop-blur-md p-8 sm:p-10 rounded-[36px] border border-emerald-200 shadow-2xl shadow-emerald-950/10 text-center space-y-6 animate-in fade-in duration-300">
              <div className="space-y-2">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 size={38} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase">
                  ĐĂNG KÝ THÀNH CÔNG!
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  Cảm ơn <strong>{fullName}</strong> ({mssv}) đã đăng ký tham gia hoạt động <strong>{activity.tieuDe}</strong>.
                </p>
              </div>

              {/* KHỐI QR ĐIỂM DANH */}
              <div className="max-w-sm mx-auto bg-gradient-to-b from-slate-50 to-blue-50/50 p-6 rounded-3xl border border-slate-200/80 space-y-4">
                <div className="bg-white p-4 rounded-2xl inline-block shadow-md border border-slate-100">
                  <QRCodeSVG
                    ref={qrRef}
                    value={mssv.trim()}
                    size={160}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900 flex items-center justify-center gap-1.5">
                    <QrCode size={14} className="text-[#0284c7]" /> Mã QR Điểm Danh Cá Nhân
                  </p>
                  <p className="text-[11px] text-slate-500">Hãy lưu mã này vào điện thoại để điểm danh khi tham gia sự kiện</p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadQR}
                  className="w-full py-2.5 px-4 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Download size={14} /> Tải Mã QR Về Máy
                </button>
              </div>

              {/* KHỐI LINK THAM GIA NHÓM ZALO */}
              <div className="pt-2">
                <a
                  href={activity.zaloLink}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full max-w-sm mx-auto py-3.5 px-6 bg-[#0068ff] hover:bg-[#0055d4] text-white font-extrabold rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-98 cursor-pointer"
                  style={{ textDecoration: 'none' }}
                >
                  <MessageCircle size={18} />
                  <span>Tham Gia Nhóm Zalo Hoạt Động</span>
                </a>
              </div>

              <div className="pt-2">
                <Link
                  href="/dang-ky"
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 transition"
                >
                  &larr; Quay lại danh sách hoạt động
                </Link>
              </div>
            </div>
          ) : isClosed ? (
            <div className="bg-white rounded-[32px] p-8 text-center space-y-3 border border-rose-200 shadow-md">
              <AlertCircle size={40} className="text-rose-500 mx-auto" />
              <h3 className="text-lg font-black text-slate-900 uppercase">
                {isFull ? 'Hoạt động đã đủ số lượng đăng ký!' : 'Hoạt động đã đóng đăng ký!'}
              </h3>
              <p className="text-xs text-slate-500">Cảm ơn bạn đã quan tâm. Vui lòng theo dõi và đăng ký các hoạt động tiếp theo của Đội.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white/95 backdrop-blur-md rounded-[32px] p-6 sm:p-8 border border-slate-200/80 shadow-xl space-y-6">
              
              <div className="space-y-4">
                <h3 className="font-black text-slate-900 text-sm uppercase border-b border-slate-100 pb-3">
                  THÔNG TIN SINH VIÊN
                </h3>

                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-2">
                    <AlertCircle size={15} /> {errorMsg}
                  </div>
                )}

                {/* Ô nhập MSSV */}
                <div>
                  <label className="block font-bold text-slate-700 text-xs mb-1 uppercase tracking-wider">
                    Mã Số Sinh Viên (MSSV) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nhập MSSV (VD: 4751180032)..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold focus:bg-white focus:outline-none focus:border-[#0284c7]"
                    value={mssv}
                    onChange={handleMssvChange}
                    onBlur={(e) => autoFetchMemberInfo(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 text-xs mb-1 uppercase tracking-wider">
                      Họ và Tên <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      readOnly={isMemberExists}
                      placeholder="VD: Nguyễn Văn Phú"
                      className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none ${
                        isMemberExists 
                          ? 'bg-slate-100 text-slate-600 cursor-not-allowed select-none' 
                          : 'bg-slate-50 text-slate-900 focus:bg-white focus:border-[#0284c7]'
                      }`}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 text-xs mb-1 uppercase tracking-wider">
                      Số Điện Thoại <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="VD: 0987654321"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-slate-50 focus:bg-white"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1">
                    <label className="block font-bold text-slate-700 text-xs mb-1 uppercase tracking-wider">
                      Ngành / Lớp / Khóa <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      readOnly={isMemberExists}
                      placeholder="VD: Nông học K47"
                      className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none ${
                        isMemberExists 
                          ? 'bg-slate-100 text-slate-600 cursor-not-allowed select-none' 
                          : 'bg-slate-50 text-slate-900 focus:bg-white focus:border-[#0284c7]'
                      }`}
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                    />
                  </div>

                  {/* Đơn vị (Tổ) - Luôn khóa cố định mặc định là Tổ 6 */}
                  <div className="sm:col-span-1">
                    <label className="block font-bold text-slate-700 text-xs mb-1 uppercase tracking-wider">
                      Đơn vị (Tổ)
                    </label>
                    <input
                      type="text"
                      readOnly
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-100 text-slate-600 cursor-not-allowed select-none focus:outline-none"
                      value={group}
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block font-bold text-slate-700 text-xs mb-1 uppercase tracking-wider">
                      Ngày Sinh (Không bắt buộc)
                    </label>
                    <input
                      type="text"
                      readOnly={isMemberExists}
                      placeholder="VD: 08/08/2006"
                      className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none ${
                        isMemberExists 
                          ? 'bg-slate-100 text-slate-600 cursor-not-allowed select-none' 
                          : 'bg-slate-50 text-slate-900 focus:bg-white focus:border-[#0284c7]'
                      }`}
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Câu hỏi khảo sát */}
              {activity.questions && activity.questions.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-black uppercase text-slate-900 border-b border-slate-100 pb-2">
                    Câu hỏi khảo sát từ Ban Tổ Chức
                  </h3>

                  {activity.questions.map((q: FormQuestion, qIndex: number) => (
                    <div key={q.id || `q_view_${qIndex}`} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                      <label className="block text-xs font-extrabold text-slate-800">
                        {q.title} {q.required && <span className="text-rose-500">*</span>}
                      </label>

                      {q.type === 'text' && (
                        <input
                          type="text"
                          required={q.required}
                          placeholder="Câu trả lời của bạn..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-[#0284c7]"
                          value={answers[q.id] || ''}
                          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        />
                      )}

                      {q.type === 'textarea' && (
                        <textarea
                          rows={3}
                          required={q.required}
                          placeholder="Nhập câu trả lời chi tiết..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-[#0284c7]"
                          value={answers[q.id] || ''}
                          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        />
                      )}

                      {q.type === 'radio' && q.options && (
                        <div className="space-y-1.5 pt-1">
                          {q.options.map((opt, optIdx) => (
                            <label key={optIdx} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name={`question_${q.id}`}
                                required={q.required}
                                checked={answers[q.id] === opt}
                                onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                                className="text-[#0284c7] focus:ring-sky-500"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {q.type === 'checkbox' && q.options && (
                        <div className="space-y-1.5 pt-1">
                          {q.options.map((opt, optIdx) => (
                            <label key={optIdx} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(answers[q.id] || []).includes(opt)}
                                onChange={() => handleCheckboxChange(q.id, opt, q.maxSelect)}
                                className="rounded text-[#0284c7] focus:ring-sky-500"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {q.type === 'select' && q.options && (
                        <select
                          required={q.required}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-[#0284c7] font-semibold"
                          value={answers[q.id] || ''}
                          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        >
                          <option value="">-- Vui lòng chọn --</option>
                          {q.options.map((opt, optIdx) => (
                            <option key={optIdx} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold rounded-2xl shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50 active:scale-98 cursor-pointer mt-4"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                <span>{submitting ? 'Đang gửi thông tin...' : 'GỬI ĐĂNG KÝ THAM GIA'}</span>
              </button>
            </form>
          )}

        </div>

        {/* Sóng biển footer */}
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