
import React, { useState, useMemo, useEffect } from 'react';
import { Order, OrderStatus, Supplier, ShippingUnit, UserAccount, UserRole } from '../types';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, Cell
} from 'recharts';
import { Download, Calendar, Search, TrendingUp, DollarSign, Package, ShieldCheck, Truck, Factory, List, ArrowRight, Wallet, ClipboardList, Filter, Hash, User, MapPin, CalendarDays, ArrowDownWideNarrow, ChevronLeft, ChevronRight, FileText, Banknote, PieChart, FileSpreadsheet, Printer, CheckCircle2, Circle, AlertCircle, Activity, Clock, CreditCard, Receipt, Boxes, Warehouse, Sparkles } from 'lucide-react';
import { Pagination } from './Pagination';
import { compareOrdersDepositOldestFirst } from '../lib/sortUtils';

interface DetailedReportsProps {
  orders: Order[];
  suppliers: Supplier[];
  shippingUnits: ShippingUnit[];
  onViewOrder: (order: Order) => void;
  currentUser: UserAccount;
  users: UserAccount[];
}

const DetailedReports: React.FC<DetailedReportsProps> = ({ orders, suppliers, shippingUnits, onViewOrder, currentUser, users }) => {
  const [activeSubTab, setActiveSubTab] = useState<'finance' | 'excelExport' | 'workshopImports' | 'factoryShipping'>('finance');
  
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
  const [selectedShippingId, setSelectedShippingId] = useState<string>('all');
  
  // Payment Status Filters
  const [supplierPaymentFilter, setSupplierPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [shippingPaymentFilter, setShippingPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  
  // Order Status Filter
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  
  // Admin filter for Shops
  const [selectedShopId, setSelectedShopId] = useState<string>('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // State cho Tab xuất Excel sản phẩm
  const [productPage, setProductPage] = useState(1);
  const productsPerPage = 15;
  const [productSearch, setProductSearch] = useState('');

  // State cho Tab Nhập hàng nhà xưởng
  const [workshopPage, setWorkshopPage] = useState(1);
  const workshopPerPage = 15;
  const [workshopSearch, setWorkshopSearch] = useState('');

  const isAdmin = currentUser.role === UserRole.ADMIN;

  useEffect(() => {
    setCurrentPage(1);
    setProductPage(1);
    setWorkshopPage(1);
  }, [startDate, endDate, selectedSupplierId, selectedShippingId, activeSubTab, selectedShopId, supplierPaymentFilter, shippingPaymentFilter, statusFilter, productSearch, workshopSearch]);

  const formatDateTime = (dt?: string) => {
    if (!dt) return '';
    try {
      if (dt.includes('T')) {
        const [datePart, timePart] = dt.split('T');
        const [year, month, day] = datePart.split('-');
        return `${timePart} ${day}/${month}/${year}`;
      }
      const d = new Date(dt);
      if (isNaN(d.getTime())) return dt;
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${hours}:${minutes} ${day}/${month}/${year}`;
    } catch (e) {
      return dt;
    }
  };

  // Lọc danh sách supplier được phép xem
  const availableSuppliers = useMemo(() => {
    if (isAdmin) return suppliers;
    return suppliers.filter(s => s.createdBy === currentUser.id);
  }, [suppliers, isAdmin, currentUser]);

  // Logic lọc dữ liệu
  const mainFilteredData = useMemo(() => {
    return orders.filter(order => {
      // 1. Permission Check (If not admin, ensure order belongs to current user. If admin, check selectedShopId)
      let matchUser = true;
      if (!isAdmin) {
        matchUser = order.createdBy === currentUser.id;
      } else {
        if (selectedShopId !== 'all') {
          matchUser = order.createdBy === selectedShopId;
        }
      }

      if (!matchUser) return false;

      const orderDate = new Date(order.orderDate);
      const matchStart = !startDate || orderDate >= new Date(startDate);
      const matchEnd = !endDate || orderDate <= new Date(endDate);
      
      const matchSupplier = selectedSupplierId === 'all' || 
                           order.supplierId === selectedSupplierId ||
                           (availableSuppliers.find(s => s.id === selectedSupplierId)?.companyName === order.supplierName);
                           
      const matchShipping = selectedShippingId === 'all' || order.shippingUnitId === selectedShippingId;
      
      // Payment Filters
      const matchSupplierPayment = supplierPaymentFilter === 'all' || 
        (supplierPaymentFilter === 'paid' ? order.isSupplierPaid : !order.isSupplierPaid);

      const matchShippingPayment = shippingPaymentFilter === 'all' || 
        (shippingPaymentFilter === 'paid' ? order.isShippingPaid : !order.isShippingPaid);

      // Status Filter
      const matchStatus = statusFilter === 'all' || order.status === statusFilter;

      return matchStart && matchEnd && matchSupplier && matchShipping && matchSupplierPayment && matchShippingPayment && matchStatus;
    }).sort(compareOrdersDepositOldestFirst);
  }, [orders, startDate, endDate, selectedSupplierId, selectedShippingId, availableSuppliers, isAdmin, currentUser, selectedShopId, supplierPaymentFilter, shippingPaymentFilter, statusFilter]);

  const exportFinanceReportToExcel = () => {
    const wb = XLSX.utils.book_new();

    const headers = [
      "Ngày đơn",
      "Mã đơn",
      "Khách hàng",
      "Nhà xưởng",
      "Thanh toán Xưởng",
      "Đơn vị giao",
      "Thanh toán Ship",
      "Doanh thu (VNĐ)",
      "Giá nhập (VNĐ)",
      "Phí VC xưởng (VNĐ)",
      "Lợi nhuận (VNĐ)",
      "Trạng thái"
    ];

    const rows = mainFilteredData.map(order => {
      const saleSubtotal = (order.items || []).reduce((s, i) => s + ((Number(i.salePrice) || 0) * (Number(i.quantity) || 0)), 0);
      const purchase = (order.items || []).reduce((s, i) => s + ((Number(i.purchasePrice) || 0) * (Number(i.quantity) || 0)), 0);
      const factoryShipping = Number(order.factoryShippingCost) || 0;
      const customerShipping = Number(order.shippingCost) || 0;
      const revenue = saleSubtotal + customerShipping;
      const profit = revenue - purchase - factoryShipping;

      return [
        new Date(order.orderDate).toLocaleDateString('vi-VN'),
        order.id,
        order.customerName,
        order.supplierName,
        order.isSupplierPaid ? "Đã thanh toán" : "Chưa thanh toán",
        order.shippingUnitName || 'Tự giao',
        order.isShippingPaid ? "Đã thanh toán" : "Chưa thanh toán",
        revenue,
        purchase,
        factoryShipping,
        profit,
        order.status
      ];
    });

    const summaryRow = [
      "TỔNG CỘNG",
      "",
      "",
      "",
      "",
      "",
      "",
      reportStats.totalSalePrice,
      reportStats.totalPurchasePrice,
      reportStats.totalShipping,
      reportStats.totalProfit,
      ""
    ];

    const worksheetData = [headers, ...rows, summaryRow];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    ws['!cols'] = [
      { wch: 14 },
      { wch: 16 },
      { wch: 25 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Báo cáo chung");
    XLSX.writeFile(wb, `Bao_cao_chung_HungIota_${new Date().getTime()}.xlsx`);
  };

  const exportToExcel = () => {
    // Xuất CSV hỗ trợ tiếng Việt (BOM UTF-8)
    const headers = ["Ngày đơn", "Mã đơn", "Khách hàng", "Nhà xưởng", "Thanh toán Xưởng", "Đơn vị giao", "Thanh toán Ship", "Doanh thu (VNĐ)", "Giá nhập (VNĐ)", "Phí VC xưởng (VNĐ)", "Lợi nhuận (VNĐ)", "Trạng thái"];
    const rows = mainFilteredData.map(order => {
      const saleSubtotal = (order.items || []).reduce((s, i) => s + ((Number(i.salePrice) || 0) * (Number(i.quantity) || 0)), 0);
      const purchase = (order.items || []).reduce((s, i) => s + ((Number(i.purchasePrice) || 0) * (Number(i.quantity) || 0)), 0);
      const factoryShipping = Number(order.factoryShippingCost) || 0;
      const customerShipping = Number(order.shippingCost) || 0;
      const revenue = saleSubtotal + customerShipping;
      const profit = revenue - purchase - factoryShipping;
      
      return [
        new Date(order.orderDate).toLocaleDateString('vi-VN'),
        order.id,
        `"${(order.customerName || '').replace(/"/g, '""')}"`,
        `"${(order.supplierName || '').replace(/"/g, '""')}"`,
        order.isSupplierPaid ? "Đã thanh toán" : "Chưa thanh toán",
        `"${(order.shippingUnitName || 'Tự giao').replace(/"/g, '""')}"`,
        order.isShippingPaid ? "Đã thanh toán" : "Chưa thanh toán",
        revenue,
        purchase,
        factoryShipping,
        profit,
        order.status
      ];
    });

    const summaryRow = [
      `"TỔNG CỘNG"`,
      "",
      "",
      "",
      "",
      "",
      "",
      reportStats.totalSalePrice,
      reportStats.totalPurchasePrice,
      reportStats.totalShipping,
      reportStats.totalProfit,
      ""
    ];

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(",")), summaryRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_cao_chung_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dữ liệu sản phẩm bóc tách theo thông tin đơn hàng bán:
  // STT, mã đơn, tên khách hàng (công ty bên dưới), SĐT (Mã số thuế đặt trên nhau), Địa chỉ, ngày cọc - ngày thanh toán (đặt trên nhau), sản phẩm, số lượng, đơn giá, thành tiền
  const productReportData = useMemo(() => {
    const list: Array<{
      key: string;
      orderId: string;
      orderDate: string;
      customerName: string;
      customerCompanyName?: string;
      customerTaxCode?: string;
      customerPhone?: string;
      address?: string;
      items: Array<{
        id: string;
        productName: string;
        dimensions?: string;
        unit?: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }>;
      shippingCost?: number;
      depositPaymentDate?: string;
      paymentDate?: string;
      invoiceDate?: string;
      status: OrderStatus;
      rawOrder: Order;
    }> = [];

    mainFilteredData.forEach(order => {
      const q = productSearch.trim().toLowerCase();
      
      const orderMatches = !q || 
        order.customerName.toLowerCase().includes(q) ||
        (order.customerCompanyName && order.customerCompanyName.toLowerCase().includes(q)) ||
        (order.customerTaxCode && order.customerTaxCode.toLowerCase().includes(q)) ||
        (order.customerPhone && order.customerPhone.toLowerCase().includes(q)) ||
        (order.address && order.address.toLowerCase().includes(q)) ||
        order.id.toLowerCase().includes(q);

      const matchedItems = (order.items || []).filter(item => {
         return orderMatches || (q && item.name.toLowerCase().includes(q));
      });

      if (matchedItems.length > 0) {
        list.push({
          key: order.id,
          orderId: order.id,
          orderDate: order.orderDate,
          customerName: order.customerName,
          customerCompanyName: order.customerCompanyName,
          customerTaxCode: order.customerTaxCode,
          customerPhone: order.customerPhone,
          address: order.address,
          items: matchedItems.map((item, idx) => ({
            id: item.id || String(idx),
            productName: item.name,
            dimensions: item.dimensions,
            unit: item.unit || 'Cái',
            quantity: item.quantity,
            unitPrice: item.salePrice,
            totalPrice: item.salePrice * item.quantity,
          })),
          shippingCost: order.shippingCost || 0,
          depositPaymentDate: order.depositPaymentDate,
          paymentDate: order.paymentDate || order.finalPaymentInvoiceDate,
          invoiceDate: order.invoiceDate || order.finalPaymentInvoiceDate,
          status: order.status,
          rawOrder: order,
        });
      }
    });

    return list;
  }, [mainFilteredData, productSearch]);

  const productStats = useMemo(() => {
    let totalQty = 0;
    let totalItemAmount = 0;
    let totalShipping = 0;
    let depositCount = 0;
    let paymentCount = 0;
    const orderSet = new Set<string>();

    productReportData.forEach(p => {
      p.items.forEach(item => {
        totalQty += item.quantity;
        totalItemAmount += item.totalPrice;
      });
      totalShipping += (p.shippingCost || 0);
      orderSet.add(p.orderId);
      if (p.depositPaymentDate) depositCount++;
      if (p.paymentDate) paymentCount++;
    });

    const totalAmount = totalItemAmount + totalShipping;

    return { totalQty, totalItemAmount, totalShipping, totalAmount, totalOrders: orderSet.size, depositCount, paymentCount };
  }, [productReportData]);

  const paginatedProducts = useMemo(() => {
    const start = (productPage - 1) * productsPerPage;
    return productReportData.slice(start, start + productsPerPage);
  }, [productReportData, productPage]);

  const totalProductPages = Math.ceil(productReportData.length / productsPerPage);

  // Xuất file Excel báo cáo bán hàng (.xlsx) bằng SheetJS
  const exportProductReportToExcel = () => {
    const headers = [
      "STT",
      "Mã đơn",
      "Tên khách hàng",
      "Công ty",
      "SĐT",
      "Mã số thuế",
      "Địa chỉ",
      "Ngày đặt cọc",
      "Ngày thanh toán",
      "Sản phẩm",
      "Số lượng",
      "Đơn vị",
      "Đơn giá (VNĐ)",
      "Thành tiền (VNĐ)",
      "Phí ship (VNĐ)",
      "Tổng tiền đơn (VNĐ)"
    ];

    let totalQty = 0;
    let totalItemAmount = 0;
    let totalShipping = 0;
    let totalAmount = 0;

    const dataRows = productReportData.flatMap((row, idx) => {
      const rowTotalQty = row.items.reduce((sum, item) => sum + item.quantity, 0);
      const rowItemAmount = row.items.reduce((sum, item) => sum + item.totalPrice, 0);
      const rowTotalAmount = rowItemAmount + (row.shippingCost || 0);

      totalQty += rowTotalQty;
      totalItemAmount += rowItemAmount;
      totalShipping += (row.shippingCost || 0);
      totalAmount += rowTotalAmount;

      return row.items.map((item, itemIdx) => {
        const productNameFull = item.dimensions ? `${item.productName} (${item.dimensions})` : item.productName;
        return [
          itemIdx === 0 ? idx + 1 : '',
          itemIdx === 0 ? row.orderId : '',
          itemIdx === 0 ? row.customerName : '',
          itemIdx === 0 ? (row.customerCompanyName || '') : '',
          itemIdx === 0 ? (row.customerPhone || '') : '',
          itemIdx === 0 ? (row.customerTaxCode || '') : '',
          itemIdx === 0 ? (row.address || '') : '',
          itemIdx === 0 ? formatDateTime(row.depositPaymentDate) : '',
          itemIdx === 0 ? formatDateTime(row.paymentDate) : '',
          productNameFull,
          item.quantity,
          item.unit || 'Cái',
          item.unitPrice,
          item.totalPrice,
          itemIdx === 0 ? (row.shippingCost || 0) : '',
          itemIdx === 0 ? rowTotalAmount : ''
        ];
      });
    });

    const summaryRow = [
      "",
      "TỔNG CỘNG",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      totalQty,
      "",
      "",
      totalItemAmount,
      totalShipping,
      totalAmount
    ];

    const worksheetData = [
      ["BÁO CÁO BÁN HÀNG - NỘI THẤT HÙNG IOTA"],
      [`Thời gian xuất báo cáo: ${new Date().toLocaleString('vi-VN')} | Tổng số dòng: ${productReportData.length} | Tổng số lượng: ${totalQty} cái/bộ | Tổng thành tiền: ${totalAmount.toLocaleString()} VNĐ`],
      [],
      headers,
      ...dataRows,
      summaryRow
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Độ rộng các cột tối ưu cho Excel
    ws['!cols'] = [
      { wch: 6 },  // STT
      { wch: 15 }, // Mã đơn
      { wch: 25 }, // Tên KH
      { wch: 26 }, // Công ty
      { wch: 15 }, // SĐT
      { wch: 15 }, // MST
      { wch: 35 }, // Địa chỉ
      { wch: 20 }, // Ngày đặt cọc
      { wch: 20 }, // Ngày thanh toán
      { wch: 32 }, // Sản phẩm
      { wch: 10 }, // Số lượng
      { wch: 10 }, // Đơn vị
      { wch: 16 }, // Đơn giá
      { wch: 20 }, // Thành tiền
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Báo cáo bán hàng");
    XLSX.writeFile(wb, `Bao_cao_ban_hang_HungIota_${new Date().getTime()}.xlsx`);
  };

  // Xuất file CSV dự phòng
  const exportProductReportToCSV = () => {
    const headers = [
      "STT",
      "Mã đơn",
      "Tên khách hàng",
      "Công ty",
      "SĐT",
      "Mã số thuế",
      "Địa chỉ",
      "Ngày đặt cọc",
      "Ngày thanh toán",
      "Sản phẩm",
      "Số lượng",
      "Đơn vị",
      "Đơn giá (VNĐ)",
      "Thành tiền (VNĐ)",
      "Phí ship (VNĐ)",
      "Tổng tiền đơn (VNĐ)"
    ];

    let totalQty = 0;
    let totalItemAmount = 0;
    let totalShipping = 0;
    let totalAmount = 0;

    const rows = productReportData.flatMap((row, idx) => {
      const rowTotalQty = row.items.reduce((sum, item) => sum + item.quantity, 0);
      const rowItemAmount = row.items.reduce((sum, item) => sum + item.totalPrice, 0);
      const rowTotalAmount = rowItemAmount + (row.shippingCost || 0);

      totalQty += rowTotalQty;
      totalItemAmount += rowItemAmount;
      totalShipping += (row.shippingCost || 0);
      totalAmount += rowTotalAmount;

      return row.items.map((item, itemIdx) => {
        const productNameFull = item.dimensions ? `${item.productName} (${item.dimensions})` : item.productName;
        return [
          itemIdx === 0 ? idx + 1 : '',
          itemIdx === 0 ? `"${row.orderId}"` : '',
          itemIdx === 0 ? `"${row.customerName.replace(/"/g, '""')}"` : '',
          itemIdx === 0 ? `"${(row.customerCompanyName || '').replace(/"/g, '""')}"` : '',
          itemIdx === 0 ? `"${row.customerPhone || ''}"` : '',
          itemIdx === 0 ? `"${row.customerTaxCode || ''}"` : '',
          itemIdx === 0 ? `"${(row.address || '').replace(/"/g, '""')}"` : '',
          itemIdx === 0 ? `"${formatDateTime(row.depositPaymentDate)}"` : '',
          itemIdx === 0 ? `"${formatDateTime(row.paymentDate)}"` : '',
          `"${productNameFull.replace(/"/g, '""')}"`,
          item.quantity,
          `"${item.unit || 'Cái'}"`,
          item.unitPrice,
          item.totalPrice,
          itemIdx === 0 ? (row.shippingCost || 0) : '',
          itemIdx === 0 ? rowTotalAmount : ''
        ];
      });
    });

    const summaryRow = [
      "",
      `"TỔNG CỘNG"`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      totalQty,
      "",
      "",
      totalItemAmount,
      totalShipping,
      totalAmount
    ];

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(",")), summaryRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_cao_ban_hang_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dữ liệu nhập hàng nhà xưởng bóc tách từng sản phẩm theo yêu cầu:
  // Mã đơn, tên khách hàng, tên sản phẩm, số lượng, thành tiền, tổng tiền đơn
  const workshopImportsData = useMemo(() => {
    const list: Array<{
      key: string;
      orderId: string;
      orderDate: string;
      customerName: string;
      customerPhone?: string;
      supplierName: string;
      supplierId: string;
      items: Array<{
        id: string;
        productName: string;
        dimensions?: string;
        unit: string;
        quantity: number;
        purchasePrice: number;
        itemTotalPurchase: number;
      }>;
      orderTotalPurchase: number;
      isSupplierPaid: boolean;
      status: OrderStatus;
      rawOrder: Order;
    }> = [];

    mainFilteredData.forEach(order => {
      const orderTotalPurchase = (order.items || []).reduce(
        (sum, it) => sum + ((it.purchasePrice || 0) * it.quantity),
        0
      );

      const q = workshopSearch.trim().toLowerCase();
      const orderMatches = !q ||
        order.customerName.toLowerCase().includes(q) ||
        order.id.toLowerCase().includes(q) ||
        (order.supplierName && order.supplierName.toLowerCase().includes(q));

      const matchedItems = (order.items || []).filter(item => {
        return orderMatches || (q && item.name.toLowerCase().includes(q));
      });

      if (matchedItems.length > 0) {
        list.push({
          key: order.id,
          orderId: order.id,
          orderDate: order.orderDate,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          supplierName: order.supplierName || 'Chưa gán xưởng',
          supplierId: order.supplierId,
          items: matchedItems.map((item, idx) => ({
            id: item.id || String(idx),
            productName: item.name,
            dimensions: item.dimensions,
            unit: item.unit || 'Cái',
            quantity: item.quantity,
            purchasePrice: item.purchasePrice || 0,
            itemTotalPurchase: (item.purchasePrice || 0) * item.quantity,
          })),
          orderTotalPurchase,
          isSupplierPaid: !!order.isSupplierPaid,
          status: order.status,
          rawOrder: order,
        });
      }
    });

    return list;
  }, [mainFilteredData, workshopSearch]);

  const workshopStats = useMemo(() => {
    let totalQty = 0;
    let totalPurchaseAmount = 0;
    const orderSet = new Set<string>();

    workshopImportsData.forEach(p => {
      p.items.forEach(item => {
        totalQty += item.quantity;
        totalPurchaseAmount += item.itemTotalPurchase;
      });
      orderSet.add(p.orderId);
    });

    return { totalQty, totalPurchaseAmount, totalOrders: orderSet.size };
  }, [workshopImportsData]);

  const paginatedWorkshopImports = useMemo(() => {
    const start = (workshopPage - 1) * workshopPerPage;
    return workshopImportsData.slice(start, start + workshopPerPage);
  }, [workshopImportsData, workshopPage]);

  const totalWorkshopPages = Math.ceil(workshopImportsData.length / workshopPerPage);

  // Xuất file Excel nhập hàng xưởng (.xlsx)
  const exportWorkshopImportsToExcel = () => {
    const headers = [
      "STT",
      "Mã đơn",
      "Tên khách hàng",
      "Tên sản phẩm",
      "Số lượng",
      "Giá tiền (VNĐ)",
      "Thành tiền (VNĐ)"
    ];

    let totalQty = 0;
    let totalAmount = 0;

    const dataRows = workshopImportsData.flatMap((row, idx) => {
      return row.items.map((item, itemIdx) => {
        totalQty += item.quantity;
        totalAmount += item.itemTotalPurchase;
        const productNameFull = item.dimensions ? `${item.productName} (${item.dimensions})` : item.productName;
        return [
          itemIdx === 0 ? idx + 1 : '',
          itemIdx === 0 ? row.orderId : '',
          itemIdx === 0 ? row.customerName : '',
          productNameFull,
          item.quantity,
          item.purchasePrice,
          item.itemTotalPurchase
        ];
      });
    });

    const summaryRow = [
      "",
      "TỔNG CỘNG",
      "",
      "",
      totalQty,
      "",
      totalAmount
    ];

    const worksheetData = [
      ["BÁO CÁO CHI TIẾT NHẬP HÀNG NHÀ XƯỞNG - NỘI THẤT HÙNG IOTA"],
      [`Thời gian xuất: ${new Date().toLocaleString('vi-VN')} | Tổng dòng: ${workshopImportsData.length} | Tổng số lượng: ${totalQty} cái/bộ | Tổng tiền: ${totalAmount.toLocaleString()} VNĐ`],
      [],
      headers,
      ...dataRows,
      summaryRow
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    ws['!cols'] = [
      { wch: 8 },  // STT
      { wch: 16 }, // Mã đơn
      { wch: 26 }, // Tên KH
      { wch: 38 }, // Tên SP
      { wch: 12 }, // Số lượng
      { wch: 18 }, // Giá tiền
      { wch: 22 }, // Thành tiền
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Nhập hàng");
    XLSX.writeFile(wb, `Bao_cao_nhap_hang_xuong_HungIota_${new Date().getTime()}.xlsx`);
  };

  // Xuất file CSV nhập hàng xưởng dự phòng
  const exportWorkshopImportsToCSV = () => {
    const headers = [
      "STT",
      "Mã đơn",
      "Tên khách hàng",
      "Tên sản phẩm",
      "Số lượng",
      "Giá tiền (VNĐ)",
      "Thành tiền (VNĐ)"
    ];

    let totalQty = 0;
    let totalAmount = 0;

    const rows = workshopImportsData.map((row, idx) => {
      totalQty += row.quantity;
      totalAmount += row.itemTotalPurchase;
      const productNameFull = row.dimensions ? `${row.productName} (${row.dimensions})` : row.productName;
      return [
        idx + 1,
        `"${row.orderId}"`,
        `"${row.customerName.replace(/"/g, '""')}"`,
        `"${productNameFull.replace(/"/g, '""')}"`,
        row.quantity,
        row.purchasePrice,
        row.itemTotalPurchase
      ];
    });

    const summaryRow = [
      "",
      `"TỔNG CỘNG"`,
      "",
      "",
      totalQty,
      "",
      totalAmount
    ];

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(",")), summaryRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_cao_nhap_hang_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Thống kê theo từng nhà xưởng (chỉ tính các xưởng được phép xem)
  const supplierBreakdown = useMemo(() => {
    const breakdown: Record<string, { id: string, name: string, totalOrders: number, purchaseAmount: number, saleAmount: number, factoryShippingAmount: number, unpaidAmount: number }> = {};
    
    availableSuppliers.forEach(s => {
      breakdown[s.id] = { id: s.id, name: s.companyName || s.name, totalOrders: 0, purchaseAmount: 0, saleAmount: 0, factoryShippingAmount: 0, unpaidAmount: 0 };
    });

    mainFilteredData.forEach(order => {
      const sId = order.supplierId;
      const sale = (order.items || []).reduce((sum, i) => sum + ((Number(i.salePrice) || 0) * (Number(i.quantity) || 0)), 0);
      const purchase = (order.items || []).reduce((sum, i) => sum + ((Number(i.purchasePrice) || 0) * (Number(i.quantity) || 0)), 0);
      const factoryShipping = Number(order.factoryShippingCost) || 0;
      
      if (breakdown[sId]) {
        breakdown[sId].totalOrders++;
        breakdown[sId].purchaseAmount += purchase;
        breakdown[sId].saleAmount += sale;
        breakdown[sId].factoryShippingAmount += factoryShipping;
        if (!order.isSupplierPaid) {
            breakdown[sId].unpaidAmount += purchase;
        }
      }
    });

    return Object.values(breakdown).filter(b => b.totalOrders > 0);
  }, [mainFilteredData, availableSuppliers]);

  const reportStats = useMemo(() => {
    return mainFilteredData.reduce((acc, order) => {
      const saleSubtotal = (order.items || []).reduce((sum, i) => sum + ((Number(i.salePrice) || 0) * (Number(i.quantity) || 0)), 0);
      const purchaseSubtotal = (order.items || []).reduce((sum, i) => sum + ((Number(i.purchasePrice) || 0) * (Number(i.quantity) || 0)), 0);
      const factoryShipping = Number(order.factoryShippingCost) || 0;
      const customerShipping = Number(order.shippingCost) || 0;
      
      // Doanh thu đơn hàng (tiền bán hàng + tiền ship khách trả nếu có)
      const revenue = saleSubtotal + customerShipping;
      // Lợi nhuận = Doanh thu - tiền giá nhập đơn hàng - phí vận chuyển xưởng
      const profit = revenue - purchaseSubtotal - factoryShipping;
      
      acc.totalSalePrice += revenue;
      acc.totalPurchasePrice += purchaseSubtotal;
      acc.totalShipping += factoryShipping;
      acc.totalProfit += profit;

      if (!order.isSupplierPaid) acc.totalUnpaidSupplier += purchaseSubtotal;
      if (!order.isShippingPaid) acc.totalUnpaidShipping += factoryShipping;
      
      return acc;
    }, { totalSalePrice: 0, totalPurchasePrice: 0, totalProfit: 0, totalShipping: 0, totalUnpaidSupplier: 0, totalUnpaidShipping: 0 });
  }, [mainFilteredData]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return mainFilteredData.slice(start, start + itemsPerPage);
  }, [mainFilteredData, currentPage]);

  const totalPages = Math.ceil(mainFilteredData.length / itemsPerPage);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Bộ lọc & Tổng quan */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-sm border border-slate-100 no-print space-y-8">
        <div className="flex flex-col gap-6">
          {/* Top Row: Tabs */}
          <div className="flex flex-wrap bg-slate-100 p-1.5 rounded-2xl w-full xl:w-fit gap-1">
            <button onClick={() => setActiveSubTab('finance')} className={`flex-1 xl:flex-none px-6 py-3 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 ${activeSubTab === 'finance' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}><TrendingUp className="w-4 h-4" /> Báo cáo chung</button>
            <button onClick={() => setActiveSubTab('excelExport')} className={`flex-1 xl:flex-none px-6 py-3 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 ${activeSubTab === 'excelExport' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'}`}><FileSpreadsheet className="w-4 h-4" /> Báo cáo bán hàng</button>
            <button onClick={() => setActiveSubTab('workshopImports')} className={`flex-1 xl:flex-none px-6 py-3 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 ${activeSubTab === 'workshopImports' ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'}`}><Boxes className="w-4 h-4" /> Nhập hàng nhà xưởng</button>
            <button onClick={() => setActiveSubTab('factoryShipping')} className={`flex-1 xl:flex-none px-6 py-3 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 ${activeSubTab === 'factoryShipping' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'}`}><Truck className="w-4 h-4" /> Báo cáo VC Xưởng</button>
          </div>

          {/* Bottom Row: Filters Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Từ ngày</label>
              <input type="date" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Đến ngày</label>
              <input type="date" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            
            {isAdmin && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-blue-600 uppercase ml-2 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Shop / Nhân viên</label>
                <select className="w-full px-5 py-3.5 bg-blue-50/50 border border-blue-200 text-blue-700 rounded-xl text-sm font-black uppercase tracking-tight focus:bg-blue-50 focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer" value={selectedShopId} onChange={e => setSelectedShopId(e.target.value)}>
                  <option value="all">Tất cả Shop</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Nhà xưởng</label>
              <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm font-black uppercase tracking-tight focus:bg-white focus:ring-2 focus:ring-slate-500 transition-all cursor-pointer" value={selectedSupplierId} onChange={e => setSelectedSupplierId(e.target.value)}>
                <option value="all">Tất cả nhà xưởng</option>
                {availableSuppliers.map(s => <option key={s.id} value={s.id}>{s.companyName || s.name}</option>)}
              </select>
            </div>

            {/* Payment Filters */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><Truck className="w-3 h-3"/> Vận chuyển</label>
              <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm font-black uppercase tracking-tight focus:bg-white focus:ring-2 focus:ring-slate-500 transition-all cursor-pointer" value={selectedShippingId} onChange={e => setSelectedShippingId(e.target.value)}>
                <option value="all">Tất cả đơn vị</option>
                {shippingUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-amber-600 uppercase ml-2 flex items-center gap-1"><Banknote className="w-3 h-3"/> Thanh toán xưởng</label>
              <select className="w-full px-5 py-3.5 bg-amber-50/50 border border-amber-200 text-amber-800 rounded-xl text-sm font-black uppercase tracking-tight focus:bg-amber-50 focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer" value={supplierPaymentFilter} onChange={e => setSupplierPaymentFilter(e.target.value as any)}>
                <option value="all">Tất cả trạng thái</option>
                <option value="paid">Đã thanh toán</option>
                <option value="unpaid">Chưa thanh toán (Nợ)</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-indigo-600 uppercase ml-2 flex items-center gap-1"><Truck className="w-3 h-3"/> Thanh toán ship</label>
              <select className="w-full px-5 py-3.5 bg-indigo-50/50 border border-indigo-200 text-indigo-800 rounded-xl text-sm font-black uppercase tracking-tight focus:bg-indigo-50 focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer" value={shippingPaymentFilter} onChange={e => setShippingPaymentFilter(e.target.value as any)}>
                <option value="all">Tất cả trạng thái</option>
                <option value="paid">Đã thanh toán</option>
                <option value="unpaid">Chưa thanh toán (Nợ)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><Activity className="w-3 h-3"/> Trạng thái đơn hàng</label>
              <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm font-black uppercase tracking-tight focus:bg-white focus:ring-2 focus:ring-slate-500 transition-all cursor-pointer" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
                <option value="all">Tất cả trạng thái</option>
                {Object.values(OrderStatus).map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-slate-50">
            <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50 flex flex-col items-center text-center">
              <DollarSign className="w-8 h-8 text-blue-500 mb-3" />
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Tổng doanh thu</p>
              <p className="text-xl font-black text-blue-700 mt-1 tabular-nums">{reportStats.totalSalePrice.toLocaleString()}đ</p>
            </div>
            <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100/50 flex flex-col items-center text-center">
              <Factory className="w-8 h-8 text-amber-500 mb-3" />
              <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Tổng giá trị nhập</p>
              <p className="text-xl font-black text-slate-900 mt-1 tabular-nums">{reportStats.totalPurchasePrice.toLocaleString()}đ</p>
              {reportStats.totalUnpaidSupplier > 0 && (
                 <div className="mt-2 px-3 py-1 bg-red-100 rounded-lg flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3 text-red-600" />
                    <span className="text-[9px] font-bold text-red-600 uppercase">Nợ tồn: {reportStats.totalUnpaidSupplier.toLocaleString()}đ</span>
                 </div>
              )}
            </div>
            <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100/50 flex flex-col items-center text-center relative overflow-hidden">
              <Truck className="w-8 h-8 text-indigo-500 mb-3" />
              <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Phí VC Xưởng</p>
              <p className="text-xl font-black text-slate-900 mt-1 tabular-nums">{reportStats.totalShipping.toLocaleString()}đ</p>
              {reportStats.totalUnpaidShipping > 0 && (
                 <div className="mt-2 px-3 py-1 bg-red-100 rounded-lg flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3 text-red-600" />
                    <span className="text-[9px] font-bold text-red-600 uppercase">Nợ tồn: {reportStats.totalUnpaidShipping.toLocaleString()}đ</span>
                 </div>
              )}
            </div>
            <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100/50 flex flex-col items-center text-center">
              <TrendingUp className="w-8 h-8 text-emerald-500 mb-3" />
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Lợi nhuận gộp</p>
              <p className={`text-xl font-black mt-1 tabular-nums ${reportStats.totalProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {reportStats.totalProfit >= 0 ? '+' : ''}{reportStats.totalProfit.toLocaleString()}đ
              </p>
              <span className="text-[9px] font-semibold text-slate-400 mt-1.5 tracking-tight">(Doanh thu - Giá nhập - Phí VC)</span>
            </div>
        </div>
      </div>

      {/* Nội dung báo cáo */}
      <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 md:p-8 border-b flex flex-col md:flex-row justify-between items-center bg-slate-50/30 gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                activeSubTab === 'workshopImports'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                  : activeSubTab === 'excelExport'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                  : activeSubTab === 'factoryShipping'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-slate-900 text-white'
              }`}>
                 {activeSubTab === 'workshopImports' ? (
                   <Boxes className="w-6 h-6" />
                 ) : activeSubTab === 'excelExport' ? (
                   <FileSpreadsheet className="w-6 h-6" />
                 ) : activeSubTab === 'factoryShipping' ? (
                   <Truck className="w-6 h-6" />
                 ) : (
                   <DollarSign className="w-6 h-6" />
                 )}
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tighter">
                  {activeSubTab === 'workshopImports'
                    ? 'Báo cáo nhập hàng nhà xưởng'
                    : activeSubTab === 'excelExport'
                    ? 'Báo cáo bán hàng'
                    : activeSubTab === 'factoryShipping'
                    ? 'Báo cáo phí VC xưởng'
                    : 'Bảng kê chi tiết tài chính'}
                </h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                 {activeSubTab === 'workshopImports'
                   ? `Tổng cộng ${workshopImportsData.length} dòng nhập hàng | ${workshopStats.totalQty} cái`
                   : activeSubTab === 'excelExport' 
                   ? `Tổng cộng ${productReportData.length} dòng đơn hàng bán | ${productStats.totalQty} cái | Tổng tiền: ${productStats.totalAmount.toLocaleString()} đ` 
                   : activeSubTab === 'factoryShipping'
                   ? `Tổng cộng ${mainFilteredData.filter(o => o.factoryShippingCost && o.factoryShippingCost > 0).length} đơn hàng có phí VC | Tổng phí: ${mainFilteredData.reduce((sum, o) => sum + (o.factoryShippingCost || 0), 0).toLocaleString()} đ`
                   : `Tổng cộng ${mainFilteredData.length} đơn | Doanh thu: ${reportStats.totalSalePrice.toLocaleString()} đ | Giá nhập: ${reportStats.totalPurchasePrice.toLocaleString()} đ | Phí VC: ${reportStats.totalShipping.toLocaleString()} đ | Lợi nhuận: ${reportStats.totalProfit.toLocaleString()} đ`}
               </p>
             </div>
          </div>
          <div className="flex flex-wrap gap-2.5 no-print w-full md:w-auto">
            {activeSubTab === 'workshopImports' ? (
              <>
                <button onClick={exportWorkshopImportsToExcel} className="flex-1 md:flex-none justify-center px-5 py-2.5 bg-violet-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-700 transition flex items-center gap-2 shadow-lg shadow-violet-200 active:scale-95">
                  <FileSpreadsheet className="w-4 h-4" /> Xuất file Excel (.xlsx)
                </button>
                <button onClick={exportWorkshopImportsToCSV} className="flex-1 md:flex-none justify-center px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition flex items-center gap-2 active:scale-95">
                  <Download className="w-4 h-4" /> Xuất CSV
                </button>
                <button onClick={() => window.print()} className="flex-1 md:flex-none justify-center px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition flex items-center gap-2">
                  <Printer className="w-4 h-4" /> In
                </button>
              </>
            ) : activeSubTab === 'excelExport' ? (
              <>
                <button onClick={exportProductReportToExcel} className="flex-1 md:flex-none justify-center px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition flex items-center gap-2 shadow-lg shadow-emerald-200 active:scale-95">
                  <FileSpreadsheet className="w-4 h-4" /> Xuất file Excel (.xlsx)
                </button>
                <button onClick={exportProductReportToCSV} className="flex-1 md:flex-none justify-center px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition flex items-center gap-2 active:scale-95">
                  <Download className="w-4 h-4" /> Xuất CSV
                </button>
                <button onClick={() => window.print()} className="flex-1 md:flex-none justify-center px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition flex items-center gap-2">
                  <Printer className="w-4 h-4" /> In
                </button>
              </>
            ) : (
              <>
                <button onClick={exportFinanceReportToExcel} className="flex-1 md:flex-none justify-center px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition flex items-center gap-2 shadow-lg shadow-blue-200 active:scale-95">
                  <FileSpreadsheet className="w-4 h-4" /> Xuất file Excel (.xlsx)
                </button>
                <button onClick={exportToExcel} className="flex-1 md:flex-none justify-center px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition flex items-center gap-2 active:scale-95">
                  <Download className="w-4 h-4" /> Xuất CSV
                </button>
                <button onClick={() => window.print()} className="flex-1 md:flex-none justify-center px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition flex items-center gap-2">
                  <Printer className="w-4 h-4" /> In
                </button>
              </>
            )}
          </div>
        </div>

        {activeSubTab === 'finance' ? (
          <>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[1050px]">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-4 whitespace-nowrap">Ngày đơn / Cọc</th>
                    <th className="px-4 py-4 whitespace-nowrap">Mã đơn</th>
                    <th className="px-4 py-4 min-w-[150px]">Khách hàng</th>
                    <th className="px-4 py-4 min-w-[120px]">Nhà xưởng</th>
                    <th className="px-3 py-4 text-center whitespace-nowrap">TT Xưởng</th>
                    <th className="px-4 py-4 min-w-[110px]">Đơn vị giao</th>
                    <th className="px-3 py-4 text-center whitespace-nowrap">TT Ship</th>
                    <th className="px-4 py-4 text-right min-w-[120px] whitespace-nowrap">Doanh thu</th>
                    <th className="px-4 py-4 text-right min-w-[120px] whitespace-nowrap">Giá nhập</th>
                    <th className="px-4 py-4 text-right min-w-[110px] whitespace-nowrap">Phí VC xưởng</th>
                    <th className="px-4 py-4 text-right min-w-[120px] whitespace-nowrap">Lợi nhuận</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedOrders.map(order => {
                    const saleSubtotal = (order.items || []).reduce((s, i) => s + ((Number(i.salePrice) || 0) * (Number(i.quantity) || 0)), 0);
                    const purchase = (order.items || []).reduce((s, i) => s + ((Number(i.purchasePrice) || 0) * (Number(i.quantity) || 0)), 0);
                    const factoryShipping = Number(order.factoryShippingCost) || 0;
                    const customerShipping = Number(order.shippingCost) || 0;
                    
                    const revenue = saleSubtotal + customerShipping;
                    const profit = revenue - purchase - factoryShipping;
                    
                    return (
                      <tr key={order.id} className="text-xs hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-4 text-slate-500 font-bold tabular-nums whitespace-nowrap">
                          <div>{new Date(order.orderDate).toLocaleDateString('vi-VN')}</div>
                          {order.depositPaymentDate && (
                            <div className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
                              <span className="text-[8px] font-black uppercase text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">Cọc</span>
                              <span>{new Date(order.depositPaymentDate).toLocaleDateString('vi-VN')}</span>
                            </div>
                          )}
                        </td>
                        <td 
                          onClick={() => onViewOrder(order)}
                          className="px-4 py-4 font-black text-blue-600 hover:text-blue-800 cursor-pointer underline underline-offset-4 decoration-blue-200 hover:decoration-blue-600 transition-all whitespace-nowrap"
                          title="Xem chi tiết hóa đơn"
                        >
                          {order.id}
                        </td>
                        <td className="px-4 py-4 font-black text-slate-800 uppercase leading-snug">{order.customerName}</td>
                        <td className="px-4 py-4 font-bold text-amber-600 uppercase text-[10px] leading-tight">{order.supplierName}</td>
                        <td className="px-3 py-4 text-center">
                           {order.isSupplierPaid ? (
                             <span className="flex justify-center text-emerald-500" title="Đã thanh toán cho xưởng"><CheckCircle2 className="w-4 h-4" /></span>
                           ) : (
                             <span className="flex justify-center text-slate-300" title="Chưa thanh toán"><Circle className="w-4 h-4" /></span>
                           )}
                        </td>
                        <td className="px-4 py-4 font-bold text-indigo-600 uppercase text-[10px] leading-tight">{order.shippingUnitName || 'Tự giao'}</td>
                        <td className="px-3 py-4 text-center">
                           {order.isShippingPaid ? (
                             <span className="flex justify-center text-emerald-500" title="Đã thanh toán ship"><CheckCircle2 className="w-4 h-4" /></span>
                           ) : (
                             <span className="flex justify-center text-slate-300" title="Chưa thanh toán"><Circle className="w-4 h-4" /></span>
                           )}
                        </td>
                        <td className="px-4 py-4 text-right font-black text-blue-700 tabular-nums whitespace-nowrap">{revenue.toLocaleString()} đ</td>
                        <td className="px-4 py-4 text-right font-medium text-amber-700 tabular-nums whitespace-nowrap">{purchase.toLocaleString()} đ</td>
                        <td className="px-4 py-4 text-right font-medium text-indigo-600 tabular-nums whitespace-nowrap">{factoryShipping.toLocaleString()} đ</td>
                        <td className={`px-4 py-4 text-right font-black tabular-nums whitespace-nowrap ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`} title="Doanh thu - Giá nhập - Phí VC xưởng">
                          {profit >= 0 ? '+' : ''}{profit.toLocaleString()} đ
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedOrders.length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-20 text-center font-black text-slate-300 uppercase text-xs">Không có dữ liệu phù hợp</td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 font-black">
                  <tr className="text-xs text-slate-800">
                    <td colSpan={7} className="px-4 py-4 text-right uppercase tracking-wider text-slate-600 font-black text-xs">
                      Tổng cộng ({mainFilteredData.length} đơn hàng):
                    </td>
                    <td className="px-4 py-4 text-right font-black text-blue-700 text-sm tabular-nums whitespace-nowrap">
                      {reportStats.totalSalePrice.toLocaleString()} đ
                    </td>
                    <td className="px-4 py-4 text-right font-black text-amber-700 text-sm tabular-nums whitespace-nowrap">
                      {reportStats.totalPurchasePrice.toLocaleString()} đ
                    </td>
                    <td className="px-4 py-4 text-right font-black text-indigo-700 text-sm tabular-nums whitespace-nowrap">
                      {reportStats.totalShipping.toLocaleString()} đ
                    </td>
                    <td className={`px-4 py-4 text-right font-black text-sm md:text-base tabular-nums whitespace-nowrap ${reportStats.totalProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`} title="Tổng Doanh thu - Tổng Giá nhập - Tổng Phí VC xưởng">
                      {reportStats.totalProfit >= 0 ? '+' : ''}{reportStats.totalProfit.toLocaleString()} đ
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 py-6 border-t border-slate-50 no-print">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 bg-slate-50 rounded-xl hover:bg-blue-50 transition disabled:opacity-30">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                     let p = currentPage;
                     if (totalPages <= 5) p = i + 1;
                     else if (currentPage <= 3) p = i + 1;
                     else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
                     else p = currentPage - 2 + i;

                     return (
                       <button 
                         key={p} 
                         onClick={() => setCurrentPage(p)} 
                         className={`w-10 h-10 rounded-xl font-bold text-xs transition ${currentPage === p ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                       >
                         {p}
                       </button>
                     );
                  })}
                </div>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 bg-slate-50 rounded-xl hover:bg-blue-50 transition disabled:opacity-30">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        ) : activeSubTab === 'factoryShipping' ? (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left min-w-[850px]">
              <thead className="bg-slate-50 border-b">
                <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-4 py-4 whitespace-nowrap">Ngày đơn</th>
                  <th className="px-4 py-4 whitespace-nowrap">Mã đơn</th>
                  <th className="px-4 py-4">Khách hàng</th>
                  <th className="px-4 py-4">Nhà xưởng</th>
                  <th className="px-4 py-4 text-right whitespace-nowrap">Phí VC xưởng (đ)</th>
                  <th className="px-4 py-4 text-center whitespace-nowrap">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mainFilteredData.filter(o => o.factoryShippingCost && o.factoryShippingCost > 0).map(order => (
                  <tr key={order.id} className="hover:bg-slate-50 transition cursor-pointer group" onClick={() => onViewOrder(order)}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="font-bold text-slate-800 text-sm tabular-nums">{order.orderDate.split('T')[0]}</p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="font-black text-blue-600 text-sm group-hover:underline">{order.id}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-800 text-sm">{order.customerName}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-800 text-sm">{order.supplierName}</p>
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <p className="font-black text-indigo-600 tabular-nums">{order.factoryShippingCost?.toLocaleString()} đ</p>
                    </td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                         order.isShippingPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                       }`}>
                         {order.isShippingPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                       </span>
                    </td>
                  </tr>
                ))}
                {mainFilteredData.filter(o => o.factoryShippingCost && o.factoryShippingCost > 0).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold text-sm">
                      Không có dữ liệu phí vận chuyển xưởng trong khoảng thời gian này
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-indigo-50/50">
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-right font-black text-slate-600 uppercase text-xs">Tổng Phí Vận Chuyển Xưởng:</td>
                  <td className="px-6 py-4 text-right font-black text-indigo-700 text-lg">
                    {mainFilteredData.reduce((sum, o) => sum + (o.factoryShippingCost || 0), 0).toLocaleString()} đ
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : activeSubTab === 'excelExport' ? (
          /* BÁO CÁO BÁN HÀNG */
          <div className="space-y-4">
            {/* Quick KPI stats banner */}
            <div className="p-6 md:p-8 bg-slate-50/70 border-b">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="flex items-center gap-2 mb-1.5 text-slate-400">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Tổng dòng bán</span>
                  </div>
                  <p className="text-xl md:text-2xl font-black text-slate-800 tabular-nums tracking-tight">
                    {productReportData.length} <span className="text-xs font-bold text-slate-400">dòng</span>
                  </p>
                  <p className="text-[10px] font-bold text-emerald-600 mt-0.5">Tổng số lượng: {productStats.totalQty} cái/bộ</p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="flex items-center gap-2 mb-1.5 text-slate-400">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Tổng tiền bán hàng</span>
                  </div>
                  <p className="text-xl md:text-2xl font-black text-blue-600 tabular-nums tracking-tight">
                    {productStats.totalAmount.toLocaleString()} <span className="text-xs font-bold">đ</span>
                  </p>
                  <p className="text-[10px] font-bold text-blue-600 mt-0.5">{productStats.totalOrders} đơn hàng liên quan</p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="flex items-center gap-2 mb-1.5 text-slate-400">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Đã đặt cọc</span>
                  </div>
                  <p className="text-xl md:text-2xl font-black text-emerald-700 tabular-nums tracking-tight">
                    {productStats.depositCount} <span className="text-xs font-bold text-slate-400">/ {productReportData.length}</span>
                  </p>
                  <p className="text-[10px] font-bold text-emerald-600 mt-0.5">Có ghi nhận ngày cọc</p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="flex items-center gap-2 mb-1.5 text-slate-400">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Đã thanh toán</span>
                  </div>
                  <p className="text-xl md:text-2xl font-black text-indigo-700 tabular-nums tracking-tight">
                    {productStats.paymentCount} <span className="text-xs font-bold text-slate-400">/ {productReportData.length}</span>
                  </p>
                  <p className="text-[10px] font-bold text-indigo-600 mt-0.5">Có ghi nhận ngày thanh toán</p>
                </div>
              </div>

              {/* Sub-search bar inside tab */}
              <div className="mt-5 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-96">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Tìm mã đơn, tên KH, công ty, SĐT, địa chỉ, sản phẩm..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                  />
                  {productSearch && (
                    <button onClick={() => setProductSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold">✕</button>
                  )}
                </div>

                <div className="text-[11px] font-bold text-slate-500 w-full sm:w-auto text-right">
                  Dữ liệu đơn hàng bán đồng bộ theo bộ lọc ngày & xưởng
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[1200px]">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-3.5 text-center w-12">STT</th>
                    <th className="px-4 py-3.5 w-28">Mã đơn</th>
                    <th className="px-5 py-3.5 min-w-[180px]">Tên khách hàng</th>
                    <th className="px-4 py-3.5 min-w-[130px]">SĐT / Mã số thuế</th>
                    <th className="px-4 py-3.5 min-w-[180px]">Địa chỉ</th>
                    <th className="px-4 py-3.5 min-w-[160px]">Ngày cọc - Ngày TT</th>
                    <th className="px-5 py-3.5 min-w-[190px]">Sản phẩm</th>
                    <th className="px-4 py-3.5 text-center w-24 whitespace-nowrap">Số lượng</th>
                    <th className="px-4 py-3.5 text-right min-w-[110px] whitespace-nowrap">Đơn giá</th>
                    <th className="px-4 py-3.5 text-right min-w-[120px] whitespace-nowrap">Thành tiền</th>
                    <th className="px-4 py-3.5 text-right min-w-[100px] whitespace-nowrap">Phí ship</th>
                    <th className="px-4 py-3.5 text-right min-w-[130px] whitespace-nowrap">Tổng tiền đơn</th>
                    <th className="px-3 py-3.5 text-right no-print w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-14 text-center">
                        <div className="max-w-md mx-auto space-y-3 px-4">
                          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
                            <Sparkles className="w-6 h-6" />
                          </div>
                          <p className="text-slate-700 font-bold text-sm">Chưa có dữ liệu đơn hàng bán nào phù hợp</p>
                          <p className="text-slate-400 text-xs">Chưa có đơn hàng nào, hoặc không có đơn hàng nào khớp với điều kiện lọc.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((row, index) => {
                      const stt = (productPage - 1) * productsPerPage + index + 1;
                      return (
                        <React.Fragment key={row.key}>
                          {row.items.map((item, itemIndex) => (
                            <tr key={`${row.key}-${item.id}`} className="text-xs hover:bg-slate-50/60 transition-colors">
                              {/* 1. STT */}
                              {itemIndex === 0 && (
                                <td rowSpan={row.items.length} className="px-4 py-3.5 text-center font-bold text-slate-400 tabular-nums align-top">
                                  {stt}
                                </td>
                              )}
                              
                              {/* 2. Mã đơn */}
                              {itemIndex === 0 && (
                                <td rowSpan={row.items.length} className="px-4 py-3.5 align-top">
                                  <button
                                    onClick={() => onViewOrder(row.rawOrder)}
                                    className="font-black text-emerald-600 hover:text-emerald-800 transition-colors underline decoration-emerald-200 underline-offset-2"
                                    title="Xem chi tiết đơn hàng"
                                  >
                                    {row.orderId}
                                  </button>
                                  <p className="text-[10px] text-slate-400 font-medium mt-1">{new Date(row.orderDate).toLocaleDateString('vi-VN')}</p>
                                </td>
                              )}

                              {/* 3. Tên khách hàng */}
                              {itemIndex === 0 && (
                                <td rowSpan={row.items.length} className="px-5 py-3.5 align-top">
                                  <div className="font-black text-slate-800 uppercase tracking-tight">
                                    {row.customerName}
                                  </div>
                                  {row.customerCompanyName && (
                                    <div className="text-[11px] font-semibold text-blue-600 mt-0.5 leading-tight">
                                      {row.customerCompanyName}
                                    </div>
                                  )}
                                </td>
                              )}

                              {/* 4. SĐT & MST */}
                              {itemIndex === 0 && (
                                <td rowSpan={row.items.length} className="px-4 py-3.5 whitespace-nowrap align-top">
                                  <div className="font-bold text-slate-700 text-xs tabular-nums">
                                    {row.customerPhone || '—'}
                                  </div>
                                  {row.customerTaxCode && (
                                    <div className="text-[10px] font-semibold text-slate-500 mt-0.5 tabular-nums">
                                      MST: <span className="text-slate-700 font-bold">{row.customerTaxCode}</span>
                                    </div>
                                  )}
                                </td>
                              )}

                              {/* 5. Địa chỉ */}
                              {itemIndex === 0 && (
                                <td rowSpan={row.items.length} className="px-4 py-3.5 align-top">
                                  <div className="text-xs text-slate-600 leading-snug line-clamp-2 max-w-[200px]" title={row.address}>
                                    {row.address || '—'}
                                  </div>
                                </td>
                              )}

                              {/* 6. Ngày cọc/thanh toán */}
                              {itemIndex === 0 && (
                                <td rowSpan={row.items.length} className="px-4 py-3.5 whitespace-nowrap align-top">
                                  <div className="space-y-1">
                                    {row.depositPaymentDate ? (
                                      <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                                        <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Cọc</span>
                                        <span>{formatDateTime(row.depositPaymentDate)}</span>
                                      </div>
                                    ) : (
                                      <div className="text-[11px] text-slate-400 italic">
                                        Cọc: Chưa
                                      </div>
                                    )}
                                    {row.paymentDate ? (
                                      <div className="text-[11px] font-bold text-blue-700 flex items-center gap-1">
                                        <span className="text-[9px] font-black uppercase text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">TT</span>
                                        <span>{formatDateTime(row.paymentDate)}</span>
                                      </div>
                                    ) : (
                                      <div className="text-[11px] text-slate-400 italic">
                                        TT: Chưa
                                      </div>
                                    )}
                                  </div>
                                </td>
                              )}

                              {/* 7. Sản phẩm */}
                              <td className={`px-5 py-3.5 ${itemIndex > 0 ? 'border-t border-slate-100' : ''}`}>
                                <p className="font-bold text-slate-800 leading-snug">{item.productName}</p>
                                {item.dimensions && (
                                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{item.dimensions}</p>
                                )}
                              </td>

                              {/* 8. Số lượng */}
                              <td className={`px-4 py-3.5 text-center ${itemIndex > 0 ? 'border-t border-slate-100' : ''}`}>
                                <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-black text-xs tabular-nums">
                                  {item.quantity} {item.unit || 'cái'}
                                </span>
                              </td>

                              {/* 9. Đơn giá */}
                              <td className={`px-4 py-3.5 text-right font-bold text-slate-700 tabular-nums whitespace-nowrap ${itemIndex > 0 ? 'border-t border-slate-100' : ''}`}>
                                {item.unitPrice.toLocaleString()} đ
                              </td>

                              {/* 10. Thành tiền */}
                              <td className={`px-4 py-3.5 text-right font-black text-emerald-700 text-sm tabular-nums whitespace-nowrap ${itemIndex > 0 ? 'border-t border-slate-100' : ''}`}>
                                {item.totalPrice.toLocaleString()} đ
                              </td>

                              {/* 11. Phí ship */}
                              {itemIndex === 0 && (
                                <td rowSpan={row.items.length} className="px-4 py-3.5 text-right font-bold text-slate-500 tabular-nums align-top whitespace-nowrap">
                                  {(row.shippingCost || 0) > 0 ? `${(row.shippingCost || 0).toLocaleString()} đ` : '—'}
                                </td>
                              )}

                              {/* 12. Tổng tiền đơn */}
                              {itemIndex === 0 && (
                                <td rowSpan={row.items.length} className="px-4 py-3.5 text-right font-black text-blue-700 text-sm tabular-nums align-top whitespace-nowrap">
                                  {(row.items.reduce((s, i) => s + i.totalPrice, 0) + (row.shippingCost || 0)).toLocaleString()} đ
                                </td>
                              )}

                              {/* Thao tác */}
                              {itemIndex === 0 && (
                                <td rowSpan={row.items.length} className="px-3 py-3.5 text-right no-print align-top">
                                  <button
                                    onClick={() => onViewOrder(row.rawOrder)}
                                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                    title="Xem chi tiết đơn hàng"
                                  >
                                    <ArrowRight className="w-4 h-4" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
                {/* Cuối bảng có tổng tiền của toàn bộ bảng ghi đang lọc này */}
                <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 font-black">
                  <tr className="text-xs text-slate-800">
                    <td colSpan={7} className="px-6 py-4 text-right uppercase tracking-wider text-slate-600 font-black text-xs">
                      Tổng cộng toàn bộ bảng ghi:
                    </td>
                    <td className="px-4 py-4 text-center font-black text-slate-900 tabular-nums text-xs">
                      <span className="inline-block px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-slate-900 shadow-sm font-black">
                        {productStats.totalQty} cái
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-slate-400 font-bold">-</td>
                    <td className="px-5 py-4 text-right font-black text-emerald-700 text-base tabular-nums">
                      {productStats.totalItemAmount.toLocaleString()} đ
                    </td>
                    <td className="px-4 py-4 text-right font-black text-slate-600 text-sm tabular-nums">
                      {productStats.totalShipping > 0 ? `${productStats.totalShipping.toLocaleString()} đ` : '-'}
                    </td>
                    <td className="px-5 py-4 text-right font-black text-blue-700 text-base tabular-nums">
                      {productStats.totalAmount.toLocaleString()} đ
                    </td>
                    <td className="no-print"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination for Product Export */}
            <Pagination 
              currentPage={productPage} 
              totalPages={totalProductPages} 
              onPageChange={setProductPage} 
              itemsPerPage={productsPerPage} 
              totalItems={productReportData.length} 
              activeColor="emerald" 
            />
          </div>
        ) : (
          /* BÁO CÁO NHẬP HÀNG NHÀ XƯỞNG */
          <div className="space-y-4">
            {/* Quick KPI stats banner */}
            <div className="p-6 md:p-8 bg-slate-50/70 border-b">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="flex items-center gap-2 mb-1.5 text-slate-400">
                    <Boxes className="w-4 h-4 text-violet-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Tổng dòng sản phẩm</span>
                  </div>
                  <p className="text-xl md:text-2xl font-black text-slate-800 tabular-nums tracking-tight">
                    {workshopImportsData.length} <span className="text-xs font-bold text-slate-400">dòng</span>
                  </p>
                  <p className="text-[10px] font-bold text-violet-600 mt-0.5">({workshopStats.totalQty} cái/bộ sản phẩm)</p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="flex items-center gap-2 mb-1.5 text-slate-400">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Tổng số lượng</span>
                  </div>
                  <p className="text-xl md:text-2xl font-black text-emerald-700 tabular-nums tracking-tight">
                    {workshopStats.totalQty} <span className="text-xs font-bold text-slate-400">cái/bộ</span>
                  </p>
                  <p className="text-[10px] font-bold text-emerald-600 mt-0.5">Sản phẩm nhập</p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="flex items-center gap-2 mb-1.5 text-slate-400">
                    <Receipt className="w-4 h-4 text-indigo-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Số đơn hàng</span>
                  </div>
                  <p className="text-xl md:text-2xl font-black text-indigo-700 tabular-nums tracking-tight">
                    {workshopStats.totalOrders} <span className="text-xs font-bold text-slate-400">đơn</span>
                  </p>
                  <p className="text-[10px] font-bold text-indigo-600 mt-0.5">Đơn hàng liên quan</p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="flex items-center gap-2 mb-1.5 text-slate-400">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Tổng tiền báo cáo</span>
                  </div>
                  <p className="text-xl md:text-2xl font-black text-blue-600 tabular-nums tracking-tight">
                    {workshopStats.totalPurchaseAmount.toLocaleString()} <span className="text-xs font-bold">đ</span>
                  </p>
                  <p className="text-[10px] font-bold text-blue-600 mt-0.5">Tổng tiền nhập hàng</p>
                </div>
              </div>

              {/* Sub-search bar inside tab */}
              <div className="mt-5 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-96">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={workshopSearch}
                    onChange={(e) => setWorkshopSearch(e.target.value)}
                    placeholder="Tìm mã đơn, tên khách hàng, tên sản phẩm..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all placeholder:text-slate-400"
                  />
                  {workshopSearch && (
                    <button onClick={() => setWorkshopSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold">✕</button>
                  )}
                </div>

                <div className="text-[11px] font-bold text-slate-500 w-full sm:w-auto text-right">
                  Dữ liệu theo bộ lọc thời gian & điều kiện tìm kiếm
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[900px]">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-3.5 text-center w-14 whitespace-nowrap">STT</th>
                    <th className="px-5 py-3.5 w-36 whitespace-nowrap">Mã đơn</th>
                    <th className="px-6 py-3.5 min-w-[160px]">Tên khách hàng</th>
                    <th className="px-6 py-3.5 min-w-[180px]">Tên sản phẩm</th>
                    <th className="px-4 py-3.5 text-center w-24 whitespace-nowrap">Số lượng</th>
                    <th className="px-6 py-3.5 text-right min-w-[120px] whitespace-nowrap">Giá tiền</th>
                    <th className="px-6 py-3.5 text-right min-w-[130px] whitespace-nowrap">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedWorkshopImports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400 font-bold text-xs">
                        Không tìm thấy dòng sản phẩm nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    paginatedWorkshopImports.map((row, index) => {
                      const stt = (workshopPage - 1) * workshopPerPage + index + 1;
                      return (
                        <React.Fragment key={row.key}>
                          {row.items.map((item, itemIdx) => (
                            <tr key={`${row.key}-${item.id}`} className="text-xs hover:bg-slate-50/60 transition-colors">
                              {itemIdx === 0 && (
                                <td rowSpan={row.items.length} className="px-4 py-3.5 text-center font-bold text-slate-400 tabular-nums align-top">
                                  {stt}
                                </td>
                              )}
                              {itemIdx === 0 && (
                                <td rowSpan={row.items.length} className="px-5 py-3.5 align-top">
                                  <button
                                    onClick={() => onViewOrder(row.rawOrder)}
                                    className="font-black text-violet-600 hover:text-violet-800 transition-colors underline decoration-violet-200 underline-offset-2"
                                    title="Xem chi tiết đơn hàng"
                                  >
                                    {row.orderId}
                                  </button>
                                  <p className="text-[10px] text-slate-400 font-medium mt-1">{new Date(row.orderDate).toLocaleDateString('vi-VN')}</p>
                                </td>
                              )}
                              {itemIdx === 0 && (
                                <td rowSpan={row.items.length} className="px-6 py-3.5 font-black text-slate-800 uppercase tracking-tight align-top">
                                  {row.customerName}
                                  {row.customerPhone && (
                                    <p className="text-[10px] font-normal text-slate-400 mt-0.5">{row.customerPhone}</p>
                                  )}
                                </td>
                              )}
                              <td className={`px-6 py-3.5 ${itemIdx > 0 ? 'border-t border-slate-100' : ''}`}>
                                <p className="font-bold text-slate-800 leading-snug">{item.productName}</p>
                                {item.dimensions && (
                                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{item.dimensions}</p>
                                )}
                              </td>
                              <td className={`px-4 py-3.5 text-center ${itemIdx > 0 ? 'border-t border-slate-100' : ''}`}>
                                <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-black text-xs tabular-nums">
                                  {item.quantity} {item.unit || 'cái'}
                                </span>
                              </td>
                              <td className={`px-4 py-3.5 text-right font-bold text-slate-700 tabular-nums whitespace-nowrap ${itemIdx > 0 ? 'border-t border-slate-100' : ''}`}>
                                {item.purchasePrice.toLocaleString()} đ
                              </td>
                              <td className={`px-4 py-3.5 text-right font-black text-blue-700 text-sm tabular-nums whitespace-nowrap ${itemIdx > 0 ? 'border-t border-slate-100' : ''}`}>
                                {item.itemTotalPurchase.toLocaleString()} đ
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 font-black">
                  <tr className="text-xs text-slate-800">
                    <td colSpan={4} className="px-6 py-4 text-right uppercase tracking-wider text-slate-600 font-black text-xs">
                      Tổng tiền của bảng báo cáo:
                    </td>
                    <td className="px-4 py-4 text-center font-black text-slate-900 tabular-nums text-xs">
                      <span className="inline-block px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-slate-900 shadow-sm font-black">
                        {workshopStats.totalQty} cái
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-400 font-bold">-</td>
                    <td className="px-6 py-4 text-right font-black text-blue-700 text-base tabular-nums">
                      {workshopStats.totalPurchaseAmount.toLocaleString()} đ
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination for Workshop Imports */}
            <Pagination 
              currentPage={workshopPage} 
              totalPages={totalWorkshopPages} 
              onPageChange={setWorkshopPage} 
              itemsPerPage={workshopPerPage} 
              totalItems={workshopImportsData.length} 
              activeColor="violet" 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailedReports;
