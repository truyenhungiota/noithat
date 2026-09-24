
import React, { useState, useRef } from 'react';
import { Order, OrderStatus, CompanySettings, OrderItem, Supplier } from '../types';
import { X, Printer, FileText, ScrollText, Receipt, Ruler, Truck, Building, Palette, ListChecks, AlertTriangle, Image as ImageIcon, Download, Mail, Phone, Hash, CreditCard, User, MapPin, Globe, Wallet, Clock, HandCoins, Factory, PackageCheck } from 'lucide-react';

declare var html2canvas: any;

interface DocumentPreviewProps {
  order: Order;
  company: CompanySettings;
  onClose: () => void;
  supplier?: Supplier;
  initialDoc?: DocType;
}

type DocType = 'quote' | 'purchase' | 'invoice' | 'production' | 'dispatch';

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ order, company, onClose, supplier, initialDoc = 'quote' }) => {
  const [activeDoc, setActiveDoc] = useState<DocType>(initialDoc);
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

    // Lưu vị trí cuộn hiện tại của modal và cửa sổ để không bị nhảy khi xuất
    const scrollContainer = documentRef.current.parentElement;
    const previousScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
    const originalWindowX = window.scrollX || window.pageXOffset || 0;
    const originalWindowY = window.scrollY || window.pageYOffset || 0;

    // Reset cuộn để loại bỏ hoàn toàn lỗi html2canvas bị lệch tọa độ cắt mất phần đầu hoặc đuôi
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
    window.scrollTo(0, 0);

    // Tạo một container staging riêng biệt cố định chiều rộng chuẩn Desktop/A4 (880px)
    // Đảm bảo dù người dùng dùng điện thoại nhỏ hay máy tính, ảnh xuất ra luôn đạt chuẩn full HD, không bị ép co, không rớt cột, không che khuất chữ
    const stagingContainer = document.createElement('div');
    stagingContainer.setAttribute('data-export-staging', 'true');
    stagingContainer.style.position = 'fixed';
    stagingContainer.style.left = '0';
    stagingContainer.style.top = '0';
    stagingContainer.style.width = '880px';
    stagingContainer.style.backgroundColor = '#ffffff';
    stagingContainer.style.zIndex = '-99999';
    stagingContainer.style.opacity = '1';
    stagingContainer.style.pointerEvents = 'none';
    stagingContainer.style.margin = '0';
    // Đệm an toàn 16px màu trắng xung quanh giúp toàn bộ 4 góc viền, bo góc, tiêu đề và chữ ký hiển thị trọn vẹn 100% không bị cắt mép
    stagingContainer.style.padding = '16px';
    stagingContainer.style.boxSizing = 'border-box';
    stagingContainer.style.overflow = 'visible';
    document.body.appendChild(stagingContainer);

    try {
      const exportElement = documentRef.current;

      // Đảm bảo tất cả hình ảnh trong chứng từ đã load xong
      const sourceImages = Array.from(exportElement.querySelectorAll('img'));
      await Promise.all(
        sourceImages.map(img => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 2000);
          });
        })
      );

      await new Promise(r => setTimeout(r, 100));

      const productionCards = exportElement.querySelectorAll('.production-card');

      if (activeDoc === 'production' && productionCards.length > 0) {
        // Với Yêu cầu sản xuất: xuất từng thẻ sản phẩm với viền và 4 góc bo tròn sắc nét, đầy đủ ảnh kiểu dáng, ảnh da và thông số
        for (let i = 0; i < productionCards.length; i++) {
          const card = productionCards[i] as HTMLElement;
          const cardClone = card.cloneNode(true) as HTMLElement;

          cardClone.style.width = '100%';
          cardClone.style.maxWidth = 'none';
          cardClone.style.margin = '0';
          cardClone.style.boxShadow = 'none'; // Gỡ bỏ bóng đổ mờ ngoài để không bị vệt cắt cạnh
          cardClone.style.overflow = 'visible'; // Cho phép viền 10px đen và 4 góc hiển thị trọn vẹn
          cardClone.style.borderRadius = '12px';

          // Mở rộng tất cả container con có overflow giới hạn
          cardClone.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .overflow-hidden').forEach(el => {
            (el as HTMLElement).style.overflow = 'visible';
            (el as HTMLElement).style.maxWidth = 'none';
          });

          // Thiết lập crossOrigin cho hình ảnh
          const cloneImages = Array.from(cardClone.querySelectorAll('img'));
          cloneImages.forEach(img => {
            img.crossOrigin = 'anonymous';
          });

          stagingContainer.innerHTML = '';
          stagingContainer.appendChild(cardClone);

          await Promise.all(
            cloneImages.map(img => {
              if (img.complete && img.naturalWidth > 0) return Promise.resolve();
              return new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve;
                setTimeout(resolve, 1500);
              });
            })
          );

          await new Promise(r => setTimeout(r, 80));

          const canvasWidth = stagingContainer.offsetWidth;
          const canvasHeight = stagingContainer.offsetHeight;

          const canvas = await html2canvas(stagingContainer, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0,
            x: 0,
            y: 0,
            width: canvasWidth,
            height: canvasHeight,
            windowWidth: 1200,
            windowHeight: canvasHeight + 200,
            logging: false
          });

          const link = document.createElement('a');
          const itemSuffix = productionCards.length > 1 ? `_sp_${i + 1}` : '';
          link.download = `yeu_cau_san_xuat_${order.id}${itemSuffix}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();

          if (i < productionCards.length - 1) {
            await new Promise(r => setTimeout(r, 400));
          }
        }
      } else {
        // Đối với Báo giá, Đơn nhập hàng, Phiếu xuất kho, Hóa đơn
        const clone = exportElement.cloneNode(true) as HTMLElement;

        clone.style.width = '100%';
        clone.style.minWidth = '100%';
        clone.style.maxWidth = 'none';
        clone.style.minHeight = 'auto'; // Vừa vặn chiều dài thực tế, không để lại mảng trắng thừa hoặc bị cắt cụt đuôi
        clone.style.boxShadow = 'none';
        clone.style.margin = '0';
        clone.style.borderRadius = '0';
        clone.style.overflow = 'visible';

        // Gỡ bỏ giới hạn cuộn và cắt cạnh ở tất cả bảng biểu và khối dữ liệu
        clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .overflow-hidden').forEach(el => {
          (el as HTMLElement).style.overflow = 'visible';
          (el as HTMLElement).style.maxWidth = 'none';
        });

        // Bỏ line-clamp để không bao giờ bị cắt ngắn địa chỉ hay ghi chú
        clone.querySelectorAll('[class*="line-clamp"]').forEach(el => {
          el.className = el.className.replace(/line-clamp-\d+/g, '');
        });

        // Đảm bảo tất cả bảng chiếm trọn chiều rộng và các cột hiển thị đầy đủ
        clone.querySelectorAll('table').forEach(table => {
          table.style.width = '100%';
          table.style.minWidth = '100%';
        });

        const cloneImages = Array.from(clone.querySelectorAll('img'));
        cloneImages.forEach(img => {
          img.crossOrigin = 'anonymous';
        });

        stagingContainer.innerHTML = '';
        stagingContainer.appendChild(clone);

        await Promise.all(
          cloneImages.map(img => {
            if (img.complete && img.naturalWidth > 0) return Promise.resolve();
            return new Promise(resolve => {
              img.onload = resolve;
              img.onerror = resolve;
              setTimeout(resolve, 1500);
            });
          })
        );

        await new Promise(r => setTimeout(r, 80));

        const canvasWidth = stagingContainer.offsetWidth;
        const canvasHeight = stagingContainer.offsetHeight;

        const canvas = await html2canvas(stagingContainer, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
          width: canvasWidth,
          height: canvasHeight,
          windowWidth: 1200,
          windowHeight: canvasHeight + 200,
          logging: false
        });

        const docNameMap: Record<DocType, string> = {
          quote: 'bao_gia',
          purchase: 'don_nhap',
          production: 'yeu_cau_san_xuat',
          dispatch: 'phieu_xuat_kho',
          invoice: 'hoa_don'
        };

        const link = document.createElement('a');
        link.download = `${docNameMap[activeDoc] || activeDoc}_${order.id}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('Không thể xuất ảnh HD. Vui lòng thử lại.');
    } finally {
      // Dọn dẹp container staging khỏi DOM và khôi phục vị trí cuộn ban đầu
      if (stagingContainer.parentNode) {
        stagingContainer.parentNode.removeChild(stagingContainer);
      }
      if (scrollContainer) {
        scrollContainer.scrollTop = previousScrollTop;
      }
      window.scrollTo(originalWindowX, originalWindowY);
      setExporting(false);
    }
  };

  const renderProductionSheet = () => (
    <div className="space-y-8 bg-transparent">
      {order.items.map((item, idx) => (
        <div key={item.id} className="production-card bg-white border-[8px] md:border-[10px] border-slate-900 overflow-hidden printable mb-8 last:mb-0 shadow-xl page-break-after-always">
          <div className="bg-slate-900 text-white p-4 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              {company.logoUrl ? (
                <div className="w-14 h-14 md:w-16 md:h-16 bg-white rounded-xl p-1 shrink-0 overflow-hidden flex items-center justify-center">
                   <img src={company.logoUrl} className="w-full h-full object-contain" alt="Logo" />
                </div>
              ) : (
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-900 font-black text-xl tracking-tighter shrink-0">HI</div>
              )}
              <div>
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest">YÊU CẦU SẢN XUẤT - {order.id}</h2>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">XƯỞNG SẢN XUẤT: {order.supplierName}</p>
              </div>
            </div>
            <div className="text-left sm:text-right flex items-center gap-4 shrink-0">
              <div className="bg-amber-500 text-slate-900 px-4 py-2 rounded-xl">
                <p className="text-[10px] font-black uppercase tracking-widest">Ngày giao hàng</p>
                <p className="text-lg md:text-xl font-black tabular-nums">{new Date(order.deliveryDate).toLocaleDateString('vi-VN')}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/2 bg-slate-100 flex flex-col items-center justify-center p-4 md:p-6 border-b-4 md:border-b-0 md:border-r-4 border-slate-900 gap-5">
               {/* Ảnh minh họa sản phẩm */}
               {item.imageUrl ? (
                 <div className="w-full flex flex-col items-center justify-center">
                   <div className="w-full flex items-center justify-between mb-2 px-1">
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                       <ImageIcon className="w-3.5 h-3.5 text-blue-600" /> Ảnh kiểu dáng sản phẩm
                     </span>
                   </div>
                   <img 
                     src={item.imageUrl} 
                     className="max-w-full max-h-[340px] md:max-h-[380px] w-auto h-auto object-contain rounded-xl shadow-md border border-slate-200/80 bg-white" 
                     alt={item.name} 
                     crossOrigin="anonymous"
                   />
                 </div>
               ) : (
                 <div className="text-slate-300 flex flex-col items-center py-8">
                   <ImageIcon className="w-16 h-16 mb-2" />
                   <p className="font-black uppercase tracking-widest text-xs">Không có ảnh mẫu kiểu dáng</p>
                 </div>
               )}

               {/* Ảnh màu da đặt dưới hình ảnh sản phẩm */}
               {item.leatherImageUrl && (
                 <div className="w-full flex flex-col items-center justify-center pt-4 border-t-2 border-dashed border-slate-300">
                   <div className="w-full flex items-center justify-between mb-2 px-1">
                     <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 flex items-center gap-1.5 bg-amber-100/80 px-2 py-0.5 rounded">
                       <Palette className="w-3.5 h-3.5 text-amber-600" /> Mẫu màu da / vật liệu bọc
                     </span>
                     {item.color && (
                       <span className="text-[10px] font-bold text-slate-600">
                         Mã màu: <b className="text-slate-900">{item.color}</b>
                       </span>
                     )}
                   </div>
                   <img 
                     src={item.leatherImageUrl} 
                     className="max-w-full max-h-[260px] md:max-h-[300px] w-auto h-auto object-contain rounded-xl shadow-md border-2 border-amber-300/80 bg-white" 
                     alt={`Màu da - ${item.name}`} 
                     crossOrigin="anonymous"
                   />
                 </div>
               )}
            </div>

            <div className="md:w-1/2 p-6 md:p-8 space-y-6 flex flex-col justify-between">
               <div className="space-y-5">
                  <div className="space-y-1 border-b-2 border-slate-100 pb-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên sản phẩm</p>
                    <p className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight leading-tight">{item.name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số lượng</p>
                      <p className="text-3xl md:text-4xl font-black text-blue-600">{item.quantity} <span className="text-base md:text-lg text-slate-400">{item.unit}</span></p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Màu sắc</p>
                      <p className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2"><Palette className="w-5 h-5 text-amber-500 shrink-0" /> {item.color || 'Theo mẫu'}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Ruler className="w-4 h-4" /> Kích thước chi tiết</p>
                    <p className="text-xl md:text-2xl font-black text-slate-900 italic underline decoration-blue-200 underline-offset-4">{item.dimensions || 'Theo bản vẽ'}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-blue-50/50 p-4 rounded-2xl border-l-8 border-blue-600">
                       <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                         <ListChecks className="w-4 h-4" /> Tùy chọn yêu cầu:
                       </p>
                       <ul className="text-sm font-bold text-slate-700 space-y-1.5 list-disc pl-5">
                          {item.options ? item.options.split('\n').map((opt, i) => <li key={i}>{opt}</li>) : <li className="italic text-slate-400">Không có tùy chọn thêm</li>}
                       </ul>
                    </div>

                    <div className="bg-red-50/50 p-4 rounded-2xl border-l-8 border-red-600">
                       <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                         <AlertTriangle className="w-4 h-4" /> Lưu ý quan trọng cho xưởng:
                       </p>
                       <ul className="text-sm font-black text-red-800 space-y-1.5 list-disc pl-5">
                          {item.productionNote ? item.productionNote.split('\n').map((note, i) => <li key={i}>{note}</li>) : <li className="italic text-slate-400">Không có lưu ý đặc biệt</li>}
                       </ul>
                    </div>
                  </div>
               </div>

               <div className="pt-4 border-t border-slate-100 text-center">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Sản xuất bởi: {order.supplierName} - HungIota Pro System</p>
               </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderQuote = () => (
    <div className="p-6 sm:p-8 md:p-12 bg-white text-slate-800 printable leading-normal font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start border-b-[6px] border-slate-900 pb-8 mb-8 gap-6">
        <div className="max-w-md">
          <div className="flex items-center gap-3.5 mb-3">
            {company.logoUrl ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center bg-white border border-slate-100 shadow-sm shrink-0">
                    <img src={company.logoUrl} className="w-full h-full object-contain" alt="Logo" />
                </div>
            ) : (
                <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-md tracking-tighter italic shrink-0">HI</div>
            )}
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight uppercase">BÁO GIÁ</h1>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">MÃ ĐƠN: <span className="font-black text-slate-900">{order.id}</span></p>
            <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">NGÀY LẬP: <span className="font-black text-slate-900">{new Date(order.orderDate).toLocaleDateString('vi-VN')}</span></p>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <h2 className="font-black text-xl uppercase text-blue-600 tracking-tight leading-snug">{company.name}</h2>
          <div className="text-xs font-medium text-slate-500 mt-2 space-y-1">
            <p className="flex sm:justify-end items-center gap-1.5 uppercase"><Building className="w-3.5 h-3.5 text-blue-600 shrink-0" /> {company.address}</p>
            <p className="flex sm:justify-end items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" /> {company.phone} • <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" /> hungiota.com</p>
            <p className="flex sm:justify-end items-center gap-1.5 font-bold text-slate-700 uppercase"><Hash className="w-3.5 h-3.5 text-blue-600 shrink-0" /> MST: {company.taxCode}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-200 pb-2">THÔNG TIN KHÁCH HÀNG:</h3>
          <div className="space-y-2.5">
             <p className="font-black text-xl text-slate-900 leading-snug uppercase">{order.customerName}</p>
             {order.customerCompanyName && <p className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1.5"><Building className="w-3.5 h-3.5 text-blue-500 shrink-0" /> {order.customerCompanyName}</p>}
             <div className="grid grid-cols-1 gap-1.5 pt-1 text-xs text-slate-600">
               <div className="flex flex-wrap gap-x-5 gap-y-1">
                 <p className="flex items-center gap-1.5 font-medium"><Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" /> {order.customerPhone}</p>
                 {order.customerEmail && <p className="flex items-center gap-1.5 font-medium"><Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" /> {order.customerEmail}</p>}
                 {order.customerTaxCode && <p className="flex items-center gap-1.5 font-bold text-slate-800"><Hash className="w-3.5 h-3.5 text-blue-500 shrink-0" /> MST: {order.customerTaxCode}</p>}
               </div>
               <p className="flex items-start gap-1.5 mt-1 pt-1.5 border-t border-slate-200 italic font-medium"><MapPin className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" /> {order.address}</p>
             </div>
          </div>
        </div>
        <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> THỜI GIAN GIAO HÀNG DỰ KIẾN:</h3>
            <div>
               <p className="text-2xl sm:text-3xl font-black tracking-tight text-blue-400 tabular-nums">{new Date(order.deliveryDate).toLocaleDateString('vi-VN')}</p>
               <p className="text-[11px] font-medium text-slate-400 mt-1">Giao hàng và lắp đặt hoàn thiện</p>
            </div>
            <div className="pt-3 border-t border-white/15">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Địa điểm bàn giao:</p>
               <p className="text-xs font-medium text-slate-300 italic mt-0.5 leading-relaxed">{order.address}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto w-full mb-6">
        <table className="w-full border-collapse min-w-[500px]">
          <thead>
            <tr className="bg-slate-900 text-white text-xs font-black uppercase tracking-wider">
              <th className="p-3.5 text-center w-20">ẢNH</th>
              <th className="p-3.5 text-left">HẠNG MỤC CHI TIẾT</th>
              <th className="p-3.5 text-center w-16">SL</th>
              <th className="p-3.5 text-right w-32">ĐƠN GIÁ</th>
              <th className="p-3.5 text-right w-36">THÀNH TIỀN</th>
            </tr>
          </thead>
          <tbody className="divide-y border-b-2 border-slate-900">
            {order.items.map((item, idx) => (
              <tr key={item.id} className="text-sm hover:bg-slate-50">
                <td className="p-2 text-center">
                  <div className="w-16 h-16 mx-auto bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} className="w-full h-full object-contain" alt={item.name} />
                    ) : (
                      <ImageIcon className="w-full h-full p-3.5 text-slate-300" />
                    )}
                  </div>
                </td>
                <td className="p-3.5">
                  <p className="font-black text-slate-900 text-sm md:text-base mb-0.5">{item.name}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 font-medium">
                    {item.dimensions && <span className="italic">KT: {item.dimensions}</span>}
                    {item.color && <span>Màu: {item.color}</span>}
                    {item.unit && <span>ĐVT: {item.unit}</span>}
                  </div>
                </td>
                <td className="p-3.5 text-center font-black text-slate-800 text-sm tabular-nums">{item.quantity}</td>
                <td className="p-3.5 text-right font-semibold text-slate-600 text-sm tabular-nums whitespace-nowrap">{item.salePrice.toLocaleString()} đ</td>
                <td className="p-3.5 text-right font-black text-slate-900 text-sm tabular-nums whitespace-nowrap">{(item.salePrice * item.quantity).toLocaleString()} đ</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TOTALS SECTION */}
      <div className="flex justify-end mb-8 pt-2">
        <div className="w-full sm:w-88 md:w-96 space-y-2.5 bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between text-slate-600 font-bold text-xs uppercase tracking-wide">
            <span>TỔNG TIỀN HÀNG:</span>
            <span className="text-slate-900 text-sm font-black tabular-nums">{subtotal.toLocaleString()} đ</span>
          </div>
          <div className="flex justify-between text-amber-700 font-bold text-xs uppercase tracking-wide">
            <span>PHÍ VẬN CHUYỂN:</span>
            <span className="text-sm font-black tabular-nums">+{shipping.toLocaleString()} đ</span>
          </div>
          {order.isVATEnabled && (
            <div className="flex justify-between text-blue-700 font-bold text-xs uppercase tracking-wide border-t border-blue-100 pt-2.5">
              <span>THUẾ VAT ({vatRate}%):</span>
              <span className="text-sm font-black tabular-nums">+{vatAmount.toLocaleString()} đ</span>
            </div>
          )}
          <div className="flex justify-between items-center text-slate-900 font-black pt-3 mt-1 border-t-2 border-slate-900">
            <span className="uppercase tracking-wider text-xs sm:text-sm">TỔNG CỘNG:</span>
            <span className="text-2xl sm:text-3xl tracking-tight tabular-nums text-blue-600">{grandTotal.toLocaleString()} đ</span>
          </div>
        </div>
      </div>

      {/* FOOTER SECTION: Payment Info & Representative */}
      <div className="flex flex-col md:flex-row justify-between gap-8 pt-8 border-t-2 border-slate-900">
        <div className="flex-1 space-y-4">
          <div>
            <p className="font-black text-slate-900 not-italic uppercase tracking-wider text-[11px] mb-2.5 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-blue-600" /> THÔNG TIN THANH TOÁN
            </p>
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-slate-600 text-xs max-w-sm">
              <div className="flex items-center gap-1.5 text-blue-600 font-black uppercase text-xs mb-2 pb-2 border-b border-slate-200">
                <Building className="w-3.5 h-3.5" /> {company.bankName}
              </div>
              <div className="space-y-0.5 mb-3">
                <p className="text-lg font-black text-slate-900 not-italic tracking-tight tabular-nums">{company.bankAccount}</p>
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Chủ TK: {company.contactPerson}</p>
              </div>

              {(deposit > 0 || order.depositPaymentDate || order.paymentDate || order.invoiceDate || order.finalPaymentInvoiceDate) && (
                <div className="pt-2.5 border-t border-slate-200 space-y-1.5 text-xs">
                  {deposit > 0 && (
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>Đã đặt cọc:</span>
                      <span className="font-black text-emerald-600 tabular-nums">{deposit.toLocaleString()} đ</span>
                    </div>
                  )}
                  {order.depositPaymentDate && (
                    <div className="text-[11px] text-slate-600 flex items-center justify-between gap-2 bg-emerald-50/80 p-2 rounded-lg border border-emerald-100">
                      <span className="flex items-center gap-1 font-bold text-emerald-800"><Clock className="w-3 h-3 text-emerald-600 shrink-0" /> TG chuyển cọc:</span>
                      <span className="font-black text-slate-800">{formatDateTime(order.depositPaymentDate)}</span>
                    </div>
                  )}
                  {(order.paymentDate || order.finalPaymentInvoiceDate) && (
                    <div className="text-[11px] text-slate-600 flex items-center justify-between gap-2 bg-blue-50/80 p-2 rounded-lg border border-blue-100">
                      <span className="flex items-center gap-1 font-bold text-blue-800"><CreditCard className="w-3 h-3 text-blue-600 shrink-0" /> TG thanh toán:</span>
                      <span className="font-black text-slate-800">{formatDateTime(order.paymentDate || order.finalPaymentInvoiceDate)}</span>
                    </div>
                  )}
                  {(order.invoiceDate || (!order.paymentDate && order.finalPaymentInvoiceDate)) && (
                    <div className="text-[11px] text-slate-600 flex items-center justify-between gap-2 bg-indigo-50/80 p-2 rounded-lg border border-indigo-100">
                      <span className="flex items-center gap-1 font-bold text-indigo-800"><Receipt className="w-3 h-3 text-indigo-600 shrink-0" /> TG xuất HĐ:</span>
                      <span className="font-black text-slate-800">{formatDateTime(order.invoiceDate || order.finalPaymentInvoiceDate)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center text-center w-64 pt-2">
          <div className="space-y-1">
              <p className="font-black text-slate-900 not-italic text-base mb-1 uppercase tracking-tight text-center leading-snug">HỘ KINH DOANH NỘI THẤT<br/>HÙNG IOTA</p>
              <p className="text-slate-400 font-bold text-xs tracking-wider uppercase">(Ký và ghi rõ họ tên)</p>
          </div>
          <div className="mt-16 w-full border-t border-slate-200 pt-3">
              <p className="font-black text-slate-900 not-italic text-base uppercase tracking-wide">{company.contactPerson}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPurchaseOrder = () => (
    <div className="p-6 sm:p-8 md:p-12 bg-white text-slate-800 printable leading-normal font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start border-b-[6px] border-amber-600 pb-8 mb-8 gap-6">
        <div className="max-w-md">
          <div className="flex items-center gap-3.5 mb-3">
            {company.logoUrl ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center bg-white border border-slate-100 shadow-sm shrink-0">
                    <img src={company.logoUrl} className="w-full h-full object-contain" alt="Logo" />
                </div>
            ) : (
                <div className="w-14 h-14 bg-amber-600 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-md tracking-tighter italic shrink-0">HI</div>
            )}
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight uppercase">ĐƠN NHẬP HÀNG</h1>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">MÃ ĐƠN NHẬP: <span className="font-black text-slate-900">{order.id}</span></p>
            <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">NGÀY LẬP: <span className="font-black text-slate-900">{new Date(order.orderDate).toLocaleDateString('vi-VN')}</span></p>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <h2 className="font-black text-xl uppercase text-amber-600 tracking-tight leading-snug">{company.name}</h2>
          <div className="text-xs font-medium text-slate-500 mt-2 space-y-1">
            <p className="flex sm:justify-end items-center gap-1.5 uppercase"><Building className="w-3.5 h-3.5 text-amber-600 shrink-0" /> {company.address}</p>
            <p className="flex sm:justify-end items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" /> {company.phone} • <Globe className="w-3.5 h-3.5 text-amber-600 shrink-0" /> hungiota.com</p>
            <p className="flex sm:justify-end items-center gap-1.5 font-bold text-slate-700 uppercase"><Hash className="w-3.5 h-3.5 text-amber-600 shrink-0" /> MST: {company.taxCode}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-200 pb-2">NHÀ CUNG CẤP / XƯỞNG CHI TIẾT:</h3>
          <div className="space-y-2.5">
             <p className="font-black text-xl text-slate-900 uppercase leading-snug">{order.supplierName}</p>
             <p className="text-xs font-medium text-slate-600 flex items-start gap-1.5 leading-relaxed"><MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" /> {order.supplierAddress || supplier?.address || 'Đang cập nhật'}</p>
             <p className="text-xs font-medium text-slate-800 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-amber-500 shrink-0" /> {order.supplierPhone || supplier?.phone || 'Đang cập nhật'}</p>
             
             <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                   <Hash className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                   <span className="font-bold text-slate-500 uppercase text-[11px]">Mã số thuế:</span>
                   <span className="font-black text-slate-900">{supplier?.taxCode || '---'}</span>
                </div>
                {supplier?.bankAccount && (
                  <div className="bg-amber-100/60 p-3 rounded-xl border border-amber-200 mt-1">
                     <p className="text-[10px] font-black text-amber-700 uppercase mb-1 flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> TT THANH TOÁN XƯỞNG:</p>
                     <p className="text-xs font-bold text-slate-600">{supplier.bankName}</p>
                     <p className="text-base font-black text-slate-900 tracking-tight tabular-nums mt-0.5">{supplier.bankAccount}</p>
                     <p className="text-[10px] font-medium text-slate-500 uppercase mt-0.5 italic">Chủ tài khoản: {order.supplierName}</p>
                  </div>
                )}
             </div>
          </div>
        </div>
        <div className="bg-amber-600 text-white p-6 rounded-2xl flex flex-col justify-between shadow-lg">
          <div className="space-y-3">
             <div>
                <h3 className="text-[11px] font-black text-amber-200 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> HẠN HOÀN THÀNH:</h3>
                <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums">{new Date(order.deliveryDate).toLocaleDateString('vi-VN')}</p>
             </div>
             <div className="pt-3 border-t border-amber-500/60">
                <p className="text-[10px] font-black uppercase text-amber-200 mb-1">Ghi chú nhập hàng xưởng:</p>
                <p className="text-xs italic font-medium leading-relaxed opacity-95">Yêu cầu xưởng kiểm tra kỹ bề mặt sơn, các góc cạnh và phụ kiện bản lề/ray trượt trước khi đóng gói xuất xưởng. Mọi sai sót về kích thước xưởng hoàn toàn chịu trách nhiệm.</p>
             </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto w-full mb-6">
        <table className="w-full border-collapse min-w-[500px]">
          <thead>
            <tr className="bg-amber-600 text-white text-xs font-black uppercase tracking-wider">
              <th className="p-3.5 text-left">HẠNG MỤC NHẬP HÀNG</th>
              <th className="p-3.5 text-center w-16">SL</th>
              <th className="p-3.5 text-right w-32">ĐƠN GIÁ NHẬP</th>
              <th className="p-3.5 text-right w-36">THÀNH TIỀN</th>
            </tr>
          </thead>
          <tbody className="divide-y border-b-2 border-amber-600">
            {order.items.map((item, idx) => (
              <tr key={item.id} className="text-sm hover:bg-slate-50">
                <td className="p-3.5">
                  <p className="font-black text-slate-900 text-sm md:text-base mb-0.5 uppercase">{item.name}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 font-medium">
                    <span>Màu: {item.color || 'Theo mẫu'}</span>
                    <span>KT: {item.dimensions || 'Theo bản vẽ'}</span>
                    <span className="text-slate-400">ĐVT: {item.unit}</span>
                  </div>
                </td>
                <td className="p-3.5 text-center font-black text-slate-800 text-sm tabular-nums">{item.quantity}</td>
                <td className="p-3.5 text-right font-semibold text-slate-600 text-sm tabular-nums whitespace-nowrap">{item.purchasePrice.toLocaleString()} đ</td>
                <td className="p-3.5 text-right font-black text-slate-900 text-sm tabular-nums whitespace-nowrap">{(item.purchasePrice * item.quantity).toLocaleString()} đ</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mb-10">
        <div className="w-full sm:w-88 md:w-96 space-y-2.5 bg-amber-50 p-6 rounded-2xl border border-amber-200 shadow-sm">
          <div className="flex justify-between items-center text-amber-950 font-black pt-1 border-t-2 border-amber-600">
            <span className="uppercase tracking-wider text-xs sm:text-sm">TỔNG TIỀN THANH TOÁN:</span>
            <span className="text-2xl sm:text-3xl tracking-tight tabular-nums text-amber-700 font-black">{purchaseSubtotal.toLocaleString()} đ</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 text-xs text-slate-500 border-t-2 border-slate-200 pt-8">
        <div className="flex flex-col items-center justify-between text-center">
            <p className="font-black text-slate-900 not-italic text-base mb-1 uppercase tracking-tight">NHÀ CUNG CẤP XÁC NHẬN</p>
            <p className="text-slate-400 font-bold text-xs tracking-wider uppercase">(Ký tên & đóng dấu)</p>
            <div className="mt-16 w-full border-t border-slate-200 pt-3">
              <p className="font-black text-slate-900 not-italic text-base uppercase tracking-wide">{order.supplierName}</p>
            </div>
        </div>
        <div className="flex flex-col items-center justify-between text-center">
          <div className="space-y-1">
            <p className="font-black text-slate-900 not-italic text-base mb-1 uppercase tracking-tight">PHÊ DUYỆT NHẬP HÀNG</p>
            <p className="text-slate-400 font-bold text-xs tracking-wider uppercase">(Ký và ghi rõ họ tên)</p>
          </div>
          <div className="mt-16 w-full border-t border-slate-200 pt-3">
            <p className="font-black text-slate-900 not-italic text-base uppercase tracking-wide underline underline-offset-4">{company.contactPerson}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDispatchNote = () => {
    const totalQty = order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const supplierDisplayName = supplier?.companyName || order.supplierName;
    const supplierDisplayAddress = order.supplierAddress || supplier?.address || 'Kho xưởng sản xuất';
    const supplierDisplayPhone = order.supplierPhone || supplier?.phone || '---';

    return (
      <div className="p-6 sm:p-8 md:p-12 bg-white text-slate-800 printable leading-normal font-sans">
        {/* Header Phiếu Xuất Kho */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b-[6px] border-teal-700 pb-8 mb-8 gap-6">
          <div className="max-w-md">
            <div className="flex items-center gap-3.5 mb-3">
              <div className="w-14 h-14 bg-teal-700 rounded-xl flex items-center justify-center text-white shadow-md shrink-0">
                <PackageCheck className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight uppercase">PHIẾU XUẤT KHO</h1>
                <p className="text-[11px] font-bold text-teal-700 uppercase tracking-widest mt-0.5">Kiêm biên bản giao nhận hàng hóa</p>
              </div>
            </div>
            <div className="flex flex-col gap-0.5 mt-2">
              <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">
                SỐ PHIẾU: <span className="font-black text-slate-900">PXK-{order.id}</span>
              </p>
              <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">
                CĂN CỨ ĐƠN HÀNG: <span className="font-black text-teal-700">#{order.id}</span>
              </p>
              <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">
                NGÀY XUẤT KHO: <span className="font-black text-slate-900">{new Date(order.deliveryDate || order.orderDate).toLocaleDateString('vi-VN')}</span>
              </p>
            </div>
          </div>

          {/* Thông tin đơn vị xuất kho - Lấy từ xưởng */}
          <div className="text-left sm:text-right">
            <div className="inline-flex sm:justify-end items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-800 rounded-lg text-[10px] font-black uppercase tracking-widest mb-1.5 border border-teal-200">
              <Factory className="w-3.5 h-3.5 text-teal-700 shrink-0" /> KHO XUẤT HÀNG / XƯỞNG SẢN XUẤT
            </div>
            <h2 className="font-black text-xl uppercase text-teal-800 tracking-tight leading-snug">{supplierDisplayName}</h2>
            <div className="text-xs font-medium text-slate-600 mt-2 space-y-1">
              <p className="flex sm:justify-end items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0" /> {supplierDisplayAddress}
              </p>
              <p className="flex sm:justify-end items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-teal-700 shrink-0" /> Hotline xưởng: <span className="font-bold text-slate-900">{supplierDisplayPhone}</span>
              </p>
              {supplier?.taxCode && (
                <p className="flex sm:justify-end items-center gap-1.5 font-bold text-slate-700 uppercase">
                  <Hash className="w-3.5 h-3.5 text-teal-700 shrink-0" /> MST: {supplier.taxCode}
                </p>
              )}
              <p className="text-[11px] text-slate-400 italic sm:text-right pt-0.5">
                Đơn vị điều phối: {company.name} ({company.phone})
              </p>
            </div>
          </div>
        </div>

        {/* Thông tin giao nhận 2 cột */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-3 border-b border-slate-200 pb-2 flex items-center justify-between">
              <span>ĐỊA ĐIỂM & ĐƠN VỊ VẬN CHUYỂN:</span>
              <Truck className="w-4 h-4 text-teal-700" />
            </h3>
            <div className="space-y-2.5 text-xs text-slate-700">
              <div>
                <p className="font-bold text-slate-500 text-[10px] uppercase">Kho xuất xưởng:</p>
                <p className="font-black text-sm text-slate-900 mt-0.5">{order.supplierName} - {supplierDisplayAddress}</p>
              </div>
              <div className="pt-2 border-t border-slate-200/80">
                <p className="font-bold text-slate-500 text-[10px] uppercase">Đơn vị / Người vận chuyển:</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                  {order.shippingUnitName || 'Xe xưởng / Đội giao nhận trực tiếp'}
                </p>
                {order.shippingUnitPhone && (
                  <p className="text-slate-600 font-medium mt-0.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-teal-700 shrink-0" /> {order.shippingUnitPhone}
                  </p>
                )}
              </div>
              <div className="pt-2 border-t border-slate-200/80">
                <p className="font-bold text-slate-500 text-[10px] uppercase">Lý do xuất kho:</p>
                <p className="font-medium text-slate-800 italic mt-0.5">
                  Xuất hàng hoàn thiện giao khách hàng theo đơn hàng #{order.id}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-teal-900 text-white p-6 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden">
            <div className="relative z-10 space-y-3">
              <h3 className="text-[11px] font-black text-teal-200 uppercase tracking-wider flex items-center justify-between border-b border-white/15 pb-2">
                <span>THÔNG TIN BÊN NHẬN HÀNG (ĐƠN VỊ ĐẶT HÀNG):</span>
                <Building className="w-4 h-4 text-teal-300" />
              </h3>
              <div>
                <p className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white leading-snug">
                  {company.name}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-teal-100 mt-1">
                  {company.contactPerson && (
                    <span>Người liên hệ: <strong className="text-white">{company.contactPerson}</strong></span>
                  )}
                  <span>Hotline: <strong className="text-white">{company.phone}</strong></span>
                  {company.taxCode && (
                    <span>MST: <strong className="text-white">{company.taxCode}</strong></span>
                  )}
                </div>
              </div>

              {/* Địa chỉ nhận hàng của khách hàng */}
              <div className="pt-3 border-t border-white/20 space-y-1.5">
                <p className="text-[10px] font-black uppercase text-teal-300 tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-300 shrink-0" /> ĐỊA CHỈ NHẬN HÀNG (CÔNG TRÌNH / KHÁCH HÀNG):
                </p>
                <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                  {order.address}
                </p>
                <p className="text-xs text-teal-100 flex items-center gap-1.5 pt-0.5">
                  <User className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                  Khách nhận bàn giao: <span className="font-bold text-white">{order.customerName}</span> - <span className="font-bold text-white">{order.customerPhone}</span>
                </p>
              </div>

              <div className="pt-2 border-t border-white/15 flex items-center justify-between text-xs">
                <span className="text-teal-300 text-[10px] font-bold uppercase tracking-wider">Hạn giao hàng:</span>
                <span className="font-black text-white tabular-nums">{new Date(order.deliveryDate).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bảng danh sách hàng hóa xuất kho */}
        <div className="overflow-x-auto w-full mb-6">
          <table className="w-full border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-teal-800 text-white text-xs font-black uppercase tracking-wider">
                <th className="p-3 text-center w-10">STT</th>
                <th className="p-3 text-center w-14">ẢNH</th>
                <th className="p-3 text-left">TÊN HÀNG HÓA & QUY CÁCH KỸ THUẬT</th>
                <th className="py-3 px-1.5 text-center w-12">ĐVT</th>
                <th className="py-3 px-1.5 text-center w-12">SL ĐẶT</th>
                <th className="py-3 px-1.5 text-center w-14 bg-teal-900">THỰC XUẤT</th>
                <th className="p-3 text-center w-28 sm:w-32">KCS & GHI CHÚ</th>
              </tr>
            </thead>
            <tbody className="divide-y border-b-2 border-teal-800">
              {order.items.map((item, idx) => (
                <tr key={item.id} className="text-sm hover:bg-slate-50">
                  <td className="p-3 text-center font-bold text-slate-400 text-xs tabular-nums">{idx + 1}</td>
                  <td className="p-2 text-center">
                    <div className="w-12 h-12 mx-auto bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} crossOrigin="anonymous" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-[8px] uppercase">No img</div>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <p className="font-black text-slate-900 text-sm md:text-base mb-1 uppercase tracking-tight">{item.name}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-medium">
                      <span>Màu sắc: <strong className="text-slate-800">{item.color || 'Theo mẫu thiết kế'}</strong></span>
                      <span>Kích thước: <strong className="text-slate-800">{item.dimensions || 'Theo bản vẽ sản xuất'}</strong></span>
                      {item.category && <span className="text-slate-500">Loại: {item.category}</span>}
                    </div>
                    {item.options && (
                      <p className="text-xs text-teal-700 font-medium mt-1 italic">
                        Quy cách / Tùy chọn: {item.options}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-1 text-center font-bold text-slate-600 text-xs uppercase tabular-nums">{item.unit}</td>
                  <td className="py-3 px-1 text-center font-black text-slate-700 text-sm tabular-nums">{item.quantity}</td>
                  <td className="py-3 px-1 text-center font-black text-teal-800 text-base tabular-nums bg-teal-50 border-x border-teal-100">{item.quantity}</td>
                  <td className="p-2.5 text-center text-xs">
                    <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold text-[10px] uppercase">
                      Đạt KCS
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">Nguyên đai kiện</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tổng kết số lượng & quy định */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <p className="font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <ListChecks className="w-4 h-4 text-teal-700" /> QUY ĐỊNH GIAO NHẬN XUẤT KHO:
            </p>
            <ul className="space-y-1.5 text-slate-600 pl-4 list-disc font-medium">
              <li>Hàng hóa đã được kiểm tra kỹ lưỡng về kết cấu, màu sơn, phụ kiện tại xưởng trước khi xuất.</li>
              <li>Bên nhận có trách nhiệm kiểm tra số lượng và hiện trạng bao bì/bề mặt sản phẩm tại thời điểm giao hàng.</li>
              {order.notes && (
                <li className="font-bold text-amber-700">
                  Ghi chú đơn: {order.notes}
                </li>
              )}
            </ul>
          </div>

          <div className="bg-teal-50 p-4 sm:p-5 rounded-2xl border border-teal-200 flex flex-col justify-center space-y-2.5">
            <div className="flex justify-between items-center text-xs font-bold text-teal-900 border-b border-teal-200 pb-2">
              <span>TỔNG SỐ HẠNG MỤC SẢN PHẨM:</span>
              <span className="text-base font-black text-teal-800 tabular-nums">{order.items.length} mặt hàng</span>
            </div>
            <div className="flex justify-between items-center text-teal-950 font-black">
              <span className="uppercase tracking-wider text-xs sm:text-sm">TỔNG SỐ LƯỢNG THỰC XUẤT:</span>
              <span className="text-2xl sm:text-3xl tracking-tight tabular-nums text-teal-700 font-black">
                {totalQty} <span className="text-base font-bold text-teal-600">sản phẩm</span>
              </span>
            </div>
          </div>
        </div>

        {/* Chữ ký xác nhận 4 bên */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-500 border-t-2 border-slate-200 pt-8">
          <div className="flex flex-col items-center justify-between text-center">
            <div className="space-y-1">
              <p className="font-black text-slate-900 not-italic text-sm uppercase tracking-tight">NGƯỜI LẬP PHIẾU</p>
              <p className="text-slate-400 font-medium text-[10px] tracking-wider uppercase">(Ký & ghi rõ họ tên)</p>
            </div>
            <div className="mt-16 w-full border-t border-slate-200 pt-2.5">
              <p className="font-black text-slate-800 text-xs uppercase">{company.contactPerson || 'Bộ phận kho'}</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between text-center">
            <div className="space-y-1">
              <p className="font-black text-slate-900 not-italic text-sm uppercase tracking-tight">NGƯỜI GIAO HÀNG</p>
              <p className="text-slate-400 font-medium text-[10px] tracking-wider uppercase">(Ký & ghi rõ họ tên)</p>
            </div>
            <div className="mt-16 w-full border-t border-slate-200 pt-2.5">
              <p className="font-black text-slate-800 text-xs uppercase">{order.shippingUnitName || 'Nhân viên giao nhận'}</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between text-center">
            <div className="space-y-1">
              <p className="font-black text-slate-900 not-italic text-sm uppercase tracking-tight">THỦ KHO XƯỞNG</p>
              <p className="text-slate-400 font-medium text-[10px] tracking-wider uppercase">(Ký, đóng dấu xưởng)</p>
            </div>
            <div className="mt-16 w-full border-t border-slate-200 pt-2.5">
              <p className="font-black text-teal-800 text-xs uppercase">{order.supplierName}</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between text-center">
            <div className="space-y-1">
              <p className="font-black text-slate-900 not-italic text-sm uppercase tracking-tight">ĐẠI DIỆN BÊN NHẬN</p>
              <p className="text-slate-400 font-medium text-[10px] tracking-wider uppercase">(Ký nhận / Đóng dấu)</p>
            </div>
            <div className="mt-16 w-full border-t border-slate-200 pt-2.5">
              <p className="font-black text-slate-900 text-xs uppercase">{company.contactPerson || company.name}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">({company.name})</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderInvoice = () => (
    <div className="p-6 sm:p-8 md:p-12 bg-white text-slate-800 printable leading-normal font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start border-b-[6px] border-blue-600 pb-8 mb-8 gap-6">
         <div className="max-w-md">
           <div className="flex items-center gap-3.5 mb-3">
             {company.logoUrl ? (
                 <div className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center bg-white border border-slate-100 shadow-sm shrink-0">
                     <img src={company.logoUrl} className="w-full h-full object-contain" alt="Logo" />
                 </div>
             ) : (
                 <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-md tracking-tighter italic shrink-0">HI</div>
             )}
             <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight uppercase">HÓA ĐƠN</h1>
           </div>
           <div className="flex flex-col gap-0.5">
             <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">SỐ HÓA ĐƠN: <span className="font-black text-slate-900">{order.id}-INV</span></p>
             <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">NGÀY LẬP: <span className="font-black text-slate-900">{new Date(order.invoiceDate || order.orderDate).toLocaleDateString('vi-VN')}</span></p>
           </div>
         </div>
         <div className="text-left sm:text-right">
           <h2 className="font-black text-xl uppercase text-blue-600 tracking-tight leading-snug">{company.name}</h2>
           <div className="text-xs font-medium text-slate-500 mt-2 space-y-1">
             <p className="flex sm:justify-end items-center gap-1.5 uppercase"><Building className="w-3.5 h-3.5 text-blue-600 shrink-0" /> {company.address}</p>
             <p className="flex sm:justify-end items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" /> {company.phone} • <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" /> hungiota.com</p>
             <p className="flex sm:justify-end items-center gap-1.5 font-bold text-slate-700 uppercase"><Hash className="w-3.5 h-3.5 text-blue-600 shrink-0" /> MST: {company.taxCode}</p>
           </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-200 pb-2">ĐƠN VỊ BÁN HÀNG:</h3>
          <div className="space-y-2.5">
            <p className="font-black text-xl text-slate-900 uppercase leading-snug">{company.name}</p>
            <p className="text-xs font-medium text-slate-600 flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" /> {company.address}</p>
            <div className="pt-2 border-t border-slate-200 flex flex-col gap-1 text-xs font-medium text-slate-700">
              <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" /> Hotline: {company.phone}</p>
              <p className="flex items-center gap-1.5 font-bold text-slate-900"><Hash className="w-3.5 h-3.5 text-blue-500 shrink-0" /> MST: {company.taxCode}</p>
              <div className="mt-1 bg-blue-50/70 p-2.5 rounded-lg border border-blue-100 flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <div className="text-[11px]">
                  <span className="font-bold text-blue-700">{company.bankName}</span>: <span className="font-black text-slate-900 tabular-nums">{company.bankAccount}</span> ({company.contactPerson})
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-200 pb-2">ĐƠN VỊ MUA HÀNG:</h3>
          <div className="space-y-2.5">
            <p className="font-black text-xl text-slate-900 uppercase leading-snug">{order.customerName}</p>
            {order.customerCompanyName && <p className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1.5"><Building className="w-3.5 h-3.5 text-blue-500 shrink-0" /> {order.customerCompanyName}</p>}
            <p className="text-xs font-medium text-slate-600 flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" /> {order.address}</p>
            <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-x-5 gap-y-1 text-xs font-medium text-slate-700">
              {order.customerTaxCode && <p className="flex items-center gap-1.5 font-bold text-slate-900"><Hash className="w-3.5 h-3.5 text-blue-500 shrink-0" /> MST: {order.customerTaxCode}</p>}
              {order.customerPhone && <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" /> SĐT: {order.customerPhone}</p>}
              {order.customerEmail && <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" /> {order.customerEmail}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto w-full mb-6">
        <table className="w-full border-collapse min-w-[500px]">
          <thead>
            <tr className="bg-slate-900 text-white text-xs font-black uppercase tracking-wider">
              <th className="p-3.5 text-center w-20">ẢNH</th>
              <th className="p-3.5 text-left">HÀNG HÓA, DỊCH VỤ CHI TIẾT</th>
              <th className="p-3.5 text-center w-16">SL</th>
              <th className="p-3.5 text-right w-32">ĐƠN GIÁ</th>
              <th className="p-3.5 text-right w-36">THÀNH TIỀN</th>
            </tr>
          </thead>
          <tbody className="divide-y border-b-2 border-slate-900">
            {order.items.map((item, idx) => (
              <tr key={item.id} className="text-sm hover:bg-slate-50">
                <td className="p-2 text-center">
                   <div className="w-16 h-16 mx-auto rounded-lg border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center">
                     {item.imageUrl ? (
                       <img src={item.imageUrl} className="w-full h-full object-contain" alt={item.name} />
                     ) : (
                       <ImageIcon className="w-full h-full p-3.5 text-slate-300" />
                     )}
                   </div>
                </td>
                <td className="p-3.5">
                  <div className="flex flex-col">
                    <span className="font-black text-slate-900 text-sm md:text-base mb-0.5 uppercase leading-snug">{item.name}</span>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 font-medium">
                      {item.dimensions && <span className="italic">KT: {item.dimensions}</span>}
                      {item.color && <span>Màu: {item.color}</span>}
                      {item.unit && <span>ĐVT: {item.unit}</span>}
                    </div>
                  </div>
                </td>
                <td className="p-3.5 text-center font-black text-slate-800 text-sm tabular-nums">{item.quantity}</td>
                <td className="p-3.5 text-right font-semibold text-slate-600 text-sm tabular-nums whitespace-nowrap">{item.salePrice.toLocaleString()} đ</td>
                <td className="p-3.5 text-right font-black text-slate-900 text-sm tabular-nums whitespace-nowrap">{(item.salePrice * item.quantity).toLocaleString()} đ</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER SECTION: Payment Info & Totals */}
      <div className="flex flex-col md:flex-row justify-between gap-8 mb-8 pt-2">
        <div className="flex-1 space-y-3">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
             <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <p className="text-[11px] font-black text-emerald-700 uppercase tracking-wider mb-1">Đã tạm ứng (Cọc)</p>
                <p className="text-xl font-black text-emerald-700 tabular-nums tracking-tight">{deposit.toLocaleString()} đ</p>
                {order.depositPaymentDate && (
                  <p className="text-[10px] font-medium text-emerald-800 mt-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3 shrink-0 text-emerald-600" /> {formatDateTime(order.depositPaymentDate)}
                  </p>
                )}
             </div>
             <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                <p className="text-[11px] font-black text-amber-700 uppercase tracking-wider mb-1">Còn lại cần thanh toán</p>
                <p className="text-xl font-black text-amber-700 tabular-nums tracking-tight">{remaining.toLocaleString()} đ</p>
                {(order.paymentDate || order.finalPaymentInvoiceDate) && (
                  <p className="text-[10px] font-medium text-amber-800 mt-1.5 flex items-center gap-1">
                    <CreditCard className="w-3 h-3 shrink-0 text-amber-600" /> {formatDateTime(order.paymentDate || order.finalPaymentInvoiceDate)}
                  </p>
                )}
             </div>
          </div>

          {(order.paymentDate || order.finalPaymentInvoiceDate) && (
             <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-100 max-w-md">
                <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Thời gian khách chuyển thanh toán:
                </p>
                <p className="text-xs font-black text-blue-900 mt-0.5">{formatDateTime(order.paymentDate || order.finalPaymentInvoiceDate)}</p>
             </div>
          )}

          {order.isCODEnabled && order.codAmount && order.codAmount > 0 && (
             <div className="bg-indigo-50 p-3.5 rounded-xl border border-indigo-100 max-w-md">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-0.5 flex items-center gap-1.5"><HandCoins className="w-3.5 h-3.5" /> Thu tiền hộ (COD)</p>
                <p className="text-xl font-black text-indigo-700 tabular-nums tracking-tight">{order.codAmount.toLocaleString()} đ</p>
             </div>
          )}
        </div>

        {/* Totals */}
        <div className="w-full sm:w-88 md:w-96 space-y-2.5 bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between text-slate-600 font-bold text-xs uppercase tracking-wide">
            <span>TỔNG TIỀN HÀNG:</span>
            <span className="text-slate-900 text-sm font-black tabular-nums">{subtotal.toLocaleString()} đ</span>
          </div>
          <div className="flex justify-between text-amber-700 font-bold text-xs uppercase tracking-wide">
            <span>PHÍ VẬN CHUYỂN:</span>
            <span className="text-sm font-black tabular-nums">+{shipping.toLocaleString()} đ</span>
          </div>
          {order.isVATEnabled && (
            <div className="flex justify-between text-blue-700 font-bold text-xs uppercase tracking-wide border-t border-blue-100 pt-2.5">
              <span>THUẾ VAT ({vatRate}%):</span>
              <span className="text-sm font-black tabular-nums">+{vatAmount.toLocaleString()} đ</span>
            </div>
          )}
          <div className="flex justify-between items-center text-slate-900 font-black pt-3 mt-1 border-t-2 border-slate-900">
            <span className="uppercase tracking-wider text-xs sm:text-sm">TỔNG CỘNG:</span>
            <span className="text-2xl sm:text-3xl tracking-tight tabular-nums text-blue-600">{grandTotal.toLocaleString()} đ</span>
          </div>
        </div>
      </div>

      {/* Invoice Signatures */}
      <div className="grid grid-cols-2 gap-8 text-xs text-slate-500 border-t-2 border-slate-900 pt-8 mt-6">
        <div className="flex flex-col items-center justify-between text-center">
            <p className="font-black text-slate-900 not-italic text-base mb-1 uppercase tracking-tight">NGƯỜI MUA HÀNG</p>
            <p className="text-slate-400 font-bold text-xs tracking-wider uppercase">(Ký và ghi rõ họ tên)</p>
            <div className="mt-16 w-full border-t border-slate-200 pt-3">
              <p className="font-black text-slate-900 not-italic text-base uppercase tracking-wide">{order.customerName}</p>
            </div>
        </div>
        <div className="flex flex-col items-center justify-between text-center">
          <div className="space-y-1">
            <p className="font-black text-slate-900 not-italic text-base mb-1 uppercase tracking-tight">ĐƠN VỊ BÁN HÀNG</p>
            <p className="text-slate-400 font-bold text-xs tracking-wider uppercase">(Ký, đóng dấu và ghi rõ họ tên)</p>
          </div>
          <div className="mt-16 w-full border-t border-slate-200 pt-3">
            <p className="font-black text-slate-900 not-italic text-base uppercase tracking-wide">{company.contactPerson}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-[60]">
      <div className="bg-white rounded-2xl md:rounded-[2.5rem] shadow-2xl w-full max-w-5xl h-[98vh] md:h-[95vh] flex flex-col overflow-hidden border border-slate-100">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center p-3 sm:p-6 bg-slate-50 border-b gap-3 no-print">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <button onClick={() => setActiveDoc('quote')} className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl font-black transition-all text-[10px] sm:text-xs uppercase ${activeDoc === 'quote' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> BÁO GIÁ
            </button>
            <button onClick={() => setActiveDoc('purchase')} className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl font-black transition-all text-[10px] sm:text-xs uppercase ${activeDoc === 'purchase' ? 'bg-amber-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>
              <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> ĐƠN NHẬP
            </button>
            <button onClick={() => setActiveDoc('production')} className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl font-black transition-all text-[10px] sm:text-xs uppercase ${activeDoc === 'production' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>
              <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> YÊU CẦU SẢN XUẤT
            </button>
            <button onClick={() => setActiveDoc('dispatch')} className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl font-black transition-all text-[10px] sm:text-xs uppercase ${activeDoc === 'dispatch' ? 'bg-teal-700 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>
              <PackageCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> PHIẾU XUẤT KHO
            </button>
            <button onClick={() => setActiveDoc('invoice')} className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl font-black transition-all text-[10px] sm:text-xs uppercase ${activeDoc === 'invoice' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>
              <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> HÓA ĐƠN
            </button>
          </div>
          <div className="flex items-center justify-end gap-2 sm:gap-3">
            <button 
              onClick={exportAsImage} 
              disabled={exporting}
              className="flex-1 sm:flex-none justify-center px-4 sm:px-6 py-2 sm:py-2.5 bg-indigo-600 text-white rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> {exporting ? 'Đang xuất...' : 'XUẤT ẢNH HD'}
            </button>
            <button onClick={handlePrint} className="p-2 sm:p-2.5 bg-white text-slate-800 rounded-xl border border-slate-200 hover:bg-slate-50 transition shadow-sm" title="In">
               <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button onClick={onClose} className="p-2 sm:p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition shadow-sm" title="Đóng">
               <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-100 p-3 sm:p-6 md:p-12 scrollbar-thin">
          <div 
            ref={documentRef} 
            className={`max-w-[210mm] mx-auto shadow-2xl bg-white ${activeDoc === 'production' ? 'min-h-0' : 'min-h-[297mm]'}`}
          >
            {activeDoc === 'quote' && renderQuote()}
            {activeDoc === 'purchase' && renderPurchaseOrder()}
            {activeDoc === 'production' && renderProductionSheet()}
            {activeDoc === 'dispatch' && renderDispatchNote()}
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
