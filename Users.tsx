import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, UserCog, Plus, Trash2, Edit2, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';

const AVAILABLE_MODULES = [
  { path: '/pos', name: 'فرۆشتن (POS)' },
  { path: '/safe', name: 'قاسە' },
  { path: '/products', name: 'کۆگا و کاڵاکان' },
  { path: '/debts', name: 'قەرزەکان (کڕیار)' },
  { path: '/companies', name: 'کۆمپانیاکان' },
  { path: '/expenses', name: 'خەرجییەکان' },
  { path: '/returns', name: 'گەڕانەوە و گۆڕین' },
  { path: '/reports', name: 'ڕاپۆرتەکان' },
  { path: '/settings', name: 'ڕێکخستنەکان' },
  { path: '/users', name: 'بەکارهێنەران' }
];

export const Users: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAppStore(state => state.currentUser);
  
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Cashier');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    // Check access
    if (currentUser && currentUser.role !== 'Admin') {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [currentUser, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    setDbError(false);
    try {
      const { data, error } = await supabase.from('staff_users').select('*').order('created_at', { ascending: true });
      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          // Table doesn't exist
          setDbError(true);
        } else {
          throw error;
        }
      }
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (path: string) => {
    setPermissions(prev => 
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      alert("پێویستە هەموو زانیارییەکان پڕبکەیتەوە");
      return;
    }
    
    // Auto grant all perms to Admin
    const actualRole = users.length === 0 ? 'Admin' : role;
    const finalPerms = actualRole === 'Admin' ? AVAILABLE_MODULES.map(m => m.path) : permissions;

    setIsProcessing(true);
    try {
      const userData = {
        name,
        email,
        password,
        role: actualRole,
        permissions: finalPerms
      };

      if (editingId) {
        const { error } = await supabase.from('staff_users').update(userData).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('staff_users').insert(userData);
        if (error) throw error;
      }

      alert('بەکارهێنەرەکە بە سەرکەوتوویی پاشەکەوت کرا');
      setShowForm(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      alert('کێشەیەک ڕوویدا: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (users.length <= 1) {
      alert('ناتوانیت کۆتا بەکارهێنەر بسڕیتەوە');
      return;
    }
    if (confirm('دڵنیایت لە سڕینەوەی ئەم بەکارهێنەرە؟')) {
      try {
        const { error } = await supabase.from('staff_users').delete().eq('id', id);
        if (error) throw error;
        fetchUsers();
      } catch (error: any) {
        alert('کێشەیەک ڕوویدا لە سڕینەوە: ' + error.message);
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('Cashier');
    setPermissions([]);
  };

  const handleEdit = (user: any) => {
    setEditingId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword(user.password);
    setRole(user.role);
    setPermissions(user.permissions || []);
    setShowForm(true);
  };

  if (dbError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-kurdish items-center justify-center p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-800 mb-2">خشتەی بەکارهێنەران نەدۆزرایەوە!</h1>
        <p className="text-slate-600 max-w-md">
          تکایە دڵنیابە لەوەی سکریپتی کۆدەکانی `supabase_schema.sql` ت جێبەجێ کردووە لە ناو Supabase بۆ ئەوەی خشتەی `staff_users` دروست ببێت.
        </p>
        <button onClick={() => navigate('/')} className="mt-6 px-6 py-2 bg-slate-800 text-white rounded-xl">گەڕانەوە</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-kurdish">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowRight className="w-6 h-6 text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <UserCog className="w-6 h-6 text-blue-600" />
            بەشی بەکارهێنەران و دەسەڵاتەکان
          </h1>
        </div>
        <button 
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm active:scale-95"
        >
          <Plus className="w-5 h-5" />
          زیادکردنی بەکارهێنەر
        </button>
      </header>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        {showForm && (
          <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-8 mb-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6">{editingId ? 'دەستکاریکردنی بەکارهێنەر' : users.length === 0 ? 'دروستکردنی ئەدمینی سەرەکی' : 'زیادکردنی بەکارهێنەری نوێ'}</h2>
            <form onSubmit={handleSaveUser} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ناوی تەواو</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ئیمەیڵ</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-left" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">پلە (Role)</label>
                  <select 
                    value={users.length === 0 ? 'Admin' : role} 
                    onChange={e => setRole(e.target.value)} 
                    disabled={users.length === 0}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-white disabled:bg-slate-100"
                  >
                    <option value="Cashier">فرۆشیار (Cashier)</option>
                    <option value="Manager">بەڕێوەبەر (Manager)</option>
                    <option value="Admin">ئەدمین (Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">پاسۆردی چوونەژوورەوە</label>
                  <input type="text" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-left" dir="ltr" />
                </div>
              </div>

              {(users.length !== 0 && role !== 'Admin') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">دەسەڵاتەکان (کام بەشانە ببینێت؟)</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {AVAILABLE_MODULES.map(module => (
                      <label key={module.path} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${permissions.includes(module.path) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input 
                          type="checkbox" 
                          checked={permissions.includes(module.path)}
                          onChange={() => handleTogglePermission(module.path)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300"
                        />
                        <span className="text-sm font-medium text-slate-700">{module.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">پاشگەزبوونەوە</button>
                <button type="submit" disabled={isProcessing} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {isProcessing ? 'چاوەڕێبە...' : 'پاشەکەوتکردن'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-4 font-medium">ناوی بەکارهێنەر</th>
                <th className="p-4 font-medium" dir="ltr">ئیمەیڵ</th>
                <th className="p-4 font-medium">پلە</th>
                <th className="p-4 font-medium text-center">دەسەڵاتەکان</th>
                <th className="p-4 font-medium text-center">کردارەکان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">بەدوای زانیاریدا دەگەڕێت...</td></tr>
              ) : users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">{user.name.charAt(0)}</div>
                    {user.name}
                  </td>
                  <td className="p-4 text-slate-500" dir="ltr">{user.email}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      user.role === 'Admin' ? 'bg-violet-100 text-violet-700' :
                      user.role === 'Manager' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-center text-sm text-slate-500">
                    {user.role === 'Admin' ? 'هەموو بەشەکان' : `${user.permissions?.length || 0} بەش`}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleEdit(user)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">هیچ بەکارهێنەرێک نییە</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};
