'use client';

export default function ShopPage() {
  return (
    <div className="w-full min-h-[60vh] bg-[#f3f9fe] text-slate-800 py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-6 md:px-12 w-full">
        
        {/* Tiêu đề trang Shop gây quỹ */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-5xl font-black text-[#0f2d4a] uppercase tracking-tight">
            SHOP GÂY QUỸ TÌNH NGUYỆN
          </h1>
          <p className="text-xs md:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Các vật phẩm, đồ lưu niệm và sản phẩm gây quỹ hỗ trợ các chiến dịch thiện nguyện vì cộng đồng của Đội.
          </p>
          <div className="w-16 h-1 bg-[#0284c7] mx-auto rounded-full mt-2" />
        </div>

      </div>
    </div>
  );
}