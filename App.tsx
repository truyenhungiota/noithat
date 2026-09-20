
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import OrderForm from './components/OrderForm';
import DocumentPreview from './components/DocumentPreview';
import CustomerManager from './components/CustomerManager';
import SupplierManager from './components/SupplierManager';
import UserManager from './components/UserManager';
import ShippingManager from './components/ShippingManager';
import ProductManager from './components/ProductManager'; 
import Settings from './components/Settings';
import DetailedReports from './components/DetailedReports';
import Login from './components/Login';
import { Pagination } from './components/Pagination';
import { Order, OrderStatus, Customer, Supplier, CompanySettings, UserAccount, UserRole, HandoverMedia, ShippingUnit, Product, Category, OrderItem } from './types';
import { Plus, Search, Eye, X, ImageIcon, Camera, Trash2, ChevronLeft, ChevronRight, Edit3, FolderOpen, UploadCloud, Download, CheckCircle2, AlertCircle, CreditCard, Clock, Receipt, Sparkles, PackageCheck } from 'lucide-react';
import { useFirestoreStore, firestoreMutations } from './lib/useFirestoreStore';
import { auth } from './lib/firebase';
import { compareNewestFirst, compareOrdersNewest } from './lib/sortUtils';

const DEFAULT_COMPANY: CompanySettings = {
  name: "NỘI THẤT HÙNG IOTA",
  contactPerson: "Nguyễn Minh Quang",
  taxCode: "0109283745",
  address: "Số 66, ngõ 322/95, đường Mỹ Đình, Quận Nam Từ Liêm, Hà Nội",
  email: "contact@hungiota.com",
  bankAccount: "1903567890123",
  bankName: "Techcombank",
  phone: "0965.803.688",
  logoUrl: "https://hungiota.com/wp-content/uploads/2020/03/logo-hungiota-dep-mien-che.png" 
};

const EMPTY_COMPANY: CompanySettings = {
  name: "",
  contactPerson: "",
  taxCode: "",
  address: "",
  email: "",
  bankAccount: "",
  bankName: "",
  phone: "",
  logoUrl: ""
};

const INITIAL_USERS: UserAccount[] = [
  { 
    id: 'USR1', 
    name: 'Admin Quang', 
    email: 'admin@hungiota.com', 
    password: 'Trinhviethung2324',
    role: UserRole.ADMIN, 
    phone: '0965803688', 
    status: 'active',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'
  }
];

