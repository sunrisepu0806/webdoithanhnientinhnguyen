'use client';

import { useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

interface TheDocProps {
  studentId: string;
  fullName: string;
}

export default function TheDocCanva({ studentId, fullName }: TheDocProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dangTai, setDangTai] = useState(false);

  const xuatThe = async () => {
    setDangTai(true);
    const canvas = canvasRef.current;
    if (!canvas) {
      setDangTai(false);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setDangTai(false);
      return;
    }

    // 1. Nạp phôi ảnh dọc từ public/the-doc.png
    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    bgImg.src = '/the-doc.png';

    bgImg.onload = () => {
      canvas.width = bgImg.width;
      canvas.height = bgImg.height;

      // Vẽ hình nền Canva
      ctx.drawImage(bgImg, 0, 0);

      // 2. Nạp mã QR từ API (đặt vào khung vuông chính giữa)
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(studentId)}`;
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.src = qrApiUrl;

      qrImg.onload = () => {
        // Tọa độ và kích thước khung QR (căn giữa theo chiều ngang canvas)
        const qrSize = canvas.width * 0.52;
        const qrX = (canvas.width - qrSize) / 2;
        const qrY = canvas.height * 0.25;

        // Vẽ nền trắng và dán mã QR
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16);
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        // 3. Viết MSV vào ô bo tròn (viết canh giữa)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = '#0084FF';
        ctx.font = `bold ${Math.round(canvas.width * 0.05)}px Arial, sans-serif`;
        ctx.fillText(`MSV: ${studentId}`, canvas.width / 2, canvas.height * 0.755);

        // 4. Viết HỌ VÀ TÊN bên dưới ô MSV
        ctx.fillStyle = '#0084FF';
        ctx.font = `bold ${Math.round(canvas.width * 0.038)}px Arial, sans-serif`;
        ctx.fillText(`HỌ VÀ TÊN: ${fullName.toUpperCase()}`, canvas.width / 2, canvas.height * 0.825);

        // 5. Tải file ảnh PNG về máy
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `The_TNV_${studentId}.png`;
        link.href = url;
        link.click();
        setDangTai(false);
      };
    };

    bgImg.onerror = () => {
      alert('Chưa tìm thấy file public/the-doc.png! Vui lòng lưu file phôi ảnh vào thư mục public.');
      setDangTai(false);
    };
  };

  return (
    <div className="w-full">
      <canvas ref={canvasRef} className="hidden" />

      <button
        onClick={xuatThe}
        disabled={dangTai}
        className="w-full py-3.5 bg-[#0084FF] hover:bg-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
      >
        {dangTai ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
        {dangTai ? 'Đang tạo thẻ...' : 'Tải Thẻ Tình Nguyện Viên'}
      </button>
    </div>
  );
}