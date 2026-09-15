'use client';

export default function ThanhTichPage() {
  return (
    <div className="w-full min-h-[60vh] bg-[#f3f9fe] text-slate-800 py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-6 md:px-12 w-full">
        
        {/* Tiêu đề trang Thành tích */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-5xl font-black text-[#0f2d4a] uppercase tracking-tight">
            THÀNH TÍCH CỦA ĐỘI
          </h1>
          <p className="text-xs md:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Ghi nhận những dấu ấn tự hào, bằng khen, giấy khen cùng sự đóng góp bền bỉ của Đội Thanh niên Tình nguyện trong hành trình lan tỏa yêu thương vì cộng đồng.
          </p>
          <div className="w-16 h-1 bg-[#0284c7] mx-auto rounded-full mt-2" />
        </div>

      </div>
    </div>
  );
}