// Toast Component
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => (
  <div className={`fixed top-6 right-6 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
    {type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
    <div>
      <h4 className="font-black text-sm uppercase tracking-wide">{type === 'success' ? 'Thành công' : 'Lỗi'}</h4>
      <p className="text-sm font-medium opacity-90">{message}</p>
    </div>
    <button onClick={onClose} className="ml-4 p-1 hover:bg-white/20 rounded-full transition"><X className="w-4 h-4" /></button>
  </div>
);

// Helper function to generate safe unique IDs
const generateId = (prefix: string) => {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
};

const App: React.FC = () => {
  const {
    users, 
    orders, 
    customers, 
    suppliers, 
    shippingUnits, 
    products, 
    categories, 
    allSettings, 
    loading,
    isAuthenticated,
    authUser,
    authInitialized
  } = useFirestoreStore();

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('furnitrack_current_user_v3');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | undefined>();
  const [previewOrderId, setPreviewOrderId] = useState<string | null>(null);
  const [previewDocType, setPreviewDocType] = useState<'quote' | 'purchase' | 'invoice' | 'production' | 'dispatch'>('quote');
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // Modal cập nhật mốc thanh toán nhanh sau khi lên đơn
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
  const [quickDepositDate, setQuickDepositDate] = useState('');
  const [quickPaymentDate, setQuickPaymentDate] = useState('');
  const [quickInvoiceDate, setQuickInvoiceDate] = useState('');
  const [quickDepositAmount, setQuickDepositAmount] = useState<number>(0);

  const openPaymentModal = (order: Order) => {
    setPaymentModalOrder(order);
    setQuickDepositDate(order.depositPaymentDate || '');
    setQuickPaymentDate(order.paymentDate || order.finalPaymentInvoiceDate || '');
    setQuickInvoiceDate(order.invoiceDate || order.finalPaymentInvoiceDate || '');
    setQuickDepositAmount(order.depositAmount || 0);
  };

  const handleSavePaymentMilestones = async () => {
    if (!paymentModalOrder) return;
    const updated: Order = {
      ...paymentModalOrder,
      depositAmount: quickDepositAmount,
      depositPaymentDate: quickDepositDate || '',
      paymentDate: quickPaymentDate || '',
      invoiceDate: quickInvoiceDate || '',
      finalPaymentInvoiceDate: quickPaymentDate || quickInvoiceDate || '',
    };
    try {
      await firestoreMutations.saveItem('orders', updated);
      setPaymentModalOrder(null);
      showNotification(`Đã cập nhật thời gian thanh toán cho đơn ${paymentModalOrder.id}!`, 'success');
    } catch (e) {
      showNotification('Lỗi khi cập nhật thanh toán!', 'error');
    }
  };

  const formatOrderDateTime = (dt?: string) => {
    if (!dt) return null;
    try {
      if (dt.includes('T')) {
        const [d, t] = dt.split('T');
        const [y, m, day] = d.split('-');
        return `${t.slice(0, 5)} ${day}/${m}/${y}`;
      } else if (dt.includes('-')) {
        const [y, m, day] = dt.split('-');
        return `${day}/${m}/${y}`;
      }
      return dt;
    } catch {
      return dt;
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const currentCompanySettings = useMemo(() => {
    if (!currentUser) return EMPTY_COMPANY;
    return allSettings[currentUser.id] || DEFAULT_COMPANY;
  }, [allSettings, currentUser]);

  const handleSaveSettings = async (newSettings: CompanySettings) => {
    if (!currentUser) return;
    await firestoreMutations.saveItem('settings', { ...newSettings, id: currentUser.id });
    showNotification('Đã lưu cấu hình công ty thành công!');
  };
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const userOrders = useMemo(() => {
    if (!currentUser) return [];
    const list = currentUser.role === UserRole.ADMIN ? orders : orders.filter(o => o.createdBy === currentUser.id);
    return [...list].sort(compareOrdersNewest);
  }, [orders, currentUser]);

  const userCustomers = useMemo(() => {
    if (!currentUser) return [];
    const list = currentUser.role === UserRole.ADMIN ? customers : customers.filter(c => c.createdBy === currentUser.id);
    return [...list].sort(compareNewestFirst);
  }, [customers, currentUser]);

  const userSuppliers = useMemo(() => {
    if (!currentUser) return [];
    const list = currentUser.role === UserRole.ADMIN ? suppliers : suppliers.filter(s => s.createdBy === currentUser.id);
    return [...list].sort(compareNewestFirst);
  }, [suppliers, currentUser]);

  const userShippingUnits = useMemo(() => {
    if (!currentUser) return [];
    const list = currentUser.role === UserRole.ADMIN ? shippingUnits : shippingUnits.filter(u => u.createdBy === currentUser.id);
    return [...list].sort(compareNewestFirst);
  }, [shippingUnits, currentUser]);

  const userProducts = useMemo(() => {
    if (!currentUser) return [];
    let list = currentUser.role === UserRole.ADMIN ? products : products.filter(p => p.createdBy === currentUser.id);
    return [...list].sort(compareNewestFirst);
  }, [products, currentUser]);

  const userCategories = useMemo(() => {
    if (!currentUser) return [];
    let list = currentUser.role === UserRole.ADMIN ? categories : categories.filter(c => c.createdBy === currentUser.id);
    return [...list].sort(compareNewestFirst);
  }, [categories, currentUser]);

  // Đồng bộ trạng thái currentUser với Firebase Auth
  useEffect(() => {
    if (!authInitialized) return;
    if (!authUser) {
      setCurrentUser(null);
      localStorage.removeItem('furnitrack_current_user_v3');
    } else {
      const match = users.find(u => u.id === authUser.uid || (authUser.email && u.email === authUser.email));
      if (match) {
        setCurrentUser(match);
      } else if (!currentUser || currentUser.id !== authUser.uid) {
        const isAdmin = authUser.email === 'hungiota.com@gmail.com' || authUser.email?.startsWith('admin');
        const fallbackUser: UserAccount = {
          id: authUser.uid,
          name: authUser.displayName || (isAdmin ? 'Quản trị viên' : (authUser.email ? authUser.email.split('@')[0] : 'Người dùng mới')),
          email: authUser.email || 'user@hungiota.com',
          phone: authUser.phoneNumber || '',
          role: isAdmin ? UserRole.ADMIN : UserRole.SALES,
          status: 'active',
          avatar: authUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.email || authUser.uid}`
        };
        firestoreMutations.saveItem('users', fallbackUser).catch(() => {});
        setCurrentUser(fallbackUser);
      }
    }
  }, [authInitialized, authUser, users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('furnitrack_current_user_v3', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('furnitrack_current_user_v3');
    }
  }, [currentUser]);

  const handleLogin = (user: UserAccount) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleRegister = async (user: UserAccount) => {
    await firestoreMutations.saveItem('users', user);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (e) {}
    setCurrentUser(null);
    localStorage.removeItem('furnitrack_current_user_v3');
    setActiveTab('dashboard');
    setSearchTerm('');
  };

  const updateOrderStatus = async (id: string, newStatus: OrderStatus) => {
    const order = orders.find(o => o.id === id);
    if(order) {
      await firestoreMutations.saveItem('orders', { ...order, status: newStatus });
      showNotification('Đã cập nhật trạng thái đơn hàng');
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, type: 'supplier' | 'shipping', isPaid: boolean) => {
    const order = orders.find(o => o.id === orderId);
    if(order) {
      const updatedOrder = type === 'supplier' 
        ? { ...order, isSupplierPaid: isPaid }
        : { ...order, isShippingPaid: isPaid };
      await firestoreMutations.saveItem('orders', updatedOrder);
      showNotification(`Đã cập nhật thanh toán ${type === 'supplier' ? 'nhà xưởng' : 'vận chuyển'}`, 'success');
    }
  };

  const filteredOrders = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    return userOrders
      .filter(o => 
        (o.customerName || '').toLowerCase().includes(s) || 
        (o.id || '').toLowerCase().includes(s) ||
        (o.id && o.id.startsWith('HI') && o.id.substring(2).includes(s))
      )
      .sort(compareOrdersNewest);
  }, [userOrders, searchTerm]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage]);

  const handleSaveOrder = async (order: Order) => {
    const creatorId = order.createdBy || currentUser?.id || 'SYSTEM';
    const orderWithCreator: Order = { 
        ...order, 
        createdBy: creatorId,
        customerId: order.customerId || '',
        supplierId: order.supplierId || '',
        customerName: order.customerName || '',
        customerPhone: order.customerPhone || '',
        supplierName: order.supplierName || '',
        orderDate: order.orderDate || new Date().toISOString().split('T')[0],
        deliveryDate: order.deliveryDate || new Date().toISOString().split('T')[0],
        status: order.status || OrderStatus.PENDING,
        address: order.address || '',
        isVATEnabled: !!order.isVATEnabled,
        isInvoiced: !!order.isInvoiced,
        invoiceCode: order.invoiceCode || '',
        shippingCost: order.shippingCost || 0,
        factoryShippingCost: order.factoryShippingCost || 0,
        items: order.items || [],
        depositPaymentDate: order.depositPaymentDate || '',
        finalPaymentInvoiceDate: order.finalPaymentInvoiceDate || '',
        createdAt: order.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    const existingCustomer = customers.find(c => c.id === order.customerId);
    
    if (!existingCustomer && order.customerName) {
      const newCustomerId = order.customerId || generateId('CUST');
      const newCustomer: Customer = {
        id: newCustomerId,
        name: order.customerName,
        phone: order.customerPhone || '',
        address: order.address || '',
        email: order.customerEmail || '',
        companyName: order.customerCompanyName || '',
        taxCode: order.customerTaxCode || '',
        status: 'active',
        createdBy: creatorId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      try {
        await firestoreMutations.saveItem('customers', newCustomer);
      } catch (e) {
        console.warn('Failed to auto-save customer', e);
      }
      orderWithCreator.customerId = newCustomerId;
    }

    if (!order.id || !orders.find(o => o.id === order.id)) {
        for (const item of (order.items || [])) {
            if (item.productId) {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    try {
                        await firestoreMutations.saveItem('products', {
                            ...product,
                            stock: Math.max(0, product.stock - item.quantity)
                        });
                    } catch (e) {
                        console.warn('Failed to update stock for product', e);
                    }
                }
            }
        }
    }

    try {
        await firestoreMutations.saveItem('orders', orderWithCreator);
        setIsFormOpen(false);
        setEditingOrder(undefined);
        showNotification('Đã lưu đơn hàng thành công!');
    } catch (e) {
        showNotification('Lỗi khi lưu đơn hàng, vui lòng thử lại', 'error');
    }
  };

  const deleteOrder = async (id: string) => {
    if (window.confirm('Xác nhận xóa đơn hàng này?')) {
      await firestoreMutations.deleteItem('orders', id);
      showNotification('Đã xóa đơn hàng', 'success');
    }
  };

  const deleteProduct = async (id: string) => {
    if (currentUser?.role !== UserRole.ADMIN) {
      showNotification('Chỉ Quản trị viên mới có quyền xóa sản phẩm!', 'error');
      return;
    }
    if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      await firestoreMutations.deleteItem('products', id);
      showNotification('Đã xóa sản phẩm', 'success');
    }
  };

  const deleteCategory = async (id: string) => {
    if (currentUser?.role !== UserRole.ADMIN) {
      showNotification('Chỉ Quản trị viên mới có quyền xóa danh mục!', 'error');
      return;
    }
    if (window.confirm('Bạn có chắc chắn muốn xóa danh mục này? Các sản phẩm thuộc danh mục sẽ bị mất liên kết.')) {
      await firestoreMutations.deleteItem('categories', id);
      showNotification('Đã xóa danh mục', 'success');
    }
  };

  const deleteShippingUnit = async (id: string) => {
    if (currentUser?.role !== UserRole.ADMIN) {
        showNotification('Chỉ Quản trị viên mới có quyền xóa đơn vị vận chuyển!', 'error');
        return;
    }
    await firestoreMutations.deleteItem('shippingUnits', id);
    showNotification('Đã xóa đơn vị vận chuyển', 'success');
  };

  const deleteSupplier = async (id: string) => {
    if (currentUser?.role !== UserRole.ADMIN) {
        showNotification('Chỉ Quản trị viên mới có quyền xóa nhà xưởng!', 'error');
        return;
    }
    await firestoreMutations.deleteItem('suppliers', id);
    showNotification('Đã xóa nhà xưởng', 'success');
  };

  const getStatusBadgeClass = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.COMPLETED: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case OrderStatus.PAID: return 'bg-green-100 text-green-700 border-green-200';
      case OrderStatus.SHIPPING: return 'bg-blue-100 text-blue-700 border-blue-200';
      case OrderStatus.PROCESSING: return 'bg-amber-100 text-amber-700 border-amber-200';
      case OrderStatus.CANCELLED: return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const currentPreviewOrder = useMemo(() => 
    orders.find(o => o.id === previewOrderId), 
  [orders, previewOrderId]);

  const previewCompanySettings = useMemo(() => {
    if (!currentPreviewOrder) return currentCompanySettings;
    const creatorId = currentPreviewOrder.createdBy;
    
    if (allSettings[creatorId]) {
      return allSettings[creatorId];
    }

    const creator = users.find(u => u.id === creatorId);
    if (creator) {
      return {
        name: creator.name || `Cửa hàng ${creator.name}`,
        contactPerson: creator.name,
        taxCode: "", 
        address: "Liên hệ cửa hàng", 
        email: creator.email,
        bankAccount: "",
        bankName: "",
        phone: creator.phone,
        logoUrl: currentCompanySettings.logoUrl 
      } as CompanySettings;
    }

    return currentCompanySettings; 
  }, [currentPreviewOrder, allSettings, currentCompanySettings, users]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard orders={userOrders} />;
      case 'reports': 
        return <DetailedReports 
          orders={orders} 
          suppliers={suppliers} 
          shippingUnits={shippingUnits}
          onViewOrder={(o) => setPreviewOrderId(o.id)}
          currentUser={currentUser!}
          users={users}
        />;
      case 'orders':
        return (
          <div className="bg-white rounded-2xl md:rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-4 md:p-8 border-b flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative flex-1 w-full max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" placeholder="Tìm tên khách hoặc số đơn hàng..." className="w-full pl-12 pr-6 py-3 md:py-3.5 bg-slate-50 border-0 rounded-2xl outline-none font-medium text-sm" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button onClick={() => { setEditingOrder(undefined); setIsFormOpen(true); }} className="w-full md:w-auto justify-center px-6 md:px-8 py-3 md:py-3.5 bg-blue-600 text-white rounded-2xl font-black shadow-lg hover:bg-blue-700 transition flex items-center gap-2 uppercase text-xs tracking-widest">
                  <Plus className="w-5 h-5" /> TẠO ĐƠN HÀNG
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <th className="px-4 md:px-6 py-4 md:py-5">Mã đơn</th>
                    <th className="px-4 md:px-6 py-4 md:py-5">Sản phẩm</th>
                    <th className="px-4 md:px-6 py-4 md:py-5">Khách hàng</th>
                    <th className="px-4 md:px-6 py-4 md:py-5">Thanh toán & Cọc</th>
                    <th className="px-4 md:px-6 py-4 md:py-5">Trạng thái</th>
                    <th className="px-4 md:px-6 py-4 md:py-5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedOrders.map(order => {
                    return (
                      <tr key={order.id} className="hover:bg-blue-50/40 transition">
                        <td className="px-4 md:px-6 py-4 md:py-6 font-black text-blue-600">{order.id}</td>
                        <td className="px-4 md:px-6 py-4 md:py-6 text-sm font-bold text-slate-800 uppercase min-w-[200px] md:min-w-[240px]">
                          <div className="space-y-2">
                            {(order.items || []).map((item, idx) => (
                              <div key={idx} className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col gap-1 w-full">
                                <span className="text-xs font-bold text-slate-800 uppercase whitespace-normal break-words">{item.name}</span>
                                <div className="flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-slate-500 font-medium">
                                  <span>SL: <b className="text-blue-600">{item.quantity}</b> {item.unit}</span>
                                  {item.dimensions && <span>KT: {item.dimensions}</span>}
                                  {item.color && <span>Màu: {item.color}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-6 min-w-[160px]">
                          <div className="space-y-1 max-w-[220px]">
                            <p className="text-sm font-bold text-slate-800 break-words" title={order.customerName}>
                              {order.customerName}
                            </p>
                            {order.customerPhone && (
                              <p className="text-xs font-semibold text-slate-600 whitespace-nowrap" title={order.customerPhone}>
                                📞 {order.customerPhone}
                              </p>
                            )}
                            {order.customerCompanyName && (
                              <p className="text-[10px] font-bold text-blue-600 break-words" title={order.customerCompanyName}>
                                🏢 {order.customerCompanyName}
                              </p>
                            )}
                            {order.address && (
                              <p className="text-[10px] font-medium text-slate-500 line-clamp-2" title={order.address}>
                                📍 {order.address}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-6">
                          <div className="space-y-1">
                            {order.depositPaymentDate ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Clock className="w-3 h-3 text-emerald-600 shrink-0" /> Cọc: {formatOrderDateTime(order.depositPaymentDate)}
                              </span>
                            ) : order.depositAmount && order.depositAmount > 0 ? (
                              <span className="inline-block text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Cọc: {order.depositAmount.toLocaleString()}đ
                              </span>
                            ) : (
                              <span className="inline-block text-[10px] text-slate-400 font-medium">Chưa cọc</span>
                            )}

                            <div>
                              {(order.paymentDate || order.finalPaymentInvoiceDate) ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                                  <CreditCard className="w-3 h-3 text-blue-600 shrink-0" /> TT: {formatOrderDateTime(order.paymentDate || order.finalPaymentInvoiceDate)}
                                </span>
                              ) : (
                                <span className="inline-block text-[10px] text-slate-400 font-medium">Chưa thanh toán</span>
                              )}
                            </div>

                            {(order.invoiceDate || (!order.paymentDate && order.finalPaymentInvoiceDate) || order.isInvoiced) && (
                              <div>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black ${order.isInvoiced ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'} border`}>
                                  <Receipt className={`w-3 h-3 ${order.isInvoiced ? 'text-emerald-600' : 'text-indigo-600'} shrink-0`} />
                                  HĐ: {order.isInvoiced ? (order.invoiceCode ? `#${order.invoiceCode}` : 'Đã xuất') : formatOrderDateTime(order.invoiceDate || order.finalPaymentInvoiceDate)}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-6">
                          <select 
                            value={order.status} 
                            onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border cursor-pointer outline-none appearance-none text-center shadow-sm transition-all hover:brightness-95 ${getStatusBadgeClass(order.status)}`}
                          >
                            {Object.values(OrderStatus).map(st => (
                              <option key={st} value={st} className="bg-white text-slate-900">{st}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-6">
                          <div className="flex justify-end gap-1.5 md:gap-2">
                            <button onClick={() => openPaymentModal(order)} title="Cập nhật thời gian cọc & xuất hóa đơn" className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition shadow-sm"><CreditCard className="w-5 h-5" /></button>
                            <button onClick={() => { setPreviewDocType('dispatch'); setPreviewOrderId(order.id); }} title="Phiếu xuất kho (Thông tin xưởng)" className="p-2.5 bg-teal-50 text-teal-700 hover:bg-teal-700 hover:text-white rounded-xl transition shadow-sm"><PackageCheck className="w-5 h-5" /></button>
                            <button onClick={() => { setPreviewDocType('quote'); setPreviewOrderId(order.id); }} title="Xem chứng từ (Báo giá, Đơn nhập, Phiếu xuất kho, Hóa đơn)" className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition shadow-sm"><Eye className="w-5 h-5" /></button>
                            <button onClick={() => { setEditingOrder(order); setIsFormOpen(true); }} title="Sửa đơn hàng" className="p-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition shadow-sm"><Edit3 className="w-5 h-5" /></button>
                            <button onClick={() => deleteOrder(order.id)} title="Xóa đơn hàng" className="p-2.5 bg-red-50 text-red-500 hover:bg-red-600 hover:text-white rounded-xl transition shadow-sm"><Trash2 className="w-5 h-5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <div className="max-w-md mx-auto space-y-3 px-4">
                          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
                            <Sparkles className="w-6 h-6" />
                          </div>
                          <p className="text-slate-700 font-bold text-sm">Chưa có đơn hàng nào</p>
                          <p className="text-slate-400 text-xs">Hãy tạo đơn hàng đầu tiên của bạn.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
              itemsPerPage={itemsPerPage} 
              totalItems={filteredOrders.length} 
              activeColor="blue" 
            />
          </div>
        );
      case 'products': 
        return <ProductManager 
          products={userProducts} 
          categories={userCategories}
          currentUser={currentUser!}
          users={users}
          onAddProduct={async (p) => { 
            await firestoreMutations.saveItem('products', {
              ...p,
              createdAt: p.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }); 
            showNotification('Đã thêm sản phẩm mới'); 
          }}
          onUpdateProduct={async (p) => { 
            await firestoreMutations.saveItem('products', {
              ...p,
              updatedAt: new Date().toISOString()
            }); 
            showNotification('Đã cập nhật sản phẩm'); 
          }}
          onDeleteProduct={deleteProduct}
          onAddCategory={async (c) => { 
            await firestoreMutations.saveItem('categories', {
              ...c,
              createdAt: c.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }); 
            showNotification('Đã thêm danh mục mới'); 
          }}
          onUpdateCategory={async (c) => { 
            await firestoreMutations.saveItem('categories', {
              ...c,
              updatedAt: new Date().toISOString()
            }); 
            showNotification('Đã cập nhật danh mục'); 
          }}
          onDeleteCategory={deleteCategory}
        />;
      case 'shipping': 
        return <ShippingManager 
          units={userShippingUnits} 
          orders={userOrders} 
          onAddUnit={async (u) => { 
            await firestoreMutations.saveItem('shippingUnits', { 
              ...u, 
              name: u.name || '',
              phone: u.phone || '',
              createdBy: currentUser!.id,
              createdAt: u.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }); 
            showNotification('Đã thêm đơn vị vận chuyển'); 
          }} 
          onUpdateUnit={async (u) => { 
            await firestoreMutations.saveItem('shippingUnits', {
              ...u,
              name: u.name || '',
              phone: u.phone || '',
              createdBy: u.createdBy || currentUser!.id,
              updatedAt: new Date().toISOString()
            }); 
            showNotification('Đã cập nhật đơn vị vận chuyển'); 
          }} 
          onDeleteUnit={deleteShippingUnit} 
          onViewOrder={(o) => setPreviewOrderId(o.id)} 
          onDeleteOrder={deleteOrder} 
          currentUser={currentUser!}
          onUpdatePaymentStatus={handleUpdatePaymentStatus}
        />;
      case 'suppliers': 
        return <SupplierManager 
          suppliers={userSuppliers} 
          orders={userOrders} 
          onAddSupplier={async (s) => { 
            await firestoreMutations.saveItem('suppliers', { 
              ...s, 
              name: s.name || '',
              phone: s.phone || '',
              address: s.address || '',
              createdBy: currentUser!.id,
              createdAt: s.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }); 
            showNotification('Đã thêm nhà xưởng'); 
          }} 
          onUpdateSupplier={async (s) => { 
            await firestoreMutations.saveItem('suppliers', {
              ...s,
              name: s.name || '',
              phone: s.phone || '',
              address: s.address || '',
              createdBy: s.createdBy || currentUser!.id,
              updatedAt: new Date().toISOString()
            }); 
            showNotification('Đã cập nhật nhà xưởng'); 
          }} 
          onDeleteSupplier={deleteSupplier} 
          onEditOrder={(o) => {setEditingOrder(o); setIsFormOpen(true);}} 
          onViewOrder={(o) => setPreviewOrderId(o.id)} 
          onDeleteOrder={deleteOrder} 
          currentUser={currentUser!}
          onUpdatePaymentStatus={handleUpdatePaymentStatus}
        />;
      case 'customers': 
        return <CustomerManager 
          customers={userCustomers} 
          orders={userOrders} 
          users={users} 
          onAddCustomer={async (c) => { 
            await firestoreMutations.saveItem('customers', { 
              ...c, 
              name: c.name || '',
              phone: c.phone || '',
              address: c.address || '',
              createdBy: currentUser!.id,
              createdAt: c.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }); 
            showNotification('Đã thêm khách hàng mới'); 
          }} 
          onUpdateCustomer={async (updatedCust: Customer) => {
            await firestoreMutations.saveItem('customers', {
              ...updatedCust,
              name: updatedCust.name || '',
              phone: updatedCust.phone || '',
              address: updatedCust.address || '',
              createdBy: updatedCust.createdBy || currentUser!.id,
              updatedAt: new Date().toISOString()
            });
            showNotification('Đã cập nhật thông tin khách hàng');
          }}
          onDeleteCustomer={() => showNotification("Không thể xóa khách hàng.", 'error')} 
          onViewOrder={(o) => setPreviewOrderId(o.id)} 
          onEditOrder={(o) => {setEditingOrder(o); setIsFormOpen(true);}} 
          onDeleteOrder={deleteOrder} 
          onUpdateOrderStatus={updateOrderStatus} 
        />;
      case 'users': return <UserManager 
        currentUser={currentUser!} 
        users={users} 
        onAddUser={async (u) => { 
          await firestoreMutations.saveItem('users', {
            ...u,
            createdAt: u.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }); 
          showNotification('Đã thêm người dùng mới'); 
        }} 
        onUpdateUser={async (u) => { 
          await firestoreMutations.saveItem('users', {
            ...u,
            updatedAt: new Date().toISOString()
          }); 
          showNotification('Đã cập nhật thông tin người dùng'); 
        }} 
        onDeleteUser={async (id) => { 
          await firestoreMutations.deleteItem('users', id); 
          showNotification('Đã xóa người dùng'); 
        }} 
      />;
      case 'settings': return <Settings settings={currentCompanySettings} onSave={handleSaveSettings} />;
      default: return <Dashboard orders={userOrders} />;
    }
  };

  if (!authInitialized || (loading && authUser && !currentUser)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-semibold text-sm">Đang kết nối hệ thống Nội Thất Hùng Iota...</p>
      </div>
    );
  }

  if (!currentUser || !auth.currentUser) {
    return <Login mockUsers={users} onLogin={handleLogin} onRegister={handleRegister} />;
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); }} onLogout={handleLogout} user={currentUser}>
      {renderContent()}
      {notification && <Toast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      {isFormOpen && <OrderForm order={editingOrder} customers={userCustomers} suppliers={userSuppliers} shippingUnits={userShippingUnits} products={userProducts} users={users} onSave={handleSaveOrder} onClose={() => setIsFormOpen(false)} />}
      {currentPreviewOrder && (
        <DocumentPreview 
          order={currentPreviewOrder} 
          company={previewCompanySettings} 
          supplier={suppliers.find(s => s.id === currentPreviewOrder.supplierId)} 
          initialDoc={previewDocType}
          onClose={() => setPreviewOrderId(null)} 
        />
      )}
      {paymentModalOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[120] animate-in fade-in-50">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-6 md:p-8 border border-slate-100">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Cập nhật tài chính đơn hàng</p>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 mt-0.5">
                  <CreditCard className="w-5 h-5 text-blue-600" /> {paymentModalOrder.id}
                </h3>
              </div>
              <button onClick={() => setPaymentModalOrder(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-xs font-bold text-slate-600">Khách hàng: <span className="font-black text-slate-900 uppercase">{paymentModalOrder.customerName}</span></p>
                <p className="text-xs font-bold text-slate-600">Tổng tiền đơn: <span className="font-black text-blue-600">{((paymentModalOrder.items || []).reduce((s, i) => s + (i.salePrice * i.quantity), 0) + (paymentModalOrder.shippingCost || 0) + (paymentModalOrder.isVATEnabled ? ((paymentModalOrder.items || []).reduce((s, i) => s + (i.salePrice * i.quantity), 0) + (paymentModalOrder.shippingCost || 0)) * ((paymentModalOrder.vatRate || 0) / 100) : 0)).toLocaleString()} đ</span></p>
              </div>

              {/* Tiền cọc & Thời gian cọc */}
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" /> Thời gian khách chuyển cọc
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const offset = now.getTimezoneOffset();
                        const local = new Date(now.getTime() - offset * 60 * 1000);
                        setQuickDepositDate(local.toISOString().slice(0, 16));
                      }}
                      className="text-[9px] font-black text-emerald-700 hover:text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200 transition shadow-xs"
                    >
                      Bây giờ
                    </button>
                    {quickDepositDate && (
                      <button
                        type="button"
                        onClick={() => setQuickDepositDate('')}
                        className="text-[9px] font-black text-slate-400 hover:text-red-500 px-1 py-0.5"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2.5 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-xs text-slate-800"
                  value={quickDepositDate}
                  onChange={e => setQuickDepositDate(e.target.value)}
                />

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">
                    Số tiền đặt cọc (đ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Nhập số tiền đã cọc..."
                    className="w-full px-3 py-2.5 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-sm text-emerald-700"
                    value={quickDepositAmount || ''}
                    onChange={e => setQuickDepositAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                </div>
              </div>

              {/* Thời gian chuyển tiền thanh toán */}
              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600" /> TG khách chuyển thanh toán
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const offset = now.getTimezoneOffset();
                        const local = new Date(now.getTime() - offset * 60 * 1000);
                        setQuickPaymentDate(local.toISOString().slice(0, 16));
                      }}
                      className="text-[9px] font-black text-blue-700 hover:text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200 transition shadow-xs"
                    >
                      Bây giờ
                    </button>
                    {quickPaymentDate && (
                      <button
                        type="button"
                        onClick={() => setQuickPaymentDate('')}
                        className="text-[9px] font-black text-slate-400 hover:text-red-500 px-1 py-0.5"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2.5 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-xs text-slate-800"
                  value={quickPaymentDate}
                  onChange={e => setQuickPaymentDate(e.target.value)}
                />
              </div>

              {/* Thời gian xuất hoá đơn */}
              <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-indigo-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-indigo-600" /> TG xuất hoá đơn
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const offset = now.getTimezoneOffset();
                        const local = new Date(now.getTime() - offset * 60 * 1000);
                        setQuickInvoiceDate(local.toISOString().slice(0, 16));
                      }}
                      className="text-[9px] font-black text-indigo-700 hover:text-indigo-800 bg-white px-2 py-0.5 rounded border border-indigo-200 transition shadow-xs"
                    >
                      Bây giờ
                    </button>
                    {quickInvoiceDate && (
                      <button
                        type="button"
                        onClick={() => setQuickInvoiceDate('')}
                        className="text-[9px] font-black text-slate-400 hover:text-red-500 px-1 py-0.5"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2.5 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs text-slate-800"
                  value={quickInvoiceDate}
                  onChange={e => setQuickInvoiceDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPaymentModalOrder(null)}
                className="px-6 py-3 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleSavePaymentMilestones}
                className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg hover:bg-blue-700 transition uppercase text-xs tracking-widest flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> LƯU CẬP NHẬT
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
