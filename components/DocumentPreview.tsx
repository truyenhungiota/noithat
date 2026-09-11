
import React, { useState, useRef } from 'react';
import { Order, OrderStatus, CompanySettings, OrderItem, Supplier } from '../types';
import { X, Printer, FileText, ScrollText, Receipt, Ruler, Truck, Building, Palette, ListChecks, AlertTriangle, Image as ImageIcon, Download, Mail, Phone, Hash, CreditCard, User, MapPin, Globe, Wallet, Clock, HandCoins, Factory } from 'lucide-react';

declare var html2canvas: any;

interface DocumentPreviewProps {
  order: Order;
  company: CompanySettings;
  onClose: () => void;
  supplier?: Supplier;
}

type DocType = 'quote' | 'purchase' | 'invoice' | 'production';

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ order, company, onClose, supplier }) => {
  const [activeDoc, setActiveDoc] = useState<DocType>('quote');
  const [exporting, setExporting] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

  // Tính toán lại giá trị
  const subtotal = order.items.reduce((sum, item) => sum + (item.salePrice * item.quantity), 0);
  const purchaseSubtotal = order.items.reduce((sum, item) => sum + (item.purchasePrice * item.quantity), 0);
  const shipping = order.shippingCost || 0;
  const taxableTotal = subtotal + shipping;
  const vatRate = order.vatRate || 0;
  const vatAmount = order.isVATEnabled ? taxableTotal * (vatRate / 100) : 0;
  const grandTotal = taxableTotal + vatAmount;
  
  const deposit = order.depositAmount || 0;
  const remaining = grandTotal - deposit;

  const formatDateTime = (dt?: string) => {
    if (!dt) return '';
    try {
      if (dt.includes('T')) {
        const [d, t] = dt.split('T');
        const [year, month, day] = d.split('-');
        return `${t.slice(0, 5)} ngày ${day}/${month}/${year}`;
      } else if (dt.includes('-')) {
        const [year, month, day] = dt.split('-');
        return `${day}/${month}/${year}`;
      }
      return dt;
    } catch {
      return dt;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const exportAsImage = async () => {
    if (!documentRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(documentRef.current, {
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `${activeDoc}_${order.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Không thể xuất ảnh HD. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  };

  const renderProductionSheet = () => (
    <div className="space-y-12">
      {order.items.map((item, idx) => (
        <div key={item.id} className="bg-white border-[10px] border-slate-900 overflow-hidden printable mb-12 page-break-after-always">
          <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
              {company.logoUrl ? (
                <div className="w-16 h-16 bg-white rounded-xl p-1 shrink-0 overflow-hidden flex items-center justify-center">
                   <img src={company.logoUrl} className="w-full h-full object-contain" alt="Logo" />
                </div>
              ) : (
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-900 font-black text-xl tracking-tighter shrink-0">HI</div>
              )}
              <div>
                <h2 className="text-3xl font-black uppercase tracking-widest">YÊU CẦU SẢN XUẤT - {order.id}</h2>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">XƯỞNG SẢN XUẤT: {order.supplierName}</p>
              </div>
            </div>
            <div className="text-right flex items-center gap-4">
              <div className="bg-amber-500 text-slate-900 px-4 py-2 rounded-xl">
                <p className="text-[10px] font-black uppercase tracking-widest">Ngày giao hàng</p>
                <p className="text-xl font-black tabular-nums">{new Date(order.deliveryDate).toLocaleDateString('vi-VN')}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row min-h-[600px]">
            <div className="lg:w-1/2 bg-slate-100 flex items-center justify-center p-4 border-r-4 border-slate-900">
               {item.imageUrl ? (
                 <img src={item.imageUrl} className="w-full h-full object-contain shadow-2xl rounded-lg" alt={item.name} />
               ) : (
                 <div className="text-slate-300 flex flex-col items-center">
                   <ImageIcon className="w-32 h-32 mb-4" />
                   <p className="font-black uppercase tracking-widest">Không có ảnh mẫu</p>
                 </div>
               )}
            </div>

            <div className="lg:w-1/2 p-10 space-y-8 flex flex-col justify-between">
               <div className="space-y-6">
                  <div className="space-y-1 border-b-2 border-slate-100 pb-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên sản phẩm</p>
                    <p className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-tight">{item.name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số lượng</p>
                      <p className="text-4xl font-black text-blue-600">{item.quantity} <span className="text-lg text-slate-400">{item.unit}</span></p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Màu sắc</p>
                      <p className="text-2xl font-black text-slate-800 flex items-center gap-2"><Palette className="w-6 h-6 text-amber-500" /> {item.color || 'Theo mẫu'}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Ruler className="w-4 h-4" /> Kích thước chi tiết</p>
                    <p className="text-2xl font-black text-slate-900 italic underline decoration-blue-200 underline-offset-4">{item.dimensions || 'Theo bản vẽ'}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-blue-50/50 p-5 rounded-2xl border-l-8 border-blue-600">
                       <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                         <ListChecks className="w-4 h-4" /> Tùy chọn yêu cầu:
                       </p>
                       <ul className="text-sm font-bold text-slate-700 space-y-2 list-disc pl-5">
                          {item.options ? item.options.split('\n').map((opt, i) => <li key={i}>{opt}</li>) : <li className="italic text-slate-400">Không có tùy chọn thêm</li>}
                       </ul>
                    </div>

                    <div className="bg-red-50/50 p-5 rounded-2xl border-l-8 border-red-600">
                       <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                         <AlertTriangle className="w-4 h-4" /> Lưu ý quan trọng cho xưởng:
                       </p>
                       <ul className="text-sm font-black text-red-800 space-y-2 list-disc pl-5">
                          {item.productionNote ? item.productionNote.split('\n').map((note, i) => <li key={i}>{note}</li>) : <li className="italic text-slate-400">Không có lưu ý đặc biệt</li>}
                       </ul>
                    </div>
                  </div>
               </div>

               <div className="pt-6 border-t border-slate-100 text-center">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Sản xuất bởi: {order.supplierName} - HungIota Pro System</p>
               </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderQuote = () => (
    <div className="p-12 bg-white text-slate-800 printable leading-normal font-sans">
      <div className="flex justify-between items-start border-b-[8px] border-slate-900 pb-10 mb-12">
        <div className="max-w-md">
          <div className="flex items-center gap-4 mb-4">
            {company.logoUrl ? (
                <div className="w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center bg-white border border-slate-100 shadow-sm shrink-0">
                    <img src={company.logoUrl} className="w-full h-full object-contain" alt="Logo" />
                </div>
            ) : (
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-xl tracking-tighter italic shrink-0">HI</div>
            )}
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">BÁO GIÁ</h1>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs font-black text-slate-400 tracking-[0.2em] uppercase">MÃ ĐƠN: <span className="text-slate-900">{order.id}</span></p>
            <p className="text-xs font-black text-slate-400 tracking-[0.2em] uppercase">NGÀY LẬP: <span className="text-slate-900">{new Date(order.orderDate).toLocaleDateString('vi-VN')}</span></p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="font-black text-2xl uppercase text-blue-600 tracking-tight leading-tight">{company.name}</h2>
          <div className="text-[11px] font-bold text-slate-500 mt-4 space-y-1">
            <p className="flex justify-end items-center gap-2 uppercase tracking-tight"><Building className="w-3 h-3 text-blue-600" /> {company.address}</p>
            <p className="flex justify-end items-center gap-2"><Phone className="w-3 h-3 text-blue-600" /> {company.phone} • <Globe className="w-3 h-3 text-blue-600" /> hungiota.com</p>
            <p className="flex justify-end items-center gap-2 font-black text-slate-800 uppercase tracking-widest"><Hash className="w-3 h-3 text-blue-600" /> MST: {company.taxCode}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
        <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-slate-100 relative overflow-hidden group">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-200 pb-2">THÔNG TIN KHÁCH HÀNG:</h3>
          <div className="space-y-3">
             <p className="font-black text-2xl text-slate-900 leading-tight">{order.customerName.toUpperCase()}</p>
             {order.customerCompanyName && <p className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2"><Building className="w-4 h-4 text-blue-500" /> {order.customerCompanyName}</p>}
             <div className="grid grid-cols-1 gap-2 pt-2 text-xs font-bold text-slate-600">
               <div className="flex flex-wrap gap-x-6 gap-y-2">
                 <p className="flex items-center gap-3"><Phone className="w-4 h-4 text-blue-500" /> {order.customerPhone}</p>
                 {order.customerEmail && <p className="flex items-center gap-3"><Mail className="w-4 h-4 text-blue-500" /> {order.customerEmail}</p>}
                 {order.customerTaxCode && <p className="flex items-center gap-3 font-black text-slate-800"><Hash className="w-4 h-4 text-blue-500" /> MST: {order.customerTaxCode}</p>}
               </div>
               <p className="flex items-start gap-3 mt-2 pt-2 border-t border-slate-200 italic"><MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" /> {order.address}</p>
             </div>
          </div>
        </div>
        <div className="bg-slate-900 text-white p-8 rounded-[2rem] flex flex-col justify-between shadow-xl shadow-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="relative z-10">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> THỜI GIAN GIAO HÀNG DỰ KIẾN:</h3>
            <div className="space-y-4">
               <div>
                  <p className="text-4xl font-black tracking-tighter text-blue-400 tabular-nums">{new Date(order.deliveryDate).toLocaleDateString('vi-VN')}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Giao hàng và lắp đặt hoàn thiện</p>
               </div>
               <div className="pt-4 border-t border-white/10">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Địa điểm bàn giao:</p>
                  <p className="text-sm font-bold text-slate-300 line-clamp-2 italic">{order.address}</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      <table className="w-full mb-8 border-collapse">
        <thead>
          <tr className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.2em]">
            <th className="p-4 text-center w-24">ẢNH</th>
            <th className="p-4 text-left">HẠNG MỤC CHI TIẾT</th>
            <th className="p-4 text-center w-12">SL</th>
            <th className="p-4 text-right w-32">ĐƠN GIÁ</th>
            <th className="p-4 text-right w-36">THÀNH TIỀN</th>
          </tr>
        </thead>
        <tbody className="divide-y border-b-2 border-slate-900">
          {order.items.map((item, idx) => (
            <tr key={item.id} className="text-sm hover:bg-slate-50">
              <td className="p-2 text-center">
                <div className="w-20 h-20 mx-auto bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                  ) : (
                    <ImageIcon className="w-full h-full p-4 text-slate-300" />
                  )}
                </div>
              </td>
              <td className="p-5">
                <p className="font-black text-slate-800 text-base mb-1">{item.name}</p>
                <div className="flex items-center gap-4">
                  {item.dimensions && <span className="text-[10px] font-bold text-slate-400 italic">KT: {item.dimensions}</span>}
                  {item.color && <span className="text-[10px] font-bold text-slate-500">Màu: {item.color}</span>}
                  {item.unit && <span className="text-[10px] font-bold text-slate-400">ĐVT: {item.unit}</span>}
                </div>
              </td>
              <td className="p-5 text-center font-black text-slate-800">{item.quantity}</td>
              <td className="p-5 text-right font-medium text-slate-600">{item.salePrice.toLocaleString()}</td>
              <td className="p-5 text-right font-black text-slate-900">{(item.salePrice * item.quantity).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* TOTALS SECTION (Right) */}
      <div className="flex justify-end mb-10 pt-2 border-t border-slate-100">
        <div className="w-full md:w-96 space-y-3 bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex justify-between text-slate-500 font-black text-xs uppercase tracking-widest">
            <span>TỔNG TIỀN HÀNG:</span>
            <span className="text-slate-800 text-base">{subtotal.toLocaleString()} đ</span>
          </div>
          <div className="flex justify-between text-amber-600 font-black text-xs uppercase tracking-widest">
            <span>PHÍ VẬN CHUYỂN:</span>
            <span className="text-base">+{shipping.toLocaleString()} đ</span>
          </div>
          {order.isVATEnabled && (
            <div className="flex justify-between text-blue-600 font-black text-xs uppercase tracking-widest border-t border-blue-100 pt-3">
              <span>THUẾ VAT ({vatRate}%):</span>
              <span className="text-base">+{vatAmount.toLocaleString()} đ</span>
            </div>
          )}
          <div className="flex justify-between items-center text-slate-900 font-black text-lg pt-4 mt-2 border-t-4 border-double border-slate-900">
            <span className="uppercase tracking-[0.2em] text-sm">TỔNG CỘNG:</span>
            <span className="text-3xl tracking-tighter tabular-nums text-blue-600">{grandTotal.toLocaleString()} đ</span>
          </div>
        </div>
      </div>

      {/* FOOTER SECTION: Payment Info (Left) & Representative (Right) */}
      <div className="flex flex-col md:flex-row justify-between gap-12 pt-10 border-t-2 border-slate-900">
        
        {/* LEFT BOTTOM: PAYMENT INFO */}
        <div className="flex-1 space-y-6">
          <div>
            <p className="font-black text-slate-900 not-italic uppercase tracking-widest text-[10px] mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" /> THÔNG TIN THANH TOÁN
            </p>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-slate-600 font-medium max-w-sm">
              <div className="flex items-center gap-2 text-blue-600 font-black uppercase text-xs mb-3 pb-3 border-b border-slate-200">
                <Building className="w-4 h-4" /> {company.bankName}
              </div>
              <div className="space-y-1 mb-4">
                <p className="text-xl font-black text-slate-900 not-italic tracking-tight leading-none">{company.bankAccount}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase italic">Chủ TK: {company.contactPerson}</p>
              </div>

              {(deposit > 0 || order.depositPaymentDate || order.paymentDate || order.invoiceDate || order.finalPaymentInvoiceDate) && (
                <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
                  {deposit > 0 && (
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>Đã đặt cọc:</span>
                      <span className="font-black text-emerald-600">{deposit.toLocaleString()} đ</span>
                    </div>
                  )}
                  {order.depositPaymentDate && (
                    <div className="text-[11px] text-slate-600 flex items-center justify-between gap-2 bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
                      <span className="flex items-center gap-1 font-bold text-emerald-800"><Clock className="w-3.5 h-3.5 text-emerald-600" /> TG chuyển tiền cọc:</span>
                      <span className="font-black text-slate-800">{formatDateTime(order.depositPaymentDate)}</span>
                    </div>
                  )}
                  {(order.paymentDate || order.finalPaymentInvoiceDate) && (
                    <div className="text-[11px] text-slate-600 flex items-center justify-between gap-2 bg-blue-50/70 p-2 rounded-lg border border-blue-100">
                      <span className="flex items-center gap-1 font-bold text-blue-800"><CreditCard className="w-3.5 h-3.5 text-blue-600" /> TG chuyển thanh toán:</span>
                      <span className="font-black text-slate-800">{formatDateTime(order.paymentDate || order.finalPaymentInvoiceDate)}</span>
                    </div>
                  )}
                  {(order.invoiceDate || (!order.paymentDate && order.finalPaymentInvoiceDate)) && (
                    <div className="text-[11px] text-slate-600 flex items-center justify-between gap-2 bg-indigo-50/70 p-2 rounded-lg border border-indigo-100">
                      <span className="flex items-center gap-1 font-bold text-indigo-800"><Receipt className="w-3.5 h-3.5 text-indigo-600" /> TG xuất hoá đơn:</span>
                      <span className="font-black text-slate-800">{formatDateTime(order.invoiceDate || order.finalPaymentInvoiceDate)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT BOTTOM: SIGNATURE */}
        <div className="flex flex-col items-center text-center w-64 pt-4">
          <div className="space-y-1">
              <p className="font-black text-slate-900 not-italic text-lg mb-2 uppercase tracking-tight text-center leading-snug">HỘ KINH DOANH NỘI THẤT<br/>HÙNG IOTA</p>
              <p className="text-slate-400 font-black text-[10px] tracking-widest uppercase">(Ký và ghi rõ họ tên)</p>
          </div>
          <div className="mt-24 w-full border-t-2 border-slate-100 pt-4">
              <p className="font-black text-slate-900 not-italic text-xl uppercase tracking-wide">{company.contactPerson}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPurchaseOrder = () => (
    <div className="p-12 bg-white text-slate-800 printable leading-normal font-sans">
      <div className="flex justify-between items-start border-b-[8px] border-amber-600 pb-10 mb-12">
        <div className="max-w-md">
          <div className="flex items-center gap-4 mb-4">
            {company.logoUrl ? (
                <div className="w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center bg-white border border-slate-100 shadow-sm shrink-0">
                    <img src={company.logoUrl} className="w-full h-full object-contain" alt="Logo" />
                </div>
            ) : (
                <div className="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-xl tracking-tighter italic shrink-0">HI</div>
            )}
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">ĐƠN NHẬP HÀNG</h1>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs font-black text-slate-400 tracking-[0.2em] uppercase">MÃ ĐƠN NHẬP: <span className="text-slate-900">{order.id}</span></p>
            <p className="text-xs font-black text-slate-400 tracking-[0.2em] uppercase">NGÀY LẬP: <span className="text-slate-900">{new Date(order.orderDate).toLocaleDateString('vi-VN')}</span></p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="font-black text-2xl uppercase text-amber-600 tracking-tight leading-tight">{company.name}</h2>
          <p className="text-[11px] font-bold text-slate-500 mt-2 uppercase">{company.address}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-12">
        <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-slate-100">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-200 pb-2">NHÀ CUNG CẤP / XƯỞNG CHI TIẾT:</h3>
          <div className="space-y-3">
             <p className="font-black text-2xl text-slate-900 uppercase">{order.supplierName}</p>
             <p className="text-xs font-bold text-slate-600 flex items-start gap-2 leading-relaxed"><MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-1" /> {order.supplierAddress || supplier?.address || 'Đang cập nhật'}</p>
             <p className="text-sm font-bold text-slate-800 flex items-center gap-2"><Phone className="w-4 h-4 text-amber-500" /> {order.supplierPhone || supplier?.phone || 'Đang cập nhật'}</p>
             
             <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 gap-3">
                <div className="flex items-center gap-2">
                   <Hash className="w-4 h-4 text-amber-600" />
                   <span className="text-[10px] font-black text-slate-400 uppercase">Mã số thuế:</span>
                   <span className="text-xs font-black text-slate-800">{supplier?.taxCode || '---'}</span>
                </div>
                {supplier?.bankAccount && (
                  <div className="bg-amber-100/50 p-3 rounded-xl border border-amber-200 mt-2">
                     <p className="text-[9px] font-black text-amber-600 uppercase mb-2 flex items-center gap-2"><CreditCard className="w-3.5 h-3.5" /> TT THANH TOÁN XƯỞNG:</p>
                     <p className="text-[10px] font-black text-slate-500 uppercase mb-0.5">{supplier.bankName}</p>
                     <p className="text-lg font-black text-slate-900 tracking-tighter leading-none">{supplier.bankAccount}</p>
                     <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 italic">Chủ tài khoản: {order.supplierName}</p>
                  </div>
                )}
             </div>
          </div>
        </div>
        <div className="bg-amber-600 text-white p-8 rounded-[2rem] flex flex-col justify-between shadow-xl shadow-amber-100">
          <div className="space-y-4">
             <div>
                <h3 className="text-[10px] font-black text-amber-200 uppercase tracking-[0.2em] mb-2 flex items-center gap-2"><Clock className="w-4 h-4" /> HẠN HOÀN THÀNH:</h3>
                <p className="text-5xl font-black tracking-tighter tabular-nums">{new Date(order.deliveryDate).toLocaleDateString('vi-VN')}</p>
             </div>
             <div className="pt-4 border-t border-amber-500/50">
                <p className="text-[10px] font-black uppercase text-amber-200 mb-2">Ghi chú nhập hàng xưởng:</p>
                <p className="text-xs italic font-medium leading-relaxed opacity-90">Yêu cầu xưởng kiểm tra kỹ bề mặt sơn, các góc cạnh và phụ kiện bản lề/ray trượt trước khi đóng gói xuất xưởng. Mọi sai sót về kích thước xưởng hoàn toàn chịu trách nhiệm.</p>
             </div>
          </div>
        </div>
      </div>

      <table className="w-full mb-8 border-collapse">
        <thead>
          <tr className="bg-amber-600 text-white text-[11px] font-black uppercase tracking-[0.2em]">
            <th className="p-4 text-left">HẠNG MỤC NHẬP HÀNG</th>
            <th className="p-4 text-center w-12">SL</th>
            <th className="p-4 text-right w-32">ĐƠN GIÁ NHẬP</th>
            <th className="p-4 text-right w-36">THÀNH TIỀN</th>
          </tr>
        </thead>
        <tbody className="divide-y border-b-2 border-amber-600">
          {order.items.map((item, idx) => (
            <tr key={item.id} className="text-sm hover:bg-slate-50">
              <td className="p-5">
                <p className="font-black text-slate-800 text-base mb-1 uppercase">{item.name}</p>
                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                  <span>Màu sắc: {item.color || 'Theo mẫu'}</span>
                  <span>Kích thước: {item.dimensions || 'Theo bản vẽ'}</span>
                  <span className="text-slate-400">ĐVT: {item.unit}</span>
                </div>
              </td>
              <td className="p-5 text-center font-black text-slate-800">{item.quantity}</td>
              <td className="p-5 text-right font-medium text-slate-600">{item.purchasePrice.toLocaleString()}</td>
              <td className="p-5 text-right font-black text-slate-900">{(item.purchasePrice * item.quantity).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mb-16">
        <div className="w-96 space-y-3 bg-amber-50 p-8 rounded-3xl border border-amber-100 shadow-sm">
          <div className="flex justify-between items-center text-amber-900 font-black text-lg pt-2 border-t-4 border-amber-600">
            <span className="uppercase tracking-[0.2em] text-xs">TỔNG TIỀN THANH TOÁN:</span>
            <span className="text-3xl tracking-tighter tabular-nums text-amber-700">{purchaseSubtotal.toLocaleString()} đ</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-16 text-xs italic text-slate-500 border-t-2 border-slate-100 pt-10">
        <div className="flex flex-col items-center justify-between text-center">
            <p className="font-black text-slate-900 not-italic text-lg mb-2 uppercase tracking-tight">NHÀ CUNG CẤP XÁC NHẬN</p>
            <p className="text-slate-400 font-black text-[10px] tracking-widest uppercase">(Ký tên & đóng dấu)</p>
            <div className="mt-20"></div>
        </div>
        <div className="flex flex-col items-center justify-between text-center">
          <div className="space-y-1">
            <p className="font-black text-slate-900 not-italic text-lg mb-2 uppercase tracking-tight">PHÊ DUYỆT NHẬP HÀNG</p>
            <p className="text-slate-400 font-black text-[10px] tracking-widest uppercase">(Ký và ghi rõ họ tên)</p>
          </div>
          <div className="mt-20">
            <p className="font-black text-slate-900 not-italic text-xl underline underline-offset-8 uppercase">{company.contactPerson}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInvoice = () => (
    <div className="p-12 bg-white text-slate-800 printable leading-normal font-sans">
      <div className="flex justify-between items-center mb-16 border-b-4 border-blue-600 pb-10">
         <div className="space-y-2">
           <h1 className="text-6xl font-black text-blue-600 tracking-tighter italic uppercase">HÓA ĐƠN</h1>
           <div className="flex flex-col gap-1">
             <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px]">SỐ: {order.id}-INV</p>
             <p className="text-slate-900 font-black text-sm uppercase tracking-widest">{new Date().toLocaleDateString('vi-VN')}</p>
           </div>
         </div>
         <div className="text-right border-r-8 border-blue-600 pr-10">
           <div className="flex items-center justify-end gap-3 mb-2">
              {company.logoUrl ? (
                  <div className="w-12 h-12 flex items-center justify-center">
                      <img src={company.logoUrl} className="w-full h-full object-contain" alt="Logo" />
                  </div>
              ) : (
                  <span className="font-black text-2xl text-blue-600 tracking-tighter italic">HI</span>
              )}
              <h2 className="font-black text-2xl text-slate-900 uppercase tracking-tight leading-tight">{company.name}</h2>
           </div>
           <p className="text-xs font-bold text-slate-500 mt-2 max-w-xs ml-auto">{company.address}</p>
           <div className="flex flex-col gap-1 mt-3">
             <p className="text-xs font-black text-blue-600 uppercase tracking-widest">MST: {company.taxCode}</p>
             <p className="text-[10px] font-bold text-slate-400">SĐT: {company.phone} • Website: hungiota.com</p>
           </div>
         </div>
      </div>

      <div className="grid grid-cols-2 gap-16 mb-16">
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 border-b border-slate-100 pb-1">ĐƠN VỊ BÁN HÀNG:</h3>
          <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="flex items-start gap-3">
              {company.logoUrl ? (
                  <div className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg overflow-hidden bg-white border border-slate-100">
                      <img src={company.logoUrl} className="w-full h-full object-contain" alt="Logo" />
                  </div>
              ) : (
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm font-black text-xs tracking-tighter">HI</div>
              )}
              <div>
                <p className="font-black text-base text-slate-900 uppercase leading-tight">{company.name}</p>
                <p className="text-[10px] font-bold text-slate-500 mt-1">{company.address}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5 text-blue-600" />
                    <div className="text-[9px] font-black text-slate-700">
                        <p className="uppercase text-[8px] text-blue-600">Ngân hàng: {company.bankName}</p>
                        <p className="text-sm tracking-tight">STK: {company.bankAccount}</p>
                    </div>
                </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 border-b border-slate-100 pb-1">ĐƠN VỊ MUA HÀNG:</h3>
          <div className="space-y-3 bg-white p-4 rounded-xl border-2 border-blue-50 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm"><User className="w-4 h-4" /></div>
              <div className="flex-1">
                <p className="font-black text-base text-slate-900 uppercase leading-tight">{order.customerName}</p>
                {order.customerCompanyName && <p className="text-[10px] font-black text-slate-700 uppercase mt-1">{order.customerCompanyName}</p>}
                <p className="text-[10px] font-bold text-slate-500 mt-1">{order.address}</p>
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
                  {order.customerTaxCode && <p className="text-[9px] font-black uppercase text-slate-400">MST: <span className="text-slate-900">{order.customerTaxCode}</span></p>}
                  {order.customerPhone && <p className="text-[9px] font-black uppercase text-slate-400">SĐT: <span className="text-slate-900">{order.customerPhone}</span></p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <table className="w-full mb-10 border-collapse">
        <thead className="border-b-2 border-slate-900 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 bg-slate-50">
          <tr>
            <th className="py-4 text-center w-20 rounded-tl-xl pl-4">HÌNH ẢNH</th>
            <th className="py-4 text-left pl-6">HÀNG HÓA, DỊCH VỤ CHI TIẾT</th>
            <th className="py-4 text-center w-12">SL</th>
            <th className="py-4 text-right w-24">ĐƠN GIÁ</th>
            <th className="py-4 text-right w-32 pr-4 rounded-tr-xl">THÀNH TIỀN</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {order.items.map((item, idx) => (
            <tr key={item.id} className="hover:bg-slate-50 group transition-colors">
              <td className="py-4 text-center pl-4">
                 <div className="w-16 h-16 mx-auto rounded-lg border border-slate-200 overflow-hidden bg-white flex items-center justify-center">
                   {item.imageUrl ? (
                     <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                   ) : (
                     <ImageIcon className="w-8 h-8 text-slate-200" />
                   )}
                 </div>
              </td>
              <td className="py-4 px-6">
                <div className="flex flex-col">
                  <span className="text-base font-bold text-slate-900 uppercase leading-tight">{item.name}</span>
                  {(item.dimensions || item.color) && (
                    <span className="text-[11px] font-medium text-slate-500 mt-1">{item.dimensions} {item.dimensions && item.color ? '|' : ''} {item.color}</span>
                  )}
                  {item.unit && <span className="text-[10px] text-slate-400 mt-0.5">ĐVT: {item.unit}</span>}
                </div>
              </td>
              <td className="py-4 text-center font-black text-sm">{item.quantity}</td>
              <td className="py-4 text-right font-medium text-slate-600 text-sm">{item.salePrice.toLocaleString()}</td>
              <td className="py-4 text-right font-black text-slate-900 text-sm pr-4">{(item.salePrice * item.quantity).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* FOOTER SECTION: Payment Info (Left) & Totals (Right) */}
      <div className="flex flex-col md:flex-row gap-12 pt-8 border-t border-slate-100">
        
        {/* LEFT COLUMN: PAYMENT BREAKDOWN FOR INVOICE */}
        <div className="flex-1 space-y-4">
           <div className="grid grid-cols-2 gap-8 max-w-sm">
             <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mb-1">Đã tạm ứng</p>
                <p className="text-xl font-black text-emerald-700 tabular-nums tracking-tight">{deposit.toLocaleString()} đ</p>
                {order.depositPaymentDate && (
                  <p className="text-[9px] font-bold text-emerald-800 mt-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3 shrink-0" /> {formatDateTime(order.depositPaymentDate)}
                  </p>
                )}
             </div>
             <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                <p className="text-[9px] font-black text-amber-600 uppercase tracking-wider mb-1">Cần thanh toán</p>
                <p className="text-xl font-black text-amber-700 tabular-nums tracking-tight">{remaining.toLocaleString()} đ</p>
                {(order.paymentDate || order.finalPaymentInvoiceDate) && (
                  <p className="text-[9px] font-bold text-amber-800 mt-1.5 flex items-center gap-1">
                    <CreditCard className="w-3 h-3 shrink-0" /> {formatDateTime(order.paymentDate || order.finalPaymentInvoiceDate)}
                  </p>
                )}
             </div>
          </div>
          {(order.paymentDate || order.finalPaymentInvoiceDate) && (
             <div className="bg-blue-50/80 p-3.5 rounded-xl border border-blue-100 max-w-sm">
                <p className="text-[9px] font-black text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Thời gian khách chuyển thanh toán:
                </p>
                <p className="text-xs font-black text-blue-900 mt-1">{formatDateTime(order.paymentDate || order.finalPaymentInvoiceDate)}</p>
             </div>
          )}
          {(order.invoiceDate || (!order.paymentDate && order.finalPaymentInvoiceDate)) && (
             <div className="bg-indigo-50/80 p-3.5 rounded-xl border border-indigo-100 max-w-sm mt-2">
                <p className="text-[9px] font-black text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-indigo-600" /> Thời gian xuất hoá đơn:
                </p>
                <p className="text-xs font-black text-indigo-900 mt-1">{formatDateTime(order.invoiceDate || order.finalPaymentInvoiceDate)}</p>
             </div>
          )}
          {/* Hiển thị tiền thu hộ nếu có */}
          {order.isCODEnabled && order.codAmount && order.codAmount > 0 && (
             <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 max-w-sm mt-4">
                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-wider mb-1 flex items-center gap-2"><HandCoins className="w-3.5 h-3.5" /> Thu tiền hộ (COD)</p>
                <p className="text-2xl font-black text-indigo-700 tabular-nums tracking-tight">{order.codAmount.toLocaleString()} đ</p>
             </div>
          )}
        </div>

        {/* RIGHT COLUMN: TOTALS with VAT */}
        <div className="w-full md:w-96 flex flex-col items-end">
          <div className="w-full space-y-3 bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex justify-between text-slate-500 font-black text-xs uppercase tracking-widest">
              <span>TỔNG TIỀN HÀNG:</span>
              <span className="text-slate-800 text-base">{subtotal.toLocaleString()} đ</span>
            </div>
            <div className="flex justify-between text-amber-600 font-black text-xs uppercase tracking-widest">
              <span>PHÍ VẬN CHUYỂN:</span>
              <span className="text-base">+{shipping.toLocaleString()} đ</span>
            </div>
            {order.isVATEnabled && (
              <div className="flex justify-between text-blue-600 font-black text-xs uppercase tracking-widest border-t border-blue-100 pt-3">
                <span>THUẾ VAT ({vatRate}%):</span>
                <span className="text-base">+{vatAmount.toLocaleString()} đ</span>
              </div>
            )}
            <div className="flex justify-between items-center text-slate-900 font-black text-lg pt-4 mt-2 border-t-4 border-double border-slate-900">
              <span className="uppercase tracking-[0.2em] text-sm">TỔNG CỘNG:</span>
              <span className="text-3xl tracking-tighter tabular-nums text-blue-600">{grandTotal.toLocaleString()} đ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl h-[95vh] flex flex-col overflow-hidden border border-slate-100">
        <div className="flex justify-between items-center p-6 bg-slate-50 border-b no-print">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActiveDoc('quote')} className={`flex items-center gap-2 px-6 py-2 rounded-xl font-black transition-all text-xs uppercase ${activeDoc === 'quote' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400'}`}>
              <FileText className="w-4 h-4" /> BÁO GIÁ
            </button>
            <button onClick={() => setActiveDoc('purchase')} className={`flex items-center gap-2 px-6 py-2 rounded-xl font-black transition-all text-xs uppercase ${activeDoc === 'purchase' ? 'bg-amber-600 text-white shadow-lg' : 'bg-white text-slate-400'}`}>
              <Truck className="w-4 h-4" /> ĐƠN NHẬP
            </button>
            <button onClick={() => setActiveDoc('production')} className={`flex items-center gap-2 px-6 py-2 rounded-xl font-black transition-all text-xs uppercase ${activeDoc === 'production' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400'}`}>
              <ImageIcon className="w-4 h-4" /> YÊU CẦU SẢN XUẤT
            </button>
            <button onClick={() => setActiveDoc('invoice')} className={`flex items-center gap-2 px-6 py-2 rounded-xl font-black transition-all text-xs uppercase ${activeDoc === 'invoice' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-400'}`}>
              <Receipt className="w-4 h-4" /> HÓA ĐƠN
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={exportAsImage} 
              disabled={exporting}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> {exporting ? 'Đang xuất...' : 'XUẤT ẢNH HD'}
            </button>
            <button onClick={handlePrint} className="p-2.5 bg-white text-slate-800 rounded-xl border border-slate-200 hover:bg-slate-50 transition shadow-sm">
               <Printer className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition shadow-sm">
               <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-100 p-12 scrollbar-thin">
          <div ref={documentRef} className="max-w-[210mm] mx-auto shadow-2xl bg-white min-h-[297mm]">
            {activeDoc === 'quote' && renderQuote()}
            {activeDoc === 'purchase' && renderPurchaseOrder()}
            {activeDoc === 'production' && renderProductionSheet()}
            {activeDoc === 'invoice' && renderInvoice()}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .printable { padding: 0 !important; margin: 0 !important; border-width: 2px !important; }
          .page-break-after-always { page-break-after: always !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
};

export default DocumentPreview;
