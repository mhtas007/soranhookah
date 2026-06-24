import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabase';
import { Mail, Key, AlertCircle } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const setCurrentUser = useAppStore(state => state.setCurrentUser);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsLoading(true);
    setError('');

    try {
      const { data, error: dbError } = await supabase
        .from('staff_users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      if (dbError) throw dbError;

      if (data) {
        setCurrentUser({
          id: data.id,
          name: data.name,
          role: data.role,
          permissions: data.permissions || []
        });
        return;
      }
    } catch (e: any) {
      console.error(e);
      setError('ئیمەیڵ یان پاسۆرد هەڵەیە!');
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 lg:p-10 rounded-[2rem] shadow-2xl w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <span className="text-3xl font-bold text-indigo-600">S</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 font-kurdish mb-2">سیستەمی سۆران هۆکە</h1>
          <p className="text-slate-500 font-kurdish">تکایە ئیمەیڵ و پاسۆرد بنووسە بۆ چوونەژوورەوە</p>
        </div>

        {error && (
          <div className="flex items-center justify-center gap-2 text-rose-600 bg-rose-50 border border-rose-100 px-4 py-3 rounded-xl mb-6 font-kurdish text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5 font-kurdish w-full">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">ئیمەیڵ</label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ئیمەیڵی کارمەند"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-left"
                dir="ltr"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">پاسۆرد</label>
            <div className="relative">
              <Key className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-left tracking-widest font-mono"
                dir="ltr"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 mt-4"
          >
            {isLoading ? 'چاوەڕێبە...' : 'چوونەژوورەوە'}
          </button>
        </form>
      </div>
    </div>
  );
};
