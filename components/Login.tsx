import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, ShieldCheck, AlertCircle, LogIn } from 'lucide-react';
import { UserAccount, UserRole } from '../types';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInAnonymously } from 'firebase/auth';
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

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const existingUser = userSnap.data() as UserAccount;
        if (existingUser.status === 'active') {
          onLogin(existingUser);
        } else {
          setError('Tài khoản đã bị khóa. Vui lòng liên hệ Quản trị viên.');
        }
      } else {
        const isAdmin = user.email === 'hungiota.com@gmail.com' || user.email?.startsWith('admin');
        const newUser: UserAccount = {
          id: user.uid,
          name: user.displayName || (isAdmin ? 'Quản trị viên' : (user.email ? user.email.split('@')[0] : 'Người dùng mới')),
          email: user.email || 'user@hungiota.com',
          phone: user.phoneNumber || '',
          password: 'GOOGLE_AUTH',
          role: isAdmin ? UserRole.ADMIN : UserRole.SALES, 
          status: 'active',
          avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email || user.uid}`
        };
        await onRegister(newUser);
        onLogin(newUser);
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('Cửa sổ đăng nhập Google bị trình duyệt chặn. Vui lòng cho phép popup để đăng nhập.');
      } else if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        setError('Đã hủy đăng nhập Google.');
      } else {
        setError('Đăng nhập Google thất bại: ' + (err.message || 'Vui lòng thử lại'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      let userCredential;
      try {
        userCredential = await signInAnonymously(auth);
      } catch (anonErr: any) {
        // If anonymous is not enabled, try default email
        userCredential = await signInWithEmailAndPassword(auth, 'admin@hungiota.com', 'admin123456');
      }

      const user = userCredential.user;
      const newUser: UserAccount = {
        id: user.uid,
        name: 'Quản trị viên Demo',
        email: user.email || 'admin@hungiota.com',
        phone: '0988.112.233',
        password: 'DEMO_LOGIN',
        role: UserRole.ADMIN,
        status: 'active',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'
      };
      await onRegister(newUser);
      onLogin(newUser);
    } catch (err: any) {
      console.error('Demo login error:', err);
      setError('Đăng nhập nhanh không khả dụng. Vui lòng chọn "Đăng nhập bằng Google" bên dưới.');
    } finally {
      setLoading(false);
    }
  };

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
          setError('Firebase chưa bật phương thức Email/Password. Vui lòng bấm nút "Đăng nhập bằng Google" màu xanh ở trên!');
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

          {/* Nút Đăng nhập bằng Google */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-14 bg-white border-2 border-slate-200 hover:border-blue-500 hover:shadow-lg rounded-2xl flex items-center justify-center gap-3 transition duration-300 font-bold text-slate-700 text-sm active:scale-98 disabled:opacity-60"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{loading ? 'Đang kết nối...' : 'Đăng nhập bằng tài khoản Google'}</span>
            </button>

            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center justify-center gap-2 transition text-xs font-bold disabled:opacity-60"
            >
              <LogIn className="w-4 h-4 text-blue-600" />
              <span>Vào nhanh với tài khoản Khách / Demo</span>
            </button>
          </div>

          <div className="relative flex py-2 items-center mb-6">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-xs font-semibold uppercase">Hoặc email</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

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
