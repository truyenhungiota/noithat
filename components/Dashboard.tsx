import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';
import { Order, OrderStatus } from '../types';
import { 
  TrendingUp, ShoppingBag, Truck, CheckCircle, AlertCircle, AlertTriangle, 
  Phone, Eye, Edit3, Search, Calendar, DollarSign, Package, CheckCircle2, Clock,
  Layers, CalendarClock
} from 'lucide-react';
import { Pagination } from './Pagination';

interface DashboardProps {
  orders: Order[];
  onViewOrder?: (order: Order) => void;
  onEditOrder?: (order: Order) => void;
}

export const getOrderFinancials = (order: Order) => {
  const saleTotal = (order.items || []).reduce((sum, item) => sum + (item.salePrice * item.quantity), 0);
  const customerShipping = order.shippingCost || 0;
  const subtotal = saleTotal + customerShipping;
  const vatAmount = order.isVATEnabled ? subtotal * ((order.vatRate || 8) / 100) : 0;
  const grandTotal = subtotal + vatAmount;
  const deposit = order.depositAmount || 0;
  const remaining = Math.max(0, grandTotal - deposit);
  return {
    saleTotal,
    customerShipping,
    grandTotal,
    deposit,
    remaining
  };
};

// Helper tính khoảng cách số ngày còn lại đến ngày giao hàng (so với hôm nay)
export const getDaysUntilDelivery = (deliveryDate?: string): number | null => {
  if (!deliveryDate) return null;
  const clean = deliveryDate.trim();
  const datePart = clean.split('T')[0];
  const parts = datePart.split('-');
  
  let targetDate: Date;
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    targetDate = new Date(y, m, d);
  } else {
    targetDate = new Date(clean);
  }

  if (isNaN(targetDate.getTime())) return null;

  targetDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = targetDate.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

// Helper kiểm tra đơn có cách ngày giao 1-2 ngày nữa hay không
export const isDueIn1To2Days = (deliveryDate?: string): boolean => {
  const days = getDaysUntilDelivery(deliveryDate);
  return days !== null && days >= 1 && days <= 2;
};

