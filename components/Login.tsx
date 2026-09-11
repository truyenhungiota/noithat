import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { UserAccount, UserRole } from '../types';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface LoginProps {
  onLogin: (user: UserAccount) => void;
  onRegister: (user: UserAccount) => void;
  mockUsers: UserAccount[];
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegister }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');


  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (signInErr: any) {
        if (signInErr.code === 'auth/invalid-credential' || signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-email') {
            try {
                userCredential = await createUserWithEmailAndPassword(auth, email, password);
            } catch (createErr: any) {
                throw createErr;
            }
        } else {
            throw signInErr;
        }
      }

      const user = userCredential.user;
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const existingUser = userSnap.data() as UserAccount;
        if (existingUser.status === 'active') {
          onLogin(existingUser);
        } else {
          setError('Tài khoản đã bị khóa. Vui lòng liên hệ Admin.');
        }
      } else {
        const isAdmin = email === 'admin@hungiota.com' || email === 'hungiota.com@gmail.com';
        const newUser: UserAccount = {
          id: user.uid,
          name: isAdmin ? 'Quản trị viên' : 'Người dùng mới',
          email: user.email || email,
          phone: '',
          password: 'EMAIL_LOGIN',
          role: isAdmin ? UserRole.ADMIN : UserRole.SALES, 
          status: 'active',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email || email}`
        };
        await onRegister(newUser);
        onLogin(newUser);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
          setError('Firebase chưa bật phương thức Email/Password. Vui lòng liên hệ quản trị viên để được hỗ trợ!');
      } else {
          setError('Đăng nhập thất bại: ' + (err.message || 'Lỗi không xác định'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f0f4f8] relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-200/40 rounded-full blur-[140px] animate-pulse-slow"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-200/30 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-[520px] p-6 relative z-10">
        <div className="bg-white/80 backdrop-blur-3xl rounded-[4rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] border border-white/60 p-6 md:p-12 transition-all duration-700">
          
          <div className="flex flex-col items-center mb-10">
            <div className="relative group mb-4">
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] flex items-center justify-center shadow-2xl text-white font-black text-2xl tracking-tighter italic border border-white/20">
                HI
              </div>
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight text-center mb-1">Hệ thống quản lý</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nội Thất Hùng Iota</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-300">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-xs font-bold text-red-600 leading-snug">{error}</p>
            </div>
          )}


          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-slate-50/50 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-700 font-medium text-sm"
                placeholder="Email đăng nhập"
              />
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-slate-50/50 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-700 font-medium text-sm"
                placeholder="Mật khẩu"
              />
            </div>
            
            <button 
              type="submit"
              disabled={loading}
              className="w-full relative group h-12 rounded-xl overflow-hidden shadow-[0_10px_30px_-10px_rgba(37,99,235,0.4)] hover:shadow-[0_20px_40px_-15px_rgba(37,99,235,0.5)] transition-all duration-500 hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 mt-2"
            >
              <div className="absolute inset-0 bg-blue-600 group-hover:bg-blue-700 transition-colors duration-500"></div>
              <div className="relative h-full flex items-center justify-center gap-2 px-6 text-white font-bold text-sm tracking-wide">
                {loading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP BẰNG EMAIL'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </div>
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest">Bảo mật thời gian thực Firebase</span>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Login;
