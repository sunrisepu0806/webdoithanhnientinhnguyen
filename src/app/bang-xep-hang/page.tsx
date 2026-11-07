import { demoRecords, members } from '@/data/demoAttendance';

export const metadata = { title: 'Bảng xếp hạng tháng | Đội TNTN QNU' };

export default async function MonthlyRanking({ searchParams }: {
  searchParams: Promise<{ thang?: string | string[] }>;
}) {
  const { thang } = await searchParams;
  const latestMonth = members.flatMap(member => demoRecords(member.studentId).map(record => record.date.slice(0, 7))).sort().at(-1)!;
  const month = typeof thang === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(thang) ? thang : latestMonth;
  const [year, number] = month.split('-');
  const results = members.flatMap(member => {
    const sessions = demoRecords(member.studentId).filter(record => record.date.startsWith(month + '-'));
    if (!sessions.length) return [];
    const group = sessions.filter(record => record.type === 'Hoạt động Đội').length;
    return [{ member, group, department: sessions.length - group, points: sessions.reduce((sum, record) => sum + record.points, 0) }];
  }).sort((a, b) => b.points - a.points || a.member.fullName.localeCompare(b.member.fullName, 'vi'));

  return (
    <section className="min-h-[65vh] bg-sky-50/50 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-ink sm:text-5xl">Bảng xếp hạng tháng</h1>
        <p className="mt-3 text-sm text-muted-ink">Dữ liệu mẫu. Thành viên được xếp theo tổng điểm trong tháng. Cùng điểm sẽ đồng hạng.</p>
        <form action="/bang-xep-hang" className="my-7 flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm font-semibold text-body-ink">Chọn tháng
            <input type="month" name="thang" key={month} defaultValue={month} required className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-base" />
          </label>
          <button className="rounded-full bg-sky-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-800">Xem xếp hạng</button>
        </form>
        <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
          <h2 className="bg-sky-800 px-5 py-4 text-lg font-bold text-white">Tháng {number}/{year}</h2>
          {results.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="bg-sky-50 text-brand-strong"><tr>
              {['Hạng', 'Thành viên', 'Buổi hoạt động Đội', 'Buổi công việc mảng', 'Điểm'].map(label =>
                <th key={label} scope="col" className="px-3 py-3 sm:px-5">{label}</th>)}
            </tr></thead>
            <tbody>{results.map(({ member, points, group, department }) => (
              <tr key={member.studentId} className="border-t border-slate-100">
                <td className="px-3 py-4 font-bold text-brand-ink sm:px-5">{results.findIndex(row => row.points === points) + 1}</td>
                <th scope="row" className="px-3 py-4 font-semibold text-ink sm:px-5">{member.fullName}<span className="block text-xs font-normal text-muted-ink">Tổ {member.group}</span></th>
                <td className="px-3 sm:px-5">{group}</td><td className="px-3 sm:px-5">{department}</td>
                <td className="px-3 text-lg font-bold text-brand-ink sm:px-5">{points}</td>
              </tr>
            ))}</tbody>
          </table></div> : <p className="p-6 text-muted-ink">Chưa có lượt tham gia trong tháng này.</p>}
        </div>
      </div>
    </section>
  );
}
