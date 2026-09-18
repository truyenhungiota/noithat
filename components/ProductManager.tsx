
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, UserAccount, Category, UserRole } from '../types';
import { Package, Search, Plus, Edit2, X, ChevronLeft, ChevronRight, Image as ImageIcon, Tag, LayoutGrid, User, FolderPlus, Trash2, Archive, CheckCircle, XCircle, ScanBarcode, Printer, Download } from 'lucide-react';
import { Pagination } from './Pagination';

interface ProductManagerProps {
  products: Product[];
  categories: Category[];
  currentUser: UserAccount;
  users: UserAccount[];
  onAddProduct: (p: Product) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  onAddCategory: (c: Category) => void;
  onUpdateCategory: (c: Category) => void;
  onDeleteCategory: (id: string) => void;
}

const ProductManager: React.FC<ProductManagerProps> = ({ 
  products, categories, currentUser, users,
  onAddProduct, onUpdateProduct, onDeleteProduct, onAddCategory, onUpdateCategory, onDeleteCategory 
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  
  // State for Barcode Printing
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [productToPrint, setProductToPrint] = useState<Product | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const isAdmin = currentUser.role === UserRole.ADMIN;
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Helper function: Lấy tất cả ID của các danh mục con, cháu... (đệ quy)
  const getDescendantIds = (categoryId: string, allCats: Category[]): string[] => {
    const children = allCats.filter(c => c.parentId === categoryId);
    let ids = children.map(c => c.id);
    children.forEach(child => {
      ids = [...ids, ...getDescendantIds(child.id, allCats)];
    });
    return ids;
  };

  // Memoize danh sách ID bị cấm chọn làm cha (Bao gồm chính nó và các con cháu)
  const forbiddenParentIds = useMemo(() => {
    if (!editingCategory?.id) return new Set<string>(); // Tạo mới thì không cấm gì (trừ khi logic khác)
    
    const descendants = getDescendantIds(editingCategory.id, categories);
    return new Set([editingCategory.id, ...descendants]);
  }, [editingCategory, categories]);

  // --- PRODUCT LOGIC ---
  const filteredProducts = useMemo(() => 
    products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm))
    ),
  [products, searchTerm]);

  const totalProductPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct?.id) {
      onUpdateProduct(editingProduct as Product);
    } else {
      const newProd = { 
        ...editingProduct, 
        id: `PROD${Date.now()}${Math.floor(Math.random() * 1000)}`, // Stronger Unique ID
        createdBy: currentUser.id,
        createdAt: new Date().toISOString()
      } as Product;
      onAddProduct(newProd);
    }
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleScanFocus = () => {
    if (searchInputRef.current) {
        searchInputRef.current.focus();
        setSearchTerm('');
    }
  };

  const openPrintModal = (product: Product) => {
      setProductToPrint(product);
      setIsPrintModalOpen(true);
  };

  // --- CATEGORY LOGIC ---
  const filteredCategories = useMemo(() => 
    categories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())),
  [categories, searchTerm]);

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory?.id) {
      onUpdateCategory(editingCategory as Category);
    } else {
      const newCat = {
        ...editingCategory,
        id: `CAT${Date.now()}${Math.floor(Math.random() * 1000)}`, // Stronger Unique ID
        createdBy: currentUser.id,
        createdAt: new Date().toISOString()
      } as Category;
      onAddCategory(newCat);
    }
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
  };

  const categoryTree = useMemo(() => {
    const roots = categories.filter(c => !c.parentId);
    const getChildren = (parentId: string) => categories.filter(c => c.parentId === parentId);
    
    return roots.map(root => ({
      ...root,
      children: getChildren(root.id)
    }));
  }, [categories]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header Controls - Responsive Grid */}
      <div className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
        <div className="flex w-full md:w-auto bg-slate-100 p-1.5 rounded-2xl">
          <button onClick={() => { setActiveTab('products'); setCurrentPage(1); setSearchTerm(''); }} className={`flex-1 md:flex-none justify-center px-4 md:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'products' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>
            <Package className="w-4 h-4" /> Sản phẩm
          </button>
          <button onClick={() => { setActiveTab('categories'); setCurrentPage(1); setSearchTerm(''); }} className={`flex-1 md:flex-none justify-center px-4 md:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'categories' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>
            <LayoutGrid className="w-4 h-4" /> Danh mục
          </button>
        </div>
        
        <div className="flex-1 w-full max-w-full md:max-w-md relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder={activeTab === 'products' ? "Tìm tên hoặc quét mã vạch..." : "Tìm tên danh mục..."}
            className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" 
            value={searchTerm} 
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
          />
          {activeTab === 'products' && (
             <button 
                onClick={handleScanFocus}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-600 transition"
                title="Chế độ quét mã vạch (Focus)"
             >
                <ScanBarcode className="w-5 h-5" />
             </button>
          )}
        </div>

        <div className="w-full md:w-auto">
          {activeTab === 'products' ? (
            <button onClick={() => { setEditingProduct({ unit: 'Cái', salePrice: 0, purchasePrice: 0, stock: 0, status: 'active', barcode: '' }); setIsProductModalOpen(true); }} className="w-full md:w-auto px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-slate-800 transition flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> THÊM SẢN PHẨM
            </button>
          ) : (
            <button onClick={() => { setEditingCategory({}); setIsCategoryModalOpen(true); }} className="w-full md:w-auto px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-slate-800 transition flex items-center justify-center gap-2">
              <FolderPlus className="w-4 h-4" /> THÊM DANH MỤC
            </button>
          )}
        </div>
      </div>

      {activeTab === 'products' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {paginatedProducts.map(product => {
              const isInactive = product.status === 'inactive';
              return (
                <div key={product.id} className={`bg-white rounded-[2rem] md:rounded-[2.5rem] p-4 md:p-5 border border-slate-100 shadow-sm group hover:shadow-xl transition-all duration-300 flex flex-col relative overflow-hidden ${isInactive ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                  <div className="aspect-square rounded-3xl bg-slate-50 mb-4 overflow-hidden relative border-2 border-slate-50 group-hover:border-indigo-100 transition">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain bg-white" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200"><ImageIcon className="w-16 h-16" /></div>
                    )}
                    
                    <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                       {product.stock <= 0 && (
                          <span className="px-2 py-1 bg-red-500 text-white text-[8px] font-black uppercase rounded-md shadow-sm">Hết hàng</span>
                       )}
                       {isInactive && (
                          <span className="px-2 py-1 bg-slate-800 text-white text-[8px] font-black uppercase rounded-md shadow-sm">Ngừng KD</span>
                       )}
                    </div>

                    <div className="absolute top-2 left-2 md:top-4 md:left-4 opacity-100 md:opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col gap-2">
                      <button onClick={() => { setEditingProduct(product); setIsProductModalOpen(true); }} className="p-2 bg-white rounded-xl text-blue-600 shadow-lg hover:scale-110 transition border border-blue-50"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => openPrintModal(product)} className="p-2 bg-white rounded-xl text-slate-600 shadow-lg hover:bg-slate-50 hover:scale-110 transition border border-slate-50" title="In mã vạch"><Printer className="w-4 h-4" /></button>
                      {isAdmin && (
                        <button onClick={() => onDeleteProduct(product.id)} className="p-2 bg-white rounded-xl text-red-600 shadow-lg hover:bg-red-50 hover:scale-110 transition border border-red-50"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-slate-800 text-sm uppercase leading-tight line-clamp-2 mb-1" title={product.name}>{product.name}</h4>
                    
                    <div className="mb-3 flex justify-between items-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[9px] font-black uppercase tracking-wide">
                           <User className="w-3 h-3" /> {getUserName(product.createdBy)}
                        </span>
                        <span className={`text-[10px] font-bold ${product.stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>Kho: {product.stock || 0}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {product.barcode && <span className="px-2 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg text-[9px] font-mono tracking-wider flex items-center gap-1"><ScanBarcode className="w-3 h-3"/> {product.barcode}</span>}
                      {product.categoryName ? (
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-wider">{product.categoryName}</span>
                      ) : (
                          <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-wider">{product.category || 'Chưa phân loại'}</span>
                      )}
                    </div>
                    <div className="space-y-1 pt-3 border-t border-slate-50">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wide">
                        <span>Giá bán:</span>
                        <span className="text-slate-900 font-black text-sm">{product.salePrice.toLocaleString()}đ</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wide">
                        <span>Giá nhập:</span>
                        <span className="text-amber-600 font-black text-sm">{product.purchasePrice.toLocaleString()}đ</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {paginatedProducts.length === 0 && (
              <div className="col-span-full py-32 text-center text-slate-400 font-black uppercase tracking-widest text-xs bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                Chưa có sản phẩm nào. Hãy thêm mới!
              </div>
            )}
          </div>

          <Pagination 
            currentPage={currentPage} 
            totalPages={totalProductPages} 
            onPageChange={setCurrentPage} 
            itemsPerPage={itemsPerPage} 
            totalItems={filteredProducts.length} 
            activeColor="emerald" 
          />
        </div>
      ) : (
        <div className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCategories.map(cat => {
                 const displayName = getDisplayName(cat.name, cat.createdBy, categories);
                 return (
                   <div key={cat.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative group hover:border-indigo-100 transition-all">
                      <div className="flex items-start justify-between mb-4">
                         <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                            {cat.parentId ? <Tag className="w-6 h-6" /> : <LayoutGrid className="w-6 h-6" />}
                         </div>
                         <div className="flex gap-2">
                            <button onClick={() => { setEditingCategory(cat); setIsCategoryModalOpen(true); }} className="p-2 bg-slate-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition"><Edit2 className="w-4 h-4" /></button>
                            {isAdmin && (
                                <button onClick={() => onDeleteCategory(cat.id)} className="p-2 bg-slate-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition"><Trash2 className="w-4 h-4" /></button>
                            )}
                         </div>
                      </div>
                      <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-1" title={displayName}>{displayName}</h4>
                      {cat.parentId && (
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-2">
                             Thuộc: {categories.find(c => c.id === cat.parentId)?.name || 'Unknown'}
                          </p>
                      )}
                      <div className="pt-4 mt-2 border-t border-slate-50 flex justify-between items-center">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><User className="w-3 h-3" /> {getUserName(cat.createdBy)}</p>
                         <span className="text-[9px] font-bold text-slate-300">{new Date(cat.createdAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                   </div>
                 );
              })}
              {filteredCategories.length === 0 && (
                <div className="col-span-full py-32 text-center text-slate-400 font-black uppercase tracking-widest text-xs bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                  Chưa có danh mục nào. Hãy tạo mới!
                </div>
              )}
           </div>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-6 md:p-6 md:p-10 relative animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsProductModalOpen(false)} className="absolute top-6 right-6 md:top-8 md:right-8 p-2 bg-slate-100 rounded-full transition hover:bg-slate-200"><X className="w-6 h-6" /></button>
            <h2 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-widest mt-2">{editingProduct?.id ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}</h2>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Tên sản phẩm</label>
                <input maxLength={500} required placeholder="Tên sản phẩm..." className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-indigo-500" value={editingProduct?.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
              </div>
              
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Danh mục</label>
                 <select 
                    className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    value={editingProduct?.categoryId || ''}
                    onChange={(e) => {
                        const selectedId = e.target.value;
                        const cat = categories.find(c => c.id === selectedId);
                        setEditingProduct({...editingProduct, categoryId: selectedId, categoryName: cat?.name || ''});
                    }}
                 >
                    <option value="">-- Chọn danh mục --</option>
                    {categoryTree.map(root => {
                        const rootDisplayName = getDisplayName(root.name, root.createdBy, categories);
                        return (
                          <React.Fragment key={root.id}>
                              <option value={root.id} className="font-bold">{rootDisplayName}</option>
                              {root.children && root.children.map(child => {
                                  const childDisplayName = getDisplayName(child.name, child.createdBy, categories);
                                  return (
                                    <option key={child.id} value={child.id}>&nbsp;&nbsp;&nbsp;↳ {childDisplayName}</option>
                                  );
                              })}
                          </React.Fragment>
                        );
                    })}
                 </select>
              </div>

              {/* Barcode Input */}
              <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Mã vạch (Barcode)</label>
                  <div className="relative">
                     <ScanBarcode className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                     <input maxLength={50} placeholder="Quét hoặc nhập mã..." className="w-full pl-14 pr-6 py-4 bg-slate-50 border rounded-2xl font-bold font-mono outline-none focus:ring-2 focus:ring-indigo-500" value={editingProduct?.barcode || ''} onChange={e => setEditingProduct({...editingProduct, barcode: e.target.value})} />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Số lượng tồn kho</label>
                      <input type="number" min="0" max="2000" required placeholder="0" className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-indigo-500" value={editingProduct?.stock || 0} onChange={e => setEditingProduct({...editingProduct, stock: Math.min(parseInt(e.target.value) || 0, 2000) })} />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Đơn vị tính</label>
                      <input maxLength={500} required placeholder="Cái, Bộ..." className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-indigo-500" value={editingProduct?.unit || ''} onChange={e => setEditingProduct({...editingProduct, unit: e.target.value})} />
                  </div>
              </div>

              <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Tình trạng kinh doanh</label>
                  <div className="flex gap-4 bg-slate-50 p-2 rounded-2xl border">
                      <button 
                        type="button"
                        onClick={() => setEditingProduct({...editingProduct, status: 'active'})}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition flex items-center justify-center gap-2 ${editingProduct?.status === 'active' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:bg-white'}`}
                      >
                        <CheckCircle className="w-4 h-4" /> Đang bán
                      </button>
                      <button 
                        type="button"
                        onClick={() => setEditingProduct({...editingProduct, status: 'inactive'})}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition flex items-center justify-center gap-2 ${editingProduct?.status === 'inactive' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:bg-white'}`}
                      >
                        <XCircle className="w-4 h-4" /> Ngừng KD
                      </button>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Kích thước</label>
                  <input maxLength={100} placeholder="DxRxC..." className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-indigo-500" value={editingProduct?.dimensions || ''} onChange={e => setEditingProduct({...editingProduct, dimensions: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Màu sắc</label>
                  <input maxLength={100} placeholder="Màu gỗ..." className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-indigo-500" value={editingProduct?.color || ''} onChange={e => setEditingProduct({...editingProduct, color: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Giá bán (VNĐ)</label>
                  <input type="number" min="0" max="99999999999" required className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-indigo-500" value={editingProduct?.salePrice || 0} onChange={e => setEditingProduct({...editingProduct, salePrice: Math.min(parseInt(e.target.value) || 0, 99999999999) })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Giá nhập (VNĐ)</label>
                  <input type="number" min="0" max="99999999999" required className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-indigo-500" value={editingProduct?.purchasePrice || 0} onChange={e => setEditingProduct({...editingProduct, purchasePrice: Math.min(parseInt(e.target.value) || 0, 99999999999) })} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Hình ảnh</label>
                <div className="flex gap-4">
                  <div 
                    className="w-16 h-16 shrink-0 rounded-2xl bg-slate-50 border-2 border-slate-100 overflow-hidden relative group/image cursor-pointer flex items-center justify-center"
                    onClick={() => document.getElementById('product-image-upload')?.click()}
                    title="Tải ảnh lên"
                  >
                    {editingProduct?.imageUrl ? (
                      <img src={editingProduct.imageUrl} className="w-full h-full object-contain bg-white" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300 group-hover/image:text-indigo-500 transition-colors" />
                    )}
                    <input 
                      type="file" 
                      id="product-image-upload"
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setEditingProduct({...editingProduct, imageUrl: reader.result as string});
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                  <input type="text" placeholder="Dán link ảnh hoặc tải lên..." className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-indigo-500 text-xs self-center" value={editingProduct?.imageUrl || ''} onChange={e => setEditingProduct({...editingProduct, imageUrl: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Mô tả thêm</label>
                <textarea maxLength={500} rows={2} className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={editingProduct?.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} />
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition mt-4">
                LƯU SẢN PHẨM
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-6 md:p-10 relative animate-in zoom-in-95">
             <button onClick={() => setIsCategoryModalOpen(false)} className="absolute top-8 right-8 p-2 bg-slate-100 rounded-full transition hover:bg-slate-200"><X className="w-6 h-6" /></button>
             <h2 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-widest">{editingCategory?.id ? 'Cập nhật danh mục' : 'Thêm danh mục'}</h2>
             <form onSubmit={handleSaveCategory} className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Tên danh mục</label>
                   <input maxLength={200} required placeholder="Nhập tên danh mục..." className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-indigo-500" value={editingCategory?.name || ''} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Danh mục cha (Tùy chọn)</label>
                   <select 
                      className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      value={editingCategory?.parentId || ''}
                      onChange={(e) => setEditingCategory({...editingCategory, parentId: e.target.value || null})}
                   >
                      <option value="">-- Là danh mục gốc --</option>
                      {categories.filter(c => !forbiddenParentIds.has(c.id)).map(c => (
                          <option key={c.id} value={c.id}>{getDisplayName(c.name, c.createdBy, categories)}</option>
                      ))}
                   </select>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Mô tả</label>
                   <textarea maxLength={200} rows={2} className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={editingCategory?.description || ''} onChange={e => setEditingCategory({...editingCategory, description: e.target.value})} />
                </div>
                <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition mt-4">
                   LƯU DANH MỤC
                </button>
             </form>
          </div>
        </div>
      )}

      {/* Print Barcode Modal */}
      {isPrintModalOpen && productToPrint && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[120] animate-in fade-in">
           <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col relative overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50 no-print">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border flex items-center justify-center text-slate-700"><Printer className="w-6 h-6" /></div>
                    <div>
                       <h3 className="text-lg font-black text-slate-800 uppercase">In Tem Mã Vạch</h3>
                       <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{productToPrint.name}</p>
                    </div>
                 </div>
                 <div className="flex gap-3">
                    <button onClick={() => window.print()} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition shadow-lg flex items-center gap-2"><Printer className="w-4 h-4" /> In Ngay</button>
                    <button onClick={() => setIsPrintModalOpen(false)} className="p-2.5 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition"><X className="w-5 h-5" /></button>
                 </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 bg-slate-100 scrollbar-thin">
                 <div className="bg-white p-8 max-w-[210mm] mx-auto shadow-xl printable">
                    <div className="grid grid-cols-3 gap-4">
                       {Array.from({ length: 24 }).map((_, i) => (
                          <div key={i} className="border border-dashed border-slate-300 p-2 flex flex-col items-center justify-center h-[120px] rounded-lg">
                             <p className="text-[10px] font-bold text-slate-800 uppercase line-clamp-1 mb-1 text-center w-full">{productToPrint.name}</p>
                             {productToPrint.barcode ? (
                                <img 
                                  src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${productToPrint.barcode}&scale=2&height=10&includetext`} 
                                  className="h-12 object-contain" 
                                  alt="barcode" 
                                />
                             ) : (
                                <div className="h-12 w-32 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 italic">Chưa có mã vạch</div>
                             )}
                             <p className="text-[9px] font-black text-slate-600 mt-1">{productToPrint.salePrice.toLocaleString()} VNĐ</p>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
           <style>{`
             @media print {
               .no-print { display: none !important; }
               .printable { padding: 0 !important; box-shadow: none !important; width: 100% !important; max-width: none !important; }
               body { background: white !important; }
             }
           `}</style>
        </div>
      )}
    </div>
  );
};

export default ProductManager;
