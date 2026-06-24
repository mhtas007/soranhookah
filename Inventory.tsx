import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, PackageSearch, AlertTriangle, TrendingUp, DollarSign, PackagePlus, Plus, Search, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';

export const Inventory: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all'); // Placeholder for when company_id is added to DB
  const [activeSection, setActiveSection] = useState<'General' | 'V'>('General');
  
  // Add Stock Modal
  const [showAddStock, setShowAddStock] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockToAdd, setStockToAdd] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('stock_level', { ascending: true }); // Low stock first
        
      if (error) throw error;
      
      const formattedProducts = (data || []).map(p => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode,
        costPrice: p.cost_price,
        sellingPrice: p.selling_price,
        category: p.category,
        stockLevel: p.stock_level,
        minStockAlert: p.min_stock_alert,
        section: p.section || 'General',
        company: p.company || ''
      })) as Product[];
      
      setProducts(formattedProducts);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !stockToAdd) return;

    setIsProcessing(true);
    try {
      const amountToAdd = selectedProduct.barcode.startsWith('WGT-') ? Math.round(parseFloat(stockToAdd) * 1000) : parseInt(stockToAdd);
      const newStock = selectedProduct.stockLevel + amountToAdd;
      
      const { error } = await supabase
        .from('products')
        .update({ stock_level: newStock })
        .eq('id', selectedProduct.id);
        
      if (error) throw error;
      
      alert('بڕی کاڵا بە سەرکەوتوویی زیاد کرا!');
      setShowAddStock(false);
      setStockToAdd('');
      setSelectedProduct(null);
      fetchInventory();
    } catch (error: any) {
      alert('کێشەیەک ڕوویدا: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter products by section BEFORE calculation
  const sectionProducts = products.filter(p => p.section === activeSection);

  const totalCost = sectionProducts.reduce((sum, p) => sum + (p.costPrice * p.stockLevel), 0);
  const totalSellingValue = sectionProducts.reduce((sum, p) => sum + (p.sellingPrice * p.stockLevel), 0);
  const expectedProfit = totalSellingValue - totalCost;

  const lowStockProducts = sectionProducts.filter(p => p.stockLevel <= 10 || p.stockLevel <= p.minStockAlert);
  
  const categories = ['all', ...Array.from(new Set(sectionProducts.map(p => p.category)))];
  const companies = ['all', ...Array.from(new Set(sectionProducts.filter(p => p.company).map(p => p.company)))];
  
  // Filtering
  const filteredProducts = sectionProducts.filter(p => {
    const matchesSearch = p.name.includes(searchTerm) || p.barcode.includes(searchTerm);
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesCompany = selectedCompany === 'all' || p.company === selectedCompany;
    return matchesSearch && matchesCategory && matchesCompany;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-kurdish">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowRight className="w-6 h-6 text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
              <PackageSearch className="w-6 h-6" />
            </div>
            کۆگا (Inventory)
          </h1>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Section Tabs */}
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveSection('General')}
            className={`flex-1 py-4 rounded-3xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${activeSection === 'General' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-100' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200 scale-95'}`}
          >
            بەشی گشتی
          </button>
          <button 
            onClick={() => setActiveSection('V')}
            className={`flex-1 py-4 rounded-3xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${activeSection === 'V' ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 scale-100' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200 scale-95'}`}
          >
            <span className="text-2xl font-black">V</span>
            بەشی ڤێ
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-2 text-slate-500">
              <DollarSign className="w-5 h-5 text-blue-500" />
              <h3 className="font-medium">کۆی گشتی تێچووی کۆگا</h3>
            </div>
            <p className="text-3xl font-black text-slate-800" dir="ltr">{totalCost.toLocaleString()} <span className="text-sm text-slate-400">IQD</span></p>
          </div>
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-2 text-slate-500">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <h3 className="font-medium">کۆی گشتی نرخی فرۆشتن</h3>
            </div>
            <p className="text-3xl font-black text-emerald-600" dir="ltr">{totalSellingValue.toLocaleString()} <span className="text-sm text-slate-400">IQD</span></p>
          </div>
          
          <div className="bg-emerald-50 p-6 rounded-3xl shadow-sm border border-emerald-100 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-2 text-emerald-700">
              <PackagePlus className="w-5 h-5" />
              <h3 className="font-bold">قازانجی پێشبینیکراو</h3>
            </div>
            <p className="text-3xl font-black text-emerald-700" dir="ltr">{expectedProfit.toLocaleString()} <span className="text-sm opacity-80">IQD</span></p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        {lowStockProducts.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-rose-700 font-bold mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h2>ئاگاداری کەمبوونی کاڵا (ستۆکیان ١٠ یان کەمترە)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {lowStockProducts.map(p => (
                <div key={p.id} className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm flex justify-between items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 truncate text-sm">{p.name}</p>
                    <p className="text-xs text-slate-500 mt-1 font-mono">{p.barcode}</p>
                  </div>
                  <div className="bg-rose-100 text-rose-700 font-bold px-3 py-1.5 rounded-xl ml-3">
                    {p.stockLevel}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="گەڕان لە کۆگا..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all bg-slate-50"
            />
          </div>
          <div className="relative min-w-[200px]">
            <Filter className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
            <select 
              value={selectedCategory} 
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none appearance-none bg-slate-50"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c === 'all' ? 'هەموو کەتەگۆرییەکان (گشتی)' : c}</option>
              ))}
            </select>
          </div>
          <div className="relative min-w-[200px]">
            <Filter className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
            <select 
              value={selectedCompany} 
              onChange={e => setSelectedCompany(e.target.value)}
              className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none appearance-none bg-slate-50"
            >
              <option value="all">هەموو شەریکەکان</option>
              {companies.filter(c => c !== 'all').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Inventory List */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-600">
                <tr>
                  <th className="p-4 font-medium">ناوی کاڵا</th>
                  <th className="p-4 font-medium">بارکۆد</th>
                  <th className="p-4 font-medium">تێچوو</th>
                  <th className="p-4 font-medium">فرۆشتن</th>
                  <th className="p-4 font-medium text-center">ستۆک</th>
                  <th className="p-4 font-medium text-center">کردار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500">بەدوای زانیاریدا دەگەڕێت...</td></tr>
                ) : filteredProducts.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500">هیچ کاڵایەک نییە</td></tr>
                ) : (
                  filteredProducts.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-800">{p.name}</td>
                      <td className="p-4"><span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded text-slate-600" dir="ltr">{p.barcode.startsWith('WGT-') ? p.barcode.replace('WGT-', '') : p.barcode}</span>
                        {p.barcode.startsWith('WGT-') && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold">بە کێش</span>}
                      </td>
                      <td className="p-4 text-slate-600" dir="ltr">{p.costPrice.toLocaleString()}</td>
                      <td className="p-4 text-emerald-600 font-medium" dir="ltr">{p.sellingPrice.toLocaleString()}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center justify-center min-w-[3rem] px-3 py-1 rounded-full text-sm font-bold ${
                          p.stockLevel <= 10 ? 'bg-rose-100 text-rose-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {p.barcode.startsWith('WGT-') ? `${(p.stockLevel / 1000).toFixed(2)} کغم` : p.stockLevel}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => { setSelectedProduct(p); setShowAddStock(true); }}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-xl font-medium text-sm inline-flex items-center gap-2 transition-colors"
                        >
                          <Plus className="w-4 h-4" /> زیادکردنی ستۆک
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

      {/* Add Stock Modal */}
      {showAddStock && selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-xl font-bold text-slate-800 mb-4">زیادکردنی ستۆک</h2>
            <p className="text-slate-600 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
              کاڵا: <strong className="text-slate-800 block mt-1">{selectedProduct.name}</strong>
              <span className="text-sm text-slate-500 block mt-1">ستۆکی ئێستا: {selectedProduct.barcode.startsWith('WGT-') ? `${(selectedProduct.stockLevel / 1000).toFixed(2)} کغم` : selectedProduct.stockLevel}</span>
            </p>
            
            <form onSubmit={handleAddStock}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">بڕی هێنراوی نوێ {selectedProduct.barcode.startsWith('WGT-') ? '(بە کیلۆگرام بنووسە، نموونە: ١.٥)' : '(ژمارە بنووسە)'}</label>
                <input 
                  type="number" 
                  step="any"
                  min="0.01"
                  required
                  autoFocus
                  value={stockToAdd}
                  onChange={e => setStockToAdd(e.target.value)}
                  className="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none text-center text-xl font-bold bg-slate-50 focus:bg-white" 
                  dir="ltr"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAddStock(false)} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">
                  پاشگەزبوونەوە
                </button>
                <button type="submit" disabled={isProcessing} className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50">
                  {isProcessing ? 'چاوەڕێبە...' : 'زیادکردن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
