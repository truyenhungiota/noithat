/**
 * Logo chuẩn thương hiệu NỘI THẤT HÙNG IOTA nền trắng sắc nét.
 * Định dạng Vector SVG Data URL tương thích 100% mọi trình duyệt,
 * hiển thị cực nét trên màn hình và khi in ấn chứng từ (Báo giá, Đơn nhập, Phiếu xuất kho, Hóa đơn).
 * Tuyệt đối không bị viền đen, không bị mờ nhòe.
 */
export const DEFAULT_HUNG_IOTA_LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 90" width="360" height="90">
    <!-- Nền trắng chuẩn 100% -->
    <rect width="360" height="90" fill="#FFFFFF" rx="12"/>
    <!-- Khung biểu tượng HI -->
    <g transform="translate(12, 11)">
      <rect width="68" height="68" rx="18" fill="#1e3a8a"/>
      <!-- Chữ H -->
      <path d="M21 20 v28 M37 20 v28 M21 34 h16" stroke="#ffffff" stroke-width="4.8" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Chữ I cách điệu màu vàng gỗ ấm -->
      <path d="M47 20 v28" stroke="#f59e0b" stroke-width="4.8" stroke-linecap="round"/>
    </g>
    <!-- Tên thương hiệu và thông tin liên hệ -->
    <text x="94" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="11" font-weight="800" fill="#64748b" letter-spacing="3">NỘI THẤT</text>
    <text x="94" y="56" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="22" font-weight="900" fill="#0f172a" letter-spacing="0.5">HÙNG IOTA</text>
    <text x="94" y="73" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="10" font-weight="700" fill="#2563eb" letter-spacing="0.8">hungiota.com • 0965.803.688</text>
  </svg>`
)}`;
