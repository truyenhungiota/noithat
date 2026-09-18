
import React, { useState, useMemo, useEffect } from 'react';
import { ShippingUnit, Order, UserAccount, UserRole } from '../types';
import { Truck, Phone, Search, Plus, List, Edit2, X, Trash2, MapPin, Package, Eye, ChevronLeft, ChevronRight, MapPinned, CalendarDays, ArrowRight, CheckCircle2, CircleDollarSign } from 'lucide-react';
import { Pagination } from './Pagination';

interface ShippingManagerProps {
  units: ShippingUnit[];
  orders: Order[];
  onAddUnit: (u: ShippingUnit) => void;
  onUpdateUnit: (u: ShippingUnit) => void;
  onDeleteUnit: (id: string) => void;
  onViewOrder: (order: Order) => void;
  onDeleteOrder: (id: string) => void;
  currentUser: UserAccount;
  onUpdatePaymentStatus: (orderId: string, type: 'supplier' | 'shipping', isPaid: boolean) => void;
}

const ShippingManager: React.FC<ShippingManagerProps> = ({ units, orders, onAddUnit, onUpdateUnit, onDeleteUnit, onViewOrder, onDeleteOrder, currentUser, onUpdatePaymentStatus }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Partial<ShippingUnit> | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [orderCurrentPage, setOrderCurrentPage] = useState(1);
  const ordersPerPage = 10;

  const isAdmin = currentUser.role === UserRole.ADMIN;

  useEffect(() => {
    setOrderCurrentPage(1);
  }, [selectedUnitId, orderSearchTerm]);

  const sortedUnits = useMemo(() => {
    const unitsWithLatestDate = units.map(unit => {
      const unitOrders = orders.filter(o => o.shippingUnitId === unit.id || o.shippingUnitName === unit.name);
      const latestOrder = unitOrders.length > 0 
        ? unitOrders.reduce((latest, current) => {
            return new Date(current.orderDate) > new Date(latest.orderDate) ? current : latest;
          })
        : null;
      
      return {
        ...unit,
        latestOrderDate: latestOrder ? new Date(latestOrder.orderDate).getTime() : 0,
        latestOrderDateStr: latestOrder ? latestOrder.orderDate : null
      };
    });

    return unitsWithLatestDate.sort((a, b) => b.latestOrderDate - a.latestOrderDate);
  }, [units, orders]);

  useEffect(() => {
    if (!selectedUnitId && sortedUnits.length > 0) {
      setSelectedUnitId(sortedUnits[0].id);
    }
  }, [sortedUnits, selectedUnitId]);

  const filteredUnits = useMemo(() => 
    sortedUnits.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())),
  [sortedUnits, searchTerm]);

  const totalPages = Math.ceil(filteredUnits.length / itemsPerPage);
  const paginatedUnits = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUnits.slice(start, start + itemsPerPage);
  }, [filteredUnits, currentPage]);

  const activeUnit = useMemo(() => 
    units.find(u => u.id === selectedUnitId),
  [units, selectedUnitId]);

  const allUnitOrders = useMemo(() => {
    if (!selectedUnitId || !activeUnit) return [];
    return orders
      .filter(o => 
        (o.shippingUnitId && o.shippingUnitId === selectedUnitId) || 
        (o.shippingUnitName && o.shippingUnitName === activeUnit.name)
      )
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [orders, selectedUnitId, activeUnit]);

  const orderTotalPages = Math.ceil(allUnitOrders.length / ordersPerPage);
  const paginatedOrders = useMemo(() => {
    const start = (orderCurrentPage - 1) * ordersPerPage;
    return allUnitOrders.slice(start, start + ordersPerPage);
  }, [allUnitOrders, orderCurrentPage]);

  const globalOrderSearchResults = useMemo(() => {
    const s = orderSearchTerm.trim().toLowerCase();
    if (!s) return [];
    return orders.filter(o => 
      o.id.toLowerCase().includes(s) ||
      (o.id.startsWith('HI') && o.id.substring(2).includes(s)) ||
      o.customerName.toLowerCase().includes(s)
    );
  }, [orders, orderSearchTerm]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit?.name || !editingUnit?.phone) {
        alert("Vui lòng nhập tên đơn vị và số điện thoại.");
        return;
    }
    if (editingUnit?.id) {
      onUpdateUnit(editingUnit as ShippingUnit);
    } else {
      const newUnit = { ...editingUnit, id: `SHIP${Date.now()}` } as ShippingUnit;
      onAddUnit(newUnit);
    }
    setIsModalOpen(false);
    setEditingUnit(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-50"><Truck className="w-6 h-6" /></div>
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Hậu cần Vận chuyển</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Xem chi tiết đơn hàng theo từng đơn vị</p>
          </div>
        </div>
        <div className="flex-1 max-w-xl relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm theo số đơn hàng (Ví dụ: 2024)..." 
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold shadow-inner" 
            value={orderSearchTerm} 
            onChange={e => setOrderSearchTerm(e.target.value)} 
          />
        </div>
        <button onClick={() => { setEditingUnit({}); setIsModalOpen(true); }} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl hover:bg-slate-800 transition flex items-center gap-2"><Plus className="w-5 h-5" /> THÊM ĐƠN VỊ</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-4 rounded-2xl border flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-400" />
            <input type="text" placeholder="Lọc tên đơn vị..." className="w-full outline-none text-sm font-black uppercase tracking-tight" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
          </div>
          <div className="space-y-3 bg-white p-2 rounded-[2rem] border shadow-sm">
            {paginatedUnits.map(unit => {
              const count = orders.filter(o => o.shippingUnitId === unit.id || o.shippingUnitName === unit.name).length;
              const isSelected = selectedUnitId === unit.id;
              
              return (
                <div 
                  key={unit.id} 
                  onClick={() => { setSelectedUnitId(unit.id); setOrderSearchTerm(''); }} 
                  className={`p-6 rounded-[2.5rem] border-2 cursor-pointer transition-all duration-300 relative overflow-hidden group ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-xl' : 'bg-white text-slate-600 border-slate-50 hover:border-blue-100'}`}
                >
                  {unit.latestOrderDate > 0 && (
                    <div className={`absolute top-0 right-0 px-3 py-1 text-[8px] font-black uppercase rounded-bl-xl ${isSelected ? 'bg-blue-500 text-blue-100' : 'bg-blue-50 text-blue-600'}`}>
                      Hoạt động
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-base uppercase tracking-tight leading-tight truncate">{unit.name}</h4>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5">
                          <Package className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`} />
                          <span className={`text-[10px] font-black uppercase ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>{count} đơn giao</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-4 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setEditingUnit(unit); setIsModalOpen(true); }} className={`p-2 rounded-xl transition shadow-sm ${isSelected ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-slate-50 text-slate-400 hover:text-blue-600'}`}><Edit2 className="w-4 h-4" /></button>
                      {isAdmin && (
                        <button onClick={(e) => { e.stopPropagation(); onDeleteUnit(unit.id); }} className={`p-2 rounded-xl transition shadow-sm ${isSelected ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-slate-50 text-red-400 hover:text-red-600'}`}><Trash2 className="w-4 h-4" /></button>
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
              totalItems={filteredUnits.length} 
              activeColor="blue" 
            />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          {orderSearchTerm.trim() ? (
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-100 shadow-xl space-y-6 animate-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center border-b pb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter"><Search className="w-6 h-6 text-blue-600" /> Kết quả cho: "{orderSearchTerm}"</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Lọc toàn bộ cơ sở dữ liệu vận chuyển</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tìm thấy</p>
                  <p className="text-3xl font-black text-blue-600 tabular-nums">{globalOrderSearchResults.length}</p>
                </div>
              </div>
              <div className="space-y-4">
                {globalOrderSearchResults.map(order => (
                   <div key={order.id} className="p-6 bg-blue-50 rounded-3xl border-2 border-blue-100 flex justify-between items-center group hover:bg-white transition-all">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-black text-blue-600 text-lg">{order.id}</span>
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase rounded">{order.shippingUnitName || 'Vận chuyển khác'}</span>
                        </div>
                        <p className="font-black text-slate-800 text-sm uppercase mt-1">{order.customerName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1 truncate"><MapPin className="w-3.5 h-3.5" /> {order.address}</p>
                      </div>
                      <div className="flex items-center gap-6 ml-4">
                         <div className="text-right min-w-[100px]">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Cước VC Xưởng</p>
                            <p className="font-black text-slate-900">{(order.factoryShippingCost || 0).toLocaleString()}đ</p>
                         </div>
                         <div className="flex gap-2">
                           <button onClick={() => onViewOrder(order)} className="p-3 bg-white rounded-2xl shadow-sm text-blue-600 hover:bg-blue-600 hover:text-white transition"><Eye className="w-5 h-5" /></button>
                         </div>
                      </div>
                   </div>
                ))}
                {globalOrderSearchResults.length === 0 && (
                   <div className="py-24 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100">
                      <MapPinned className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Không tìm thấy mã đơn hoặc tên khách này</p>
                   </div>
                )}
              </div>
            </div>
          ) : activeUnit ? (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 animate-in slide-in-from-right-4">
              <div className="flex flex-col md:flex-row justify-between items-start border-b pb-6 gap-6">
                <div className="flex-1">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter"><List className="w-6 h-6 text-blue-600" /> Lịch sử giao hàng: {activeUnit.name}</h3>
                  <div className="mt-2 flex items-center gap-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {activeUnit.phone}</p>
                    {activeUnit.address && <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {activeUnit.address}</p>}
                  </div>
                  {activeUnit.extraInfo && (
                    <div className="mt-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100 shadow-inner">
                      <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2">Thông tin mở rộng</p>
                      <p className="text-xs font-bold text-slate-600 italic leading-relaxed">{activeUnit.extraInfo}</p>
                    </div>
                  )}
                </div>
                <div className="w-full md:w-auto text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doanh số cước giao</p>
                    <p className="text-3xl font-black text-blue-600 tabular-nums">{allUnitOrders.reduce((sum, o) => sum + (o.factoryShippingCost || 0), 0).toLocaleString()}đ</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {paginatedOrders.length > 0 ? paginatedOrders.map(order => (
                  <div key={order.id} className="p-5 bg-slate-50 rounded-2xl flex justify-between items-center hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-slate-100 group">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-blue-600">{order.id}</span>
                        <span className="font-black text-slate-800 text-sm uppercase">{order.customerName}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {new Date(order.orderDate).toLocaleDateString('vi-VN')}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1 italic"><MapPin className="w-3 h-3" /> {order.address}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-6 ml-4">
                      <div className="hidden md:flex flex-col items-end gap-1">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Cước VC Xưởng</p>
                            <p className="font-black text-blue-600">{(order.factoryShippingCost || 0).toLocaleString()}đ</p>
                        </div>
                        {/* Nút thanh toán */}
                        <button 
                             onClick={(e) => { e.stopPropagation(); onUpdatePaymentStatus(order.id, 'shipping', !order.isShippingPaid); }}
                             className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all shadow-sm ${
                               order.isShippingPaid 
                                 ? 'bg-blue-500 text-white hover:bg-blue-600' 
                                 : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                             }`}
                             title="Bấm để thay đổi trạng thái thanh toán"
                          >
                             {order.isShippingPaid ? <CheckCircle2 className="w-3 h-3" /> : <CircleDollarSign className="w-3 h-3" />}
                             {order.isShippingPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => onViewOrder(order)} className="p-2.5 bg-white rounded-xl shadow-sm text-blue-600 hover:bg-blue-600 hover:text-white transition flex items-center gap-2 group/btn">
                           <Eye className="w-4.5 h-4.5" />
                           <span className="text-[10px] font-black uppercase hidden group-hover/btn:inline pr-2">Xem đơn</span>
                        </button>
                        {isAdmin && (
                           <button onClick={() => onDeleteOrder(order.id)} className="p-2.5 bg-white rounded-xl shadow-sm text-red-500 hover:bg-red-50 hover:text-white transition"><Trash2 className="w-4.5 h-4.5" /></button>
                        )}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-20 text-center text-slate-400 font-bold border-2 border-dashed border-slate-50 rounded-2xl uppercase text-[10px] tracking-[0.2em]">Đơn vị này chưa có dữ liệu giao hàng</div>
                )}
                
                <Pagination 
                  currentPage={orderCurrentPage} 
                  totalPages={orderTotalPages} 
                  onPageChange={setOrderCurrentPage} 
                  itemsPerPage={ordersPerPage} 
                  totalItems={allUnitOrders.length} 
                  activeColor="blue" 
                />
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[500px] flex items-center justify-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 p-20 text-center text-slate-400 font-black uppercase tracking-widest text-xs">Hãy chọn một đơn vị vận chuyển ở danh sách bên trái</div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-6 md:p-10 relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 p-2 bg-slate-100 rounded-full transition hover:bg-slate-200"><X className="w-6 h-6" /></button>
            <h2 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-widest">{editingUnit?.id ? 'Sửa đơn vị' : 'Thêm đơn vị'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tên đơn vị</label>
                <input maxLength={500} required placeholder="GHTK, Viettel Post..." className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-blue-500" value={editingUnit?.name || ''} onChange={e => setEditingUnit({...editingUnit, name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Số điện thoại</label>
                <input maxLength={15} required placeholder="1900... (Max 15 số)" className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-blue-500" value={editingUnit?.phone || ''} onChange={e => setEditingUnit({...editingUnit, phone: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Địa chỉ / Ghi chú</label>
                <textarea maxLength={500} placeholder="Thông tin liên hệ thêm..." rows={3} className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-inner" value={editingUnit?.address || ''} onChange={e => setEditingUnit({...editingUnit, address: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Thông tin mở rộng</label>
                <textarea maxLength={500} placeholder="Ghi chú nội bộ, đánh giá chất lượng..." rows={3} className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-inner" value={editingUnit?.extraInfo || ''} onChange={e => setEditingUnit({...editingUnit, extraInfo: e.target.value})} />
              </div>
              <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition flex items-center justify-center gap-2 mt-4">
                <Truck className="w-5 h-5" /> LƯU ĐƠN VỊ VẬN CHUYỂN
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingManager;
