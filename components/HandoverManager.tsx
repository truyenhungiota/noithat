
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Order, OrderStatus, HandoverMedia, CompanySettings, UserAccount, UserRole } from '../types';
import { Camera, Plus, Trash2, X, PlayCircle, Maximize2, Lock, ShieldCheck, ImageIcon, UploadCloud, Film, LayoutGrid, ChevronLeft, ChevronRight, Calendar, User, Search, ArrowRight, Clock, Link, Edit3, Save, ExternalLink } from 'lucide-react';
import { Pagination } from './Pagination';

interface HandoverManagerProps {
  orders: Order[];
  company: CompanySettings;
  onUpdateMedia: (orderId: string, media: HandoverMedia[]) => void;
  initialOrderId?: string;
  currentUser: UserAccount;
  onNotify: (message: string, type: 'success' | 'error') => void;
}

const HandoverManager: React.FC<HandoverManagerProps> = ({ orders, company, onUpdateMedia, initialOrderId, currentUser, onNotify }) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(initialOrderId || null);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<HandoverMedia | null>(null);
  const [newMedia, setNewMedia] = useState<Partial<HandoverMedia>>({ type: 'image' });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit URL State
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);
  const [editUrlValue, setEditUrlValue] = useState('');

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isAdmin = currentUser.role === UserRole.ADMIN;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const ordersWithMedia = useMemo(() => {
    return orders
      .filter(o => 
        (o.handoverMedia && o.handoverMedia.length > 0) &&
        (o.id.toLowerCase().includes(searchTerm.toLowerCase()) || o.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .map(o => {
        const latestMediaTimestamp = o.handoverMedia && o.handoverMedia.length > 0
          ? Math.max(...o.handoverMedia.map(m => new Date(m.timestamp).getTime()))
          : 0;
        return { ...o, latestMediaTimestamp };
      })
      .sort((a, b) => b.latestMediaTimestamp - a.latestMediaTimestamp);
  }, [orders, searchTerm]);

  const filteredOrders = useMemo(() => {
    return ordersWithMedia.filter(o => 
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customerName && o.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [ordersWithMedia, searchTerm]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage]);

  const activeOrder = useMemo(() => {
    return orders.find(o => o.id === selectedOrderId);
  }, [orders, selectedOrderId]);

  const isCompleted = activeOrder?.status === OrderStatus.COMPLETED;

  const validateUrl = (type: 'image' | 'video', url: string): boolean => {
    if (type === 'image') {
      return /\.(jpg|jpeg|gif|png|webp)(\?.*)?$/i.test(url) || url.startsWith('data:image/');
    } else {
      // Regex for Youtube (Standard and Shorts)
      return /^(https?\:\/\/)?(www\.youtube\.com|youtu\.?be)\/.+$/i.test(url);
    }
  };

  const getYoutubeVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const addMedia = () => {
    if (!newMedia.url || !activeOrder) {
      onNotify("Vui lòng nhập đường dẫn hoặc tải lên tệp.", 'error');
      return;
    }

    if (!validateUrl(newMedia.type!, newMedia.url)) {
      if (newMedia.type === 'image') {
        onNotify("Đường dẫn hình ảnh phải có đuôi .jpg, .jpeg, .png, .gif, .webp", 'error');
      } else {
        onNotify("Đường dẫn video chỉ hỗ trợ Youtube hoặc Youtube Shorts", 'error');
      }
      return;
    }

    const media: HandoverMedia = {
      id: `MED${Date.now()}`,
      type: newMedia.type || 'image',
      url: newMedia.url,
      timestamp: new Date().toISOString(),
      note: newMedia.note
    };
    onUpdateMedia(activeOrder.id, [...(activeOrder.handoverMedia || []), media]);
    setIsAdding(false);
    setNewMedia({ type: 'image', url: '', note: '' });
    onNotify('Đã thêm tư liệu thành công', 'success');
  };

  const startEditing = (media: HandoverMedia) => {
    setEditingMediaId(media.id);
    setEditUrlValue(media.url);
  };

  const saveEditing = () => {
    if (activeOrder && editingMediaId) {
      const currentMedia = activeOrder.handoverMedia?.find(m => m.id === editingMediaId);
      if (currentMedia && !validateUrl(currentMedia.type, editUrlValue)) {
         if (currentMedia.type === 'image') {
            onNotify("Đường dẫn hình ảnh không hợp lệ (phải .jpg, .png...)", 'error');
         } else {
            onNotify("Đường dẫn video phải là Youtube", 'error');
         }
         return;
      }

      const updatedMedia = (activeOrder.handoverMedia || []).map(m => 
        m.id === editingMediaId ? { ...m, url: editUrlValue } : m
      );
      onUpdateMedia(activeOrder.id, updatedMedia);
      setEditingMediaId(null);
      
      // Update selectedMedia if strictly viewing it
      if (selectedMedia?.id === editingMediaId) {
        setSelectedMedia({ ...selectedMedia, url: editUrlValue });
      }
      onNotify('Đã cập nhật đường dẫn media', 'success');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeOrder) return;

    if (file.size > 5 * 1024 * 1024) {
      onNotify("Dung lượng file quá lớn. Vui lòng chọn file < 5MB.", 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const url = event.target.result as string;
        const date = new Date();
        const folderPath = `${currentUser.name}/${date.getFullYear()}/${date.getMonth() + 1}-${activeOrder.id}/${file.name}`;
        
        console.log("Simulated Upload Path:", folderPath);

        const media: HandoverMedia = {
          id: `MED${Date.now()}`,
          type: newMedia.type || 'image',
          url: url,
          timestamp: new Date().toISOString(),
          note: newMedia.note || `Uploaded to: ${folderPath}`
        };
        
        onUpdateMedia(activeOrder.id, [...(activeOrder.handoverMedia || []), media]);
        setIsAdding(false);
        setNewMedia({ type: 'image', url: '', note: '' });
        onNotify(`Đã tải lên và lưu vào: ${folderPath}`, 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  if (!selectedOrderId) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-50"><Camera className="w-7 h-7" /></div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Thư viện Media Bàn giao</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Quản lý toàn bộ hình ảnh, video thực tế dự án</p>
            </div>
          </div>
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
            <input 
              type="text" 
              placeholder="Tìm theo mã đơn hoặc tên khách..." 
              className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-0 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-emerald-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {paginatedOrders.map(order => {
            const firstMedia = order.handoverMedia?.[0];
            const mediaCount = order.handoverMedia?.length || 0;
            const videoId = firstMedia?.type === 'video' ? getYoutubeVideoId(firstMedia.url) : null;

            return (
              <div 
                key={order.id} 
                onClick={() => setSelectedOrderId(order.id)}
                className="group bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden cursor-pointer"
              >
                <div className="aspect-[4/3] relative bg-slate-100 overflow-hidden">
                  {firstMedia?.type === 'video' ? (
                    videoId ? (
                        <div className="w-full h-full relative">
                            <img src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Video thumb" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <PlayCircle className="w-16 h-16 text-white opacity-90" />
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800">
                            <PlayCircle className="w-16 h-16 text-white/40" />
                        </div>
                    )
                  ) : firstMedia?.url ? (
                    <img src={firstMedia.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={order.id} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200"><ImageIcon className="w-20 h-20" /></div>
                  )}
                  <div className="absolute top-4 right-4 flex gap-2">
                     <span className="px-3 py-1 bg-white/90 backdrop-blur shadow-sm rounded-lg text-[10px] font-black text-slate-800 uppercase flex items-center gap-1.5">
                       <ImageIcon className="w-3 h-3 text-blue-500" /> {mediaCount}
                     </span>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="font-black text-blue-600 text-lg uppercase tracking-tight">{order.id}</h3>
                    <p className="font-black text-slate-800 uppercase text-sm leading-tight line-clamp-1">{order.customerName}</p>
                  </div>
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-50">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-1.5 text-emerald-600">
                         <Clock className="w-3.5 h-3.5" />
                         <span className="text-[9px] font-black uppercase">Cập nhật: {new Date(order.latestMediaTimestamp).toLocaleDateString('vi-VN')}</span>
                       </div>
                       <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] font-black uppercase">Xem Album <ArrowRight className="w-3 h-3" /></span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {ordersWithMedia.length === 0 && (
            <div className="col-span-full py-40 text-center bg-white rounded-[4rem] border-4 border-dashed border-slate-50">
               <ImageIcon className="w-24 h-24 text-slate-100 mx-auto mb-6" />
               <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter">Không tìm thấy tư liệu nào</h3>
            </div>
          )}
        </div>

        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={setCurrentPage} 
          itemsPerPage={itemsPerPage} 
          totalItems={filteredOrders.length} 
          activeColor="emerald" 
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl animate-in zoom-in-95">
      <div className="flex flex-col md:flex-row justify-between items-center border-b pb-8 gap-6">
        <div className="flex items-center gap-5">
          <button 
            onClick={() => setSelectedOrderId(null)} 
            className="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="w-16 h-16 bg-emerald-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-emerald-50"><Camera className="w-8 h-8" /></div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Chi tiết: {activeOrder.id}</h2>
            <div className="flex items-center gap-3 mt-1">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><User className="w-3 h-3" /> {activeOrder.customerName}</span>
               <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
               <span className={`text-[10px] font-black uppercase tracking-widest ${isCompleted ? 'text-emerald-600' : 'text-amber-500'}`}>{activeOrder.status}</span>
            </div>
          </div>
        </div>
        
        {isCompleted ? (
          <button onClick={() => setIsAdding(true)} className="px-10 py-4 bg-emerald-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition flex items-center gap-3 shadow-xl shadow-emerald-100 hover:scale-105 active:scale-95">
            <UploadCloud className="w-6 h-6" /> TẢI LÊN TƯ LIỆU
          </button>
        ) : (
          <div className="flex items-center gap-3 px-8 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-200 cursor-not-allowed">
            <Lock className="w-5 h-5" /> Album chỉ mở khi hoàn thành
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
        {activeOrder.handoverMedia && activeOrder.handoverMedia.length > 0 ? activeOrder.handoverMedia.map(media => {
            const videoId = media.type === 'video' ? getYoutubeVideoId(media.url) : null;
            return (
              <div key={media.id} className="group bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-2xl transition-all duration-500 relative">
                <div className="aspect-[4/5] relative bg-slate-200 cursor-pointer" onClick={() => setSelectedMedia(media)}>
                  {media.type === 'video' ? (
                    videoId ? (
                        <div className="w-full h-full relative">
                            <img src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Video Thumb" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <PlayCircle className="w-12 h-12 text-white opacity-80" />
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800">
                           <PlayCircle className="w-16 h-16 text-white opacity-50" />
                        </div>
                    )
                  ) : (
                    <img src={media.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={media.id} />
                  )}
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                     <button className="px-6 py-3 bg-white text-slate-900 rounded-2xl text-[11px] font-black uppercase shadow-lg flex items-center gap-2 hover:bg-blue-600 hover:text-white transition"><Maximize2 className="w-4 h-4" /> Phóng to</button>
                  </div>
                  <div className="absolute top-4 right-4 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition">
                     <button onClick={(e) => { e.stopPropagation(); startEditing(media); }} className="p-3 bg-white text-blue-600 rounded-full shadow-lg hover:bg-blue-50 hover:scale-110"><Edit3 className="w-5 h-5" /></button>
                  </div>
                </div>
                <div className="p-5 bg-white">
                  {editingMediaId === media.id ? (
                    <div className="flex items-center gap-2">
                      <input maxLength={100} autoFocus className="w-full text-[10px] border border-blue-200 rounded p-1 outline-none" value={editUrlValue} onChange={e => setEditUrlValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEditing()} />
                      <button onClick={saveEditing} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 hover:scale-105 transition shadow-sm"><Save className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <p className="text-[11px] font-bold text-slate-600 line-clamp-1 italic text-center">"{media.note || 'Không có ghi chú'}"</p>
                  )}
                </div>
              </div>
            );
        }) : (
          <div className="col-span-full py-32 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <ImageIcon className="w-20 h-20 text-slate-200 mx-auto mb-6" />
            <h4 className="text-slate-400 font-black uppercase tracking-widest text-sm">Chưa có tư liệu bàn giao</h4>
          </div>
        )}
      </div>

      {selectedMedia && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-2xl z-[200] flex flex-col lg:flex-row p-6 animate-in fade-in">
          {/* Nút thoát nổi bật */}
          <button 
            onClick={() => { setSelectedMedia(null); setEditingMediaId(null); }} 
            className="absolute top-8 right-8 z-[210] p-6 bg-red-600 text-white rounded-full hover:bg-red-700 hover:scale-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(220,38,38,0.5)] border-4 border-white/20"
            title="Đóng xem chi tiết"
          >
            <X className="w-10 h-10" strokeWidth={3} />
          </button>

          <div className="flex-1 flex items-center justify-center relative p-6 lg:p-12 overflow-hidden">
            {selectedMedia.type === 'video' ? (
                (() => {
                    const videoId = getYoutubeVideoId(selectedMedia.url);
                    return videoId ? (
                        <div className="w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10">
                            <iframe 
                                width="100%" 
                                height="100%" 
                                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`} 
                                title="YouTube video player" 
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                allowFullScreen
                            ></iframe>
                        </div>
                    ) : (
                        <div className="w-full max-w-4xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
                           <Film className="w-32 h-32 text-white/20" />
                           <p className="text-white font-black uppercase tracking-widest ml-4">Đang phát Video (Không hỗ trợ Preview)...</p>
                        </div>
                    )
                })()
              ) : (
                <img src={selectedMedia.url} className="max-w-full max-h-[85vh] object-contain rounded-3xl shadow-2xl border-4 border-white/10" alt="Full view" />
              )
            }
          </div>

          <div className="w-full lg:w-[400px] bg-white rounded-[3rem] p-10 space-y-10 animate-in slide-in-from-right-10 shadow-2xl flex flex-col border-l">
            <div><h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-tight">Thông tin Tư liệu</h3><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Xác thực bởi HungIota Pro System</p></div>
            
            <div className="flex-1 space-y-8 overflow-y-auto pr-4">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Mô tả thực tế</p><p className="text-sm font-bold text-slate-700 italic leading-relaxed">"{selectedMedia.note || 'Hình ảnh bàn giao thực tế tại hiện trường đơn hàng.'}"</p></div>
              
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                 <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Link className="w-3 h-3" /> Đường dẫn file</p>
                    <button onClick={() => startEditing(selectedMedia)} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-[10px] font-black uppercase hover:bg-blue-200 hover:scale-105 transition shadow-sm">Sửa link</button>
                 </div>
                 {editingMediaId === selectedMedia.id ? (
                    <div className="flex gap-2 mt-2">
                       <input maxLength={100} className="w-full text-xs border border-blue-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={editUrlValue} onChange={e => setEditUrlValue(e.target.value)} />
                       <button onClick={saveEditing} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition shadow-lg"><Save className="w-5 h-5"/></button>
                    </div>
                 ) : (
                    <div className="flex items-center justify-between gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] text-slate-500 break-all font-mono line-clamp-2">{selectedMedia.url}</p>
                        <a href={selectedMedia.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700"><ExternalLink className="w-4 h-4" /></a>
                    </div>
                 )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-2">Loại tệp</p><p className="text-xs font-black uppercase text-blue-600">{selectedMedia.type}</p></div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-2">Ngày lưu</p><p className="text-xs font-black text-slate-800">{new Date(selectedMedia.timestamp).toLocaleDateString('vi-VN')}</p></div>
              </div>
              
              <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Bản quyền hệ thống</p>
                 <p className="text-xs font-bold text-blue-800 leading-relaxed italic">Tư liệu này thuộc quyền sở hữu của {company.name} và chỉ được lưu hành nội bộ.</p>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100 text-center">
               <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">HungIota Media v2.5</p>
            </div>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg p-6 md:p-12 relative animate-in zoom-in-95">
            <button onClick={() => setIsAdding(false)} className="absolute top-10 right-10 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition"><X className="w-6 h-6" /></button>
            <h2 className="text-3xl font-black text-slate-800 mb-2 uppercase tracking-tighter">Tải lên Tư liệu</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-10">Thêm ảnh/video bàn giao cho đơn {activeOrder.id}</p>
            
            <div className="space-y-8">
               <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2">
                 {['image', 'video'].map(t => (
                   <button 
                    key={t} 
                    onClick={() => setNewMedia({...newMedia, type: t as any})} 
                    className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${newMedia.type === t ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                   >
                     {t === 'image' ? <ImageIcon className="w-4 h-4" /> : <Film className="w-4 h-4" />}
                     {t === 'image' ? 'Hình ảnh' : 'Video'}
                   </button>
                 ))}
               </div>
               
               {/* URL Input */}
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Đường dẫn URL {newMedia.type === 'image' ? '(.jpg, .png...)' : '(Youtube)'}</label>
                 <input maxLength={100} required type="text" placeholder="Dán liên kết tại đây (Max 100 ký tự)..." className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold transition shadow-inner" value={newMedia.url || ''} onChange={e => setNewMedia({...newMedia, url: e.target.value})} />
               </div>

               {isAdmin && (
                 <>
                   {/* File Upload Alternative */}
                   <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200"></div>
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase font-black">
                        <span className="bg-white px-4 text-slate-400">Hoặc tải file lên</span>
                      </div>
                   </div>

                   <div>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept={newMedia.type === 'image' ? "image/*" : "video/*"}
                        onChange={handleFileUpload}
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 font-bold hover:border-emerald-500 hover:text-emerald-600 transition flex flex-col items-center gap-2"
                      >
                        <UploadCloud className="w-6 h-6" />
                        <span className="text-xs uppercase">Chọn file từ máy (Max 5MB)</span>
                      </button>
                   </div>
                 </>
               )}

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Ghi chú nhanh</label>
                 <textarea maxLength={500} rows={3} placeholder="VD: Bàn giao tầng 3, khách kiểm tra OK..." className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm transition shadow-inner" value={newMedia.note || ''} onChange={e => setNewMedia({...newMedia, note: e.target.value})} />
               </div>
               <button onClick={addMedia} className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-50 hover:bg-emerald-700 hover:scale-[1.02] transition active:scale-95 flex items-center justify-center gap-3">
                 <UploadCloud className="w-6 h-6" /> XÁC NHẬN TẢI LÊN
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HandoverManager;
