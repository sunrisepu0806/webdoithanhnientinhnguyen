'use client';

import { useState } from 'react';
import { Search, ArrowRight, ClipboardCheck, Users } from 'lucide-react';

const modes = [
  { title: 'Điểm danh', icon: ClipboardCheck, result: 'Đã ghi nhận 3 buổi tham gia' },
  { title: 'Kết quả tuyển thành viên', icon: Users, result: 'Trúng tuyển vòng phỏng vấn' },
];

export default function TrangChu() {
  const [mode, setMode] = useState(0);
  const [id, setId] = useState('');
  const [searched, setSearched] = useState('');
  const found = searched === 'QNU001';
  return <div className="bg-[#f3f7fa] px-5 py-10 sm:py-16">
    <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="relative overflow-hidden bg-[#103d52] px-6 py-10 text-white sm:px-12 sm:py-14">
        <div aria-hidden="true" className="absolute -right-16 -top-32 h-96 w-96 rounded-full border-[44px] border-white/5" />
        <p className="text-xs font-semibold tracking-widest text-teal-200">TNTN QNU · DỊCH VỤ SINH VIÊN</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Cổng tra cứu</h1>
        <p className="mt-3 max-w-lg text-slate-100">Xem số buổi đã tham gia và kết quả tuyển thành viên của Đội bằng mã số sinh viên.</p>
      </div>
      <section className="p-6 sm:p-12" aria-label="Tra cứu thông tin">
        <fieldset><legend className="font-semibold text-ink">Bạn muốn tra cứu gì?</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{modes.map(({title,icon:Icon}, index) => <button key={title} type="button" aria-pressed={mode === index} onClick={()=>{setMode(index);setSearched('');}} className={'flex items-center gap-3 rounded-xl border px-4 py-4 text-left font-semibold '+(mode===index?'border-teal-700 bg-teal-50 text-brand-strong':'border-slate-200 text-body-ink hover:bg-slate-50')}><Icon size={21} aria-hidden="true"/>{title}</button>)}</div>
        </fieldset>
        <form className="mt-7" onSubmit={e=>{e.preventDefault();setSearched(id.trim().toUpperCase());}}>
          <label htmlFor="mssv" className="text-sm font-semibold text-ink">Mã số sinh viên</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row"><div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-300 px-4 focus-within:border-teal-700"><Search size={20} aria-hidden="true"/><input className="min-w-0 flex-1 py-3 outline-none" id="mssv" value={id} onChange={e=>{setId(e.target.value);setSearched('');}} required pattern=".*\S.*" placeholder="Nhập mã số sinh viên" /></div><button className="flex items-center justify-center gap-3 rounded-xl bg-teal-800 px-6 py-3 font-semibold text-white hover:bg-teal-900">Tra cứu <ArrowRight size={18}/></button></div>
        </form>
        <p className="mt-3 text-sm text-muted-ink">Bản mẫu dùng dữ liệu minh họa. <button className="font-semibold text-brand-ink underline" onClick={()=>{setId('QNU001');setSearched('QNU001');}}>Thử với mã QNU001</button></p>
        <div aria-live="polite">{searched && <div className="mt-6 rounded-xl border-l-4 border-teal-600 bg-slate-50 p-5"><p className="text-xs font-bold uppercase tracking-wide text-muted-ink">{modes[mode].title} · {searched}</p><p className="mt-1 font-semibold">{found ? modes[mode].result : 'Không tìm thấy mã này trong dữ liệu mẫu.'}</p></div>}</div>
      </section>
    </div>
  </div>;
}