// Helper kiểm tra xem ngày đặt hàng (orderDate) có thuộc tháng hiện tại không (tính từ ngày 01 tới hết tháng)
export const isOrderInSelectedMonth = (orderDate?: string, targetYM?: string): boolean => {
  if (!orderDate || !targetYM) return false;
  const clean = orderDate.trim();

  // 1. Khớp chuỗi trực tiếp tiền tố YYYY-MM (e.g. 2026-10-02 bắt đầu bằng 2026-10)
  if (clean.startsWith(targetYM)) {
    return true;
  }

  // 2. Định dạng ISO (e.g. 2026-10-02T08:30:00.000Z)
  if (clean.includes('T') && clean.split('T')[0].startsWith(targetYM)) {
    return true;
  }

  // 3. Định dạng DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(clean)) {
    const parts = clean.split('/');
    const formatted = `${parts[2]}-${parts[1].padStart(2, '0')}`;
    return formatted === targetYM;
  }

  // 4. Phân tích đối tượng Date
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}` === targetYM;
  }

  return false;
};

export type DashboardTab = 'shipping' | 'processing' | 'upcoming';

const Dashboard: React.FC<DashboardProps> = ({ orders, onViewOrder, onEditOrder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mục tổng quan kinh doanh CHỈ thống kê các đơn hàng trong trạng thái:
  // - Đang sản xuất (PROCESSING)
  // - Đang giao hàng (SHIPPING) - đơn đang giao hàng tức là đơn chưa thanh toán
  // Các trường hợp khác (Chờ xử lý, Hoàn thành, Đã thanh toán, Đã hủy) không đưa vào.
  const activeOrders = useMemo(() => {
    return (orders || []).filter(order => 
      order.status === OrderStatus.PROCESSING || order.status === OrderStatus.SHIPPING
    );
  }, [orders]);

  // Bộ lọc trạng thái bảng gồm 3 tab:
  // 1. 'shipping': Đang giao hàng (Đơn chưa thanh toán)
  // 2. 'processing': Đang sản xuất
  // 3. 'upcoming': Đơn hàng cách ngày giao 1-2 ngày nữa
  const [statusFilter, setStatusFilter] = useState<DashboardTab>('shipping');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // =========================================================================
  // 1. THỐNG KÊ TỔNG ĐƠN (áp dụng cho danh sách đơn hàng đã giao chưa thanh toán và đang sản xuất)
  // "Còn danh sách các đơn hàng đã giao mà chưa thanh toán vẫn lấy ở tổng đơn"
  // =========================================================================
  const allActiveStats = useMemo(() => {
    return activeOrders.reduce((acc, order) => {
      const saleTotal = (order.items || []).reduce((sum, item) => sum + (item.salePrice * item.quantity), 0);
      const costTotal = (order.items || []).reduce((sum, item) => sum + (item.purchasePrice * item.quantity), 0);
      const customerShipping = order.shippingCost || 0;
      const vatAmount = order.isVATEnabled ? (saleTotal + customerShipping) * ((order.vatRate || 8) / 100) : 0;
      const grandTotal = saleTotal + customerShipping + vatAmount;
      const deposit = order.depositAmount || 0;
      const remaining = Math.max(0, grandTotal - deposit);

      if (order.status === OrderStatus.PROCESSING) {
        acc.productionCount++;
        acc.productionValue += grandTotal;
        acc.productionDeposit += deposit;
        acc.productionRemaining += remaining;
      }
      if (order.status === OrderStatus.SHIPPING) {
        acc.shippingCount++;
        acc.shippingValue += grandTotal;
        acc.shippingDeposit += deposit;
        acc.shippingRemaining += remaining;
      }

      // Thống kê đơn cách ngày giao 1-2 ngày nữa
      if (isDueIn1To2Days(order.deliveryDate)) {
        acc.upcomingCount++;
        acc.upcomingValue += grandTotal;
        acc.upcomingDeposit += deposit;
        acc.upcomingRemaining += remaining;
      }

      return acc;
    }, {
      productionCount: 0,
      productionValue: 0,
      productionDeposit: 0,
      productionRemaining: 0,
      shippingCount: 0,
      shippingValue: 0,
      shippingDeposit: 0,
      shippingRemaining: 0,
      upcomingCount: 0,
      upcomingValue: 0,
      upcomingDeposit: 0,
      upcomingRemaining: 0
    });
  }, [activeOrders]);

  // =========================================================================
  // 2. THỐNG KÊ THEO THÁNG:
  // "Chỉ đổ dữ liệu theo tháng vào ô doanh thu đang tính, tổng giá vốn, lợi nhuận"
  // Tính từ các đơn hàng trong tháng tính từ ngày 01 tới hết tháng lấy từ trường Ngày đặt hàng (orderDate)
  // =========================================================================
  const currentMonthYM = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  const monthActiveOrders = useMemo(() => {
    return activeOrders.filter(order => isOrderInSelectedMonth(order.orderDate, currentMonthYM));
  }, [activeOrders, currentMonthYM]);

  const monthFinancialStats = useMemo(() => {
    return monthActiveOrders.reduce((acc, order) => {
      const saleTotal = (order.items || []).reduce((sum, item) => sum + (item.salePrice * item.quantity), 0);
      const costTotal = (order.items || []).reduce((sum, item) => sum + (item.purchasePrice * item.quantity), 0);
      const factoryShipping = order.factoryShippingCost || 0;
      const customerShipping = order.shippingCost || 0;
      
      const revenue = saleTotal + customerShipping;
      
      acc.revenue += revenue;
      acc.cost += costTotal;
      acc.profit += (revenue - costTotal - factoryShipping);
      acc.orderCount++;
      
      return acc;
    }, { 
      revenue: 0, 
      cost: 0, 
      profit: 0,
      orderCount: 0
    });
  }, [monthActiveOrders]);

  // =========================================================================
  // 3. DANH SÁCH ĐƠN HÀNG TRONG BẢNG: LẤY Ở TỔNG ĐƠN (theo yêu cầu)
  // "Còn danh sách các đơn hàng đã giao mà chưa thanh toán vẫn lấy ở tổng đơn"
  // =========================================================================
  const filteredOrders = useMemo(() => {
    return activeOrders.filter(order => {
      // Lọc theo trạng thái tab: 'shipping', 'processing', 'upcoming'
      if (statusFilter === 'processing' && order.status !== OrderStatus.PROCESSING) return false;
      if (statusFilter === 'shipping' && order.status !== OrderStatus.SHIPPING) return false;
      if (statusFilter === 'upcoming' && !isDueIn1To2Days(order.deliveryDate)) return false;

      // Lọc theo từ khóa tìm kiếm (Mã đơn, tên khách, số điện thoại, tên sản phẩm)
      if (searchTerm.trim()) {
        const s = searchTerm.trim().toLowerCase();
        const cleanS = s.replace(/[\s\.\-\(\)]/g, '');
        const idMatch = order.id.toLowerCase().includes(s);
        const nameMatch = (order.customerName || '').toLowerCase().includes(s);
        const phoneClean = (order.customerPhone || '').replace(/[\s\.\-\(\)]/g, '');
        const phoneMatch = cleanS && phoneClean.includes(cleanS);
        const productMatch = (order.items || []).some(i => (i.name || '').toLowerCase().includes(s));
        return idMatch || nameMatch || phoneMatch || productMatch;
      }
      return true;
    }).sort((a, b) => {
      const dateA = new Date(a.deliveryDate || a.orderDate).getTime();
      const dateB = new Date(b.deliveryDate || b.orderDate).getTime();
      return dateB - dateA;
    });
  }, [activeOrders, statusFilter, searchTerm]);

  // Phân trang
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  // Dữ liệu biểu đồ xu hướng
  const chartOrders = activeOrders;
  const chartData = useMemo(() => {
    return chartOrders.slice(0, 10).reverse().map(o => {
      const saleTotal = (o.items || []).reduce((sum, i) => sum + (i.salePrice * i.quantity), 0);
      const costTotal = (o.items || []).reduce((sum, i) => sum + (i.purchasePrice * i.quantity), 0);
      const customerShipping = o.shippingCost || 0;
      const factoryShipping = o.factoryShippingCost || 0;
      const revenue = saleTotal + customerShipping;

      return {
        name: o.id || (o.orderDate ? o.orderDate.split('T')[0] : ''),
        revenue: revenue,
        profit: revenue - costTotal - factoryShipping,
      };
    });
  }, [chartOrders]);

  const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between gap-3 relative overflow-hidden">
      <div className="flex items-center gap-4">
        <div className={`p-3.5 rounded-2xl ${color} shadow-sm shrink-0`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider truncate">{title}</p>
          <p className="text-2xl font-black text-slate-800 tabular-nums truncate mt-0.5">{value.toLocaleString()} đ</p>
        </div>
      </div>
      {subtitle && (
        <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 font-semibold">{subtitle}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 4 THẺ THỐNG KÊ ĐẦU TRANG */}
      {/* 3 ô đầu đổ dữ liệu theo tháng: Doanh thu đang tính, Tổng giá vốn, Lợi nhuận */}
      {/* Ô thứ 4 hiển thị tổng đơn theo dõi đang thực hiện */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Doanh thu đang thực hiện" 
          value={monthFinancialStats.revenue} 
          icon={TrendingUp} 
          color="bg-blue-600" 
          subtitle="Đơn đặt trong tháng này"
        />
        <StatCard 
          title="Tổng giá vốn dự tính" 
          value={monthFinancialStats.cost} 
          icon={ShoppingBag} 
          color="bg-amber-500" 
          subtitle="Chi phí mua hàng trong tháng"
        />
        <StatCard 
          title="Lợi nhuận gộp dự tính" 
          value={monthFinancialStats.profit} 
          icon={CheckCircle} 
          color="bg-emerald-600" 
          subtitle="Doanh thu trừ vốn & ship xưởng"
        />
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-indigo-600 text-white shadow-sm shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider truncate">Tổng đơn theo dõi</p>
              <p className="text-2xl font-black text-slate-800 tabular-nums mt-0.5">
                {activeOrders.length} <span className="text-xs font-bold text-slate-400">đơn</span>
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
            <span>Sản xuất: <b className="text-blue-600">{allActiveStats.productionCount}</b></span>
            <span>Giao hàng: <b className="text-amber-700">{allActiveStats.shippingCount}</b></span>
          </div>
        </div>
      </div>

      {/* 3 THẺ ĐẠI DIỆN CHO CÁC TRẠNG THÁI / TAB THEO DÕI: LẤY THEO TỔNG ĐƠN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Thẻ 1: Đang giao hàng (Đơn chưa thanh toán) */}
        <div 
          onClick={() => { setStatusFilter('shipping'); setCurrentPage(1); }}
          className={`p-6 rounded-2xl shadow-sm border transition cursor-pointer ${
            statusFilter === 'shipping' 
              ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-500/20' 
              : 'bg-white border-amber-100 hover:border-amber-300'
          } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
        >
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-xs">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-black text-amber-800 uppercase tracking-widest">
                  Đang giao hàng (Chưa thanh toán)
                </p>
                {statusFilter === 'shipping' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-600 text-white">Đang chọn</span>
                )}
              </div>
              <p className="text-2xl md:text-3xl font-black text-amber-800 tabular-nums mt-0.5">
                {allActiveStats.shippingCount} <span className="text-xs font-bold text-slate-400">đơn (tổng đơn)</span>
              </p>
              <p className="text-[10px] text-amber-700 font-bold mt-0.5">
                Đơn đang giao hàng tức là đơn chưa thanh toán
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-200/50">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng cần thu</p>
            <p className="text-base md:text-lg font-black text-rose-600 tabular-nums">{allActiveStats.shippingRemaining.toLocaleString()} đ</p>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">
              Tổng giá trị: {allActiveStats.shippingValue.toLocaleString()} đ
            </p>
          </div>
        </div>

        {/* Thẻ 2: Đang sản xuất */}
        <div 
          onClick={() => { setStatusFilter('processing'); setCurrentPage(1); }}
          className={`p-6 rounded-2xl shadow-sm border transition cursor-pointer ${
            statusFilter === 'processing' 
              ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20' 
              : 'bg-white border-blue-100 hover:border-blue-300'
          } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
        >
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-xs">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Đang sản xuất</p>
                {statusFilter === 'processing' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-600 text-white">Đang chọn</span>
                )}
              </div>
              <p className="text-2xl md:text-3xl font-black text-blue-700 tabular-nums mt-0.5">
                {allActiveStats.productionCount} <span className="text-xs font-bold text-slate-400">đơn (tổng đơn)</span>
              </p>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                Đang gia công sản xuất tại xưởng
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-blue-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng tiền hàng</p>
            <p className="text-base md:text-lg font-black text-slate-800 tabular-nums">{allActiveStats.productionValue.toLocaleString()} đ</p>
            <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
              Đã cọc: {allActiveStats.productionDeposit.toLocaleString()} đ
            </p>
          </div>
        </div>

        {/* Thẻ 3: Cách ngày giao 1-2 ngày nữa */}
        <div 
          onClick={() => { setStatusFilter('upcoming'); setCurrentPage(1); }}
          className={`p-6 rounded-2xl shadow-sm border transition cursor-pointer ${
            statusFilter === 'upcoming' 
              ? 'bg-rose-50/90 border-rose-400 ring-2 ring-rose-500/20' 
              : 'bg-white border-rose-100 hover:border-rose-300'
          } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
        >
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-xs">
              <CalendarClock className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-black text-rose-800 uppercase tracking-widest">
                  Cách ngày giao 1-2 ngày
                </p>
                {statusFilter === 'upcoming' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-600 text-white">Đang chọn</span>
                )}
              </div>
              <p className="text-2xl md:text-3xl font-black text-rose-700 tabular-nums mt-0.5">
                {allActiveStats.upcomingCount} <span className="text-xs font-bold text-slate-400">đơn (tổng đơn)</span>
              </p>
              <p className="text-[10px] text-rose-600 font-bold mt-0.5">
                Lịch hẹn giao trong 1-2 ngày tới
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-rose-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng giá trị</p>
            <p className="text-base md:text-lg font-black text-rose-700 tabular-nums">{allActiveStats.upcomingValue.toLocaleString()} đ</p>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">
              Cần thu: {allActiveStats.upcomingRemaining.toLocaleString()} đ
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* BẢNG CHI TIẾT ĐƠN HÀNG: LẤY Ở TỔNG ĐƠN THEO YÊU CẦU */}
      {/* "Còn danh sách các đơn hàng đã giao mà chưa thanh toán vẫn lấy ở tổng đơn" */}
      {/* ======================================================== */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200/90 shadow-xl overflow-hidden space-y-6">
        {/* Tiêu đề bảng */}
        <div className={`p-6 md:p-8 bg-gradient-to-r ${
          statusFilter === 'shipping' 
            ? 'from-slate-50 via-amber-50/30 to-white' 
            : statusFilter === 'processing'
            ? 'from-slate-50 via-blue-50/30 to-white'
            : 'from-slate-50 via-rose-50/30 to-white'
        } border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6`}>
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0 mt-0.5 text-white ${
              statusFilter === 'shipping' 
                ? 'bg-amber-600 shadow-amber-200' 
                : statusFilter === 'processing'
                ? 'bg-blue-600 shadow-blue-200'
                : 'bg-rose-600 shadow-rose-200'
            }`}>
              {statusFilter === 'shipping' ? <Truck className="w-7 h-7" /> : statusFilter === 'processing' ? <Package className="w-7 h-7" /> : <CalendarClock className="w-7 h-7" />}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight">
                  {statusFilter === 'shipping' 
                    ? 'Đơn hàng đang giao hàng (Đơn chưa thanh toán)' 
                    : statusFilter === 'processing'
                    ? 'Đơn hàng đang sản xuất tại xưởng'
                    : 'Đơn hàng cách ngày giao 1-2 ngày nữa'}
                </h3>
                <span className={`px-3 py-1 text-xs font-black uppercase rounded-full shadow-2xs ${
                  statusFilter === 'shipping' 
                    ? 'bg-amber-100 text-amber-800' 
                    : statusFilter === 'processing'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {filteredOrders.length} đơn (tổng đơn)
                </span>
              </div>
              <p className="text-xs text-slate-500 font-bold mt-1">
                {statusFilter === 'shipping'
                  ? 'Danh sách toàn bộ các đơn đang giao hàng chưa thanh toán cần thu tiền'
                  : statusFilter === 'processing'
                  ? 'Danh sách toàn bộ các đơn hàng nội thất đang trong tiến trình gia công sản xuất tại xưởng'
                  : 'Danh sách các đơn hàng có lịch hẹn giao khách cách 1 đến 2 ngày nữa để chủ động điều phối'}
              </p>
            </div>
          </div>

          {/* Khối tóm tắt tài chính của tab đang chọn (Lấy ở tổng đơn) */}
          <div className="flex items-center gap-4 bg-white p-4 px-6 rounded-2xl border border-slate-200 shadow-sm w-full lg:w-auto justify-between lg:justify-start">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {statusFilter === 'shipping' 
                  ? 'Tổng tiền cần thu (tổng đơn)' 
                  : statusFilter === 'processing'
                  ? 'Tổng tiền hàng sản xuất (tổng đơn)'
                  : 'Tổng giá trị đơn sắp giao'}
              </p>
              <p className={`text-2xl md:text-3xl font-black tabular-nums ${
                statusFilter === 'shipping' 
                  ? 'text-rose-600' 
                  : statusFilter === 'processing'
                  ? 'text-blue-700'
                  : 'text-rose-700'
              }`}>
                {(statusFilter === 'shipping' 
                  ? allActiveStats.shippingRemaining 
                  : statusFilter === 'processing'
                  ? allActiveStats.productionValue 
                  : allActiveStats.upcomingValue).toLocaleString()} <span className="text-sm">đ</span>
              </p>
            </div>
            <div className="h-10 w-px bg-slate-200 hidden sm:block"></div>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {statusFilter === 'upcoming' ? 'Cần thu' : 'Khách đã cọc'}
              </p>
              <p className={`text-sm font-bold tabular-nums ${
                statusFilter === 'upcoming' ? 'text-rose-600' : 'text-emerald-600'
              }`}>
                {(statusFilter === 'shipping' 
                  ? allActiveStats.shippingDeposit 
                  : statusFilter === 'processing'
                  ? allActiveStats.productionDeposit
                  : allActiveStats.upcomingRemaining).toLocaleString()} đ
              </p>
            </div>
          </div>
        </div>

        {/* Thanh công cụ: Chọn 3 tab */}
        <div className="px-6 md:px-8 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl self-start flex-wrap">
            <button
              onClick={() => { setStatusFilter('shipping'); setCurrentPage(1); }}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 ${
                statusFilter === 'shipping' 
                  ? 'bg-white text-amber-800 shadow-sm border border-slate-200/80' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Truck className="w-4 h-4 text-amber-600" />
              Đang giao hàng (Đơn chưa thanh toán) ({allActiveStats.shippingCount})
            </button>
            <button
              onClick={() => { setStatusFilter('processing'); setCurrentPage(1); }}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 ${
                statusFilter === 'processing' 
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Package className="w-4 h-4 text-blue-600" />
              Đang sản xuất ({allActiveStats.productionCount})
            </button>
            <button
              onClick={() => { setStatusFilter('upcoming'); setCurrentPage(1); }}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 ${
                statusFilter === 'upcoming' 
                  ? 'bg-white text-rose-700 shadow-sm border border-slate-200/80' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CalendarClock className="w-4 h-4 text-rose-600" />
              Cách ngày giao 1-2 ngày ({allActiveStats.upcomingCount})
            </button>
          </div>

          {/* Ô tìm kiếm nhanh trong bảng */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input 
              type="text"
              placeholder="Tìm theo Mã đơn, Khách, SĐT..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-amber-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Danh sách bảng đơn hàng (Tổng đơn) */}
        <div className="overflow-x-auto">
          {paginatedOrders.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-y border-slate-100">
                  <th className="px-6 py-4">Mã đơn</th>
                  <th className="px-6 py-4">Khách hàng & Liên hệ</th>
                  <th className="px-6 py-4">Sản phẩm</th>
                  <th className="px-6 py-4">Thời gian</th>
                  <th className="px-6 py-4 text-right">Tổng tiền & Cọc</th>
                  <th className="px-6 py-4 text-right">Cần thu (Còn lại)</th>
                  <th className="px-6 py-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedOrders.map(order => {
                  const { grandTotal, deposit, remaining } = getOrderFinancials(order);
                  const isProcessing = order.status === OrderStatus.PROCESSING;

                  return (
                    <tr key={order.id} className="hover:bg-amber-50/20 transition group">
                      {/* Mã đơn (đã bỏ trạng thái bên dưới theo yêu cầu) */}
                      <td className="px-6 py-5 align-top">
                        <span className="font-black text-blue-600 text-base block group-hover:underline">
                          {order.id}
                        </span>
                      </td>

                      {/* Khách hàng & Liên hệ */}
                      <td className="px-6 py-5 align-top max-w-[240px]">
                        <div className="space-y-1">
                          <p className="font-black text-slate-800 text-sm uppercase break-words">
                            {order.customerName || 'Khách không tên'}
                          </p>
                          {order.customerPhone && (
                            <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <a href={`tel:${order.customerPhone}`} className="hover:text-blue-600">{order.customerPhone}</a>
                            </p>
                          )}
                          {order.customerCompanyName && (
                            <p className="text-[10px] font-bold text-blue-600 truncate">
                              🏢 {order.customerCompanyName}
                            </p>
                          )}
                          {order.address && (
                            <p className="text-[11px] text-slate-500 font-medium line-clamp-2 mt-0.5" title={order.address}>
                              📍 {order.address}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Sản phẩm */}
                      <td className="px-6 py-5 align-top max-w-[220px]">
                        <div className="space-y-1.5">
                          {(order.items || []).slice(0, 3).map((item, idx) => (
                            <div key={idx} className="text-xs text-slate-700 font-bold flex items-start gap-1">
                              <span className="text-slate-400 text-[10px] mt-0.5">•</span>
                              <span className="truncate">{item.name} <b className="text-blue-600">x{item.quantity}</b></span>
                            </div>
                          ))}
                          {(order.items || []).length > 3 && (
                            <span className="text-[10px] font-bold text-slate-400 italic block">
                              +{(order.items || []).length - 3} sản phẩm khác
                            </span>
                          )}
                          {order.shippingUnitName && (
                            <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-1">
                              <Truck className="w-3 h-3 text-slate-400" /> {order.shippingUnitName}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Thời gian */}
                      <td className="px-6 py-5 align-top">
                        <div className="space-y-1 text-xs">
                          {order.orderDate && (
                            <div className="flex items-center gap-1.5 font-bold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100">
                              <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span>Đặt: {new Date(order.orderDate).toLocaleDateString('vi-VN')}</span>
                            </div>
                          )}
                          {order.deliveryDate && (
                            <div className="flex items-center gap-1.5 font-semibold text-slate-600 pt-0.5">
                              <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span>Giao: {new Date(order.deliveryDate).toLocaleDateString('vi-VN')}</span>
                            </div>
                          )}
                          {(() => {
                            const days = getDaysUntilDelivery(order.deliveryDate);
                            if (days !== null && days >= 1 && days <= 2) {
                              return (
                                <div className="mt-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                                    <CalendarClock className="w-3 h-3 text-rose-500 shrink-0" />
                                    Cách ngày giao {days} ngày ({days === 1 ? 'Ngày mai' : 'Ngày kia'})
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>

                      {/* Tổng tiền & Cọc */}
                      <td className="px-6 py-5 align-top text-right tabular-nums">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-700">
                            {grandTotal.toLocaleString()} đ
                          </p>
                          {deposit > 0 ? (
                            <p className="text-[11px] font-bold text-emerald-600">
                              Đã cọc: {deposit.toLocaleString()} đ
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-400 font-medium">
                              Chưa đặt cọc
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Cần thu (Còn lại) */}
                      <td className="px-6 py-5 align-top text-right tabular-nums">
                        <div className="space-y-1">
                          <span className={`text-base md:text-lg font-black block ${remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {remaining.toLocaleString()} đ
                          </span>
                          {remaining > 0 ? (
                            <span className="inline-block text-[9px] font-black uppercase text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              Cần thu
                            </span>
                          ) : (
                            <span className="inline-block text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Đã thu đủ
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Thao tác */}
                      <td className="px-6 py-5 align-top text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {onViewOrder && (
                            <button
                              onClick={() => onViewOrder(order)}
                              title="Xem chứng từ đơn hàng"
                              className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition shadow-2xs"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {onEditOrder && (
                            <button
                              onClick={() => onEditOrder(order)}
                              title="Sửa thông tin / Cập nhật trạng thái"
                              className="p-2 bg-slate-100 text-slate-600 hover:bg-indigo-600 hover:text-white rounded-xl transition shadow-2xs"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center space-y-3 px-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle className="w-7 h-7" />
              </div>
              <p className="text-slate-800 font-black text-base uppercase tracking-tight">
                {statusFilter === 'shipping' 
                  ? 'Không có đơn hàng nào đang giao (chưa thanh toán)' 
                  : statusFilter === 'processing'
                  ? 'Không có đơn hàng nào đang sản xuất'
                  : 'Không có đơn hàng nào cách ngày giao 1-2 ngày nữa'}
              </p>
              <p className="text-slate-400 text-xs max-w-md mx-auto">
                {searchTerm 
                  ? 'Không tìm thấy đơn hàng nào khớp với từ khóa tìm kiếm.'
                  : statusFilter === 'shipping'
                    ? 'Hiện tại không có đơn hàng nào đang trong quá trình giao hàng (chưa thanh toán).'
                    : statusFilter === 'processing'
                    ? 'Hiện tại không có đơn hàng nào đang trong tiến trình gia công sản xuất tại xưởng.'
                    : 'Hiện tại không có đơn hàng nào có lịch hẹn giao khách trong khoảng 1-2 ngày tới.'}
              </p>
            </div>
          )}
        </div>

        {/* Phân trang cho bảng */}
        {totalPages > 1 && (
          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={setCurrentPage} 
            itemsPerPage={itemsPerPage} 
            totalItems={filteredOrders.length} 
            activeColor={statusFilter === 'shipping' ? 'amber' : 'blue'} 
          />
        )}
      </div>

      {/* Biểu đồ xu hướng và lợi nhuận (Toàn bộ đơn đang sản xuất & đang giao hàng) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
              Xu hướng doanh thu (Đơn đang sản xuất & Đang giao hàng)
            </h3>
            <span className="text-[10px] font-bold text-slate-400">
              Đơn chưa thanh toán & sản xuất
            </span>
          </div>
          <div className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} />
                  <Tooltip 
                    formatter={(val: any) => [`${Number(val).toLocaleString()} đ`, 'Doanh thu']}
                    contentStyle={{ borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400">
                Chưa có dữ liệu đơn hàng
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
              Lợi nhuận gộp dự tính
            </h3>
            <span className="text-[10px] font-bold text-slate-400">
              Doanh thu trừ giá vốn & ship xưởng
            </span>
          </div>
          <div className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} />
                  <Tooltip 
                    formatter={(val: any) => [`${Number(val).toLocaleString()} đ`, 'Lợi nhuận']}
                    contentStyle={{ borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{fill: '#f8fafc'}} 
                  />
                  <Bar dataKey="profit" fill="#10b981" radius={[8, 8, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400">
                Chưa có dữ liệu đơn hàng
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
