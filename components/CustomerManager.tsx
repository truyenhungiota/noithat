
import React, { useState, useMemo, useEffect } from 'react';
import { Customer, Order, OrderStatus, UserAccount } from '../types';
import { User, Phone, MapPin, Search, ShoppingBag, Eye, Edit2, X, Trash2, ChevronLeft, ChevronRight, Mail, Hash, Building2, ArrowRight, UserCheck, Camera, Clock, Package, Wallet, List, AlertCircle, Filter } from 'lucide-react';
import { Pagination } from './Pagination';

interface CustomerManagerProps {
  customers: Customer[];
  orders: Order[];
  users: UserAccount[];
  onAddCustomer: (c: Customer) => void;
  onUpdateCustomer: (c: Customer) => void;
  onDeleteCustomer: (id: string) => void; // Prop kept for interface compatibility but functionality disabled/hidden
  onViewOrder: (order: Order) => void;
  onEditOrder: (order: Order) => void;
  onDeleteOrder: (id: string) => void;
  onUpdateOrderStatus?: (id: string, status: OrderStatus) => void;
  onOpenHandoverMedia?: (id: string) => void;
}

const CustomerManager: React.FC<CustomerManagerProps> = ({ 
  customers, orders, users, onAddCustomer, onUpdateCustomer, onDeleteCustomer, 
  onViewOrder, onEditOrder, onDeleteOrder, onUpdateOrderStatus, onOpenHandoverMedia 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [orderCurrentPage, setOrderCurrentPage] = useState(1);
  const ordersPerPage = 8;

  const getUserName = (id: string) => {
    const user = users.find(u => u.id === id);
    return user ? user.name : 'Unknown';
  };

  const getDisplayName = (name: string, createdBy: string, allItems: {name: string, createdBy: string}[]) => {
    const duplicates = allItems.filter(item => item.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (duplicates.length > 1) {
      return `${name} (${getUserName(createdBy)})`;
    }
    return name;
  };

  // Sắp xếp khách hàng: Khách có đơn hàng mới nhất lên đầu
  const sortedCustomers = useMemo(() => {
    const customersWithLatestDate = customers.map(cust => {
      const custOrders = orders.filter(o => o.customerId === cust.id);
      const latestOrder = custOrders.length > 0 
        ? custOrders.reduce((latest, current) => {
            return new Date(current.orderDate) > new Date(latest.orderDate) ? current : latest;
          })
        : null;
      
      return {
        ...cust,
        latestOrderDate: latestOrder ? new Date(latestOrder.orderDate).getTime() : 0
      };
    });
    return customersWithLatestDate.sort((a, b) => b.latestOrderDate - a.latestOrderDate);
  }, [customers, orders]);

  // Lọc sidebar theo trạng thái hoạt động
  const filteredCustomers = useMemo(() => 
    sortedCustomers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || (c.status || 'active') === statusFilter;
      return matchesSearch && matchesStatus;
    }),
  [sortedCustomers, searchTerm, statusFilter]);

  // Tự động chọn khách hàng đầu tiên
  useEffect(() => {
    if (!orderSearchTerm.trim() && filteredCustomers.length > 0) {
      if (!selectedCustomerId || !filteredCustomers.find(c => c.id === selectedCustomerId)) {
        setSelectedCustomerId(filteredCustomers[0].id);
      }
    } else if (filteredCustomers.length === 0) {
      setSelectedCustomerId(null);
    }
  }, [filteredCustomers, orderSearchTerm]);

  // Reset trang đơn hàng khi đổi khách hoặc tìm kiếm
  useEffect(() => {
    setOrderCurrentPage(1);
  }, [selectedCustomerId, orderSearchTerm]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, currentPage]);

  const activeCustomer = sortedCustomers.find(c => c.id === selectedCustomerId);

  // Tra cứu mã đơn hàng (Chỉ tìm theo mã đơn)
  const globalOrderSearchResults = useMemo(() => {
    const s = orderSearchTerm.trim().toLowerCase();
    if (!s) return [];
    return orders
      .filter(o => o.id.toLowerCase().includes(s) || (o.id.startsWith('HI') && o.id.substring(2).includes(s)))
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [orders, orderSearchTerm]);

  const allSelectedCustomerOrders = useMemo(() => {
    if (!selectedCustomerId) return [];
    return orders.filter(o => o.customerId === selectedCustomerId);
  }, [orders, selectedCustomerId]);

  const displayOrdersBase = useMemo(() => {
    if (orderSearchTerm.trim()) return globalOrderSearchResults;
    if (!selectedCustomerId) return [];
    return orders
      .filter(o => o.customerId === selectedCustomerId)
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [orders, selectedCustomerId, globalOrderSearchResults, orderSearchTerm]);

  const orderTotalPages = Math.ceil(displayOrdersBase.length / ordersPerPage);
  const paginatedOrders = useMemo(() => {
    const start = (orderCurrentPage - 1) * ordersPerPage;
    return displayOrdersBase.slice(start, start + ordersPerPage);
  }, [displayOrdersBase, orderCurrentPage]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer?.id) {
      onUpdateCustomer(editingCustomer as Customer);
    } else {
      const newCust = { 
        ...editingCustomer, 
        id: `CUST${Date.now()}${Math.floor(Math.random() * 1000)}`, 
        status: 'active' 
      } as Customer;
      onAddCustomer(newCust);
    }
    setIsModalOpen(false);
    setEditingCustomer(null);
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

  const jumpToCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setOrderSearchTerm('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-50"><User className="w-6 h-6" /></div>
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Đối tác Khách hàng</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Quản lý hồ sơ và lịch sử mua sắm</p>
          </div>
        </div>
        <div className="flex-1 max-w-xl relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm theo số đơn hàng (Ví dụ: 2024)..." 
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" 
            value={orderSearchTerm} 
            onChange={e => setOrderSearchTerm(e.target.value)} 
          />
        </div>
        <button onClick={() => { setEditingCustomer({}); setIsModalOpen(true); }} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl hover:bg-slate-800 transition flex items-center gap-2"><UserCheck className="w-5 h-5" /> THÊM KHÁCH HÀNG</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-2 rounded-2xl border flex flex-col gap-2 shadow-sm">
            <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl">
              <Search className="w-5 h-5 text-slate-400" />
              <input type="text" placeholder="Lọc tên/SĐT khách..." className="w-full bg-transparent outline-none text-sm font-black uppercase tracking-tight" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => { setStatusFilter('active'); setCurrentPage(1); }} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${statusFilter === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Đang hoạt động</button>
              <button onClick={() => { setStatusFilter('inactive'); setCurrentPage(1); }} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${statusFilter === 'inactive' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400'}`}>Cần chú ý</button>
            </div>
          </div>

          <div className="space-y-3 bg-white p-2 rounded-[2.5rem] border shadow-sm min-h-[400px]">
            {paginatedCustomers.map(customer => {
              const isSelected = selectedCustomerId === customer.id && !orderSearchTerm.trim();
              const count = orders.filter(o => o.customerId === customer.id).length;
              const displayName = getDisplayName(customer.name, customer.createdBy, customers);

              return (
                <div 
                  key={customer.id} 
                  onClick={() => { setSelectedCustomerId(customer.id); setOrderSearchTerm(''); }} 
                  className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 relative group overflow-hidden ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-xl' : 'bg-white text-slate-600 border-slate-50 hover:border-blue-100'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-base uppercase tracking-tight truncate" title={displayName}>{displayName}</h4>
                        {customer.status === 'inactive' && <span className="px-2 py-0.5 bg-amber-100 text-amber-600 rounded text-[8px] font-black uppercase">Cần chú ý</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
                        <div className="flex items-center gap-1.5">
                          <Package className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`} />
                          <span className={`text-[10px] font-black uppercase ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>{count} đơn</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`} />
                          <span className={`text-[10px] font-bold ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>{customer.phone}</span>
                        </div>
                      </div>
                    </div>
                    {/* Add Edit button to list item, REMOVED DELETE BUTTON */}
                    <div className="flex gap-1 ml-4 group-hover:opacity-100 opacity-60 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setEditingCustomer(customer); setIsModalOpen(true); }} className={`p-2 rounded-xl transition shadow-sm ${isSelected ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-slate-50 text-slate-400 hover:text-blue-600'}`}><Edit2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
              itemsPerPage={itemsPerPage} 
              totalItems={filteredCustomers.length} 
              activeColor="blue" 
            />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          {/* Order Details View (unchanged from previous version except context) */}
          {orderSearchTerm.trim() ? (
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-100 shadow-xl space-y-6 animate-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center border-b pb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter"><Search className="w-6 h-6 text-blue-600" /> Tra cứu mã đơn: "{orderSearchTerm}"</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Tìm thấy {displayOrdersBase.length} kết quả</p>
                </div>
              </div>
              <div className="space-y-3">
                {paginatedOrders.map(order => {
                  const saleTotal = order.items.reduce((sum, i) => sum + (i.salePrice * i.quantity), 0) + (order.shippingCost || 0);
                  return (
                    <div key={order.id} className="p-5 bg-slate-50 rounded-2xl flex justify-between items-center hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-blue-100 group">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-blue-600 text-lg">{order.id}</span>
                          <button onClick={() => jumpToCustomer(order.customerId)} className="font-black text-slate-800 text-sm uppercase hover:text-blue-600 transition decoration-blue-200 underline underline-offset-4">{order.customerName}</button>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${getStatusBadgeClass(order.status)}`}>{order.status}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Sản phẩm: {order.items.map(i => i.name).join(', ')}</p>
                      </div>
                      <div className="text-right flex items-center gap-6">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Thanh toán</p>
                          <p className="font-black text-slate-900 tabular-nums">{saleTotal.toLocaleString()}đ</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => onViewOrder(order)} className="p-2.5 bg-white rounded-xl shadow-sm text-blue-600 hover:bg-blue-600 hover:text-white transition"><Eye className="w-5 h-5" /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <Pagination 
                  currentPage={orderCurrentPage} 
                  totalPages={orderTotalPages} 
                  onPageChange={setOrderCurrentPage} 
                  itemsPerPage={ordersPerPage} 
                  totalItems={displayOrdersBase.length} 
                  activeColor="blue" 
                />
              </div>
            </div>
          ) : activeCustomer ? (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-10 animate-in slide-in-from-right-4">
              <div className="flex flex-col md:flex-row justify-between items-start border-b pb-8 gap-8">
                <div className="space-y-6 flex-1">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-blue-600 rounded-[1.8rem] flex items-center justify-center text-white shadow-2xl shadow-blue-100"><User className="w-10 h-10" /></div>
                    <div>
                      <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter leading-tight">{getDisplayName(activeCustomer.name, activeCustomer.createdBy, customers)}</h2>
                      <div className="flex items-center gap-4 mt-2">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-blue-500" /> {activeCustomer.companyName || 'Khách hàng cá nhân'}
                        </p>
                        <select 
                          value={activeCustomer.status || 'active'}
                          onChange={(e) => onUpdateCustomer({...activeCustomer, status: e.target.value as 'active' | 'inactive'})}
                          className={`px-3 py-0.5 rounded-lg text-[8px] font-black uppercase border cursor-pointer ${activeCustomer.status === 'inactive' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}
                        >
                          <option value="active">Đang hoạt động</option>
                          <option value="inactive">Cần chú ý</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner relative group">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Địa chỉ giao hàng</p>
                      <p className="font-bold text-xs text-slate-700 flex items-start gap-2 leading-relaxed"><MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" /> {activeCustomer.address}</p>
                      <button onClick={() => { setEditingCustomer(activeCustomer); setIsModalOpen(true); }} className="absolute top-2 right-2 p-2 bg-white rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition text-blue-600"><Edit2 className="w-4 h-4" /></button>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner relative group">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Thông tin liên hệ</p>
                      <div className="space-y-1.5">
                        <p className="font-black text-sm text-slate-800 flex items-center gap-2 truncate"><Phone className="w-4 h-4 text-blue-600" /> {activeCustomer.phone}</p>
                        {activeCustomer.email && <p className="font-bold text-[10px] text-slate-500 flex items-center gap-2 truncate"><Mail className="w-3.5 h-3.5 text-blue-400" /> {activeCustomer.email}</p>}
                      </div>
                      <button onClick={() => { setEditingCustomer(activeCustomer); setIsModalOpen(true); }} className="absolute top-2 right-2 p-2 bg-white rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition text-blue-600"><Edit2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  {activeCustomer.extraInfo && (
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 shadow-inner">
                      <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2">Thông tin mở rộng</p>
                      <p className="text-xs font-bold text-slate-600 italic leading-relaxed">{activeCustomer.extraInfo}</p>
                    </div>
                  )}
                </div>
                <div className="w-full md:w-auto text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng giá trị đơn hàng</p>
                    <p className="text-3xl font-black text-blue-600 tabular-nums">{allSelectedCustomerOrders.reduce((s, o) => s + o.items.reduce((sum,i)=>sum+(i.salePrice*i.quantity),0) + (o.shippingCost || 0), 0).toLocaleString()}đ</p>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter"><List className="w-7 h-7 text-blue-600" /> Lịch sử đơn hàng ({displayOrdersBase.length})</h3>
                <div className="space-y-3 min-h-[300px]">
                  {paginatedOrders.length > 0 ? paginatedOrders.map(order => {
                    const hasMedia = order.handoverMedia && order.handoverMedia.length > 0;
                    const saleTotal = order.items.reduce((sum, i) => sum + (i.salePrice * i.quantity), 0) + (order.shippingCost || 0);
                    return (
                      <div key={order.id} className="p-5 bg-slate-50 rounded-2xl flex justify-between items-center hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-blue-100 group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="font-black text-blue-600 text-lg">{order.id}</span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${getStatusBadgeClass(order.status)}`}>{order.status}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(order.orderDate).toLocaleDateString('vi-VN')}</span>
                          </div>
                          <p className="text-sm font-black text-slate-800 uppercase mt-2 truncate max-w-lg">{order.items.map(i => i.name).join(', ')}</p>
                        </div>
                        <div className="text-right flex items-center gap-8 ml-4 shrink-0">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Thanh toán</p>
                            <p className="font-black text-slate-900 tabular-nums">{saleTotal.toLocaleString()}đ</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => onOpenHandoverMedia?.(order.id)} className={`p-2.5 rounded-xl transition shadow-sm ${hasMedia ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white' : 'bg-white text-slate-400 border border-slate-100'}`}><Camera className="w-4.5 h-4.5" /></button>
                            <button onClick={() => onViewOrder(order)} className="p-2.5 bg-white rounded-xl shadow-sm text-blue-600 hover:bg-blue-600 hover:text-white transition border border-slate-100"><Eye className="w-4.5 h-4.5" /></button>
                            <button onClick={() => onEditOrder(order)} className="p-2.5 bg-white rounded-xl shadow-sm text-indigo-600 hover:bg-indigo-600 hover:text-white transition border border-slate-100"><Edit2 className="w-4.5 h-4.5" /></button>
                            <button onClick={() => onDeleteOrder(order.id)} className="p-2.5 bg-white rounded-xl shadow-sm text-red-500 hover:bg-red-600 hover:text-white transition border border-slate-100"><Trash2 className="w-4.5 h-4.5" /></button>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100">
                      <ShoppingBag className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Chưa có đơn hàng nào</p>
                    </div>
                  )}

                  <Pagination 
                    currentPage={orderCurrentPage} 
                    totalPages={orderTotalPages} 
                    onPageChange={setOrderCurrentPage} 
                    itemsPerPage={ordersPerPage} 
                    totalItems={displayOrdersBase.length} 
                    activeColor="blue" 
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[500px] flex items-center justify-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 p-20 text-center text-slate-400 font-black uppercase tracking-widest text-xs">Hãy chọn một khách hàng hoặc nhập mã đơn để xem chi tiết</div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[110] animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-6 md:p-10 relative animate-in zoom-in-95">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition"><X className="w-6 h-6" /></button>
            <h2 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-widest">{editingCustomer?.id ? 'Cập nhật khách hàng' : 'Thêm khách hàng mới'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên khách hàng</label>
                <input maxLength={500} required placeholder="Nhập tên khách hàng..." className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-blue-500" value={editingCustomer?.name || ''} onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số điện thoại</label>
                  <input maxLength={15} required placeholder="090... (Max 15 số)" className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-blue-500" value={editingCustomer?.phone || ''} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                  <input maxLength={500} placeholder="khach@gmail.com" className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-blue-500" value={editingCustomer?.email || ''} onChange={e => setEditingCustomer({...editingCustomer, email: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-1">Tên công ty (Pháp nhân)</label>
                <input maxLength={500} placeholder="Công ty CP Nội thất..." className="w-full px-6 py-4 bg-indigo-50/30 border border-indigo-100/50 focus:border-indigo-500 border-dashed rounded-2xl font-black outline-none focus:ring-2 focus:ring-indigo-500" value={editingCustomer?.companyName || ''} onChange={e => setEditingCustomer({...editingCustomer, companyName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-1">Mã số thuế</label>
                <input maxLength={15} placeholder="010... (Max 15 số)" className="w-full px-6 py-4 bg-indigo-50/30 border border-indigo-100/50 focus:border-indigo-500 border-dashed rounded-2xl font-black outline-none focus:ring-2 focus:ring-indigo-500" value={editingCustomer?.taxCode || ''} onChange={e => setEditingCustomer({...editingCustomer, taxCode: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Địa chỉ chi tiết</label>
                <textarea maxLength={500} placeholder="Số nhà, đường, quận..." rows={3} className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-inner" value={editingCustomer?.address || ''} onChange={e => setEditingCustomer({...editingCustomer, address: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Thông tin mở rộng</label>
                <textarea maxLength={500} placeholder="Ghi chú thêm, thông tin chuyển khoản, người nhận thay..." rows={3} className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-inner" value={editingCustomer?.extraInfo || ''} onChange={e => setEditingCustomer({...editingCustomer, extraInfo: e.target.value})} />
              </div>
              <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 mt-4">
                <UserCheck className="w-6 h-6" /> LƯU THÔNG TIN KHÁCH HÀNG
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManager;
