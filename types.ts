
export enum OrderStatus {
  PENDING = 'Chờ xử lý',
  PROCESSING = 'Đang sản xuất',
  SHIPPING = 'Đang giao hàng',
  COMPLETED = 'Hoàn thành',
  PAID = 'Đã thanh toán',
  CANCELLED = 'Đã hủy'
}

export enum UserRole {
  ADMIN = 'Quản trị viên',
  SALES = 'Cửa hàng / Shop',
  WORKSHOP = 'Quản lý xưởng',
  DELIVERY = 'Nhân viên giao hàng'
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatar?: string;
  phone: string;
  status: 'active' | 'inactive';
}

export interface HandoverMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  timestamp: string;
  note?: string;
  optimizedUrl?: string;
  thumbUrl?: string;
}

export interface ShippingUnit {
  id: string;
  name: string;
  phone: string;
  contactPerson?: string;
  address?: string;
  rating?: number;
  extraInfo?: string; // Thông tin mở rộng
  createdBy: string; // ID của người tạo
}

export interface Category {
  id: string;
  name: string;
  parentId?: string | null; // ID danh mục cha (nếu có)
  createdBy: string;
  createdAt: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  barcode?: string; // Mã vạch sản phẩm
  categoryId?: string; // ID danh mục
  categoryName?: string; // Tên danh mục (optional for display)
  dimensions?: string;
  salePrice: number;
  purchasePrice: number;
  unit: string;
  imageUrl?: string;
  description?: string;
  color?: string;
  stock: number; // Số lượng tồn kho
  status: 'active' | 'inactive'; // Tình trạng hoạt động
  createdBy: string; // ID của người tạo
  createdAt: string; // Thời gian tạo để sắp xếp
}

export interface OrderItem {
  id: string;
  name: string;
  productId?: string; // Link back to actual product for stock deduction
  category: string;
  dimensions: string;
  quantity: number;
  salePrice: number;    
  purchasePrice: number; 
  imageUrl?: string;
  unit: string;
  color?: string;
  options?: string; 
  productionNote?: string; 
}

export interface Order {
  id: string;
  customerId: string;
  supplierId: string;
  customerName: string; 
  customerPhone: string;
  customerEmail?: string;
  customerID?: string; 
  customerCompanyName?: string;
  customerTaxCode?: string;
  supplierName: string;
  supplierPhone?: string;
  supplierAddress?: string;
  orderDate: string;
  deliveryDate: string;
  status: OrderStatus;
  items: OrderItem[];
  notes?: string;
  depositAmount?: number;
  address: string;
  
  // VAT Config
  isVATEnabled: boolean;
  vatRate?: number; // Phần trăm VAT tùy chỉnh
  isInvoiced?: boolean; // Đã xuất hóa đơn chưa
  invoiceCode?: string; // Mã hóa đơn (optional)

  // Shipping Config
  shippingCost: number;
  factoryShippingCost?: number; // Tiền vận chuyển trả cho xưởng
  shippingUnitId?: string;
  shippingUnitName?: string;
  shippingUnitPhone?: string;
  isCODEnabled?: boolean; // Thu hộ hay không
  codAmount?: number; // Số tiền thu hộ

  // Payment Tracking Status (New)
  isSupplierPaid?: boolean; // Đã thanh toán cho xưởng chưa
  isShippingPaid?: boolean; // Đã thanh toán phí ship chưa

  // Payment Milestones
  depositPaymentDate?: string; // Thời gian khách hàng chuyển tiền đặt cọc
  paymentDate?: string; // Thời gian khách hàng chuyển tiền thanh toán
  invoiceDate?: string; // Thời gian xuất hoá đơn
  finalPaymentInvoiceDate?: string; // Tương thích ngược: Thời gian khách hàng chuyển tiền thanh toán - xuất hoá đơn

  handoverMedia?: HandoverMedia[];
  createdBy: string; // ID của người tạo
}

export interface Customer {
  id: string;
  name: string;
  companyName?: string;
  taxCode?: string;
  phone: string;
  email?: string;
  idCard?: string;
  address: string;
  bankAccount?: string;
  bankName?: string;
  note?: string;
  extraInfo?: string; // Thông tin mở rộng
  status?: 'active' | 'inactive';
  createdBy: string; // ID của người tạo
}

export interface Supplier {
  id: string;
  name: string;
  companyName?: string;
  phone: string;
  address: string;
  taxCode?: string;
  bankAccount?: string;
  bankName?: string;
  note?: string;
  extraInfo?: string; // Thông tin mở rộng
  createdBy: string; // ID của người tạo
}

export interface CompanySettings {
  name: string;
  contactPerson: string;
  taxCode: string;
  address: string;
  email: string;
  bankAccount: string;
  bankName: string;
  phone: string;
  logoUrl?: string;
}

export type ReportPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
