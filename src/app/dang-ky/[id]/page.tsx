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

const DANH_SACH_NGANH = [
  "Quản lý Giáo dục",
  "Giáo dục mầm non",
  "Giáo dục Tiểu học",
  "Giáo dục chính trị",
  "Giáo dục thể chất",
  "Sư phạm Toán học",
  "Sư phạm Tin học",
  "Sư phạm Vật lý",
  "Sư phạm Hoá học",
  "Sư phạm Sinh học",
  "Sư phạm Ngữ văn",
  "Sư phạm Lịch sử",
  "Sư phạm Địa lý",
  "Sư phạm Tiếng Anh",
  "Sư phạm Khoa học tự nhiên",
  "Sư phạm Lịch sử Địa lý",
  "Ngôn ngữ Anh",
  "Ngôn ngữ Trung Quốc",
  "Văn học",
  "Kinh tế",
  "Quản lý nhà nước",
  "Tâm lý học giáo dục",
  "Đông phương học",
  "Việt Nam học",
  "Quản trị kinh doanh",
  "Tài chính - Ngân hàng",
  "Kế toán",
  "Kiểm toán",
  "Luật",
  "Hóa học",
  "Khoa học dữ liệu",
  "Toán ứng dụng",
  "Kỹ thuật phần mềm",
  "Trí tuệ nhân tạo",
  "Công nghệ thông tin",
  "Công nghệ kỹ thuật ô tô",
  "Công nghệ kỹ thuật hoá học",
  "Logistics và Quản lý chuỗi cung ứng",
  "Kỹ thuật cơ khí động lực",
  "Kỹ thuật điện",
  "Kỹ thuật điện tử - viễn thông",
  "Kỹ thuật điều khiển và Tự động hóa",
  "Vật lý kỹ thuật",
  "Công nghệ thực phẩm",
  "Kỹ thuật xây dựng",
  "Nông học",
  "Công tác xã hội",
  "Quản trị dịch vụ du lịch và lữ hành",
  "Quản trị khách sạn",
  "Quản lý tài nguyên và môi trường",
  "Quản lý đất đai"
];

const cleanId = (val: any) => String(val || '').trim().toLowerCase();

// Chuẩn hóa tên Tổ
const formatToName = (toData: any): string => {
  if (!toData) return 'TNV';
  const str = String(toData).trim().toLowerCase();
  if (str === 'tnv' || str === '' || str === 'tự do' || str === 'tu do') return 'TNV';
  const match = str.match(/\d+/);
  return match ? `Tổ ${match[0]}` : str.toUpperCase();
};

