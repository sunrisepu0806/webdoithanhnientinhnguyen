// src/data/groupLinks.ts

// 1. Danh sách link Tổ (1 -> 5)
export const GROUP_LINKS: Record<string, string> = {
  "1": "https://zalo.me/g/iuwnnbrb7kq4hfmaovnp",
  "2": "https://zalo.me/g/yumasyhlxlc57sxnisqn",
  "3": "https://zalo.me/g/nawks610sgbrfdyhjgwv",
  "4": "https://zalo.me/g/n3idvhv2kgb8xl4icalm",
  "5": "https://zalo.me/g/ig6bhkcpedbyebsvc58q",
};

// 2. Danh sách link Mảng chuyên môn
export const DEPARTMENT_LINKS: Record<string, string> = {
  "ky thuat hau can": "https://zalo.me/g/uohgtd334",
  "chup anh": "https://zalo.me/g/91qxjgn9ub5qsgjg50gc",
  "thiet ke": "https://zalo.me/g/f3ubvwpqyque5msothh1",
  "viet bai": "https://zalo.me/g/dul0c6oum6bie1aatnlj",
  
  // Link MC - Hoạt náo (Hỗ trợ mọi cách viết: MC, MC - Hoạt náo, Hoạt náo)
  "mc - hoat nao": "https://zalo.me/g/7hrf9n9gvdahwi096iuk",
  "mc hoat nao": "https://zalo.me/g/7hrf9n9gvdahwi096iuk",
  "mc-hoat nao": "https://zalo.me/g/7hrf9n9gvdahwi096iuk",
  "hoat nao": "https://zalo.me/g/7hrf9n9gvdahwi096iuk",
  "mc": "https://zalo.me/g/7hrf9n9gvdahwi096iuk",

  "van nghe": "https://zalo.me/g/zbdp2f0x0f7icphd3elc",
  "hau can": "https://zalo.me/g/tjk887qfr7jlepip2r0f",
};

// Chuẩn hóa tiếng Việt, chữ thường, bỏ dấu và bỏ các ký tự đặc biệt
function cleanKey(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[-_]/g, ' ') // Chuyển dấu gạch ngang thành khoảng trắng
    .replace(/\s+/g, ' ')  // Thu gọn nhiều khoảng trắng thành 1
    .trim();
}

// Lấy link Tổ
export function getGroupLink(groupId?: string): string {
  if (!groupId) return '';
  const num = String(groupId).replace(/[^0-9]/g, '');
  return GROUP_LINKS[num] || '';
}

// Tìm link của một mảng đơn lẻ (So sánh thông minh)
export function getSingleDeptLink(deptName: string): string | null {
  const key = cleanKey(deptName);
  if (!key) return null;

  // 1. Kiểm tra khớp trực tiếp
  if (DEPARTMENT_LINKS[key]) {
    return DEPARTMENT_LINKS[key];
  }

  // 2. Kiểm tra nếu có chứa từ khóa
  if (key.includes('mc') || key.includes('hoat nao')) {
    return "https://zalo.me/g/7hrf9n9gvdahwi096iuk";
  }
  if (key.includes('chup anh') || key.includes('anh')) {
    return "https://zalo.me/g/91qxjgn9ub5qsgjg50gc";
  }
  if (key.includes('thiet ke')) {
    return "https://zalo.me/g/f3ubvwpqyque5msothh1";
  }
  if (key.includes('viet bai')) {
    return "https://zalo.me/g/dul0c6oum6bie1aatnlj";
  }
  if (key.includes('van nghe')) {
    return "https://zalo.me/g/zbdp2f0x0f7icphd3elc";
  }
  if (key.includes('ky thuat')) {
    return "https://zalo.me/g/uohgtd334";
  }
  if (key.includes('hau can')) {
    return "https://zalo.me/g/tjk887qfr7jlepip2r0f";
  }

  return null;
}

// Tách nhiều mảng theo dấu phẩy, chấm phẩy, hoặc dấu /
export function getDeptLinksList(deptString?: string): { name: string; link: string | null }[] {
  if (!deptString) return [];
  
  const depts = deptString.split(/[,;/]+/).map((d) => d.trim()).filter(Boolean);

  return depts.map((d) => ({
    name: d,
    link: getSingleDeptLink(d),
  }));
}