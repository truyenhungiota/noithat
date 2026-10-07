import { Order } from '../types';

/**
 * Sinh mã đơn hàng mới chuẩn xác theo thứ tự tăng dần.
 * Quy chuẩn: Đứng đầu là 'HI', tiếp theo là số thứ tự tăng dần (HI001, HI002, HI003...).
 * Tự động tìm số thứ tự lớn nhất hiện có và tăng thêm 1, đảm bảo không bao giờ bị trùng lặp.
 */
export const generateNextOrderId = (orders: Order[] = []): string => {
  if (!orders || orders.length === 0) {
    return 'HI001';
  }

  // Tập hợp các ID hiện có (viết hoa, cắt khoảng trắng)
  const existingIdSet = new Set(orders.map(o => String(o?.id || '').trim().toUpperCase()));

  // Thu thập toàn bộ các mã đơn bắt đầu bằng HI + phần số
  const hiItems: { num: number; padLength: number; rawId: string }[] = [];

  for (const o of orders) {
    if (!o || !o.id) continue;
    const cleanId = String(o.id).trim().toUpperCase();
    // Bắt các mẫu HI001, HI-001, HI_001
    const match = cleanId.match(/^HI[_-]?(\d+)$/);
    if (match) {
      const digits = match[1];
      const num = parseInt(digits, 10);
      // Bỏ qua các số quá lớn bất thường như unix timestamp (Date.now() > 100000000)
      if (!isNaN(num) && num > 0 && num < 100000000) {
        hiItems.push({
          num,
          padLength: digits.length,
          rawId: cleanId
        });
      }
    }
  }

  // Nếu chưa có đơn nào có định dạng HI + số, bắt đầu từ HI001
  if (hiItems.length === 0) {
    let cand = 'HI001';
    let idx = 1;
    while (existingIdSet.has(cand)) {
      idx++;
      cand = `HI${String(idx).padStart(3, '0')}`;
    }
    return cand;
  }

  // Lọc các số thứ tự thông thường (< 10000)
  const normalItems = hiItems.filter(item => item.num < 10000);

  let nextNum = 1;
  let targetPad = 3;

  if (normalItems.length > 0) {
    // Lấy số lớn nhất trong các số thứ tự thông thường
    const maxNum = Math.max(...normalItems.map(i => i.num));
    nextNum = maxNum + 1;
    const matchingItem = normalItems.find(i => i.num === maxNum);
    targetPad = Math.max(3, matchingItem?.padLength || 3);
  } else {
    // Tất cả các số đều >= 10000 (có thể từ hệ thống cũ hoặc import), tìm số nhỏ nhất và lớn nhất
    const allNums = hiItems.map(i => i.num);
    const minNum = Math.min(...allNums);
    const maxNum = Math.max(...allNums);

    // Nếu là chuỗi số thứ tự liên tục
    if ((maxNum - minNum) <= hiItems.length + 5) {
      nextNum = maxNum + 1;
      targetPad = Math.max(4, String(nextNum).length);
    } else {
      // Bắt đầu lại dãy số thứ tự chuẩn từ HI001
      nextNum = 1;
      targetPad = 3;
    }
  }

  // Đảm bảo tuyệt đối không trùng với bất kỳ mã nào đã có trong hệ thống
  let candidateId = `HI${String(nextNum).padStart(targetPad, '0')}`;
  while (existingIdSet.has(candidateId)) {
    nextNum++;
    candidateId = `HI${String(nextNum).padStart(targetPad, '0')}`;
  }

  return candidateId;
};
