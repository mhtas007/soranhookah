import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ScrollText, Calendar, Eye, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { startOfDay, endOfDay, format } from 'date-fns';

export const Receipts: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Date Range filter
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');

  const [salesList, setSalesList] = useState<any[]>([]);
  const [customers, setCustomers] = useState<{id: string, name: string}[]>([]);

  // Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [receiptItems, setReceiptItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    fetchReceipts();
  }, [startDate, endDate]);

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const start = startOfDay(new Date(startDate)).toISOString();
      const end = endOfDay(new Date(endDate)).toISOString();

      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      const { data: customersData } = await supabase.from('customers').select('id, name');
      if (customersData) {
        setCustomers(customersData);
      }

      setSalesList(sales || []);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReceiptItems = async (saleId: string) => {
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', saleId);
        
      if (error) throw error;
      setReceiptItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleViewReceipt = (sale: any) => {
    setSelectedReceipt(sale);
    fetchReceiptItems(sale.id);
  };

  const filteredSales = salesList.filter(s => {
    const customer = customers.find(c => c.id === s.debt_customer_id);
    const searchString = `${s.id} ${customer?.name || ''} ${s.payment_method}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-kurdish">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowRight className="w-6 h-6 text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-pink-500" />
            وەسڵەکان
          </h1>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Filters */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">لە بەرواری</label>
            <div className="relative">
              <Calendar className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-pink-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">تا بەرواری</label>
            <div className="relative">
              <Calendar className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input 
                type="date" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-pink-500 outline-none"
              />
            </div>
          </div>
          <div className="flex-1 min-w-[250px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">گەڕان</label>
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="گەڕان بەپێی کڕیار یان جۆری پارەدان..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-pink-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Sales List */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="p-4 font-medium">کات</th>
                  <th className="p-4 font-medium">شێوازی پارەدان</th>
                  <th className="p-4 font-medium">داشکان</th>
                  <th className="p-4 font-medium">کۆی گشتی</th>
                  <th className="p-4 font-medium">قازانج</th>
                  <th className="p-4 font-medium text-center">دۆخ</th>
                  <th className="p-4 font-medium text-center">وردەکاری</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-500">خەریکی هێنانی داتاکانە...</td></tr>
                ) : filteredSales.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-500">هیچ وەصڵێک نییە</td></tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/50">
                      <td className="p-4" dir="ltr">{format(new Date(sale.created_at), 'yyyy-MM-dd HH:mm')}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold inline-block ${
                          sale.payment_method === 'Cash' ? 'bg-emerald-100 text-emerald-700' :
                          sale.payment_method === 'FIB' ? 'bg-indigo-100 text-indigo-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {sale.payment_method}
                        </span>
                        {sale.payment_method === 'Debt' && sale.debt_customer_id && (
                          <span className="block text-xs text-amber-600 mt-1 font-medium">
                            (کڕیار: {customers.find(c => c.id === sale.debt_customer_id)?.name || 'نەزانراو'})
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-rose-500 font-medium" dir="ltr">{(sale.discount || 0).toLocaleString()}</td>
                      <td className="p-4 font-bold text-slate-800" dir="ltr">{sale.total_amount.toLocaleString()} IQD</td>
                      <td className="p-4 text-emerald-600 font-bold" dir="ltr">{sale.total_profit.toLocaleString()} IQD</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                          sale.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {sale.status === 'Completed' ? 'تەواوکراو' : sale.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => handleViewReceipt(sale)}
                          className="text-pink-600 hover:bg-pink-50 px-3 py-1.5 rounded-lg font-medium text-sm transition-colors border border-transparent hover:border-pink-200 flex items-center justify-center gap-1 mx-auto"
                        >
                          <Eye className="w-4 h-4" />
                          بینین
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <ScrollText className="w-6 h-6 text-pink-500" />
                وردەکاری وەسڵ
              </h2>
              <button onClick={() => setSelectedReceipt(null)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-1">کۆی گشتی (بڕی فرۆشتن)</p>
                <p className="text-lg font-bold text-slate-800" dir="ltr">{selectedReceipt.total_amount.toLocaleString()}</p>
              </div>
              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                <p className="text-xs font-medium text-rose-600 mb-1">داشکان</p>
                <p className="text-lg font-bold text-rose-700" dir="ltr">{(selectedReceipt.discount || 0).toLocaleString()}</p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <p className="text-xs font-medium text-emerald-600 mb-1">کۆی قازانج</p>
                <p className="text-lg font-bold text-emerald-700" dir="ltr">{selectedReceipt.total_profit.toLocaleString()}</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                <p className="text-xs font-medium text-indigo-600 mb-1">شێوازی پارەدان</p>
                <p className="text-lg font-bold text-indigo-700">{selectedReceipt.payment_method}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl min-h-[300px]">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="p-4 font-medium text-slate-600">ناوی کاڵا</th>
                    <th className="p-4 font-medium text-slate-600 text-center">بڕ</th>
                    <th className="p-4 font-medium text-slate-600">نرخی دانە</th>
                    <th className="p-4 font-medium text-slate-600">کۆی نرخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingItems ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-500">خەریکی هێنانی کاڵاکانە...</td></tr>
                  ) : receiptItems.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-500">هیچ کاڵایەک نەدۆزرایەوە</td></tr>
                  ) : (
                    receiptItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-4 font-bold text-slate-800">{item.name}</td>
                        <td className="p-4 text-center font-bold text-slate-600">{item.quantity}</td>
                        <td className="p-4 text-slate-600" dir="ltr">{item.price.toLocaleString()}</td>
                        <td className="p-4 font-bold text-blue-600" dir="ltr">{(item.price * item.quantity).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={() => setSelectedReceipt(null)} className="px-8 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors">
                داخستن
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
