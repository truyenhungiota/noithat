
import React, { useRef } from 'react';
import { CompanySettings } from '../types';
import { Save, Building2, User, FileText, MapPin, Mail, CreditCard, Phone, UploadCloud, Trash2, Image as ImageIcon } from 'lucide-react';

interface SettingsProps {
  settings: CompanySettings;
  onSave: (settings: CompanySettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onSave }) => {
  const [formData, setFormData] = React.useState<CompanySettings>(settings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Kích thước ảnh quá lớn. Vui lòng chọn ảnh < 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setFormData({ ...formData, logoUrl: undefined });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Building2 className="w-7 h-7 text-blue-600" /> Cấu hình thông tin công ty
          </h2>
          <p className="text-slate-500 mt-1">Thông tin này sẽ xuất hiện trên các báo giá, hợp đồng và hóa đơn.</p>
        </div>

        <div className="p-8 space-y-8">
          {/* Logo Upload Section */}
          <div className="flex flex-col md:flex-row gap-8 items-start pb-8 border-b border-slate-100">
             <div className="w-32 h-32 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center relative overflow-hidden shrink-0 group">
                {formData.logoUrl ? (
                  <img src={formData.logoUrl} alt="Company Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="text-slate-300 flex flex-col items-center">
                    <ImageIcon className="w-8 h-8 mb-1" />
                    <span className="text-[10px] font-bold uppercase">Chưa có Logo</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                   <button type="button" onClick={() => fileInputRef.current?.click()} className="text-white text-[10px] font-bold uppercase tracking-widest hover:underline">Thay đổi</button>
                </div>
             </div>
             
             <div className="flex-1 space-y-3">
                <label className="text-xs font-black text-slate-800 uppercase tracking-widest">Logo thương hiệu</label>
                <p className="text-xs text-slate-500 leading-relaxed">Logo sẽ hiển thị ở góc trái trên cùng của các văn bản (Báo giá, Hóa đơn...).<br/>Khuyên dùng định dạng PNG nền trong suốt, kích thước vuông hoặc chữ nhật ngang.</p>
                <div className="flex gap-3">
                   <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleLogoUpload} 
                   />
                   <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-blue-100 transition"
                   >
                      <UploadCloud className="w-4 h-4" /> Tải ảnh lên
                   </button>
                   {formData.logoUrl && (
                      <button 
                        type="button" 
                        onClick={removeLogo}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-red-100 transition"
                      >
                        <Trash2 className="w-4 h-4" /> Xóa Logo
                      </button>
                   )}
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Building2 className="w-3 h-3" /> Tên công ty / Cửa hàng
              </label>
              <input 
                maxLength={500}
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition font-medium"
                value={formData.name || ''}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <User className="w-3 h-3" /> Người đại diện
              </label>
              <input 
                maxLength={500}
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition font-medium"
                value={formData.contactPerson || ''}
                onChange={e => setFormData({...formData, contactPerson: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-3 h-3" /> Mã số thuế
              </label>
              <input 
                maxLength={500}
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition font-medium"
                value={formData.taxCode || ''}
                onChange={e => setFormData({...formData, taxCode: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Phone className="w-3 h-3" /> Số điện thoại
              </label>
              <input 
                maxLength={500}
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition font-medium"
                value={formData.phone || ''}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MapPin className="w-3 h-3" /> Địa chỉ
              </label>
              <input 
                maxLength={500}
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition font-medium"
                value={formData.address || ''}
                onChange={e => setFormData({...formData, address: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Mail className="w-3 h-3" /> Email
              </label>
              <input 
                maxLength={500}
                type="email" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition font-medium"
                value={formData.email || ''}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CreditCard className="w-3 h-3" /> Tên ngân hàng
              </label>
              <input 
                maxLength={500}
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition font-medium"
                value={formData.bankName || ''}
                onChange={e => setFormData({...formData, bankName: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CreditCard className="w-3 h-3" /> Số tài khoản
              </label>
              <input 
                maxLength={500}
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition font-medium"
                value={formData.bankAccount || ''}
                onChange={e => setFormData({...formData, bankAccount: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-slate-100 bg-slate-50/30 flex justify-end">
          <button 
            type="submit"
            className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition"
          >
            <Save className="w-5 h-5" /> Lưu cấu hình
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
