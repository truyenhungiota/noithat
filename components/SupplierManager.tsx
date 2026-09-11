
import React, { useState, useMemo, useEffect } from 'react';
import { Supplier, Order, UserAccount, UserRole } from '../types';
import { Factory, Phone, Search, Plus, List, Edit2, X, Trash2, MapPin, Package, Eye, ChevronLeft, ChevronRight, AlertCircle, Wallet, CalendarDays, Hash, Building2, User, CheckCircle2, CircleDollarSign } from 'lucide-react';
import { Pagination } from './Pagination';

interface SupplierManagerProps {
  suppliers: Supplier[];
  orders: Order[];
  onAddSupplier: (s: Supplier) => void;
  onUpdateSupplier: (s: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
  onEditOrder: (order: Order) => void;
  onViewOrder: (order: Order) => void;
  onDeleteOrder: (id: string) => void;
  currentUser: UserAccount;
  onUpdatePaymentStatus: (orderId: string, type: 'supplier' | 'shipping', isPaid: boolean) => void;
}

const SupplierManager: React.FC<SupplierManagerProps> = ({ suppliers, orders, onAddSupplier, onUpdateSupplier, onDeleteSupplier, onEditOrder, onViewOrder, onDeleteOrder, currentUser, onUpdatePaymentStatus }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [orderCurrentPage, setOrderCurrentPage] = useState(1);
  const ordersPerPage = 10;

  const isAdmin = currentUser.role === UserRole.ADMIN;

  useEffect(() => {
    setOrderCurrentPage(1);
  }, [selectedSupplierId, orderSearchTerm]);

  const sortedSuppliers = useMemo(() => {
    const suppliersWithLatestDate = suppliers.map(sup => {
      const supOrders = orders.filter(o => o.supplierId === sup.id || o.supplierName === (sup.companyName || sup.name));
      const latestOrder = supOrders.length > 0 
        ? supOrders.reduce((latest, current) => {
            return new Date(current.orderDate) > new Date(latest.orderDate) ? current : latest;
          })
        : null;
      
      return {
        ...sup,
        latestOrderDate: latestOrder ? new Date(latestOrder.orderDate).getTime() : 0,
        latestOrderDateStr: latestOrder ? latestOrder.orderDate : null
      };
    });

    return suppliersWithLatestDate.sort((a, b) => b.latestOrderDate - a.latestOrderDate);
  }, [suppliers, orders]);

  useEffect(() => {
    if (!selectedSupplierId && sortedSuppliers.length > 0) {
      setSelectedSupplierId(sortedSuppliers[0].id);
    }
  }, [sortedSuppliers, selectedSupplierId]);

  const globalOrderSearchResults = useMemo(() => {
    const s = orderSearchTerm.trim().toLowerCase();
    if (!s) return [];
    return orders.filter(o => 
      o.id.toLowerCase().includes(s) || 
      (o.id.startsWith('HI') && o.id.substring(2).includes(s))
    );
  }, [orders, orderSearchTerm]);

  const filteredSuppliers = useMemo(() => 
    sortedSuppliers.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.companyName && s.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    ),
  [sortedSuppliers, searchTerm]);

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSuppliers.slice(start, start + itemsPerPage);
  }, [filteredSuppliers, currentPage]);

  const activeSupplier = sortedSuppliers.find(s => s.id === selectedSupplierId);
  const allSupplierOrders = useMemo(() => {
    if (!activeSupplier) return [];
    return orders
      .filter(o => o.supplierId === selectedSupplierId || o.supplierName === (activeSupplier.companyName || activeSupplier.name))
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [orders, selectedSupplierId, activeSupplier]);

  const orderTotalPages = Math.ceil(allSupplierOrders.length / ordersPerPage);
  const paginatedOrders = useMemo(() => {
    const start = (orderCurrentPage - 1) * ordersPerPage;
    return allSupplierOrders.slice(start, start + ordersPerPage);
  }, [allSupplierOrders, orderCurrentPage]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier?.name || !editingSupplier?.phone) {
        alert("Vui lòng nhập tên người đại diện và số điện thoại.");
        return;
    }
    if (editingSupplier?.id) {
      onUpdateSupplier(editingSupplier as Supplier);
    } else {
      const newSup = { 
        ...editingSupplier, 
        id: `SUP${Date.now()}${Math.floor(Math.random() * 1000)}` // Stronger Unique ID
      } as Supplier;
      onAddSupplier(newSup);
    }
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-50"><Factory className="w-6 h-6" /></div>
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Đối tác Nhà xưởng</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Quản lý nhập hàng và công nợ sản xuất</p>
          </div>
        </div>
        <div className="flex-1 max-w-xl relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm theo số đơn hàng (Ví dụ: 2024)..." 
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 font-bold" 
            value={orderSearchTerm} 
            onChange={e => setOrderSearchTerm(e.target.value)} 
          />
        </div>
        <button onClick={() => { setEditingSupplier({}); setIsModalOpen(true); }} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl hover:bg-slate-800 transition flex items-center gap-2"><Plus className="w-5 h-5" /> THÊM NHÀ XƯỞNG</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-4 rounded-2xl border flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-400" />
            <input type="text" placeholder="Lọc tên xưởng / công ty..." className="w-full outline-none text-sm font-black uppercase tracking-tight" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
          </div>
          <div className="space-y-3 bg-white p-2 rounded-[2rem] border shadow-sm">
            {paginatedSuppliers.map(supplier => {
              const count = orders.filter(o => o.supplierId === supplier.id).length;
              const isSelected = selectedSupplierId === supplier.id && !orderSearchTerm.trim();

              return (
                <div 
                  key={supplier.id} 
                  onClick={() => setSelectedSupplierId(supplier.id)} 
                  className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 relative overflow-hidden group ${isSelected ? 'bg-amber-600 text-white border-amber-600 shadow-xl' : 'bg-white text-slate-600 border-slate-50 hover:border-amber-100'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-base uppercase tracking-tight leading-tight truncate">{supplier.companyName || supplier.name}</h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
                        <div className="flex items-center gap-1.5">
                          <Package className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-200' : 'text-slate-400'}`} />
                          <span className={`text-[10px] font-black uppercase ${isSelected ? 'text-amber-100' : 'text-slate-500'}`}>{count} đơn hàng</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-200' : 'text-slate-400'}`} />
                          <span className={`text-[10px] font-bold ${isSelected ? 'text-amber-100' : 'text-slate-500'}`}>{supplier.phone}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-4 group-hover:opacity-100 opacity-60 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setEditingSupplier(supplier); setIsModalOpen(true); }} className={`p-2 rounded-xl transition shadow-sm ${isSelected ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-slate-50 text-slate-400 hover:text-amber-600'}`}><Edit2 className="w-4 h-4" /></button>
                      {isAdmin && (
                        <button onClick={(e) => { e.stopPropagation(); onDeleteSupplier(supplier.id); }} className={`p-2 rounded-xl transition shadow-sm ${isSelected ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-slate-50 text-red-400 hover:text-red-600'}`}><Trash2 className="w-4 h-4" /></button>
                      )}
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
              totalItems={filteredSuppliers.length} 
              activeColor="blue" 
            />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          {orderSearchTerm.trim() ? (
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-amber-100 shadow-xl space-y-6 animate-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center border-b pb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter"><Search className="w-6 h-6 text-amber-600" /> Kết quả tìm kiếm đơn hàng: "{orderSearchTerm}"</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Quét trên tất cả các nhà xưởng đối tác</p>
                </div>
              </div>
              <div className="space-y-4">
                {globalOrderSearchResults.map(order => (
                   <div key={order.id} className="p-6 bg-amber-50 rounded-3xl border-2 border-amber-100 flex justify-between items-center group hover:bg-white transition-all">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-amber-600 text-lg">{order.id}</span>
                          <span className="px-3 py-1 bg-amber-600 text-white text-[9px] font-black uppercase rounded-lg">{order.supplierName}</span>
                        </div>
                        <p className="font-black text-slate-800 text-sm uppercase mt-1">{order.customerName}</p>
                      </div>
                      <div className="flex items-center gap-4">
                         <div className="text-right mr-4">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Giá nhập</p>
                            <p className="font-black text-slate-900">{order.items.reduce((s,i)=>s+(i.purchasePrice*i.quantity),0).toLocaleString()}đ</p>
                         </div>
                         <button onClick={() => onViewOrder(order)} className="p-3 bg-white rounded-2xl shadow-sm text-blue-600 hover:bg-blue-600 hover:text-white transition"><Eye className="w-5 h-5" /></button>
                         <button onClick={() => onDeleteOrder(order.id)} className="p-2.5 bg-white rounded-xl shadow-sm text-red-500 hover:bg-red-600 hover:text-white transition"><Trash2 className="w-4.5 h-4.5" /></button>
                      </div>
                   </div>
                ))}
              </div>
            </div>
          ) : activeSupplier ? (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 animate-in slide-in-from-right-4">
              <div className="flex flex-col md:flex-row justify-between items-start border-b pb-8 gap-8">
                <div className="space-y-6 flex-1">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-amber-600 rounded-[1.8rem] flex items-center justify-center text-white shadow-2xl shadow-amber-100"><Building2 className="w-10 h-10" /></div>
                    <div>
                      <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-tight">{activeSupplier.companyName || activeSupplier.name}</h2>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-2">
                        <User className="w-4 h-4 text-amber-500" /> Đại diện: {activeSupplier.name}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Thông tin pháp nhân</p>
                      <div className="space-y-1.5">
                        <p className="font-black text-sm text-slate-800 flex items-center gap-2"><Hash className="w-4 h-4 text-amber-600" /> MST: {activeSupplier.taxCode || '---'}</p>
                        <p className="font-bold text-xs text-slate-500 flex items-start gap-2"><MapPin className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" /> {activeSupplier.address}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Thanh toán & Liên hệ</p>
                      <div className="space-y-1.5">
                        <p className="font-black text-sm text-slate-800 flex items-center gap-2"><Phone className="w-4 h-4 text-blue-600" /> {activeSupplier.phone}</p>
                        {activeSupplier.bankAccount && <p className="font-bold text-[10px] text-slate-500 flex items-center gap-2"><Wallet className="w-3.5 h-3.5 text-amber-500" /> {activeSupplier.bankName}: {activeSupplier.bankAccount}</p>}
                      </div>
                    </div>
                  </div>
                  {activeSupplier.extraInfo && (
                    <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 shadow-inner">
                      <p className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] mb-2">Thông tin mở rộng</p>
                      <p className="text-xs font-bold text-slate-600 italic leading-relaxed">{activeSupplier.extraInfo}</p>
                    </div>
                  )}
                </div>
                <div className="w-full md:w-auto text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng giá trị nhập xưởng</p>
                    <p className="text-3xl font-black text-amber-600 tabular-nums">{allSupplierOrders.reduce((s, o) => s + o.items.reduce((sum,i)=>sum+(i.purchasePrice*i.quantity),0),0).toLocaleString()}đ</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter"><List className="w-7 h-7 text-amber-600" /> Danh sách đơn sản xuất ({allSupplierOrders.length})</h3>
                {paginatedOrders.length > 0 ? paginatedOrders.map(order => {
                  const purchaseTotal = order.items.reduce((sum, i) => sum + (i.purchasePrice * i.quantity), 0);
                  return (
                    <div key={order.id} className="p-5 bg-slate-50 rounded-2xl flex justify-between items-center hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-amber-100 group">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-amber-600">{order.id}</span>
                          <span className="font-black text-slate-800 text-sm uppercase">{order.customerName}</span>
                          <span className="text-[10px] text-slate-400 font-bold">{new Date(order.orderDate).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Sản phẩm: {order.items.map(i => i.name).join(', ')}</p>
                      </div>
                      <div className="text-right flex items-center gap-6">
                        <div className="flex flex-col items-end gap-1">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Giá nhập</p>
                            <p className="font-black text-slate-900 tabular-nums">{purchaseTotal.toLocaleString()}đ</p>
                          </div>
                          
                          {/* Nút thanh toán */}
                          <button 
                             onClick={(e) => { e.stopPropagation(); onUpdatePaymentStatus(order.id, 'supplier', !order.isSupplierPaid); }}
                             className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all shadow-sm ${
                               order.isSupplierPaid 
                                 ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                                 : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                             }`}
                             title="Bấm để thay đổi trạng thái thanh toán"
                          >
                             {order.isSupplierPaid ? <CheckCircle2 className="w-3 h-3" /> : <CircleDollarSign className="w-3 h-3" />}
                             {order.isSupplierPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <button onClick={() => onViewOrder(order)} className="p-2.5 bg-white rounded-xl shadow-sm text-blue-600 hover:bg-blue-600 hover:text-white transition"><Eye className="w-4.5 h-4.5" /></button>
                          <button onClick={() => onDeleteOrder(order.id)} className="p-2.5 bg-white rounded-xl shadow-sm text-red-500 hover:bg-red-600 hover:text-white transition"><Trash2 className="w-4.5 h-4.5" /></button>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-20 text-center text-slate-400 font-bold border-2 border-dashed border-slate-50 rounded-2xl uppercase text-[10px] tracking-[0.2em]">Xưởng này chưa có đơn hàng nào</div>
                )}
                
                <Pagination 
                  currentPage={orderCurrentPage} 
                  totalPages={orderTotalPages} 
                  onPageChange={setOrderCurrentPage} 
                  itemsPerPage={ordersPerPage} 
                  totalItems={allSupplierOrders.length} 
                  activeColor="blue" 
                />
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[500px] flex items-center justify-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 p-20 text-center text-slate-400 font-black uppercase tracking-widest text-xs">Hãy chọn một nhà xưởng ở danh sách bên trái</div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-6 md:p-10 relative animate-in zoom-in-95">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 p-2 bg-slate-100 rounded-full transition hover:bg-slate-200"><X className="w-6 h-6" /></button>
            <h2 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-widest">{editingSupplier?.id ? 'Cập nhật xưởng' : 'Thêm xưởng sản xuất'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Tên công ty / Xưởng (Pháp nhân)</label>
                <input maxLength={500} placeholder="Công ty TNHH Mộc Decor..." className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-amber-500" value={editingSupplier?.companyName || ''} onChange={e => setEditingSupplier({...editingSupplier, companyName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Người đại diện</label>
                  <input maxLength={500} required placeholder="Ông/Bà..." className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-amber-500" value={editingSupplier?.name || ''} onChange={e => setEditingSupplier({...editingSupplier, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Mã số thuế</label>
                  <input maxLength={15} placeholder="010... (Max 15 số)" className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-amber-500" value={editingSupplier?.taxCode || ''} onChange={e => setEditingSupplier({...editingSupplier, taxCode: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Số điện thoại</label>
                  <input maxLength={15} required placeholder="09... (Max 15 số)" className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-amber-500" value={editingSupplier?.phone || ''} onChange={e => setEditingSupplier({...editingSupplier, phone: e.target.value})} />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Ngân hàng</label>
                   <input maxLength={500} placeholder="Vietinbank, MB..." className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-amber-500" value={editingSupplier?.bankName || ''} onChange={e => setEditingSupplier({...editingSupplier, bankName: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Số tài khoản</label>
                <input maxLength={500} placeholder="Nhập số tài khoản..." className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-amber-500" value={editingSupplier?.bankAccount || ''} onChange={e => setEditingSupplier({...editingSupplier, bankAccount: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Địa chỉ xưởng</label>
                <textarea maxLength={500} placeholder="Địa chỉ chi tiết..." rows={2} className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500" value={editingSupplier?.address || ''} onChange={e => setEditingSupplier({...editingSupplier, address: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Thông tin mở rộng</label>
                <textarea maxLength={500} placeholder="Ghi chú thêm, công suất xưởng, thế mạnh..." rows={2} className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500" value={editingSupplier?.extraInfo || ''} onChange={e => setEditingSupplier({...editingSupplier, extraInfo: e.target.value})} />
              </div>
              <button type="submit" className="w-full py-5 bg-amber-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-amber-100 hover:bg-amber-700 transition mt-4">
                LƯU THÔNG TIN NHÀ XƯỞNG
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManager;
