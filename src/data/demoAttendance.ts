export const members = [
  { studentId: '9900000001', fullName: 'Thành viên mẫu An', major: 'Công nghệ thông tin', group: '1', groupSessions: 6, departmentSessions: 3, totalSessions: 9, totalPoints: 60, department: 'Thiết kế', createdAt: '07/11/2026' },
  { studentId: '9900000002', fullName: 'Thành viên mẫu Bình', major: 'Sư phạm Toán', group: '2', groupSessions: 2, departmentSessions: 0, totalSessions: 2, totalPoints: 20, department: 'Chụp ảnh', createdAt: '07/11/2026' },
];

// Nhật ký giả lập chỉ dùng cho bản tra cứu mẫu.
const activities = [
  ['2026-10-03', 'Sáng', 'Dọn vệ sinh khuôn viên trường'],
  ['2026-10-04', 'Chiều', 'Hướng dẫn tân sinh viên'],
  ['2026-10-10', 'Sáng', 'Thu gom giấy tái chế'],
  ['2026-10-11', 'Chiều', 'Phân loại sách quyên góp'],
  ['2026-10-17', 'Sáng', 'Trồng cây tại trường'],
  ['2026-10-18', 'Sáng', 'Chuẩn bị quà tình nguyện'],
  ['2026-10-20', 'Chiều', 'Thiết kế áp phích tuyển thành viên'],
  ['2026-10-22', 'Chiều', 'Dàn trang bản tin Đội'],
  ['2026-10-24', 'Sáng', 'Thiết kế thư cảm ơn'],
].map(([date, shift, name], index) => ({
  date, shift, name, type: index < 6 ? 'Hoạt động Đội' : 'Công việc mảng',
  points: index < 6 ? 10 : 0,
}));

export function demoRecords(studentId: string) {
  if (studentId === '9900000001') return activities;
  if (studentId === '9900000002') return activities.slice(0, 2);
  return [];
}