export default function FormDangKyChiTietPage() {
  const params = useParams();
  const rawId = params?.id;
  const activityId = Array.isArray(rawId) ? rawId[0] : (typeof rawId === 'string' ? rawId : '');

  const [activity, setActivity] = useState<any>(null);
  const [currentRegisteredCount, setCurrentRegisteredCount] = useState<number>(0);
  const [loadingActivity, setLoadingActivity] = useState(true);

  // Form State
  const [mssv, setMssv] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedMajor, setSelectedMajor] = useState('');
  const [cohortNumber, setCohortNumber] = useState('48');
  const [group, setGroup] = useState('TNV');
  const [dob, setDob] = useState('');
  const [answers, setAnswers] = useState<{ [key: string]: any }>({});

  const [isMemberExists, setIsMemberExists] = useState(false);
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
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

  // Tải chi tiết hoạt động
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

  // Phân tích chuỗi ngành và khóa khi nhận diện thành viên cũ
  const parseMajorAndCohort = (rawMajorStr: string) => {
    if (!rawMajorStr) return;
    const str = rawMajorStr.trim();
    
    // Tìm khóa K (ví dụ K47, K48)
    const cohortMatch = str.match(/k(\d{1,2})/i);
    if (cohortMatch && cohortMatch[1]) {
      setCohortNumber(cohortMatch[1]);
    }

    // Tìm tên ngành trong danh sách
    const matchedMajor = DANH_SACH_NGANH.find((m) => str.toLowerCase().includes(m.toLowerCase()));
    if (matchedMajor) {
      setSelectedMajor(matchedMajor);
    } else {
      const cleanMajorOnly = str.replace(/k\d{1,2}/gi, '').replace(/[-–]/g, '').trim();
      setSelectedMajor(cleanMajorOnly || str);
    }
  };

  // HÀM TÌM KIẾM THÔNG TIN THÀNH VIÊN TỰ ĐỘNG
  const autoFetchMemberInfo = async (inputMssv: string) => {
    const rawVal = inputMssv.trim();
    const cleanInputSid = cleanId(rawVal);

    if (!cleanInputSid || cleanInputSid.length < 5) {
      setIsMemberExists(false);
      setGroup('TNV');
      return;
    }

    try {
      setIsFetchingInfo(true);

      // --- BƯỚC 1: Tìm trong collection 'users' ---
      const userDirectRef = doc(db, 'users', cleanInputSid);
      const userDirectSnap = await getDoc(userDirectRef);

      if (userDirectSnap.exists()) {
        const data = userDirectSnap.data();
        setFullName(data.name || data.fullName || data.hoTen || '');
        parseMajorAndCohort(data.majorAndClass || data.major || data.nganhHoc || '');
        setGroup(formatToName(data.to_id || data.group || data.to));
        setDob(data.ngaySinh || data.dob || '');
        setIsMemberExists(true);
        return;
      }

      const userQueryMssv = query(collection(db, 'users'), where('mssv', '==', rawVal));
      const userSnapMssv = await getDocs(userQueryMssv);

      if (!userSnapMssv.empty) {
        const data = userSnapMssv.docs[0].data();
        setFullName(data.name || data.fullName || data.hoTen || '');
        parseMajorAndCohort(data.majorAndClass || data.major || data.nganhHoc || '');
        setGroup(formatToName(data.to_id || data.group || data.to));
        setDob(data.ngaySinh || data.dob || '');
        setIsMemberExists(true);
        return;
      }

      const userQuerySid = query(collection(db, 'users'), where('studentId', '==', rawVal));
      const userSnapSid = await getDocs(userQuerySid);

      if (!userSnapSid.empty) {
        const data = userSnapSid.docs[0].data();
        setFullName(data.name || data.fullName || data.hoTen || '');
        parseMajorAndCohort(data.majorAndClass || data.major || data.nganhHoc || '');
        setGroup(formatToName(data.to_id || data.group || data.to));
        setDob(data.ngaySinh || data.dob || '');
        setIsMemberExists(true);
        return;
      }

      // --- BƯỚC 2: Dự phòng tìm trong 'members' ---
      const memberQ = query(collection(db, 'members'), where('mssv', '==', rawVal));
      const memberSnap = await getDocs(memberQ);

      if (!memberSnap.empty) {
        const data = memberSnap.docs[0].data();
        setFullName(data.name || data.fullName || '');
        parseMajorAndCohort(data.majorAndClass || data.major || '');
        setGroup(formatToName(data.to_id || data.group || data.to));
        setDob(data.ngaySinh || data.dob || '');
        setIsMemberExists(true);
        return;
      }

      const directRef = doc(db, 'members', cleanInputSid);
      const directSnap = await getDoc(directRef);

      if (directSnap.exists()) {
        const data = directSnap.data();
        setFullName(data.name || data.fullName || '');
        parseMajorAndCohort(data.majorAndClass || data.major || '');
        setGroup(formatToName(data.to_id || data.group || data.to));
        setDob(data.ngaySinh || data.dob || '');
        setIsMemberExists(true);
        return;
      }

      const memDocRef = doc(db, 'members', `mem_${cleanInputSid}`);
      const memDocSnap = await getDoc(memDocRef);

      if (memDocSnap.exists()) {
        const data = memDocSnap.data();
        setFullName(data.name || data.fullName || '');
        parseMajorAndCohort(data.majorAndClass || data.major || '');
        setGroup(formatToName(data.to_id || data.group || data.to));
        setDob(data.ngaySinh || data.dob || '');
        setIsMemberExists(true);
        return;
      }

      // --- BƯỚC 3: Dự phòng tìm trong 'activity_registrations' ---
      const regQ = query(collection(db, 'activity_registrations'), where('studentId', '==', rawVal));
      const regSnap = await getDocs(regQ);

      if (!regSnap.empty) {
        const data = regSnap.docs[0].data();
        setFullName(data.fullName || data.name || '');
        parseMajorAndCohort(data.major || data.majorAndClass || '');
        setGroup(formatToName(data.group || data.to_id || 'TNV'));
        setDob(data.dob || data.ngaySinh || '');
        setIsMemberExists(true);
        return;
      }

      setIsMemberExists(false);
      setGroup('TNV');
    } catch (err: any) {
      setIsMemberExists(false);
      setGroup('TNV');
    } finally {
      setIsFetchingInfo(false);
    }
  };

  const handleMssvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMssv(val);

    if (!val.trim()) {
      setIsMemberExists(false);
      setFullName('');
      setSelectedMajor('');
      setCohortNumber('48');
      setDob('');
      setGroup('TNV');
      return;
    }

    if (val.trim().length >= 8) {
      autoFetchMemberInfo(val);
    }
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

    if (!fullName.trim() || !mssv.trim() || !selectedMajor.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ các trường thông tin bắt buộc (*)!');
      return;
    }

    if (!cohortNumber || cohortNumber.length !== 2) {
      setErrorMsg('Vui lòng nhập đúng 2 chữ số của Khóa (Ví dụ: 48 cho K48)!');
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

      const assignedGroup = group.trim() || 'TNV';
      const cleanSid = cleanId(mssv);
      const formattedMajor = `${selectedMajor.trim()} K${cohortNumber.trim()}`.trim();

      // Nếu là người mới chưa có trong hệ thống thì lưu vào collection users
      if (!isMemberExists) {
        try {
          const userPayload = {
            mssv: mssv.trim(),
            name: fullName.trim(),
            majorAndClass: formattedMajor,
            to_id: assignedGroup === 'TNV' ? 'tnv' : `to_${assignedGroup.replace(/[^0-9]/g, '')}`,
            ngaySinh: dob.trim() || 'Chưa cập nhật',
            role: 'Thành viên',
            soBuoiDiemDanh: 0,
            createdAt: serverTimestamp(),
          };

          await setDoc(doc(db, 'users', cleanSid), userPayload, { merge: true });
        } catch (memErr) {
          console.warn('Lỗi lưu thông tin thành viên vào users:', memErr);
        }
      }

      await addDoc(collection(db, 'activity_registrations'), {
        activityId: activity?.id || activityId,
        activityTitle: activity?.tieuDe || 'Hoạt động TNTN',
        studentId: mssv.trim(),
        fullName: fullName.trim(),
        major: formattedMajor,
        group: assignedGroup,
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
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-black text-slate-900 text-sm uppercase">
                    THÔNG TIN SINH VIÊN
                  </h3>
                </div>

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
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Nhập MSSV (VD: 4651170002)..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold focus:bg-white focus:outline-none focus:border-[#0284c7]"
                      value={mssv}
                      onChange={handleMssvChange}
                      onBlur={(e) => autoFetchMemberInfo(e.target.value)}
                    />
                    {isFetchingInfo && (
                      <Loader2 size={14} className="absolute right-3 top-3 animate-spin text-[#0284c7]" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Nhập mã số sinh viên để hệ thống tự động kiểm tra và điền thông tin.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Họ và Tên */}
                  <div className="sm:col-span-3">
                    <label className="block font-bold text-slate-700 text-xs mb-1 uppercase tracking-wider">
                      Họ và Tên <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      readOnly={isMemberExists}
                      placeholder="VD: Nguyễn Văn A"
                      className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none ${
                        isMemberExists 
                          ? 'bg-slate-100 text-slate-600 cursor-not-allowed select-none tracking-wide' 
                          : 'bg-slate-50 text-slate-900 focus:bg-white focus:border-[#0284c7]'
                      }`}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  {/* Ô Ngành Học có tìm kiếm gợi ý */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 text-xs mb-1 uppercase tracking-wider">
                      Ngành Học <span className="text-rose-500">*</span>
                    </label>
                    <input
                      list="danh-sach-nganh"
                      required
                      readOnly={isMemberExists}
                      placeholder="Gõ để tìm ngành (VD: Kỹ thuật phần mềm)..."
                      className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none ${
                        isMemberExists 
                          ? 'bg-slate-100 text-slate-600 cursor-not-allowed select-none' 
                          : 'bg-slate-50 text-slate-900 focus:bg-white focus:border-[#0284c7]'
                      }`}
                      value={selectedMajor}
                      onChange={(e) => setSelectedMajor(e.target.value)}
                    />
                    <datalist id="danh-sach-nganh">
                      {DANH_SACH_NGANH.map((n, idx) => (
                        <option key={idx} value={n} />
                      ))}
                    </datalist>
                  </div>

                  {/* Ô Khóa: Tiền tố K cố định, khóa không cho sửa nếu là thành viên đã đăng ký */}
                  <div>
                    <label className="block font-bold text-slate-700 text-xs mb-1 uppercase tracking-wider">
                      Khóa <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-xs font-black text-slate-500 select-none pointer-events-none">
                        K
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        autoComplete="off"
                        required
                        readOnly={isMemberExists}
                        placeholder="48"
                        className={`w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold font-mono focus:outline-none tracking-widest ${
                          isMemberExists 
                            ? 'bg-slate-100 text-slate-600 cursor-not-allowed select-none' 
                            : 'bg-slate-50 text-slate-900 focus:bg-white focus:border-[#0284c7]'
                        }`}
                        value={cohortNumber}
                        onChange={(e) => {
                          if (isMemberExists) return;
                          const val = e.target.value.replace(/\D/g, '');
                          setCohortNumber(val);
                        }}
                      />
                    </div>
                  </div>

                  {/* Đơn vị (Tổ / TNV) */}
                  <div className="sm:col-span-1">
                    <label className="block font-bold text-slate-700 text-xs mb-1 uppercase tracking-wider">
                      Đơn vị (Tổ)
                    </label>
                    <input
                      type="text"
                      readOnly
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-100 text-slate-600 cursor-not-allowed select-none focus:outline-none"
                      value={group || 'TNV'}
                    />
                  </div>

                  {/* Ngày Sinh */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 text-xs mb-1 uppercase tracking-wider">
                      Ngày Sinh (Không bắt buộc)
                    </label>
                    <input
                      type="text"
                      readOnly={isMemberExists}
                      placeholder="VD: 31/10/2006"
                      className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none ${
                        isMemberExists 
                          ? 'bg-slate-100 text-slate-600 cursor-not-allowed select-none font-mono' 
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