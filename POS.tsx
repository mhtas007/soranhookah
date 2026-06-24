import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, ShoppingCart, Minus, Plus, Trash2, Printer, CreditCard, Banknote, ArrowDownToLine, Gift } from 'lucide-react';
import type { Product, CartItem, PaymentMethod, Customer } from '../types';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';

export const POS: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [activeSection, setActiveSection] = useState<'All' | 'General' | 'V'>('All');
  const usdRate = useAppStore(state => state.settings.usdRate) || 150000;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Weight Modal State
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [selectedWeightProduct, setSelectedWeightProduct] = useState<Product | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [weightInputType, setWeightInputType] = useState<'grams' | 'money'>('grams');

  // Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  
  // New Customer State
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, customersRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('*').order('name', { ascending: true })
      ]);

      if (productsRes.error) throw productsRes.error;
      if (customersRes.error) throw customersRes.error;

      setProducts(productsRes.data.map((p: any) => ({
        id: p.id, name: p.name, barcode: p.barcode, costPrice: p.cost_price, sellingPrice: p.selling_price,
        category: p.category, stockLevel: p.stock_level, minStockAlert: p.min_stock_alert,
        section: p.section || 'General', company: p.company,
        bulkCost: p.bulk_cost || 0, bulkPrice: p.bulk_price || 0, bulkSize: p.bulk_size || 1, currency: p.currency || 'IQD',
        createdAt: p.created_at, updatedAt: p.updated_at
      })));

      setCustomers(customersRes.data.map((c: any) => ({
        id: c.id, name: c.name, phone: c.phone, totalPurchases: c.total_purchases,
        totalPaid: c.total_paid, remainingDebt: c.remaining_debt, createdAt: c.created_at
      })));

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSection = activeSection === 'All' || p.section === activeSection;
    const matchesSearch = p.name.includes(searchTerm) || p.barcode.includes(searchTerm);
    return matchesSection && matchesSearch;
  });

  const handleProductClick = (product: Product) => {
    if (product.stockLevel <= 0) return;
    if (product.barcode.startsWith('WGT-')) {
      setSelectedWeightProduct(product);
      setWeightInput('');
      setWeightInputType('grams');
      setShowWeightModal(true);
    } else {
      addToCart(product, 1);
    }
  };

  const addToCart = (product: Product, quantityToAdd: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity + quantityToAdd > product.stockLevel) return prev; 
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + quantityToAdd } : item
        );
      }
      if (quantityToAdd > product.stockLevel) return prev;
      return [...prev, { ...product, quantity: quantityToAdd }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        // Check stock bounds
        const product = products.find(p => p.id === id);
        if (product && newQ > product.stockLevel) return item;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const toggleGift = (id: string) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, isGift: !item.isGift } : item));
  };

  const getItemTotals = (item: CartItem) => {
    if (item.isGift) return { amount: 0, profit: 0, isBulkActivated: false };
    
    let isWgt = item.barcode.startsWith('WGT-');
    let baseQty = isWgt ? item.quantity / 1000 : item.quantity;
    
    let saleAmountIQD = 0;
    let costAmountIQD = 0;
    let isBulkActivated = false;

    const exchange = item.currency === 'USD' ? (usdRate / 100) : 1;
    
    if (item.bulkSize > 1 && baseQty >= item.bulkSize) {
      isBulkActivated = true;
      const bulkCount = Math.floor(baseQty / item.bulkSize);
      const pieceCount = baseQty % item.bulkSize;
      
      saleAmountIQD = (bulkCount * item.bulkPrice + pieceCount * item.sellingPrice) * exchange;
      costAmountIQD = (bulkCount * item.bulkCost + pieceCount * item.costPrice) * exchange;
    } else {
      saleAmountIQD = (baseQty * item.sellingPrice) * exchange;
      costAmountIQD = (baseQty * item.costPrice) * exchange;
    }

    return { amount: saleAmountIQD, profit: saleAmountIQD - costAmountIQD, isBulkActivated };
  };

  const totalAmount = cart.reduce((sum, item) => sum + getItemTotals(item).amount, 0);
  const totalProfit = cart.reduce((sum, item) => sum + getItemTotals(item).profit, 0);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName) return;
    setIsCreatingCustomer(true);
    try {
      const { data, error } = await supabase.from('customers').insert({
        name: newCustomerName,
        phone: newCustomerPhone
      }).select().single();
      
      if (error) throw error;
      
      setCustomers([...customers, {
        id: data.id, name: data.name, phone: data.phone, totalPurchases: 0, totalPaid: 0, remainingDebt: 0, createdAt: data.created_at
      }]);
      setSelectedCustomer(data.id);
      setShowNewCustomerForm(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
    } catch (error: any) {
      alert("کێشەیەک ڕوویدا لە دروستکردنی کڕیار: " + error.message);
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'Debt' && !selectedCustomer) {
      alert("تکایە کڕیارێک هەڵبژێرە");
      return;
    }
    
    setIsProcessing(true);
    
    const finalAmount = totalAmount - Number(discountAmount || 0);
    const finalProfit = totalProfit - Number(discountAmount || 0);
    
    try {
      // 1. Insert Sale
      const { data: saleData, error: saleError } = await supabase.from('sales').insert({
        total_amount: finalAmount,
        total_profit: finalProfit,
        payment_method: paymentMethod,
        payment_amount: paymentMethod === 'Debt' ? 0 : finalAmount,
        debt_customer_id: paymentMethod === 'Debt' ? selectedCustomer : null,
      }).select().single();

      if (saleError) throw saleError;

      // 2. Insert Sale Items
      const saleItems = cart.map(item => {
        const totals = getItemTotals(item);
        const isWgt = item.barcode.startsWith('WGT-');
        const baseQty = isWgt ? (item.quantity / 1000) : item.quantity;
        return {
          sale_id: saleData.id,
          product_id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: totals.amount / (baseQty || 1), // average price per unit/kg in IQD
          cost: (totals.amount - totals.profit) / (baseQty || 1) // average cost per unit/kg in IQD
        };
      });

      const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
      if (itemsError) throw itemsError;

      // 3. Update Product Stock
      for (const item of cart) {
        const newStock = item.stockLevel - item.quantity;
        await supabase.from('products').update({ stock_level: newStock }).eq('id', item.id);
      }

      // 4. Update Customer Debt if applicable
      if (paymentMethod === 'Debt' && selectedCustomer) {
        const customer = customers.find(c => c.id === selectedCustomer);
        if (customer) {
          await supabase.from('customers').update({
            total_purchases: customer.totalPurchases + finalAmount,
            remaining_debt: customer.remainingDebt + finalAmount
          }).eq('id', selectedCustomer);
        }
      }

      // Print & Clear cart
      alert("فرۆشتنەکە بە سەرکەوتوویی ئەنجامدرا!");
      setCart([]);
      setPaymentMethod('Cash');
      setSelectedCustomer('');
      setDiscountAmount('');
      setAmountPaid('');
      setShowCheckoutModal(false);
      fetchData(); // Refresh data

    } catch (error: any) {
      console.error("Checkout Error:", error);
      alert("کێشەیەک ڕوویدا لە کاتی فرۆشتن: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-kurdish">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowRight className="w-6 h-6 text-slate-600" />
          </button>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-indigo-500" />
            فرۆشتن (POS)
          </h1>
        </div>
        <div className="text-slate-500 text-sm" dir="ltr">
          {new Date().toLocaleDateString('en-GB')}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <section className="flex-1 flex flex-col border-l border-slate-200 bg-slate-50/50">
          <div className="p-4 border-b border-slate-200 bg-white flex gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setActiveSection('All')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeSection === 'All' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                هەمووی
              </button>
              <button 
                onClick={() => setActiveSection('General')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeSection === 'General' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                بەشی گشتی
              </button>
              <button 
                onClick={() => setActiveSection('V')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeSection === 'V' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                بەشی V
              </button>
            </div>
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="گەڕان یان سکانی بارکۆد..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-slate-50 focus:bg-white text-base"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="text-center text-slate-500 p-8">خەریکی هێنانی داتاکانە...</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map(product => {
                  const outOfStock = product.stockLevel <= 0;
                  return (
                    <button
                      key={product.id}
                      onClick={() => handleProductClick(product)}
                      disabled={outOfStock}
                      className={`bg-white p-4 rounded-2xl shadow-sm border transition-all text-right group ${
                        outOfStock ? 'opacity-50 cursor-not-allowed border-slate-100' : 'border-slate-100 hover:border-indigo-300 hover:shadow-md active:scale-95'
                      }`}
                    >
                      <div className="h-24 bg-slate-50 rounded-xl mb-3 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 transition-colors">
                        <ShoppingCart className="w-8 h-8 opacity-50" />
                      </div>
                      <h3 className="font-semibold text-slate-800 line-clamp-2 mb-1">{product.name}</h3>
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col text-right">
                          <p className="text-indigo-600 font-bold" dir="ltr">{product.currency === 'USD' ? '$' : ''}{product.sellingPrice.toLocaleString()} <span className="text-xs font-normal">{product.currency === 'USD' ? '' : 'IQD'}{product.barcode.startsWith('WGT-') ? '/کغم' : ''}</span></p>
                          {product.currency === 'USD' && (
                            <p className="text-xs text-slate-500 mt-0.5 font-medium">{(product.sellingPrice * (usdRate / 100)).toLocaleString()} IQD</p>
                          )}
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${outOfStock ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {product.barcode.startsWith('WGT-') ? `${(product.stockLevel / 1000).toFixed(2)} کغم` : product.stockLevel} ماوە
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <section className="w-[400px] xl:w-[450px] bg-white flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] shrink-0">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <h2 className="font-bold text-slate-800">کارت (بەسەبەتە)</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.map((item, index) => {
              const totals = getItemTotals(item);
              return (
              <div key={item.id} className={`bg-white border p-2 rounded-xl shadow-sm flex items-center justify-between gap-2 transition-colors ${item.isGift ? 'border-rose-200 bg-rose-50/30' : (totals.isBulkActivated ? 'border-purple-200 bg-purple-50/30' : 'border-slate-100')}`}>
                <div className="flex items-center gap-2 flex-1 overflow-hidden">
                  <span className="w-5 h-5 flex shrink-0 items-center justify-center bg-slate-100 text-slate-500 rounded-md text-xs font-bold font-mono">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 text-xs truncate leading-tight flex items-center gap-1">
                      {item.name}
                      {totals.isBulkActivated && <span className="text-[10px] bg-purple-200 text-purple-700 px-1 rounded font-bold">کۆتە</span>}
                    </h4>
                    <p className={`font-semibold text-xs mt-0.5 ${item.isGift ? 'text-rose-500' : 'text-indigo-600'}`} dir="ltr">
                      {item.isGift ? 'هەدیە (٠ IQD)' : totals.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => toggleGift(item.id)} 
                    title="هەدیە"
                    className={`p-1.5 rounded-lg transition-colors ${item.isGift ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`}
                  >
                    <Gift className="w-4 h-4" />
                  </button>

                  {item.barcode.startsWith('WGT-') ? (
                    <span className="font-bold text-slate-800 px-2 text-xs">{(item.quantity / 1000).toFixed(2)} کغم</span>
                  ) : (
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-100">
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-0.5 hover:bg-white rounded-md text-slate-600 shadow-sm"><Plus className="w-3.5 h-3.5" /></button>
                      <span className="font-bold text-slate-800 w-4 text-center text-xs">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-0.5 hover:bg-white rounded-md text-slate-600 shadow-sm"><Minus className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                  
                  <button onClick={() => removeFromCart(item.id)} className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )})}
            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                <ShoppingCart className="w-12 h-12 opacity-20" />
                <p>سەبەتەکە خاڵییە</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-slate-600">
                <span>کۆی گشتی:</span>
                <span className="font-bold text-slate-800 text-xl" dir="ltr">{totalAmount.toLocaleString()} IQD</span>
              </div>
            </div>

            <button 
              onClick={() => setShowCheckoutModal(true)}
              disabled={cart.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-200"
            >
              <Printer className="w-6 h-6" />
              پارەدان و چاپکردن
            </button>
          </div>
        </section>
      </main>

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Banknote className="w-7 h-7 text-emerald-500" />
              پوختەی پارەدان
            </h2>
            
            <div className="bg-slate-50 p-4 rounded-2xl mb-6 space-y-3">
              <div className="flex justify-between text-slate-600 text-lg">
                <span>کۆی گشتی:</span>
                <span className="font-bold text-slate-800" dir="ltr">{totalAmount.toLocaleString()} IQD</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>داشکاندن (Discount):</span>
                <input 
                  type="number"
                  value={discountAmount}
                  onChange={e => setDiscountAmount(e.target.value)}
                  placeholder="بڕی داشکاندن..."
                  className="w-1/2 p-2 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-left font-bold text-rose-500"
                  dir="ltr"
                />
              </div>
              <div className="flex justify-between text-indigo-700 text-xl pt-3 border-t border-slate-200">
                <span className="font-bold">کۆی کۆتایی:</span>
                <span className="font-black" dir="ltr">{(totalAmount - Number(discountAmount || 0)).toLocaleString()} IQD</span>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium text-slate-700 mb-3">شێوازی پارەدان</p>
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => setPaymentMethod('Cash')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentMethod === 'Cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-50'}`}>
                  <Banknote className="w-6 h-6 mb-2" />
                  <span className="font-bold">نەقد</span>
                </button>
                <button onClick={() => setPaymentMethod('FIB')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentMethod === 'FIB' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-50'}`}>
                  <CreditCard className="w-6 h-6 mb-2" />
                  <span className="font-bold">FIB</span>
                </button>
                <button onClick={() => setPaymentMethod('Debt')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentMethod === 'Debt' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-50'}`}>
                  <ArrowDownToLine className="w-6 h-6 mb-2" />
                  <span className="font-bold">قەرز</span>
                </button>
              </div>
            </div>

            {paymentMethod === 'Debt' && (
              <div className="mb-6 p-4 border-2 border-amber-100 bg-amber-50 rounded-2xl">
                {!showNewCustomerForm ? (
                  <>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-bold text-amber-800">هەڵبژاردنی کڕیار</label>
                      <button onClick={() => setShowNewCustomerForm(true)} className="text-sm bg-amber-200 hover:bg-amber-300 text-amber-800 px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors">
                        <Plus className="w-4 h-4" /> کڕیاری نوێ
                      </button>
                    </div>
                    <select 
                      value={selectedCustomer}
                      onChange={(e) => setSelectedCustomer(e.target.value)}
                      className="w-full p-3 rounded-xl border-0 ring-1 ring-amber-200 focus:ring-2 focus:ring-amber-500 outline-none text-amber-900 bg-white font-medium"
                    >
                      <option value="">کڕیارێک هەڵبژێرە...</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} - (قەرزی ماوە: {c.remainingDebt.toLocaleString()})</option>
                      ))}
                    </select>
                  </>
                ) : (
                  <form onSubmit={handleCreateCustomer}>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-bold text-amber-800">کڕیاری نوێ</label>
                      <button type="button" onClick={() => setShowNewCustomerForm(false)} className="text-sm text-amber-600 hover:text-amber-800">
                        گەڕانەوە بۆ لیست
                      </button>
                    </div>
                    <div className="space-y-3">
                      <input 
                        required 
                        type="text" 
                        placeholder="ناوی کڕیار..." 
                        value={newCustomerName}
                        onChange={e => setNewCustomerName(e.target.value)}
                        className="w-full p-3 rounded-xl border-0 ring-1 ring-amber-200 focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                      />
                      <input 
                        type="text" 
                        placeholder="ژمارەی مۆبایل (ئارەزوومەندانە)..." 
                        value={newCustomerPhone}
                        onChange={e => setNewCustomerPhone(e.target.value)}
                        className="w-full p-3 rounded-xl border-0 ring-1 ring-amber-200 focus:ring-2 focus:ring-amber-500 outline-none bg-white text-left" dir="ltr"
                      />
                      <button 
                        type="submit" 
                        disabled={isCreatingCustomer}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl disabled:opacity-50"
                      >
                        {isCreatingCustomer ? 'خەریکە...' : 'خەزنکردنی کڕیار'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {paymentMethod === 'Cash' && (
              <div className="mb-8">
                <label className="block text-sm font-medium text-slate-700 mb-2">بڕی پارەی دراو (بۆ حیسابکردنی باقی)</label>
                <input 
                  type="number"
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  placeholder="بۆ نموونە: ٢٥٠٠٠"
                  className="w-full p-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none text-left font-bold text-lg"
                  dir="ltr"
                />
                {amountPaid && Number(amountPaid) >= (totalAmount - Number(discountAmount || 0)) && (
                  <div className="mt-3 p-4 bg-emerald-50 rounded-xl flex justify-between items-center border border-emerald-100">
                    <span className="font-medium text-emerald-800">باقیی گەڕاوە:</span>
                    <span className="font-black text-emerald-600 text-xl" dir="ltr">{(Number(amountPaid) - (totalAmount - Number(discountAmount || 0))).toLocaleString()} IQD</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors"
              >
                پاشگەزبوونەوە
              </button>
              <button 
                onClick={handleCheckout}
                disabled={isProcessing || (paymentMethod === 'Debt' && !selectedCustomer)}
                className="flex-[2] bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-200"
              >
                <Printer className="w-6 h-6" />
                {isProcessing ? 'خەریکە...' : 'پارەدان و چاپکردن'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weight Modal */}
      {showWeightModal && selectedWeightProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-xl font-bold text-slate-800 mb-2">فرۆشتن بە کێش</h2>
            <p className="text-sm text-slate-500 mb-6">{selectedWeightProduct.name} - (کیلۆی بە {selectedWeightProduct.sellingPrice.toLocaleString()})</p>
            
            <div className="flex gap-2 mb-6">
              <button 
                onClick={() => { setWeightInputType('money'); setWeightInput(''); }} 
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${weightInputType === 'money' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                بە پارە (دینار)
              </button>
              <button 
                onClick={() => { setWeightInputType('grams'); setWeightInput(''); }} 
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${weightInputType === 'grams' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                بە کێش (کیلۆگرام)
              </button>
            </div>

            {weightInputType === 'money' ? (
              <>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[1000, 2000, 3000, 4000, 5000].map(amt => (
                    <button
                      key={amt}
                      onClick={() => {
                        const grams = Math.round((amt / selectedWeightProduct.sellingPrice) * 1000);
                        addToCart(selectedWeightProduct, grams);
                        setShowWeightModal(false);
                      }}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-3 rounded-xl border border-emerald-100 transition-colors"
                      dir="ltr"
                    >
                      {amt.toLocaleString()}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      const grams = Math.round((10000 / selectedWeightProduct.sellingPrice) * 1000);
                      addToCart(selectedWeightProduct, grams);
                      setShowWeightModal(false);
                    }}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-3 rounded-xl border border-emerald-100 transition-colors"
                    dir="ltr"
                  >
                    10,000
                  </button>
                </div>
                
                <div className="relative mb-6">
                  <input 
                    type="number" 
                    placeholder="بڕی پارە بنووسە..." 
                    value={weightInput}
                    onChange={e => setWeightInput(e.target.value)}
                    className="w-full p-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none text-center font-bold text-lg"
                    dir="ltr"
                  />
                  {weightInput && (
                    <p className="text-center text-xs text-indigo-600 mt-2 font-bold">
                      دەکاتە: {(Number(weightInput) / selectedWeightProduct.sellingPrice).toFixed(3)} کغم
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="mb-6">
                <input 
                  type="number" 
                  step="any"
                  placeholder="بڕ بە کیلۆگرام بنووسە (نموونە: ١.٥)..." 
                  value={weightInput}
                  onChange={e => setWeightInput(e.target.value)}
                  className="w-full p-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none text-center font-bold text-lg"
                  dir="ltr"
                />
                {weightInput && (
                  <p className="text-center text-xs text-emerald-600 mt-2 font-bold">
                    نرخ: {Math.round(Number(weightInput) * selectedWeightProduct.sellingPrice).toLocaleString()} دینار
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowWeightModal(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
                پاشگەزبوونەوە
              </button>
              <button 
                disabled={!weightInput}
                onClick={() => {
                  let grams = 0;
                  if (weightInputType === 'money') {
                    grams = Math.round((Number(weightInput) / selectedWeightProduct.sellingPrice) * 1000);
                  } else {
                    grams = Math.round(Number(weightInput) * 1000);
                  }
                  if (grams > 0) {
                    addToCart(selectedWeightProduct, grams);
                    setShowWeightModal(false);
                  }
                }} 
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl transition-colors"
              >
                زیادکردن
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
