import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Users, Search, Plus, CreditCard, Download, FileSpreadsheet, PlusCircle, History } from 'lucide-react';
import { format } from 'date-fns';
import type { Customer } from '../types';
import { supabase } from '../lib/supabase';

export const Debts: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'debtors' | 'cleared'>('all');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Customer Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [isAdding, setIsAdding] = useState(false);

  // Payment Modal State (Receive Payment)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Add Debt Modal State (Record New Debt)
  const [showAddDebtModal, setShowAddDebtModal] = useState(false);
  const [addDebtCustomer, setAddDebtCustomer] = useState('');
  const [addDebtAmount, setAddDebtAmount] = useState('');
  const [addDebtNotes, setAddDebtNotes] = useState('');
  const [isAddingDebt, setIsAddingDebt] = useState(false);

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('remaining_debt', { ascending: false });
        
      if (error) throw error;
      
      const formatted = (data || []).map(c => ({
        id: c.id, name: c.name, phone: c.phone, 
        totalPurchases: c.total_purchases, totalPaid: c.total_paid, 
        remainingDebt: c.remaining_debt, createdAt: c.created_at
      }));
      
      setCustomers(formatted);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setIsAdding(true);
    try {
      const { error } = await supabase.from('customers').insert({
        name: formData.name,
        phone: formData.phone
      });
      if (error) throw error;

      alert('کڕیارەکە بە سەرکەوتوویی زیادکرا');
      setShowAddForm(false);
      setFormData({ name: '', phone: '' });
      fetchCustomers();
    } catch (error: any) {
      alert('کێشەیەک ڕوویدا: ' + error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsProcessing(true);
    try {
      const { error: paymentError } = await supabase.from('debt_payments').insert({
        customer_id: selectedCustomer.id,
        amount: amount,
        notes: paymentNotes
      });
      if (paymentError) throw paymentError;

      const { error: customerError } = await supabase.from('customers').update({
        total_paid: selectedCustomer.totalPaid + amount,
        remaining_debt: selectedCustomer.remainingDebt - amount
      }).eq('id', selectedCustomer.id);
      
      if (customerError) throw customerError;

      alert('پارەدانەکە سەرکەوتوو بوو!');
      setSelectedCustomer(null);
      setPaymentAmount('');
      setPaymentNotes('');
      fetchCustomers();

    } catch (error: any) {
      alert('کێشەیەک ڕوویدا: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addDebtCustomer || !addDebtAmount) return;

    const amount = parseFloat(addDebtAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsAddingDebt(true);
    try {
      const customer = customers.find(c => c.id === addDebtCustomer);
      if (!customer) throw new Error("کڕیار نەدۆزرایەوە");

      const { error: historyError } = await supabase.from('debt_payments').insert({
        customer_id: addDebtCustomer,
        amount: -amount, // Negative amount to represent debt increase
        notes: addDebtNotes || 'زیادکردنی قەرز بە دەستی'
      });
      if (historyError) throw historyError;

      const { error: customerError } = await supabase.from('customers').update({
        total_purchases: customer.totalPurchases + amount,
        remaining_debt: customer.remainingDebt + amount
      }).eq('id', addDebtCustomer);
      
      if (customerError) throw customerError;

      alert('قەرزە نوێیەکە بە سەرکەوتوویی خرایە سەر حیسابەکەی!');
      setShowAddDebtModal(false);
      setAddDebtCustomer('');
      setAddDebtAmount('');
      setAddDebtNotes('');
      fetchCustomers();

    } catch (error: any) {
      alert('کێشەیەک ڕوویدا: ' + error.message);
    } finally {
      setIsAddingDebt(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['کڕیار', 'مۆبایل', 'کۆی قەرز (قەرزی کۆن)', 'پارەی دراو', 'قەرزی ماوە'];
    const rows = filteredCustomers.map(c => [
      c.name,
      c.phone || '',
      c.totalPurchases,
      c.totalPaid,
      c.remainingDebt
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += headers.join(',') + "\n";
    rows.forEach(row => {
      csvContent += row.join(',') + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `دەفتەری_قەرز_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchHistory = async (customer: Customer) => {
    setHistoryCustomer(customer);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      // Fetch Sales
      const { data: salesData } = await supabase
        .from('sales')
        .select('*')
        .eq('debt_customer_id', customer.id)
        .order('created_at', { ascending: false });

      // Fetch Payments & Manual Debts
      const { data: paymentsData } = await supabase
        .from('debt_payments')
        .select('*')
        .eq('customer_id', customer.id)
        .order('date', { ascending: false });

      const allTransactions = [
        ...(salesData || []).map(s => ({
          id: s.id,
          date: s.created_at,
          type: 'Sale',
          amount: s.total_amount,
          notes: 'کڕینی کاڵا بە قەرز'
        })),
        ...(paymentsData || []).map(p => ({
          id: p.id,
          date: p.date,
          type: p.amount > 0 ? 'Payment' : 'ManualDebt',
          amount: Math.abs(p.amount),
          notes: p.notes || (p.amount > 0 ? 'پارەدان' : 'زیادکردنی قەرز')
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.includes(searchTerm) || (c.phone && c.phone.includes(searchTerm));
    if (!matchesSearch) return false;
    
    if (filter === 'debtors') return c.remainingDebt > 0;
    if (filter === 'cleared') return c.remainingDebt <= 0 && c.totalPurchases > 0;
    return true; // all
  });

  const totalMarketDebt = customers.reduce((sum, c) => sum + c.remainingDebt, 0);
  const totalReceived = customers.reduce((sum, c) => sum + c.totalPaid, 0);
  const totalPurchasesOverall = customers.reduce((sum, c) => sum + c.totalPurchases, 0);
  const debtorsCount = customers.filter(c => c.remainingDebt > 0).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-kurdish">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowRight className="w-6 h-6 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-amber-500" />
              دەفتەری قەرز
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToCSV}
            className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors"
          >
            <Download className="w-5 h-5" />
            ئێکسڵ
          </button>
          <button 
            onClick={() => setShowAddDebtModal(true)}
            className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors"
          >
            <PlusCircle className="w-5 h-5" />
            تۆمارکردنی قەرزی نوێ
          </button>
          <button 
            onClick={() => setShowAddForm(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm active:scale-95"
          >
            <Plus className="w-5 h-5" />
            کڕیاری نوێ
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">کۆی کڕین بە قەرز (قەرزی کۆن)</p>
              <h3 className="text-xl font-bold text-slate-800" dir="ltr">{totalPurchasesOverall.toLocaleString()}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">پارەی وەرگیراو</p>
              <h3 className="text-xl font-bold text-emerald-600" dir="ltr">{totalReceived.toLocaleString()}</h3>
            </div>
          </div>
          <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-5 rounded-3xl shadow-lg shadow-rose-200 flex items-center gap-4 text-white">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-rose-100 mb-1">قەرزی ماوە</p>
              <h3 className="text-xl font-bold" dir="ltr">{totalMarketDebt.toLocaleString()}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">ژمارەی قەرزارەکان</p>
              <h3 className="text-xl font-bold text-slate-800" dir="ltr">{debtorsCount}</h3>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2">
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${filter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              هەمووی
            </button>
            <button 
              onClick={() => setFilter('debtors')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${filter === 'debtors' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              قەرزارەکان
            </button>
            <button 
              onClick={() => setFilter('cleared')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${filter === 'cleared' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              پاکتاوکراو
            </button>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="گەڕان بۆ کڕیار (ناو، مۆبایل)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all bg-slate-50 focus:bg-white"
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="p-4 font-medium">ناوی کڕیار</th>
                  <th className="p-4 font-medium">مۆبایل</th>
                  <th className="p-4 font-medium">کۆی قەرز</th>
                  <th className="p-4 font-medium">پارەی دراو</th>
                  <th className="p-4 font-medium">قەرزی ماوە</th>
                  <th className="p-4 font-medium text-center">دۆخ</th>
                  <th className="p-4 font-medium text-center">کردارەکان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-500">بەدوای زانیاریدا دەگەڕێت...</td></tr>
                ) : filteredCustomers.map((customer) => {
                  const hasDebt = customer.remainingDebt > 0;
                  return (
                    <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-bold">{customer.name}</td>
                      <td className="p-4" dir="ltr">{customer.phone || '-'}</td>
                      <td className="p-4" dir="ltr">{customer.totalPurchases.toLocaleString()}</td>
                      <td className="p-4 text-emerald-600" dir="ltr">{customer.totalPaid.toLocaleString()}</td>
                      <td className={`p-4 font-bold ${hasDebt ? 'text-rose-600' : 'text-slate-400'}`} dir="ltr">
                        {customer.remainingDebt.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        {hasDebt ? (
                          <span className="bg-rose-100 text-rose-700 text-xs px-2 py-1 rounded-md font-bold">قەرزارە</span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-md font-bold">پاکتاوکراو</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => fetchHistory(customer)}
                            className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                            title="مێژوو"
                          >
                            <History className="w-3.5 h-3.5" />
                            مێژوو
                          </button>
                          <button 
                            onClick={() => {
                              setAddDebtCustomer(customer.id);
                              setShowAddDebtModal(true);
                            }}
                            className="bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                            title="زیادکردنی قەرز"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            قەرز
                          </button>
                          <button 
                            disabled={!hasDebt}
                            onClick={() => setSelectedCustomer(customer)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${hasDebt ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-50 text-slate-300 cursor-not-allowed'}`}
                            title="پارەدان"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            پارەدان
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!loading && filteredCustomers.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-500">هیچ کڕیارێک نەدۆزرایەوە</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Debt Modal */}
      {showAddDebtModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
              <PlusCircle className="w-6 h-6 text-indigo-500" />
              تۆمارکردنی قەرزی نوێ
            </h2>
            <form onSubmit={handleAddDebt} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">هەڵبژاردنی کڕیار</label>
                <select 
                  required
                  value={addDebtCustomer}
                  onChange={e => setAddDebtCustomer(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
                >
                  <option value="">کڕیارێک هەڵبژێرە...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">بڕی قەرز (IQD)</label>
                <input 
                  type="number" 
                  required
                  min="250"
                  value={addDebtAmount}
                  onChange={e => setAddDebtAmount(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">تێبینی (ئارەزوومەندانە)</label>
                <input 
                  type="text" 
                  value={addDebtNotes}
                  onChange={e => setAddDebtNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
                />
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setShowAddDebtModal(false)} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">
                  پاشگەزبوونەوە
                </button>
                <button type="submit" disabled={isAddingDebt} className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50">
                  {isAddingDebt ? 'چاوەڕێبە...' : 'تۆمارکردن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Payment Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-emerald-500" />
              وەرگرتنی قەرز لە ({selectedCustomer.name})
            </h2>
            <p className="text-slate-500 mb-6 bg-rose-50 p-3 rounded-xl border border-rose-100">
              قەرزی ماوە: <span className="font-bold text-rose-600 text-lg" dir="ltr">{selectedCustomer.remainingDebt.toLocaleString()} IQD</span>
            </p>
            
            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">بڕی پارەی وەرگیراو (IQD)</label>
                <input 
                  type="number" 
                  required
                  min="250"
                  max={selectedCustomer.remainingDebt}
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none font-bold text-lg"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">تێبینی</label>
                <input 
                  type="text" 
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
                />
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setSelectedCustomer(null)} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">
                  پاشگەزبوونەوە
                </button>
                <button type="submit" disabled={isProcessing} className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50">
                  {isProcessing ? 'چاوەڕێبە...' : 'وەرگرتن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Customer Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Plus className="w-6 h-6 text-amber-500" />
              زیادکردنی کڕیاری نوێ
            </h2>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ناوی کڕیار</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-amber-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ژمارەی مۆبایل</label>
                <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-left" dir="ltr" />
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">
                  پاشگەزبوونەوە
                </button>
                <button type="submit" disabled={isAdding} className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50">
                  {isAdding ? 'چاوەڕێبە...' : 'تۆمارکردن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && historyCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <History className="w-6 h-6 text-indigo-500" />
                مێژووی مامەڵەکانی ({historyCustomer.name})
              </h2>
              <button onClick={() => setShowHistoryModal(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl">
                <p className="text-sm font-medium text-rose-600 mb-1">کۆی قەرزی ماوە</p>
                <h3 className="text-xl font-bold text-rose-700" dir="ltr">{historyCustomer.remainingDebt.toLocaleString()} IQD</h3>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                <p className="text-sm font-medium text-emerald-600 mb-1">کۆی پارەی دراو</p>
                <h3 className="text-xl font-bold text-emerald-700" dir="ltr">{historyCustomer.totalPaid.toLocaleString()} IQD</h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[300px] border border-slate-200 rounded-2xl">
              <table className="w-full text-right">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="p-4 font-medium text-slate-600">بەروار</th>
                    <th className="p-4 font-medium text-slate-600">جۆری مامەڵە</th>
                    <th className="p-4 font-medium text-slate-600">بڕ (IQD)</th>
                    <th className="p-4 font-medium text-slate-600">تێبینی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingHistory ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-500">خەریکی هێنانی زانیارییەکانە...</td></tr>
                  ) : transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-600 text-sm" dir="ltr">{format(new Date(tx.date), 'yyyy-MM-dd HH:mm')}</td>
                      <td className="p-4 font-bold">
                        {tx.type === 'Sale' && <span className="text-rose-600">کڕین بە قەرز</span>}
                        {tx.type === 'Payment' && <span className="text-emerald-600">پارەدان</span>}
                        {tx.type === 'ManualDebt' && <span className="text-rose-600">قەرزی نوێ</span>}
                      </td>
                      <td className="p-4 font-bold" dir="ltr">
                        {tx.type === 'Payment' ? '+' : '-'}{tx.amount.toLocaleString()}
                      </td>
                      <td className="p-4 text-slate-500 text-sm">{tx.notes}</td>
                    </tr>
                  ))}
                  {!loadingHistory && transactions.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-500">هیچ مامەڵەیەک نییە</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6">
              <button onClick={() => setShowHistoryModal(false)} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
                داخستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
