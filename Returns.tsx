import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  ArrowLeftRight, 
  Search, 
  Package, 
  Plus, 
  Minus, 
  Receipt,
  AlertCircle,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';

export const Returns: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAppStore(state => state.currentUser);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [sales, setSales] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Selected Sale State
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [returnItems, setReturnItems] = useState<{ [key: string]: number }>({});
  
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch recent sales initially or search by ID
  useEffect(() => {
    const fetchSales = async () => {
      setIsSearching(true);
      try {
        let query = supabase
          .from('sales')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (searchQuery.trim()) {
          // If searching, try to match UUID (receipt ID)
          if (searchQuery.length > 8) {
             query = query.ilike('id', `%${searchQuery}%`);
          } else {
             // Otherwise just keep recent
          }
        }

        const { data, error } = await query;
        if (error) throw error;
        setSales(data || []);
      } catch (error) {
        console.error('Error fetching sales:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(fetchSales, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSelectSale = async (sale: any) => {
    setSelectedSale(sale);
    setReturnItems({});
    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', sale.id);
      
      if (error) throw error;
      setSaleItems(data || []);
    } catch (error) {
      console.error('Error fetching sale items:', error);
    }
  };

  const handleReturnQuantityChange = (itemId: string, maxQuantity: number, delta: number) => {
    setReturnItems(prev => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, Math.min(maxQuantity, current + delta));
      if (next === 0) {
        const newObj = { ...prev };
        delete newObj[itemId];
        return newObj;
      }
      return { ...prev, [itemId]: next };
    });
  };

  // Calculate total refund based on returnItems
  const totalRefund = saleItems.reduce((sum, item) => {
    const returnQty = returnItems[item.id] || 0;
    return sum + (item.price * returnQty);
  }, 0);

  const handleCompleteReturn = async () => {
    const itemsToReturn = Object.keys(returnItems).length;
    if (itemsToReturn === 0) return;
    
    if (!confirm(`دڵنیایت لە گەڕاندنەوەی ئەم کاڵایانە؟\nبڕی پارەی گەڕاوە: ${totalRefund.toLocaleString()} IQD`)) {
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Update Product Stocks (Add returned quantity back)
      for (const item of saleItems) {
        const returnQty = returnItems[item.id];
        if (!returnQty) continue;

        const { data: currentProduct, error: fetchError } = await supabase
          .from('products')
          .select('stock_level')
          .eq('id', item.product_id)
          .single();
          
        if (!fetchError && currentProduct) {
          const newStock = currentProduct.stock_level + returnQty;
          await supabase.from('products').update({ stock_level: newStock }).eq('id', item.product_id);
        }
      }

      // 2. Handle Money Return
      if (totalRefund > 0) {
        if (selectedSale.payment_method === 'Debt' && selectedSale.debt_customer_id) {
          // Decrease Customer Debt
          const { data: customer } = await supabase.from('customers').select('*').eq('id', selectedSale.debt_customer_id).single();
          if (customer) {
            await supabase.from('customers').update({
              total_purchases: Math.max(0, customer.total_purchases - totalRefund),
              remaining_debt: Math.max(0, customer.remaining_debt - totalRefund)
            }).eq('id', selectedSale.debt_customer_id);
          }
        } else {
          // Insert into Expenses (To deduct money from the safe)
          const { error: expenseError } = await supabase
            .from('expenses')
            .insert({
              amount: totalRefund,
              category: 'گەڕانەوەی کاڵا',
              notes: `گەڕانەوەی کاڵا لە وەصڵی ژمارە: ${selectedSale.id.substring(0,8)}. بەکارهێنەر: ${currentUser?.name || 'نەزانراو'}`
            });
          if (expenseError) throw expenseError;
        }
      }

      alert('گەڕانەوەکە بە سەرکەوتوویی جێبەجێ کرا! پارەکە لە قاسە دەرکرا و کاڵاکە خرایەوە کۆگا.');
      setSelectedSale(null);
      setSaleItems([]);
      setReturnItems({});
    } catch (error: any) {
      console.error('Error completing return:', error);
      alert('کێشەیەک ڕوویدا لە کاتی گەڕانەوەدا: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-kurdish">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowRight className="w-6 h-6 text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <div className="bg-rose-100 p-2 rounded-xl text-rose-600">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            گەڕانەوەی کاڵا بەپێی وەصڵ
          </h1>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Search Receipts */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col h-[calc(100vh-120px)] sticky top-24">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">وەصڵە فرۆشراوەکان</h2>
            
            <div className="relative mb-4">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="گەڕان بە ژمارەی وەصڵ..."
                className="w-full bg-slate-50 pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 outline-none transition-all text-sm"
                dir="ltr"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {isSearching ? (
                <div className="text-center py-8 text-slate-500">خەریکی گەڕانە...</div>
              ) : sales.length === 0 ? (
                <div className="text-center py-8 text-slate-500">هیچ وەصڵێک نەدۆزرایەوە</div>
              ) : (
                sales.map(sale => (
                  <button
                    key={sale.id}
                    onClick={() => handleSelectSale(sale)}
                    className={`w-full text-right p-4 rounded-2xl border transition-all ${selectedSale?.id === sale.id ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600" dir="ltr">#{sale.id.substring(0,8)}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(sale.created_at).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="font-bold text-rose-600" dir="ltr">{sale.total_amount.toLocaleString()} IQD</span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{sale.payment_method}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Receipt Details & Return Items */}
        <div className="lg:col-span-2">
          {!selectedSale ? (
             <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-12 h-full flex flex-col items-center justify-center text-slate-400">
               <Receipt className="w-16 h-16 text-slate-200 mb-4" />
               <p className="text-xl font-bold text-slate-600 mb-2">هیچ وەصڵێک دیارینەکراوە</p>
               <p>تکایە لە لیستەکەی تەنیشتەوە وەصڵێک هەڵبژێرە بۆ گەڕاندنەوەی کاڵاکانی</p>
             </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[calc(100vh-120px)]">
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Receipt className="w-6 h-6 text-rose-500" />
                    وردەکاری وەصڵ
                  </h2>
                  <p className="text-slate-500 text-sm mt-1 font-mono" dir="ltr">ID: {selectedSale.id}</p>
                </div>
                <div className="text-left">
                  <p className="text-sm text-slate-500">کۆی وەصڵ</p>
                  <p className="font-bold text-xl text-slate-800" dir="ltr">{selectedSale.total_amount.toLocaleString()} IQD</p>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-6">
                <table className="w-full text-right">
                  <thead className="text-slate-500 text-sm border-b border-slate-100">
                    <tr>
                      <th className="pb-4 font-medium">کاڵا</th>
                      <th className="pb-4 font-medium text-center">بڕی کڕدراو</th>
                      <th className="pb-4 font-medium text-left">نرخ</th>
                      <th className="pb-4 font-medium text-center">بڕی گەڕاوە</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {saleItems.map(item => {
                      const returnQty = returnItems[item.id] || 0;
                      return (
                        <tr key={item.id} className={returnQty > 0 ? "bg-rose-50/30" : ""}>
                          <td className="py-4">
                            <p className="font-bold text-slate-800">{item.name}</p>
                          </td>
                          <td className="py-4 text-center font-bold text-slate-600">
                            {item.quantity}
                          </td>
                          <td className="py-4 text-left font-bold text-slate-600" dir="ltr">
                            {item.price.toLocaleString()}
                          </td>
                          <td className="py-4">
                            <div className="flex items-center justify-center gap-3">
                              <button 
                                onClick={() => handleReturnQuantityChange(item.id, item.quantity, 1)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${returnQty === item.quantity ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-rose-100 hover:bg-rose-200 text-rose-600'}`}
                                disabled={returnQty === item.quantity}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <span className="font-bold text-lg w-8 text-center text-rose-600">{returnQty}</span>
                              <button 
                                onClick={() => handleReturnQuantityChange(item.id, item.quantity, -1)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${returnQty === 0 ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                                disabled={returnQty === 0}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Checkout Section */}
              <div className="border-t border-slate-100 p-6 bg-slate-50">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <p className="text-slate-500 mb-1">
                      {selectedSale.payment_method === 'Debt' ? 'کۆی قەرز کە دادەبەزێت' : 'کۆی پارەی گەڕاوە (دەردەکرێت لە قاسە)'}
                    </p>
                    <div className="text-3xl font-black text-rose-600" dir="ltr">
                      {totalRefund.toLocaleString()} <span className="text-lg font-bold text-rose-600/70">IQD</span>
                    </div>
                  </div>
                  <button
                    onClick={handleCompleteReturn}
                    disabled={totalRefund === 0 || isProcessing}
                    className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-4 rounded-2xl font-bold text-xl transition-all shadow-lg shadow-rose-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isProcessing ? 'چاوەڕێبە...' : 'تەواوکردنی گەڕانەوە'}
                    <CheckCircle2 className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-3 rounded-xl border border-amber-100 mt-6">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>
                    {selectedSale?.payment_method === 'Debt' 
                      ? 'تێبینی: چونکە ئەم وەصڵە بە قەرز بووە، پارە لە قاسە دەرناکرێت، بەڵکو بڕی گەڕاوە ڕاستەوخۆ لە قەرزی کڕیارەکە کەم دەکرێتەوە و کاڵاکە دەچێتەوە کۆگا.'
                      : 'تێبینی: ئەو کاڵایانەی دەیانگەڕێنیتەوە ڕاستەوخۆ دەچنەوە سەر کۆگا، و پارەکەشیان لە خەرجییەکان تۆمار دەکرێت بۆ ئەوەی قاسە ڕێک بێت.'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
};
