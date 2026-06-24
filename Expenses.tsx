import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Receipt, Plus, Search, Trash2 } from 'lucide-react';
import type { Expense } from '../types';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

export const Expenses: React.FC = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Expense State
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });
        
      if (error) throw error;
      setExpenses(data as Expense[]);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase.from('expenses').insert({
        amount: parseFloat(amount),
        category,
        notes
      });
      if (error) throw error;

      alert('خەرجییەکە تۆمارکرا');
      setAmount('');
      setCategory('');
      setNotes('');
      setShowForm(false);
      fetchExpenses();
    } catch (error: any) {
      alert('کێشە لە تۆمارکردن: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-kurdish">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowRight className="w-6 h-6 text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-rose-500" />
            خەرجییەکان
          </h1>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm active:scale-95"
        >
          <Plus className="w-5 h-5" />
          زیادکردنی خەرجی
        </button>
      </header>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        {showForm && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-rose-100 mb-6">
            <h2 className="text-lg font-bold mb-4">فۆڕمی زیادکردنی خەرجی</h2>
            <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">جۆری خەرجی</label>
                <input required type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="بۆ نموونە: کرێی دوکان" className="w-full p-3 rounded-xl border border-slate-200 focus:border-rose-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">بڕی پارە (IQD)</label>
                <input required type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 focus:border-rose-500 outline-none" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">تێبینی</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 focus:border-rose-500 outline-none" />
              </div>
              <div className="md:col-span-3 flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">پاشگەزبوونەوە</button>
                <button type="submit" disabled={isProcessing} className="px-6 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors disabled:opacity-50">تۆمارکردن</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-4 font-medium">بەروار</th>
                <th className="p-4 font-medium">جۆر</th>
                <th className="p-4 font-medium">تێبینی</th>
                <th className="p-4 font-medium text-rose-600">بڕی پارە</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">بەدوای زانیاریدا دەگەڕێت...</td></tr>
              ) : expenses.map(expense => (
                <tr key={expense.id} className="hover:bg-slate-50/50">
                  <td className="p-4" dir="ltr">{format(new Date(expense.date), 'yyyy-MM-dd HH:mm')}</td>
                  <td className="p-4 font-medium">{expense.category}</td>
                  <td className="p-4 text-slate-500">{expense.notes || '-'}</td>
                  <td className="p-4 font-bold text-rose-600" dir="ltr">{expense.amount.toLocaleString()} IQD</td>
                </tr>
              ))}
              {!loading && expenses.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">هیچ خەرجییەک نییە</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};
