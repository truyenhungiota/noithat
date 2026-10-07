
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Order, OrderItem, OrderStatus, Customer, Supplier, ShippingUnit, Product, UserAccount } from '../types';
import { Plus, Trash2, X, Image as ImageIcon, Calendar, Ruler, Tag, Truck, Receipt, Calculator, Building, Palette, ListChecks, AlertTriangle, Activity, Wallet, Mail, Clock, Hash, User, Package, HandCoins, CreditCard, Banknote, Search, Check, Phone, RotateCw } from 'lucide-react';
import { compressImage } from '../lib/imageUtils';
import { generateNextOrderId } from '../lib/orderUtils';

interface OrderFormProps {
  order?: Order;
  orders?: Order[];
  customers: Customer[];
  suppliers: Supplier[];
  shippingUnits: ShippingUnit[];
  products?: Product[];
  users: UserAccount[];
  onSave: (order: Order) => void;
  onClose: () => void;
}

const OrderForm: React.FC<OrderFormProps> = ({ order, orders = [], customers, suppliers, shippingUnits, products = [], users, onSave, onClose }) => {
  const [formData, setFormData] = useState<Partial<Order>>(() => {
    if (order) {
      return {
        ...order,
        items: (order.items || []).map((it, idx) => ({
          ...it,
          id: it.id || `item_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
          imageUrl: it.imageUrl || '',
          leatherImageUrl: it.leatherImageUrl || ''
        }))
      };
    }
    return {
      id: generateNextOrderId(orders),
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

      items: [{
        id: `item_${Date.now()}_0_${Math.random().toString(36).substring(2, 7)}`,
        name: '',
        category: '',
        dimensions: '',
        quantity: 1,
        salePrice: 0,
        purchasePrice: 0,
        unit: 'Bộ',
        imageUrl: '',
        leatherImageUrl: '',
        color: '',
        options: '',
        productionNote: ''
      }],
    };
  });

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

  const [customerNameSearch, setCustomerNameSearch] = useState('');
  const [customerPhoneSearch, setCustomerPhoneSearch] = useState('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target as Node)) {
        setIsCustomerSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const safeCustomers = useMemo(() => customers || [], [customers]);

  const filteredCustomers = useMemo(() => {
    const list = safeCustomers;
    const nameTerm = customerNameSearch.trim().toLowerCase();
    const cleanPhoneTerm = customerPhoneSearch.trim().replace(/[\s\.\-\(\)]/g, '');

    if (!nameTerm && !cleanPhoneTerm) return list.slice(0, 50);

    return list.filter(c => {
      let matchesName = true;
      let matchesPhone = true;

      if (nameTerm) {
        matchesName = (c.name || '').toLowerCase().includes(nameTerm) || (c.companyName || '').toLowerCase().includes(nameTerm);
      }
      if (cleanPhoneTerm) {
        const cPhone = (c.phone || '').replace(/[\s\.\-\(\)]/g, '');
        matchesPhone = cPhone.includes(cleanPhoneTerm);
      }
      return matchesName && matchesPhone;
    }).slice(0, 30);
  }, [safeCustomers, customerNameSearch, customerPhoneSearch]);

  const selectedCustomer = useMemo(() => {
    if (!formData.customerId) return null;
    return safeCustomers.find(c => c.id === formData.customerId) || null;
  }, [safeCustomers, formData.customerId]);

  const phoneMatchCustomer = useMemo(() => {
    const phone = (formData.customerPhone || '').replace(/[\s\.\-\(\)]/g, '');
    if (!phone || phone.length < 8) return null;
    if (selectedCustomer && (selectedCustomer.phone || '').replace(/[\s\.\-\(\)]/g, '') === phone) return null;
    return safeCustomers.find(c => {
      const cPhone = (c.phone || '').replace(/[\s\.\-\(\)]/g, '');
      return cPhone === phone;
    });
  }, [safeCustomers, formData.customerPhone, selectedCustomer]);

  const selectCustomer = (cust: Customer) => {
    setFormData(prev => ({
      ...prev,
      customerId: cust.id,
      customerName: cust.name || '',
      customerPhone: cust.phone || '',
      customerEmail: cust.email || '',
      customerID: cust.idCard || '',
      customerCompanyName: cust.companyName || '',
      customerTaxCode: cust.taxCode || '',
      address: cust.address || prev.address || ''
    }));
    setCustomerNameSearch('');
    setCustomerPhoneSearch('');
    setIsCustomerSearchOpen(false);
  };

  const clearSelectedCustomer = () => {
    setFormData(prev => ({
      ...prev,
      customerId: '',
    }));
    setCustomerNameSearch('');
    setCustomerPhoneSearch('');
  };

  const getUserName = (id: string) => {
    const user = users.find(u => u.id === id);
    return user ? user.name : 'Unknown';
  };

  const addItem = () => {
    const newItemId = `item_${Date.now()}_${(formData.items || []).length}_${Math.random().toString(36).substring(2, 7)}`;
    setFormData(prev => ({
      ...prev,
      items: [
        ...(prev.items || []),
        {
          id: newItemId,
          name: '',
          category: '',
          dimensions: '',
          quantity: 1,
          salePrice: 0,
          purchasePrice: 0,
          unit: 'Bộ',
          imageUrl: '',
          leatherImageUrl: '',
          color: '',
          options: '',
          productionNote: ''
        }
      ]
    }));
  };

  const removeItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      items: (prev.items || []).filter(item => item.id !== id)
    }));
  };

  const updateItem = (id: string, updates: Partial<OrderItem>) => {
    setFormData(prev => ({
      ...prev,
      items: (prev.items || []).map(item => item.id === id ? { ...item, ...updates } : item)
    }));
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
    if (!id) {
      clearSelectedCustomer();
      return;
    }
    const cust = safeCustomers.find(c => c.id === id);
    if (cust) {
      selectCustomer(cust);
    }
  };

  const handleSelectSupplier = (id: string) => {
    const sup = suppliers.find(s => s.id === id);
    if (sup) {
      setFormData(prev => ({
        ...prev,
        supplierId: sup.id,
        supplierName: sup.companyName || sup.name || '',
        supplierPhone: sup.phone || '',
        supplierAddress: sup.address || ''
      }));
    }
  };

  const handleSelectShippingUnit = (id: string) => {
    const unit = shippingUnits.find(u => u.id === id);
    if (unit) {
      setFormData(prev => ({
        ...prev,
        shippingUnitId: unit.id,
        shippingUnitName: unit.name || '',
        shippingUnitPhone: unit.phone || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        shippingUnitId: '',
        shippingUnitName: '',
        shippingUnitPhone: ''
      }));
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
            <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl">
              <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">Mã đơn:</span>
              <input
                type="text"
                value={formData.id || ''}
                onChange={e => setFormData({ ...formData, id: e.target.value.trim().toUpperCase() })}
                className="w-24 bg-transparent font-black text-blue-700 outline-none text-sm uppercase"
                title="Mã đơn hàng theo quy chuẩn HI (tăng dần)"
              />
              {!order && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, id: generateNextOrderId(orders) }))}
                  title="Sinh lại mã đơn theo thứ tự tăng dần chuẩn HI"
                  className="p-1 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
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
              <div className="space-y-4 bg-slate-50/70 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200/80">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                      <User className="w-4 h-4" /> Lấy thông tin từ danh bạ khách hàng ({safeCustomers.length})
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      Tìm theo tên hoặc số điện thoại để tự động điền hồ sơ khách hàng
                    </p>
                  </div>
                  {selectedCustomer && (
                    <button 
                      type="button" 
                      onClick={clearSelectedCustomer}
                      className="text-[10px] font-black uppercase text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 transition"
                    >
                      Bỏ liên kết khách hàng
                    </button>
                  )}
                </div>

                {/* 2 ô tìm kiếm riêng biệt: Theo Tên và Theo Số điện thoại */}
                <div className="relative" ref={customerSearchRef}>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Ô 1: Tìm kiếm theo tên khách hàng */}
                    <div className="md:col-span-5 relative">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                        Tìm kiếm theo Tên khách hàng
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input 
                          type="text"
                          placeholder="Nhập tên khách (vd: Minh, Hoa, Trang)..."
                          value={customerNameSearch}
                          onChange={(e) => {
                            setCustomerNameSearch(e.target.value);
                            setIsCustomerSearchOpen(true);
                          }}
                          onFocus={() => setIsCustomerSearchOpen(true)}
                          className="w-full pl-9 pr-8 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
                        />
                        {customerNameSearch && (
                          <button 
                            type="button" 
                            onClick={() => setCustomerNameSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Ô 2: Tìm kiếm theo số điện thoại */}
                    <div className="md:col-span-4 relative">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                        Tìm kiếm theo Số điện thoại
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input 
                          type="text"
                          placeholder="Nhập SĐT (vd: 098, 090...)..."
                          value={customerPhoneSearch}
                          onChange={(e) => {
                            setCustomerPhoneSearch(e.target.value);
                            setIsCustomerSearchOpen(true);
                          }}
                          onFocus={() => setIsCustomerSearchOpen(true)}
                          className="w-full pl-9 pr-8 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
                        />
                        {customerPhoneSearch && (
                          <button 
                            type="button" 
                            onClick={() => setCustomerPhoneSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Ô 3: Chọn trực tiếp từ dropdown danh bạ */}
                    <div className="md:col-span-3">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                        Hoặc chọn từ danh bạ
                      </label>
                      <select 
                        className="w-full py-3 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs cursor-pointer truncate"
                        onChange={e => handleSelectCustomer(e.target.value)}
                        value={formData.customerId || ''}
                      >
                        <option value="">-- Danh bạ ({safeCustomers.length}) --</option>
                        {safeCustomers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name || 'Khách không tên'}{c.phone ? ` (${c.phone})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Popover danh sách kết quả tìm kiếm */}
                  {isCustomerSearchOpen && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                      <div className="p-2.5 border-b bg-slate-50 flex justify-between items-center text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        <span>
                          Kết quả ({filteredCustomers.length} / {safeCustomers.length} khách)
                          {(customerNameSearch || customerPhoneSearch) && (
                            <span className="text-blue-600 ml-1">
                              {[customerNameSearch && `Tên: "${customerNameSearch}"`, customerPhoneSearch && `SĐT: "${customerPhoneSearch}"`].filter(Boolean).join(' & ')}
                            </span>
                          )}
                        </span>
                        <button 
                          type="button" 
                          onClick={() => setIsCustomerSearchOpen(false)}
                          className="text-slate-400 hover:text-slate-600 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map(c => {
                            const isCurr = formData.customerId === c.id;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => selectCustomer(c)}
                                className={`w-full text-left p-3 hover:bg-blue-50 transition flex items-start justify-between gap-3 ${isCurr ? 'bg-blue-50/80 font-black' : ''}`}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-800 uppercase truncate">{c.name || 'Khách không tên'}</span>
                                    {c.companyName && (
                                      <span className="text-[9px] text-blue-600 bg-blue-100/60 px-1.5 py-0.5 rounded font-bold truncate max-w-[150px]">{c.companyName}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 font-semibold">
                                    <span className="text-blue-600 font-black flex items-center gap-1">
                                      <Phone className="w-3 h-3 text-blue-500" /> {c.phone || 'Chưa có SĐT'}
                                    </span>
                                    {c.address && <span className="truncate max-w-[200px] text-slate-400 text-[10px]">{c.address}</span>}
                                  </div>
                                </div>
                                {isCurr ? (
                                  <Check className="w-4 h-4 text-blue-600 shrink-0 mt-1" />
                                ) : (
                                  <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded-lg shrink-0 mt-0.5">Chọn</span>
                                )}
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-6 text-center text-xs text-slate-400 font-bold">
                            Không tìm thấy khách hàng nào khớp với thông tin đã nhập
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Thông báo khách hàng đã chọn */}
                {selectedCustomer && (
                  <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs animate-in fade-in">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">✓</div>
                      <div className="truncate">
                        <span className="font-bold text-slate-600">Đã chọn từ danh bạ: </span>
                        <strong className="font-black text-emerald-950 uppercase">{selectedCustomer.name}</strong>
                        <span className="text-emerald-700 font-black ml-2">({selectedCustomer.phone})</span>
                        {selectedCustomer.companyName && <span className="text-slate-500 ml-1.5">- {selectedCustomer.companyName}</span>}
                        {selectedCustomer.address && <span className="text-slate-400 text-[11px] ml-2 truncate">({selectedCustomer.address})</span>}
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={clearSelectedCustomer}
                      className="text-[10px] font-black uppercase text-slate-500 hover:text-rose-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs hover:border-rose-300 transition shrink-0"
                    >
                      Bỏ liên kết
                    </button>
                  </div>
                )}

                {/* Gợi ý nếu số điện thoại nhập khớp với khách hàng đã có */}
                {phoneMatchCustomer && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-amber-900 min-w-0">
                      <span className="text-base shrink-0">💡</span>
                      <span className="truncate">Số điện thoại này khớp với khách hàng <strong className="font-black uppercase">"{phoneMatchCustomer.name}"</strong> trong danh bạ!</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => selectCustomer(phoneMatchCustomer)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase rounded-xl shadow-xs transition shrink-0"
                    >
                      Điền nhanh thông tin
                    </button>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-blue-500" /> Ngày đặt hàng
                  </label>
                  <input required type="date" className="w-full px-4 py-3 bg-blue-50/30 border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-black text-sm text-blue-700"
                    value={formData.orderDate || ''} onChange={e => setFormData({ ...formData, orderDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-500" /> Ngày giao dự kiến
                  </label>
                  <input required type="date" className="w-full px-4 py-3 bg-amber-50/30 border border-amber-100 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-black text-sm text-amber-700"
                    value={formData.deliveryDate || ''} onChange={e => setFormData({ ...formData, deliveryDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên khách</label>
                  <input maxLength={100} required type="text" placeholder="Nhập tên khách..." className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                    value={formData.customerName || ''} onChange={e => setFormData({ ...formData, customerName: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số điện thoại</label>
                  <input maxLength={15} required type="text" placeholder="09... (Max 15 số)" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                    value={formData.customerPhone || ''} onChange={e => setFormData({ ...formData, customerPhone: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                  <input maxLength={100} type="email" placeholder="khach@gmail.com" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                    value={formData.customerEmail || ''} onChange={e => setFormData({ ...formData, customerEmail: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã số thuế</label>
                  <input maxLength={15} type="text" placeholder="MST (Max 15 số)" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                    value={formData.customerTaxCode || ''} onChange={e => setFormData({ ...formData, customerTaxCode: e.target.value })} />
                </div>
                <div className="lg:col-span-1 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên công ty</label>
                  <input maxLength={200} type="text" placeholder="Tên pháp nhân (nếu có)" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                    value={formData.customerCompanyName || ''} onChange={e => setFormData({ ...formData, customerCompanyName: e.target.value })} />
                </div>
                <div className="lg:col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Địa chỉ bàn giao lắp đặt</label>
                  <input maxLength={300} required type="text" placeholder="Số nhà, đường, quận..." className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                    value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} />
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
                      <option key={s.id} value={s.id} className="text-white">
                        {s.companyName || s.name}{s.phone ? ` - ${s.phone}` : ''}
                      </option>
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
              {(formData.items || []).map((item, index) => {
                const imgInputId = `upload-product-img-${item.id || index}-${index}`;
                const leatherInputId = `upload-leather-img-${item.id || index}-${index}`;

                return (
                  <div key={item.id || `item-key-${index}`} className="p-4 md:p-8 bg-white rounded-[2rem] md:rounded-[2.5rem] border-2 border-slate-100 shadow-sm relative group hover:border-blue-300 transition-all duration-300">
                    <div className="grid grid-cols-12 gap-4 md:gap-8">
                      <div className="col-span-12 lg:col-span-3 space-y-6">
                        {/* Ảnh minh họa sản phẩm */}
                        <div className="space-y-3">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Ảnh minh họa sản phẩm</label>
                          <div 
                            className="relative aspect-square rounded-[2rem] bg-slate-50 overflow-hidden border-2 border-slate-100 shadow-inner group-hover:border-blue-100 transition cursor-pointer group/image"
                            onClick={() => {
                              const input = document.getElementById(imgInputId) as HTMLInputElement;
                              input?.click();
                            }}
                          >
                            {item.imageUrl ? (
                              <img src={item.imageUrl} className="w-full h-full object-contain bg-white" alt="Ảnh sản phẩm" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 group-hover/image:text-blue-500 transition-colors">
                                <ImageIcon className="w-12 h-12 mb-2" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-center px-4">TẢI ẢNH LÊN</span>
                              </div>
                            )}
                            <input 
                              type="file" 
                              id={imgInputId}
                              className="hidden" 
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const compressed = await compressImage(file, 1080, 1080, 0.78);
                                    updateItem(item.id, { imageUrl: compressed });
                                  } catch (err) {
                                    console.error('Lỗi nén ảnh sản phẩm:', err);
                                  } finally {
                                    e.target.value = '';
                                  }
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
                            onClick={() => {
                              const input = document.getElementById(leatherInputId) as HTMLInputElement;
                              input?.click();
                            }}
                          >
                            {item.leatherImageUrl ? (
                              <div className="relative w-full h-full group/preview">
                                <img src={item.leatherImageUrl} className="w-full h-full object-contain bg-white" alt="Ảnh màu da" />
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
                              id={leatherInputId}
                              className="hidden" 
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const compressed = await compressImage(file, 1080, 1080, 0.78);
                                    updateItem(item.id, { leatherImageUrl: compressed });
                                  } catch (err) {
                                    console.error('Lỗi nén ảnh màu da:', err);
                                  } finally {
                                    e.target.value = '';
                                  }
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
                               <option key={p.id} value={p.id}>{p.name}{p.dimensions ? ` - ${p.dimensions}` : ''} ({p.salePrice.toLocaleString()}đ)</option>
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
              );
            })}
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
