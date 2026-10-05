
import React, { useState, useMemo } from 'react';
import { UserAccount, UserRole } from '../types';
import { Users, Plus, Search, Mail, Phone, X, Edit2, Trash2, CheckCircle, ShieldAlert, ChevronLeft, ChevronRight, Lock, Eye, EyeOff, Save, AlertTriangle } from 'lucide-react';
import { Pagination } from './Pagination';
import { compareNewestFirst } from '../lib/sortUtils';

interface UserManagerProps {
  currentUser: UserAccount;
  users: UserAccount[];
  onAddUser: (user: UserAccount) => void;
  onUpdateUser: (user: UserAccount) => void;
  onDeleteUser: (id: string) => void;
}

const UserManager: React.FC<UserManagerProps> = ({ currentUser, users, onAddUser, onUpdateUser, onDeleteUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newUser, setNewUser] = useState<Partial<UserAccount>>({ role: UserRole.SALES, status: 'active', password: '', name: '', email: '', phone: '' });
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const isAdmin = currentUser.role === UserRole.ADMIN;

  const availableUsers = useMemo(() => {
    const list = isAdmin ? users : users.filter(u => u.id === currentUser.id || u.role === UserRole.ADMIN);
    return [...list].sort(compareNewestFirst);
  }, [users, currentUser, isAdmin]);

  const filteredUsers = useMemo(() => 
    availableUsers
      .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort(compareNewestFirst),
  [availableUsers, searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nameToCheck = editingUser ? editingUser.name : newUser.name;
    const emailToCheck = editingUser ? editingUser.email : newUser.email;

    // Kiểm tra trùng lặp
    const duplicate = users.find(u => {
      if (editingUser && u.id === editingUser.id) return false; // Bỏ qua chính nó khi sửa
      return (
        u.name.toLowerCase().trim() === nameToCheck?.toLowerCase().trim() ||
        u.email.toLowerCase().trim() === emailToCheck?.toLowerCase().trim()
      );
    });

    if (duplicate) {
      if (duplicate.email.toLowerCase().trim() === emailToCheck?.toLowerCase().trim()) {
        setError(`Email "${emailToCheck}" đã tồn tại trên hệ thống.`);
      } else {
        setError(`Tên người dùng "${nameToCheck}" đã tồn tại.`);
      }
      return;
    }

    if (editingUser) {
      onUpdateUser({
        ...editingUser,
        updatedAt: new Date().toISOString()
      });
      setEditingUser(null);
    } else {
      const user: UserAccount = { 
        ...newUser, 
        id: `USR${Date.now()}${Math.floor(Math.random() * 1000)}`, 
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as UserAccount;
      onAddUser(user);
    }
    
    setIsModalOpen(false);
    setNewUser({ role: UserRole.SALES, status: 'active', password: '', name: '', email: '', phone: '' });
    setShowPassword(false);
  };

  const openModal = (user: UserAccount | null) => {
    setError(null);
    setEditingUser(user);
    if (!user) {
      setNewUser({ role: UserRole.SALES, status: 'active', password: '', name: '', email: '', phone: '' });
    }
    setIsModalOpen(true);
    setShowPassword(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" placeholder="" className="w-full pl-12 pr-4 py-3 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
        </div>
        {isAdmin && (
          <button onClick={() => openModal(null)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl hover:bg-slate-800 transition uppercase tracking-widest text-[11px]">
            <Plus className="w-5 h-5" /> THÊM TÀI KHOẢN
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedUsers.map(user => (
          <div key={user.id} className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm relative group overflow-hidden">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden border-2 border-white shadow-lg">
                <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} alt={user.name} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 leading-tight uppercase">{user.name}</h3>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg inline-block mt-1 ${user.role === UserRole.ADMIN ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                  {user.role}
                </span>
              </div>
            </div>
            <div className="space-y-2 text-xs text-slate-500 font-bold">
              <p className="flex items-center gap-2 truncate"><Mail className="w-4 h-4 text-blue-500" /> {user.email}</p>
              <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-blue-500" /> {user.phone}</p>
              <p className="flex items-center gap-2"><Lock className="w-4 h-4 text-blue-500" /> ••••••••</p>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between items-center">
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-full">
                <CheckCircle className="w-3.5 h-3.5" /> {user.status}
              </span>
              
              {(isAdmin || currentUser.id === user.id) && (
                <div className="flex gap-1">
                  <button onClick={() => openModal(user)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition shadow-sm"><Edit2 className="w-4.5 h-4.5" /></button>
                  {isAdmin && currentUser.id !== user.id && (
                     <button onClick={() => onDeleteUser(user.id)} className="p-2.5 bg-red-50 text-red-400 hover:text-red-600 rounded-xl transition shadow-sm"><Trash2 className="w-4.5 h-4.5" /></button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Pagination 
        currentPage={currentPage} 
        totalPages={totalPages} 
        onPageChange={setCurrentPage} 
        itemsPerPage={itemsPerPage} 
        totalItems={filteredUsers.length} 
        activeColor="blue" 
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-6 md:p-10 relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition"><X className="w-6 h-6" /></button>
            <h2 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-widest">{editingUser ? 'Cập nhật tài khoản' : 'Thêm nhân sự mới'}</h2>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-in slide-in-from-top-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p className="text-xs font-black uppercase tracking-tight">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên / Tên Shop</label>
                <input required placeholder="" className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-blue-500 transition" value={editingUser ? editingUser.name : newUser.name} onChange={e => editingUser ? setEditingUser({...editingUser, name: e.target.value}) : setNewUser({...newUser, name: e.target.value})} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email đăng nhập</label>
                <input required type="email" placeholder="" className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-blue-500 transition" value={editingUser ? editingUser.email : newUser.email} onChange={e => editingUser ? setEditingUser({...editingUser, email: e.target.value}) : setNewUser({...newUser, email: e.target.value})} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu truy cập</label>
                <div className="relative">
                  <input 
                    required={!editingUser}
                    type={showPassword ? "text" : "password"} 
                    placeholder=""
                    className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-blue-500 transition pr-14" 
                    value={editingUser ? editingUser.password : newUser.password} 
                    onChange={e => editingUser ? setEditingUser({...editingUser, password: e.target.value}) : setNewUser({...newUser, password: e.target.value})} 
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {isAdmin && (
                <div className="space-y-1 animate-in slide-in-from-top-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quyền hạn hệ thống</label>
                  <select className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-black outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition" value={editingUser ? editingUser.role : newUser.role} onChange={e => editingUser ? setEditingUser({...editingUser, role: e.target.value as UserRole}) : setNewUser({...newUser, role: e.target.value as UserRole})}>
                    {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                </div>
              )}

              <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 transition mt-6 flex items-center justify-center gap-2">
                <Save className="w-5 h-5" /> {editingUser ? 'CẬP NHẬT TÀI KHOẢN' : 'LƯU TÀI KHOẢN MỚI'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManager;
