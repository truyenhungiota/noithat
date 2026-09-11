
import React, { useState } from 'react';
import { LayoutDashboard, ShoppingCart, Truck, Settings, LogOut, BarChart3, Users, Factory, ShieldCheck, Image as ImageIcon, Package, Menu, X } from 'lucide-react';
import { UserAccount } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  user: UserAccount;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onLogout, user }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const NavItem = ({ id, label, icon: Icon }: any) => (
    <button 
      type="button"
      onClick={() => {
        setActiveTab(id);
        setIsMobileMenuOpen(false); // Đóng menu khi chọn trên mobile
      }}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 ${
        activeTab === id 
          ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 font-bold' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm uppercase tracking-widest">{label}</span>
    </button>
  );

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-30 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-100 p-6 flex flex-col shadow-2xl md:shadow-sm transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 text-white font-black text-xl tracking-tighter">
              HI
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black text-slate-800 tracking-tighter leading-tight">HungIota</h1>
              <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Enterprise Pro</p>
            </div>
          </div>
          {/* Close button on mobile sidebar */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-2 text-slate-400 hover:text-red-500 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-2 scrollbar-thin">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-4 mb-2 mt-2">Hệ thống</p>
          <NavItem id="dashboard" label="Tổng quan" icon={LayoutDashboard} />
          <NavItem id="orders" label="Đơn hàng" icon={ShoppingCart} />
          
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-4 mt-6 mb-2">Hậu cần & Sản phẩm</p>
          <NavItem id="products" label="Sản phẩm" icon={Package} />
          <NavItem id="shipping" label="Vận chuyển" icon={Truck} />
          <NavItem id="suppliers" label="Nhà xưởng" icon={Factory} />
          <NavItem id="handover-gallery" label="Media bàn giao" icon={ImageIcon} />

          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-4 mt-6 mb-2">Đối tác</p>
          <NavItem id="customers" label="Khách hàng" icon={Users} />
          
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-4 mt-6 mb-2">Quản trị</p>
          <NavItem id="users" label="Người dùng" icon={ShieldCheck} />
          <NavItem id="reports" label="Báo cáo" icon={BarChart3} />
        </nav>

        <div className="pt-4 border-t border-slate-100 space-y-1">
          <NavItem id="settings" label="Cấu hình" icon={Settings} />
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onLogout();
            }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all font-black uppercase text-[10px] tracking-widest group"
          >
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-72 p-4 md:p-10 transition-all duration-300 w-full max-w-[100vw]">
        {/* Mobile Header Bar */}
        <div className="md:hidden flex justify-between items-center mb-6 bg-white p-4 rounded-3xl shadow-sm border border-slate-100 sticky top-4 z-20">
           <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <Menu className="w-7 h-7" />
              </button>
              <h2 className="text-lg font-black text-slate-800 tracking-tight truncate max-w-[150px]">
                {activeTab === 'dashboard' ? 'Tổng quan' : 
                 activeTab === 'orders' ? 'Đơn hàng' : 
                 activeTab === 'products' ? 'Sản phẩm' :
                 activeTab === 'shipping' ? 'Vận chuyển' :
                 activeTab === 'customers' ? 'Khách hàng' : 
                 activeTab === 'suppliers' ? 'Nhà xưởng' : 
                 activeTab === 'handover-gallery' ? 'Media' :
                 activeTab === 'users' ? 'Nhân sự' : 
                 activeTab === 'reports' ? 'Báo cáo' : 'Cấu hình'}
              </h2>
           </div>
           <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center overflow-hidden border border-slate-50 shrink-0">
               <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} alt={user.name} className="w-full h-full object-cover" />
           </div>
        </div>

        {/* Desktop Header */}
        <header className="hidden md:flex justify-between items-center mb-10 no-print">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">
              {activeTab === 'dashboard' ? 'Tổng quan kinh doanh' : 
               activeTab === 'orders' ? 'Quản lý Đơn hàng' : 
               activeTab === 'products' ? 'Danh sách Sản phẩm' :
               activeTab === 'shipping' ? 'Hậu cần Vận chuyển' :
               activeTab === 'customers' ? 'Đối tác Khách hàng' : 
               activeTab === 'suppliers' ? 'Đối tác Nhà xưởng' : 
               activeTab === 'handover-gallery' ? 'Media Bàn giao' :
               activeTab === 'users' ? 'Quản lý Nhân sự' : 
               activeTab === 'reports' ? 'Báo cáo Thống kê' : 'Cấu hình hệ thống'}
            </h2>
          </div>
          <div className="flex items-center gap-4 bg-white p-2.5 pr-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-black overflow-hidden border-2 border-slate-50">
               <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} alt={user.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col items-start leading-tight">
              <p className="font-black text-slate-800 text-sm">{user.name}</p>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{user.role}</p>
            </div>
          </div>
        </header>

        <div className="pb-20 md:pb-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
