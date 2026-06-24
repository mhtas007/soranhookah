import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Wallet, 
  PackageSearch, 
  Users, 
  Building2, 
  Receipt, 
  ArrowLeftRight, 
  RefreshCcw,
  Settings,
  TrendingUp,
  LogOut,
  PackagePlus,
  ScrollText
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAppStore(state => state.currentUser);

  const modules = [
    { name: 'کاشێر (POS)', icon: ShoppingCart, path: '/pos', color: 'bg-indigo-500', hover: 'hover:bg-indigo-600' },
    { name: 'قاسە', icon: Wallet, path: '/safe', color: 'bg-emerald-500', hover: 'hover:bg-emerald-600' },
    { name: 'کاڵاکان', icon: PackageSearch, path: '/products', color: 'bg-blue-500', hover: 'hover:bg-blue-600' },
    { name: 'کۆگا (Inventory)', icon: PackagePlus, path: '/inventory', color: 'bg-teal-500', hover: 'hover:bg-teal-600' },
    { name: 'قەرزەکان (کڕیار)', icon: Users, path: '/debts', color: 'bg-amber-500', hover: 'hover:bg-amber-600' },
    { name: 'شەریکەکان (بارهێنەر)', icon: Building2, path: '/companies', color: 'bg-orange-500', hover: 'hover:bg-orange-600' },
    { name: 'خەرجییەکان', icon: Receipt, path: '/expenses', color: 'bg-rose-500', hover: 'hover:bg-rose-600' },
    { name: 'گەڕانەوە', icon: ArrowLeftRight, path: '/returns', color: 'bg-rose-400', hover: 'hover:bg-rose-500' },
    { name: 'گۆڕینەوە', icon: RefreshCcw, path: '/exchanges', color: 'bg-cyan-500', hover: 'hover:bg-cyan-600' },
    { name: 'وەسڵەکان', icon: ScrollText, path: '/receipts', color: 'bg-pink-500', hover: 'hover:bg-pink-600' },
    { name: 'ڕاپۆرتەکان', icon: TrendingUp, path: '/reports', color: 'bg-violet-500', hover: 'hover:bg-violet-600' },
    { name: 'ڕێکخستنەکان', icon: Settings, path: '/settings', color: 'bg-slate-700', hover: 'hover:bg-slate-800' },
  ];

  // Admin sees Users module, and Admin sees everything. Cashier sees only allowed modules.
  const visibleModules = modules.filter(m => {
    if (currentUser?.role === 'Admin') return true;
    return currentUser?.permissions?.includes(m.path);
  });

  const adminModules = [
    { name: 'بەکارهێنەران (Staff)', icon: Users, path: '/users', color: 'bg-blue-600', hover: 'hover:bg-blue-700' }
  ];

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header section with Shop Name */}
      <header className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 font-kurdish">سۆران هۆکە شۆپ</h1>
          <p className="text-slate-500 mt-1 font-kurdish">بەخێربێیت بۆ سیستەمی بەڕێوەبردن</p>
        </div>
        <div className="flex items-center gap-6 text-left font-kurdish">
          {currentUser && (
            <div className="flex flex-col items-end mr-4 border-r pr-4 border-slate-200">
              <span className="font-bold text-slate-800">{currentUser.name}</span>
              <span className="text-xs text-slate-500">{currentUser.role === 'Admin' ? 'ئەدمین' : currentUser.role === 'Manager' ? 'بەڕێوەبەر' : 'فرۆشیار'}</span>
            </div>
          )}
          <div className="flex gap-2">
            <button 
              onClick={() => {
                useAppStore.getState().setCurrentUser(null);
              }}
              title="چوونەدەرەوە"
              className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2 rounded-xl font-medium transition-colors border border-rose-200"
            >
              <LogOut className="w-5 h-5" />
              دەرچوون
            </button>
          </div>
          <div>
            <p className="text-slate-500 text-sm">{new Date().toLocaleDateString('ku-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p className="text-xl font-semibold text-slate-800" dir="ltr">
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </header>

      {/* Main Modules Grid */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {visibleModules.map((module, index) => {
            const Icon = module.icon;
            return (
              <button
                key={index}
                onClick={() => navigate(module.path)}
                className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all hover:-translate-y-1 group text-right flex flex-col items-center justify-center gap-4"
              >
                <div className={`${module.color} ${module.hover} text-white p-4 rounded-2xl transition-colors`}>
                  <Icon className="w-8 h-8" />
                </div>
                <h2 className="font-bold text-slate-800 text-lg font-kurdish">{module.name}</h2>
              </button>
            );
          })}
          
          {currentUser?.role === 'Admin' && adminModules.map((module, index) => {
            const Icon = module.icon;
            return (
              <button
                key={'admin-'+index}
                onClick={() => navigate(module.path)}
                className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all hover:-translate-y-1 group text-right flex flex-col items-center justify-center gap-4"
              >
                <div className={`${module.color} ${module.hover} text-white p-4 rounded-2xl transition-colors`}>
                  <Icon className="w-8 h-8" />
                </div>
                <h2 className="font-bold text-slate-800 text-lg font-kurdish">{module.name}</h2>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
};
