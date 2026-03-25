import React from 'react';
import { auth } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Package, LogIn } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Login() {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success('Logged in successfully');
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/unauthorized-domain') {
        toast.error('Domain not authorized in Firebase Console');
      } else {
        toast.error('Login failed: ' + (error.message || 'Unknown error'));
      }
    }
  };

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-12 rounded-[3rem] shadow-2xl border border-primary/5 flex flex-col items-center gap-12">
        <div className="w-24 h-24 bg-primary rounded-[2rem] flex items-center justify-center shadow-xl rotate-3">
          <Package className="w-12 h-12 text-secondary -rotate-3" />
        </div>
        
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-black text-primary tracking-tighter">QuickScan POS</h1>
          <p className="text-primary/60 font-medium max-w-[200px] mx-auto leading-relaxed">
            The modern retail solution for your business.
          </p>
        </div>

        <button
          onClick={handleLogin}
          className="w-full bg-primary text-secondary py-5 rounded-3xl font-black text-xl flex items-center justify-center gap-4 hover:bg-accent transition-all shadow-lg active:scale-95"
        >
          <LogIn className="w-6 h-6" />
          Get Started
        </button>

        <p className="text-[10px] font-bold uppercase tracking-widest text-primary/30">
          Secure Cloud Infrastructure
        </p>
      </div>
    </div>
  );
}
