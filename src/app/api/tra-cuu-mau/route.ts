import { members, demoRecords } from '@/data/demoAttendance';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const member = members.find(member => member.studentId === params.get('mssv'));
  if (params.get('format') !== 'xlsx') return Response.json({ member: member ?? null });
  if (!member) return new Response(null, { status: 404 });

  const records = demoRecords(member.studentId);
  const { Workbook } = await import('exceljs');
  const book = new Workbook();
  const sheet = book.addWorksheet('Hoạt động', { views: [{ state: 'frozen', ySplit: 9 }] });
  sheet.columns = [24, 15, 23, 45, 14, 14].map(width => ({ width }));
  sheet.mergeCells('A1:F1');
  sheet.getCell('A1').value = 'BÁO CÁO HOẠT ĐỘNG · DỮ LIỆU MẪU';
  sheet.addRow(['MSSV', member.studentId, 'Thành viên', member.fullName]);
  sheet.addRow([]);
  sheet.addRow(['Loại hoạt động', 'Số buổi', 'Điểm']);
  const end = 9 + records.length;
  for (const type of ['Hoạt động Đội', 'Công việc mảng']) {
    const row = sheet.rowCount + 1;
    const subset = records.filter(record => record.type === type);
    sheet.addRow([type,
      { formula: `SUMIF(C10:C${end},A${row},E10:E${end})`, result: subset.length },
      { formula: `SUMIF(C10:C${end},A${row},F10:F${end})`, result: subset.reduce((sum,r) => sum + r.points, 0) },
    ]);
  }
  sheet.addRow(['Tổng cộng', {formula:'SUM(B5:B6)', result:member.totalSessions}, {formula:'SUM(C5:C6)', result:member.totalPoints}]);
  sheet.addRow([]);
  sheet.addRow(['Ngày tham gia', 'Ca', 'Loại hoạt động', 'Hoạt động / nhiệm vụ', 'Số buổi', 'Điểm']);
  for (const record of records) {
    const row = sheet.addRow([new Date(record.date + 'T00:00:00Z'), record.shift, record.type, record.name, 1, record.points]);
    row.getCell(1).numFmt = 'dd/mm/yyyy';
  }
  sheet.autoFilter = `A9:F${end}`;
  for (const index of [1,4,9]) {
    const row = sheet.getRow(index);
    row.height = index === 1 ? 32 : 24;
    row.eachCell(cell => {
      cell.font = {bold:true, color:{argb:'FFFFFFFF'}};
      cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF036995'}};
    });
  }
  sheet.getRow(7).font = {bold:true, color:{argb:'FF075985'}};
  return new Response(new Uint8Array(await book.xlsx.writeBuffer()), {headers:{
    'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition':`attachment; filename="hoat-dong-mau-${member.studentId}.xlsx"`,
  }});
}
