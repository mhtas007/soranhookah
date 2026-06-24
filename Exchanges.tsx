import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  RefreshCcw, 
  Search, 
  Package, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';

export const Exchanges: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAppStore(state => state.currentUser);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Cart States
  const [returnedItems, setReturnedItems] = useState<any[]>([]); // Items customer brings back
  const [newItems, setNewItems] = useState<any[]>([]); // Items customer takes

  const [isProcessing, setIsProcessing] = useState(false);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search Products
  useEffect(() => {
    const searchProducts = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .or(`name.ilike.%${searchQuery}%,barcode.ilike.%${searchQuery}%`)
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (error) {
        console.error('Error searching products:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const addToList = (product: any, listType: 'return' | 'new') => {
    const setList = listType === 'return' ? setReturnedItems : setNewItems;
    setList(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateQuantity = (id: string, delta: number, listType: 'return' | 'new') => {
    const setList = listType === 'return' ? setReturnedItems : setNewItems;
    setList(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeItem = (id: string, listType: 'return' | 'new') => {
    const setList = listType === 'return' ? setReturnedItems : setNewItems;
    setList(prev => prev.filter(item => item.id !== id));
  };

  const totalReturnVal = returnedItems.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);
  const totalNewVal = newItems.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);
  const difference = totalNewVal - totalReturnVal;

  const handleCompleteExchange = async () => {
    if (returnedItems.length === 0 && newItems.length === 0) return;
    
    setIsProcessing(true);
    try {
      // 1. Update Product Stocks
      // Returned items go back to stock (+)
      for (const item of returnedItems) {
        const { data: currentProduct } = await supabase.from('products').select('stock_level').eq('id', item.id).single();
        if (currentProduct) {
          await supabase.from('products').update({ stock_level: currentProduct.stock_level + item.quantity }).eq('id', item.id);
        }
      }
      
      // New items go out of stock (-)
      for (const item of newItems) {
        const { data: currentProduct } = await supabase.from('products').select('stock_level').eq('id', item.id).single();
        if (currentProduct) {
          await supabase.from('products').update({ stock_level: currentProduct.stock_level - item.quantity }).eq('id', item.id);
        }
      }

      // 2. Handle Money Difference
      if (difference > 0) {
        // Customer needs to pay the difference -> Log as Sale
        const { data: saleData, error: saleError } = await supabase
          .from('sales')
          .insert({
            cashier_id: currentUser?.id,
            total_amount: difference,
            total_profit: 0, // Simplified for exchange
            payment_method: 'Cash',
            payment_amount: difference,
            status: 'Completed'
          })
          .select()
          .single();

        if (saleError) throw saleError;

        // Insert new items as sale items
        if (newItems.length > 0) {
          const saleItemsData = newItems.map(item => ({
            sale_id: saleData.id,
            product_id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.selling_price,
            cost: item.cost_price
          }));
          await supabase.from('sale_items').insert(saleItemsData);
        }
        
        // Return items handled via Expense internally or just accept the stock change.
        // For accurate cash, we record the difference as a sale.

      } else if (difference < 0) {
        // We owe the customer money -> Log as Expense
        const { error: expenseError } = await supabase
          .from('expenses')
          .insert({
            amount: Math.abs(difference),
            category: 'گەڕانەوە و گۆڕین',
            notes: `پێدانەوەی جیاوازی پارە لە کاتی گۆڕینەوەی کاڵا. بەکارهێنەر: ${currentUser?.name || 'نەزانراو'}`
          });
        if (expenseError) throw expenseError;
      }

      alert('گۆڕینەوەکە بە سەرکەوتوویی جێبەجێ کرا!');
      setReturnedItems([]);
      setNewItems([]);
    } catch (error: any) {
      console.error('Error completing exchange:', error);
      alert('کێشەیەک ڕوویدا: ' + error.message);
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
            <div className="bg-cyan-100 p-2 rounded-xl text-cyan-600">
              <RefreshCcw className="w-6 h-6" />
            </div>
            بەشی گۆڕینەوە
          </h1>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col gap-6">
        
        {/* Search Bar */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 relative z-20" ref={searchRef}>
          <div className="relative">
            <Search className="w-6 h-6 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="گەڕان بۆ کاڵا (ناوی کاڵا یان بارکۆد لێبدە...)"
              className="w-full bg-slate-50 pl-12 pr-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-cyan-500 focus:bg-white outline-none transition-all text-lg shadow-inner"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-20 max-h-80 overflow-y-auto">
              {searchResults.map(product => (
                <div
                  key={product.id}
                  className="w-full p-4 hover:bg-cyan-50 border-b border-slate-50 flex justify-between items-center transition-colors group"
                >
                  <div className="text-right">
                    <p className="font-bold text-slate-800 text-lg group-hover:text-cyan-700">{product.name}</p>
                    <p className="font-bold text-cyan-600" dir="ltr">{product.selling_price.toLocaleString()} IQD</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => addToList(product, 'return')}
                      className="px-4 py-2 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-xl font-bold text-sm transition-colors"
                    >
                      بیکە بە کاڵای گەڕاوە
                    </button>
                    <button 
                      onClick={() => addToList(product, 'new')}
                      className="px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-xl font-bold text-sm transition-colors"
                    >
                      بیکە بە کاڵای نوێ (دەیبات)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
          {/* Returned Items */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[500px]">
            <div className="p-4 bg-rose-50 border-b border-rose-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-rose-800">کاڵای گەڕاوە (هێناویەتیەوە)</h2>
              <span className="font-bold text-rose-600" dir="ltr">{totalReturnVal.toLocaleString()} IQD</span>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-right">
                <tbody className="divide-y divide-slate-50">
                  {returnedItems.map(item => (
                    <tr key={item.id}>
                      <td className="p-4 font-bold text-slate-800">{item.name}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => updateQuantity(item.id, 1, 'return')} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                          <span className="font-bold w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, -1, 'return')} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                          <button onClick={() => removeItem(item.id, 'return')} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 className="w-5 h-5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* New Items */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[500px]">
            <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-emerald-800">کاڵای نوێ (دەیبات)</h2>
              <span className="font-bold text-emerald-600" dir="ltr">{totalNewVal.toLocaleString()} IQD</span>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-right">
                <tbody className="divide-y divide-slate-50">
                  {newItems.map(item => (
                    <tr key={item.id}>
                      <td className="p-4 font-bold text-slate-800">{item.name}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => updateQuantity(item.id, 1, 'new')} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                          <span className="font-bold w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, -1, 'new')} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                          <button onClick={() => removeItem(item.id, 'new')} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 className="w-5 h-5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Total & Complete */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm mb-1">ئەنجامی گۆڕینەوەکە</p>
            {difference > 0 ? (
              <p className="text-2xl font-black text-emerald-600">کڕیار دەبێت بیدات: <span dir="ltr">{difference.toLocaleString()} IQD</span></p>
            ) : difference < 0 ? (
              <p className="text-2xl font-black text-rose-600">پێویستە بیدەیتەوە بە کڕیار: <span dir="ltr">{Math.abs(difference).toLocaleString()} IQD</span></p>
            ) : (
              <p className="text-2xl font-black text-slate-600">یەکسانە (٠ IQD)</p>
            )}
          </div>
          
          <button
            onClick={handleCompleteExchange}
            disabled={isProcessing || (returnedItems.length === 0 && newItems.length === 0)}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-4 rounded-2xl font-bold text-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? 'چاوەڕێبە...' : 'تەواوکردنی گۆڕینەوە'}
            <CheckCircle2 className="w-6 h-6" />
          </button>
        </div>

      </main>
    </div>
  );
};
