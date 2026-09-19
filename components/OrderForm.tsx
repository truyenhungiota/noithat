
import React, { useState } from 'react';
import { Order, OrderItem, OrderStatus, Customer, Supplier, ShippingUnit, Product, UserAccount } from '../types';
import { Plus, Trash2, X, Image as ImageIcon, Calendar, Ruler, Tag, Truck, Receipt, Calculator, Building, Palette, ListChecks, AlertTriangle, Activity, Wallet, Mail, Clock, Hash, User, Package, HandCoins, CreditCard, Banknote } from 'lucide-react';

interface OrderFormProps {
  order?: Order;
  customers: Customer[];
  suppliers: Supplier[];
  shippingUnits: ShippingUnit[];
  products?: Product[];
  users: UserAccount[];
  onSave: (order: Order) => void;
  onClose: () => void;
}

const OrderForm: React.FC<OrderFormProps> = ({ order, customers, suppliers, shippingUnits, products = [], users, onSave, onClose }) => {
  const [formData, setFormData] = useState<Partial<Order>>(
    order || {
      id: `HI${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customerId: '',
      supplierId: '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerID: '',
      customerCompanyName: '',
      customerTaxCode: '',
      address: '',
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: OrderStatus.PENDING,
      supplierName: '',
      supplierAddress: '',
      supplierPhone: '',
      depositAmount: 0,
      depositPaymentDate: '',
      paymentDate: '',
      invoiceDate: '',
      finalPaymentInvoiceDate: '',
      
      isVATEnabled: false,
      vatRate: 8, // Mặc định 8%

      shippingCost: 0,
      factoryShippingCost: 0,
      shippingUnitId: '',
      shippingUnitName: '',
      shippingUnitPhone: '',
      isCODEnabled: false,
      codAmount: 0,

      items: [{ id: Date.now().toString(), name: '', category: '', dimensions: '', quantity: 1, salePrice: 0, purchasePrice: 0, unit: 'Bộ', imageUrl: '', color: '', options: '', productionNote: '' }],
    }
  );

  const subtotal = (formData.items || []).reduce((sum, i) => sum + (i.salePrice * i.quantity), 0);
  const shipping = formData.shippingCost || 0;
  const taxableTotal = subtotal + shipping;
  const vatRate = formData.vatRate || 0;
  const vatAmount = formData.isVATEnabled ? taxableTotal * (vatRate / 100) : 0;
  const grandTotal = taxableTotal + vatAmount;

  const getLocalDateTimeString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 16);
  };

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

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...(formData.items || []),
        { id: Date.now().toString(), name: '', category: '', dimensions: '', quantity: 1, salePrice: 0, purchasePrice: 0, unit: 'Bộ', imageUrl: '', leatherImageUrl: '', color: '', options: '', productionNote: '' }
      ]
    });
  };

  const removeItem = (id: string) => {
    setFormData({
      ...formData,
      items: (formData.items || []).filter(item => item.id !== id)
    });
  };

  const updateItem = (id: string, updates: Partial<OrderItem>) => {
    setFormData({
      ...formData,
      items: (formData.items || []).map(item => item.id === id ? { ...item, ...updates } : item)
    });
  };

  const handleSelectProduct = (itemId: string, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      updateItem(itemId, {
        name: product.name,
        category: product.category,
        dimensions: product.dimensions || '',
        salePrice: product.salePrice,
        purchasePrice: product.purchasePrice,
        unit: product.unit,
        imageUrl: product.imageUrl || '',
        color: product.color || ''
      });
    }
  };

  const handleSelectCustomer = (id: string) => {
    const cust = customers.find(c => c.id === id);
    if (cust) {
      setFormData({
        ...formData,
        customerId: cust.id,
        customerName: cust.name,
        customerPhone: cust.phone,
        customerEmail: cust.email,
        customerID: cust.idCard,
        customerCompanyName: cust.companyName,
        customerTaxCode: cust.taxCode,
        address: cust.address
      });
    }
  };

  const handleSelectSupplier = (id: string) => {
    const sup = suppliers.find(s => s.id === id);
    if (sup) {
      setFormData({
        ...formData,
        supplierId: sup.id,
        supplierName: sup.companyName || sup.name,
        supplierPhone: sup.phone,
        supplierAddress: sup.address
      });
    }
  };

  const handleSelectShippingUnit = (id: string) => {
    const unit = shippingUnits.find(u => u.id === id);
    if (unit) {
      setFormData({
        ...formData,
        shippingUnitId: unit.id,
        shippingUnitName: unit.name,
        shippingUnitPhone: unit.phone
      });
    } else {
      setFormData({
        ...formData,
        shippingUnitId: '',
        shippingUnitName: '',
        shippingUnitPhone: ''
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Order);
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.COMPLETED: return 'text-emerald-600';
      case OrderStatus.PAID: return 'text-green-500';
      case OrderStatus.PROCESSING: return 'text-amber-600';
      case OrderStatus.SHIPPING: return 'text-blue-600';
      case OrderStatus.CANCELLED: return 'text-red-600';
      default: return 'text-slate-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 z-50 overflow-y-auto">
      <div className="bg-white md:rounded-[2.5rem] shadow-2xl w-full max-w-7xl p-6 md:p-8 h-full md:h-auto md:max-h-[95vh] overflow-y-auto relative border border-slate-100 animate-in zoom-in-95">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 md:top-6 md:right-6 p-4 bg-slate-100 hover:bg-red-500 hover:text-white rounded-full transition-all shadow-sm hover:shadow-red-200 z-10 group"
          title="Đóng cửa sổ"
        >
          <X className="w-6 h-6 group-hover:scale-110 transition-transform" strokeWidth={3} />
        </button>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b pb-4 pr-16 gap-4">
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3 flex-wrap">
            {order ? 'Chỉnh sửa đơn' : 'Tạo đơn mới'}
            <span className="text-sm font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{formData.id}</span>
          </h2>
          <div className="flex items-center gap-4 bg-slate-50 p-2 px-4 rounded-2xl border w-full md:w-auto">
            <Activity className={`w-5 h-5 ${getStatusColor(formData.status as OrderStatus)}`} />
            <div className="flex flex-col flex-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trạng thái đơn</label>
              <select 
                className={`bg-transparent outline-none font-black text-sm uppercase cursor-pointer w-full ${getStatusColor(formData.status as OrderStatus)}`}
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as OrderStatus })}
              >
                {Object.values(OrderStatus).map(st => (
                  <option key={st} value={st} className="text-slate-900">{st}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4" /> Thông tin khách hàng & Thời gian
                </h3>
                <div className="flex gap-2 w-full md:w-auto">
                  <select 
                    className="w-full md:w-auto text-xs bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-100 outline-none font-black cursor-pointer shadow-sm hover:bg-blue-100 transition"
                    onChange={e => handleSelectCustomer(e.target.value)}
                    value={formData.customerId}
                  >
                    <option value="">LẤY TỪ DANH SÁCH KHÁCH HÀNG</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{getDisplayName(c.name, c.createdBy, customers)}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-blue-500" /> Ngày đặt hàng
                  </label>
                  <input required type="date" className="w-full px-4 py-3 bg-blue-50/30 border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-black text-sm text-blue-700"
                    value={formData.orderDate} onChange={e => setFormData({ ...formData, orderDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-500" /> Ngày giao dự kiến
                  </label>
                  <input required type="date" className="w-full px-4 py-3 bg-amber-50/30 border border-amber-100 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-black text-sm text-amber-700"
                    value={formData.deliveryDate} onChange={e => setFormData({ ...formData, deliveryDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên khách</label>
                  <input maxLength={100} required type="text" placeholder="Nhập tên khách..." className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                    value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số điện thoại</label>
                  <input maxLength={15} required type="text" placeholder="09... (Max 15 số)" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                    value={formData.customerPhone} onChange={e => setFormData({ ...formData, customerPhone: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                  <input maxLength={100} type="email" placeholder="khach@gmail.com" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                    value={formData.customerEmail} onChange={e => setFormData({ ...formData, customerEmail: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã số thuế</label>
                  <input maxLength={15} type="text" placeholder="MST (Max 15 số)" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                    value={formData.customerTaxCode} onChange={e => setFormData({ ...formData, customerTaxCode: e.target.value })} />
                </div>
                <div className="lg:col-span-1 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên công ty</label>
                  <input maxLength={200} type="text" placeholder="Tên pháp nhân (nếu có)" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                    value={formData.customerCompanyName} onChange={e => setFormData({ ...formData, customerCompanyName: e.target.value })} />
                </div>
                <div className="lg:col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Địa chỉ bàn giao lắp đặt</label>
                  <input maxLength={300} required type="text" placeholder="Số nhà, đường, quận..." className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                    value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                </div>
              </div>

              {/* TÀI CHÍNH & THANH TOÁN */}
              <div className="space-y-6 mt-8 p-6 md:p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100 shadow-sm">
                <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-2">
                  <Banknote className="w-4 h-4" /> Tài chính & Thanh toán
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tạm ứng (đ)</label>
                    <input type="number" min="0" max="99999999999" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-black text-sm text-right text-emerald-600 shadow-inner"
                      value={formData.depositAmount || ''} onChange={e => setFormData({ ...formData, depositAmount: Math.min(parseInt(e.target.value) || 0, 99999999999) })} />
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-500" /> TG khách chuyển đặt cọc
                      </label>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setFormData({ ...formData, depositPaymentDate: getLocalDateTimeString() })} className="text-[9px] font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 transition">
                          Hiện tại
                        </button>
                        {formData.depositPaymentDate && (
                          <button type="button" onClick={() => setFormData({ ...formData, depositPaymentDate: '' })} className="text-[9px] font-black text-slate-400 hover:text-red-500 px-1 py-0.5 transition" title="Xóa mốc thời gian">
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>
                    <input type="datetime-local" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-xs text-slate-700 shadow-inner"
                      value={formData.depositPaymentDate || ''} onChange={e => setFormData({ ...formData, depositPaymentDate: e.target.value })} />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-blue-500" /> TG khách thanh toán
                      </label>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => { const now = getLocalDateTimeString(); setFormData({ ...formData, paymentDate: now, finalPaymentInvoiceDate: formData.finalPaymentInvoiceDate || now }); }} className="text-[9px] font-black text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 transition">
                          Hiện tại
                        </button>
                        {formData.paymentDate && (
                          <button type="button" onClick={() => setFormData({ ...formData, paymentDate: '' })} className="text-[9px] font-black text-slate-400 hover:text-red-500 px-1 py-0.5 transition" title="Xóa mốc thời gian">
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>
                    <input type="datetime-local" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-xs text-slate-700 shadow-inner"
                      value={formData.paymentDate || formData.finalPaymentInvoiceDate || ''} onChange={e => setFormData({ ...formData, paymentDate: e.target.value, finalPaymentInvoiceDate: e.target.value || formData.finalPaymentInvoiceDate })} />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-indigo-500" /> TG xuất hoá đơn
                      </label>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => { const now = getLocalDateTimeString(); setFormData({ ...formData, invoiceDate: now, finalPaymentInvoiceDate: formData.finalPaymentInvoiceDate || now }); }} className="text-[9px] font-black text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 transition">
                          Hiện tại
                        </button>
                        {formData.invoiceDate && (
                          <button type="button" onClick={() => setFormData({ ...formData, invoiceDate: '' })} className="text-[9px] font-black text-slate-400 hover:text-red-500 px-1 py-0.5 transition" title="Xóa mốc thời gian">
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>
                    <input type="datetime-local" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs text-slate-700 shadow-inner"
                      value={formData.invoiceDate || formData.finalPaymentInvoiceDate || ''} onChange={e => setFormData({ ...formData, invoiceDate: e.target.value, finalPaymentInvoiceDate: e.target.value || formData.finalPaymentInvoiceDate })} />
                  </div>
                </div>

                {/* VAT & Invoice */}
                <div className="flex flex-col md:flex-row gap-6 pt-6 border-t border-slate-200/60">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition ${formData.isVATEnabled ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                        <input type="checkbox" className="hidden" checked={formData.isVATEnabled} onChange={e => setFormData({...formData, isVATEnabled: e.target.checked})} />
                        {formData.isVATEnabled && <Plus className="w-4 h-4 text-white" />}
                      </div>
                      <span className="text-xs font-black text-slate-600 uppercase tracking-widest group-hover:text-blue-600 transition">TÍNH THUẾ VAT</span>
                    </label>
                    {formData.isVATEnabled && (
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-inner">
                        <input type="number" min="0" max="100" className="w-10 bg-transparent text-slate-800 font-black text-center outline-none" 
                          value={formData.vatRate} onChange={e => setFormData({...formData, vatRate: parseInt(e.target.value) || 0})} />
                        <span className="text-blue-600 font-bold">%</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 flex-1">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition ${formData.isInvoiced ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300 bg-white'}`}>
                        <input type="checkbox" className="hidden" checked={formData.isInvoiced || false} onChange={e => setFormData({...formData, isInvoiced: e.target.checked})} />
                        {formData.isInvoiced && <Plus className="w-4 h-4 text-white" />}
                      </div>
                      <span className="text-xs font-black text-slate-600 uppercase tracking-widest group-hover:text-emerald-600 transition">ĐÃ XUẤT HÓA ĐƠN</span>
                    </label>
                    
                    {formData.isInvoiced && (
                      <div className="flex-1 max-w-xs">
                        <input type="text" placeholder="Mã hóa đơn..." className="w-full bg-white text-slate-800 px-4 py-2.5 rounded-lg border border-slate-200 outline-none text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 shadow-inner" 
                          value={formData.invoiceCode || ''} onChange={e => setFormData({...formData, invoiceCode: e.target.value})} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6 bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-xl text-white">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4" /> Sản xuất & Hậu cần
              </h3>
              
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-amber-500" /> Chọn xưởng sản xuất
                  </label>
                  <select 
                    required
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-black text-sm cursor-pointer text-amber-400"
                    value={formData.supplierId}
                    onChange={e => handleSelectSupplier(e.target.value)}
                  >
                    <option value="" className="text-white">-- CHỌN NHÀ XƯỞNG --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id} className="text-white">{getDisplayName(s.companyName || s.name, s.createdBy, suppliers.map(su => ({name: su.companyName || su.name, createdBy: su.createdBy})))}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Đơn vị vận chuyển</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-black text-sm cursor-pointer text-blue-400"
                    value={formData.shippingUnitId}
                    onChange={e => handleSelectShippingUnit(e.target.value)}
                  >
                    <option value="" className="text-white">-- CHỌN ĐƠN VỊ VẬN CHUYỂN --</option>
                    {shippingUnits.map(u => (
                      <option key={u.id} value={u.id} className="text-white">{u.name}</option>
                    ))}
                    <option value="other" className="text-white">Khác / Khách tự lấy</option>
                  </select>
                </div>

                {/* Phần Thu Hộ (COD) - Mới thêm */}
                <div className="space-y-2 pt-2 border-t border-slate-700/50">
                   <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition ${formData.isCODEnabled ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500'}`} onClick={() => setFormData({...formData, isCODEnabled: !formData.isCODEnabled})}>
                         {formData.isCODEnabled && <Plus className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2"><HandCoins className="w-4 h-4" /> Thu tiền hộ (COD)</span>
                   </div>
                   {formData.isCODEnabled && (
                      <div className="space-y-1 pl-8 animate-in slide-in-from-top-1">
                         <input type="number" min="0" max="99999999999" placeholder="Nhập số tiền thu hộ..." className="w-full px-4 py-2.5 bg-slate-800 border border-indigo-500/50 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-black text-sm text-indigo-300"
                           value={formData.codAmount || ''} onChange={e => setFormData({ ...formData, codAmount: Math.min(parseInt(e.target.value) || 0, 99999999999) })} />
                         <p className="text-[9px] text-slate-500 italic">*Chỉ ghi nhận, không tính vào tổng đơn</p>
                      </div>
                   )}
                </div>

                <div className="pt-2 flex gap-4">
                  <div className="space-y-1 flex-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cước thu khách (đ)</label>
                    <input type="number" min="0" max="99999999999" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-black text-sm text-right text-white"
                      value={formData.shippingCost || ''} onChange={e => setFormData({ ...formData, shippingCost: Math.min(parseInt(e.target.value) || 0, 99999999999) })} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Trả cho xưởng (đ)</label>
                    <input type="number" min="0" max="99999999999" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-black text-sm text-right text-white"
                      value={formData.factoryShippingCost || ''} onChange={e => setFormData({ ...formData, factoryShippingCost: Math.min(parseInt(e.target.value) || 0, 99999999999) })} />
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-6 border-b-2 border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                <Tag className="w-6 h-6 text-blue-600" /> Danh sách sản phẩm
              </h3>
              <button type="button" onClick={addItem} className="flex items-center gap-2 px-6 md:px-8 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-2xl text-[10px] md:text-xs font-black transition shadow-xl shadow-blue-100 uppercase tracking-widest">
                <Plus className="w-5 h-5" /> THÊM SẢN PHẨM
              </button>
            </div>
            <div className="space-y-8">
              {(formData.items || []).map((item, index) => (
                <div key={item.id} className="p-4 md:p-8 bg-white rounded-[2rem] md:rounded-[2.5rem] border-2 border-slate-100 shadow-sm relative group hover:border-blue-300 transition-all duration-300">
                  <div className="grid grid-cols-12 gap-4 md:gap-8">
                    <div className="col-span-12 lg:col-span-3 space-y-6">
                      {/* Ảnh minh họa sản phẩm */}
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Ảnh minh họa sản phẩm</label>
                        <div 
                          className="relative aspect-square rounded-[2rem] bg-slate-50 overflow-hidden border-2 border-slate-100 shadow-inner group-hover:border-blue-100 transition cursor-pointer group/image"
                          onClick={() => document.getElementById(`upload-${item.id}`)?.click()}
                        >
                          {item.imageUrl ? (
                            <img src={item.imageUrl} className="w-full h-full object-contain bg-white" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 group-hover/image:text-blue-500 transition-colors">
                              <ImageIcon className="w-12 h-12 mb-2" />
                              <span className="text-[9px] font-black uppercase tracking-widest text-center px-4">TẢI ẢNH LÊN</span>
                            </div>
                          )}
                          <input 
                            type="file" 
                            id={`upload-${item.id}`}
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  updateItem(item.id, { imageUrl: reader.result as string });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </div>
                        <input type="text" placeholder="Dán link ảnh hoặc tải lên..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            value={item.imageUrl || ''} onChange={e => updateItem(item.id, { imageUrl: e.target.value })} />
                      </div>

                      {/* Ô tải hình ảnh màu da (Chỉ xuất hiện trong Yêu cầu sản xuất) */}
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between ml-1">
                          <label className="text-[9px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5">
                            <Palette className="w-3.5 h-3.5 text-amber-500" /> Ảnh màu da
                          </label>
                          <span className="text-[8px] font-bold text-slate-400 uppercase bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200/60">Chỉ hiện ở YCSX</span>
                        </div>
                        <div 
                          className="relative aspect-square rounded-[1.75rem] bg-amber-50/40 overflow-hidden border-2 border-dashed border-amber-200/80 shadow-inner hover:border-amber-400 transition cursor-pointer group/leather"
                          onClick={() => document.getElementById(`upload-leather-${item.id}`)?.click()}
                        >
                          {item.leatherImageUrl ? (
                            <div className="relative w-full h-full group/preview">
                              <img src={item.leatherImageUrl} className="w-full h-full object-contain bg-white" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateItem(item.id, { leatherImageUrl: '' });
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-lg opacity-0 group-hover/preview:opacity-100 transition shadow-md hover:bg-red-600"
                                title="Xóa ảnh màu da"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-amber-400 group-hover/leather:text-amber-600 transition-colors p-3 text-center">
                              <Palette className="w-8 h-8 mb-1.5" />
                              <span className="text-[9px] font-black uppercase tracking-wider">TẢI ẢNH MÀU DA</span>
                              <span className="text-[8px] font-bold text-slate-400 mt-0.5">Mẫu da, vải xưởng bọc</span>
                            </div>
                          )}
                          <input 
                            type="file" 
                            id={`upload-leather-${item.id}`}
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  updateItem(item.id, { leatherImageUrl: reader.result as string });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </div>
                        <input 
                          type="text" 
                          placeholder="Dán link ảnh màu da..." 
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                          value={item.leatherImageUrl || ''} 
                          onChange={e => updateItem(item.id, { leatherImageUrl: e.target.value })} 
                        />
                      </div>
                    </div>
                    <div className="col-span-12 lg:col-span-9 grid grid-cols-12 gap-4 md:gap-6">
                      {/* Product Selection Logic */}
                      <div className="col-span-12">
                         <label className="text-[9px] font-black text-indigo-500 uppercase tracking-widest ml-1 flex items-center gap-1 mb-1">
                            <Package className="w-3 h-3" /> Chọn mẫu sản phẩm (Tự động điền)
                         </label>
                         <select 
                            className="w-full px-5 py-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-700 outline-none cursor-pointer"
                            onChange={(e) => handleSelectProduct(item.id, e.target.value)}
                            defaultValue=""
                         >
                            <option value="">-- Chọn từ danh sách sản phẩm --</option>
                            {products.map(p => (
                               <option key={p.id} value={p.id}>{getDisplayName(p.name, p.createdBy, products)} ({p.salePrice.toLocaleString()}đ)</option>
                            ))}
                         </select>
                      </div>

                      <div className="col-span-12 lg:col-span-5 space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên sản phẩm chi tiết</label>
                        <input maxLength={200} required type="text" placeholder="Bàn sofa, Kệ gỗ..." className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black uppercase tracking-tight"
                          value={item.name} onChange={e => updateItem(item.id, { name: e.target.value })} />
                      </div>
                      <div className="col-span-12 lg:col-span-4 space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Kích thước (DxRxC)</label>
                        <div className="relative">
                           <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                           <input maxLength={100} type="text" placeholder="2000 x 800 x 450 mm" className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold"
                             value={item.dimensions} onChange={(e) => updateItem(item.id, { dimensions: e.target.value })} />
                        </div>
                      </div>
                      <div className="col-span-6 lg:col-span-3 space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Màu sắc</label>
                        <div className="relative">
                          <Palette className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                          <input maxLength={100} type="text" placeholder="Màu gỗ..." className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black"
                            value={item.color} onChange={e => updateItem(item.id, { color: e.target.value })} />
                        </div>
                      </div>
                      
                      <div className="col-span-6 lg:col-span-2 space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Số lượng</label>
                        <input type="number" min="1" max="2000" className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-lg text-center font-black"
                          value={item.quantity} onChange={e => updateItem(item.id, { quantity: Math.min(parseInt(e.target.value) || 0, 2000) })} />
                      </div>
                      <div className="col-span-6 lg:col-span-5 space-y-1">
                        <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-1 block">Giá bán khách hàng (đ)</label>
                        <input type="number" min="0" max="99999999999" className="w-full px-5 py-3.5 bg-blue-50 border border-blue-100 rounded-2xl text-lg font-black text-blue-700 text-right tabular-nums"
                          value={item.salePrice || ''} onChange={e => updateItem(item.id, { salePrice: Math.min(parseInt(e.target.value) || 0, 99999999999) })} />
                      </div>
                      <div className="col-span-6 lg:col-span-5 space-y-1">
                        <label className="text-[9px] font-black text-amber-500 uppercase tracking-widest ml-1 block">Giá nhập xưởng (đ)</label>
                        <input type="number" min="0" max="99999999999" className="w-full px-5 py-3.5 bg-amber-50 border border-amber-100 rounded-2xl text-lg font-black text-amber-700 text-right tabular-nums"
                          value={item.purchasePrice || ''} onChange={e => updateItem(item.id, { purchasePrice: Math.min(parseInt(e.target.value) || 0, 99999999999) })} />
                      </div>

                      <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-blue-400 uppercase flex items-center gap-2 ml-1">
                            <ListChecks className="w-4 h-4" /> Tùy chọn yêu cầu (Show báo giá)
                          </label>
                          <textarea maxLength={500} rows={3} placeholder="Mỗi dòng một yêu cầu chi tiết..." className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none"
                            value={item.options} onChange={e => updateItem(item.id, { options: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-red-500 uppercase flex items-center gap-2 ml-1">
                            <AlertTriangle className="w-4 h-4" /> Lưu ý xưởng (Show Yêu cầu SX)
                          </label>
                          <textarea maxLength={500} rows={3} placeholder="Ghi chú kỹ thuật cho nhà xưởng..." className="w-full px-5 py-4 bg-red-50/30 border border-red-100/50 rounded-2xl text-xs font-black leading-relaxed text-red-800 focus:ring-2 focus:ring-red-500 outline-none"
                            value={item.productionNote} onChange={e => updateItem(item.id, { productionNote: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => removeItem(item.id)} className="absolute -top-4 -right-4 bg-red-500 text-white p-3 rounded-2xl shadow-xl opacity-100 md:opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-[3rem] p-6 md:p-10 text-white grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 shadow-2xl relative overflow-hidden border-4 border-slate-800">
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Tổng giá trị hàng</p>
              <p className="text-3xl font-black tracking-tight tabular-nums">{subtotal.toLocaleString()} đ</p>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Phí dịch vụ & Thuế</p>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-black text-amber-400 flex justify-between">Cước vận chuyển: <span>+{shipping.toLocaleString()}đ</span></p>
                {formData.isVATEnabled && <p className="text-sm font-black text-blue-400 flex justify-between">Thuế VAT ({vatRate}%): <span>+{vatAmount.toLocaleString()}đ</span></p>}
              </div>
            </div>
            <div className="md:col-span-2 flex flex-col items-end justify-center pt-4 md:pt-0 border-t border-slate-800 md:border-0">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] mb-2">TỔNG THANH TOÁN KHÁCH HÀNG</p>
              <p className="text-4xl md:text-6xl font-black text-emerald-400 tabular-nums tracking-tighter">{grandTotal.toLocaleString()} đ</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 md:gap-6 justify-end pt-10 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-10 py-5 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition order-2 md:order-1 text-center">Hủy bỏ</button>
            <button type="submit" className="px-16 py-5 bg-blue-600 text-white rounded-[2rem] font-black shadow-2xl shadow-blue-500/20 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 text-xs uppercase tracking-[0.2em] order-1 md:order-2">
              <Calculator className="w-6 h-6" /> LƯU ĐƠN HÀNG HỆ THỐNG
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderForm;
