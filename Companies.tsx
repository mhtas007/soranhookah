import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Search, Plus, Trash2 } from 'lucide-react';
import type { Supplier } from '../types';
import { supabase } from '../lib/supabase';

export const Companies: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Supplier Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });
        
      if (error) throw error;
      
      const formatted = (data || []).map(s => ({
        id: s.id, name: s.name, phone: s.phone, 
        totalPurchases: s.total_purchases, totalPaid: s.total_paid, 
        remainingDebt: s.remaining_debt, createdAt: s.created_at
      }));
      
      setSuppliers(formatted);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setIsAdding(true);
    try {
      const { error } = await supabase.from('suppliers').insert({
        name: formData.name,
        phone: formData.phone
      });
      if (error) throw error;

      alert('شەریکەکە بە سەرکەوتوویی زیادکرا');
      setShowAddForm(false);
      setFormData({ name: '', phone: '' });
      fetchSuppliers();
    } catch (error: any) {
      alert('کێشەیەک ڕوویدا: ' + error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('دڵنیایت لە سڕینەوەی ئەم شەریکەیە؟')) return;
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      fetchSuppliers();
    } catch (error: any) {
      alert('کێشەیەک ڕوویدا: ' + error.message);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.includes(searchTerm) || (s.phone && s.phone.includes(searchTerm))
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-kurdish">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowRight className="w-6 h-6 text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-orange-500" />
            شەریکەکان (بارهێنەران)
          </h1>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm active:scale-95"
        >
          <Plus className="w-5 h-5" />
          زیادکردنی شەریکە
        </button>
      </header>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        {showAddForm && (
          <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
              <h2 className="text-xl font-bold text-slate-800 mb-6">زیادکردنی شەریکەی نوێ</h2>
              <form onSubmit={handleAddSupplier} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ناوی شەریکە / بڕاند</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none" placeholder="نموونە: ئەل فاخر" />
                </div>
                <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                  <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">
                    پاشگەزبوونەوە
                  </button>
                  <button type="submit" disabled={isAdding} className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50">
                    {isAdding ? 'چاوەڕێبە...' : 'تۆمارکردن'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="گەڕان بۆ شەریکە (بڕاند)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none transition-all bg-slate-50 focus:bg-white"
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-4 font-medium w-16 text-center">#</th>
                <th className="p-4 font-medium">ناوی شەریکە (بڕاند)</th>
                <th className="p-4 font-medium w-32 text-center">کردارەکان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading ? (
                <tr><td colSpan={3} className="p-8 text-center text-slate-500">بەدوای زانیاریدا دەگەڕێت...</td></tr>
              ) : filteredSuppliers.map((supplier, idx) => (
                <tr key={supplier.id} className="hover:bg-slate-50/50">
                  <td className="p-4 font-medium text-slate-400 text-center">{idx + 1}</td>
                  <td className="p-4 font-bold text-lg">{supplier.name}</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => handleDelete(supplier.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="سڕینەوە"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filteredSuppliers.length === 0 && (
                <tr><td colSpan={3} className="p-8 text-center text-slate-500">هیچ شەریکەیەک نەدۆزرایەوە</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};
