import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, Search, Edit2, Trash2, PackageSearch, Printer, Wand2, Layers } from 'lucide-react';
import Barcode from 'react-barcode';
import type { Product } from '../types';
import { supabase } from '../lib/supabase';

export const Products: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'General' | 'V'>('General');

  // Add/Edit Product Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    name: '', barcode: '', costPrice: '', sellingPrice: '', category: '', stockLevel: '', minStockAlert: '5', unitType: 'piece',
    section: 'General', company: '', bulkCost: '', bulkPrice: '', bulkSize: '1', bulkBarcode: '', currency: 'IQD'
  });

  // Print Barcode State
  const [printProduct, setPrintProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const { data } = await supabase.from('suppliers').select('name').order('name');
      if (data) setSuppliers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
        
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
        company: p.company || '',
        bulkCost: p.bulk_cost || 0,
        bulkPrice: p.bulk_price || 0,
        bulkSize: p.bulk_size || 1,
        bulkBarcode: p.bulk_barcode || '',
        currency: p.currency || 'IQD',
        createdAt: p.created_at,
        updatedAt: p.updated_at
      })) as Product[];
      
      setProducts(formattedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const finalBarcode = formData.unitType === 'weight' ? (formData.barcode.startsWith('WGT-') ? formData.barcode : `WGT-${formData.barcode}`) : formData.barcode.replace('WGT-', '');
      
      const payload = {
        name: formData.name,
        barcode: finalBarcode,
        cost_price: parseFloat(formData.costPrice),
        selling_price: parseFloat(formData.sellingPrice),
        category: formData.category,
        stock_level: formData.unitType === 'weight' ? Math.round(parseFloat(formData.stockLevel) * 1000) : parseInt(formData.stockLevel),
        min_stock_alert: parseInt(formData.minStockAlert),
        section: formData.section,
        company: formData.company,
        bulk_cost: parseFloat(formData.bulkCost) || 0,
        bulk_price: parseFloat(formData.bulkPrice) || 0,
        bulk_size: parseInt(formData.bulkSize) || 1,
        bulk_barcode: formData.bulkBarcode || null,
        currency: formData.currency
      };

      if (editingId) {
        const { error } = await supabase.from('products').update(payload).eq('id', editingId);
        if (error) throw error;
        alert('کاڵاکە بە سەرکەوتوویی گۆڕدرا');
      } else {
        const { error } = await supabase.from('products').insert(payload);
        if (error) throw error;
        alert('کاڵاکە بە سەرکەوتوویی زیادکرا');
      }
      
      setShowForm(false);
      setEditingId(null);
      setFormData({ 
        name: '', barcode: '', costPrice: '', sellingPrice: '', category: '', stockLevel: '', minStockAlert: '5', unitType: 'piece',
        section: 'General', company: '', bulkCost: '', bulkPrice: '', bulkSize: '1', bulkBarcode: '', currency: 'IQD'
      });
      fetchProducts();
    } catch (error: any) {
      alert('کێشەیەک ڕوویدا: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingId(product.id);
    const isWeight = product.barcode.startsWith('WGT-');
    setFormData({
      name: product.name,
      barcode: isWeight ? product.barcode.replace('WGT-', '') : product.barcode,
      costPrice: product.costPrice.toString(),
      sellingPrice: product.sellingPrice.toString(),
      category: product.category,
      stockLevel: isWeight ? (product.stockLevel / 1000).toString() : product.stockLevel.toString(),
      minStockAlert: product.minStockAlert.toString(),
      unitType: isWeight ? 'weight' : 'piece',
      section: product.section,
      company: product.company || '',
      bulkCost: product.bulkCost ? product.bulkCost.toString() : '',
      bulkPrice: product.bulkPrice ? product.bulkPrice.toString() : '',
      bulkSize: product.bulkSize ? product.bulkSize.toString() : '1',
      bulkBarcode: product.bulkBarcode || '',
      currency: product.currency || 'IQD'
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('دڵنیایت لە سڕینەوەی ئەم کاڵایە؟ داتاکانی فرۆشتنی پەیوەست پێوەی دەکرێت کێشەی تێبکەوێت.')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      fetchProducts();
    } catch (error: any) {
      alert('کێشەیەک ڕوویدا لە کاتی سڕینەوە: ' + error.message);
    }
  };

  const generateAutoBarcode = () => {
    const randomDigits = Math.floor(100000000 + Math.random() * 900000000);
    setFormData({ ...formData, barcode: `869${randomDigits}` });
  };

  const handlePrintBarcode = () => {
    window.print();
  };

  const filteredProducts = products.filter(p => 
    p.section === activeSection && 
    (p.name.includes(searchTerm) || p.barcode.includes(searchTerm) || p.category.includes(searchTerm) || (p.company && p.company.includes(searchTerm)))
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-kurdish">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowRight className="w-6 h-6 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <PackageSearch className="w-6 h-6 text-blue-500" />
              بەڕێوەبردنی کاڵاکان
            </h1>
          </div>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ 
              name: '', barcode: '', costPrice: '', sellingPrice: '', category: '', stockLevel: '', minStockAlert: '5', unitType: 'piece',
              section: activeSection, company: '', bulkCost: '', bulkPrice: '', bulkSize: '1', bulkBarcode: '', currency: 'IQD'
            });
            setShowForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm active:scale-95"
        >
          <Plus className="w-5 h-5" />
          کالای نوێ
        </button>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Section Tabs */}
        <div className="flex gap-4 mb-6">
          <button 
            onClick={() => setActiveSection('General')}
            className={`flex-1 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${activeSection === 'General' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-100' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200 scale-95'}`}
          >
            <Layers className="w-6 h-6" />
            بەشی گشتی
          </button>
          <button 
            onClick={() => setActiveSection('V')}
            className={`flex-1 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${activeSection === 'V' ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 scale-100' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200 scale-95'}`}
          >
            <span className="text-2xl font-black">V</span>
            بەشی ڤێ
          </button>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="گەڕان بەپێی ناو، بارکۆد، جۆر..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-slate-50 focus:bg-white"
            />
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="p-4 font-medium min-w-[150px]">ناو</th>
                  <th className="p-4 font-medium">کەتەگۆری</th>
                  <th className="p-4 font-medium">شەریکە/جۆر</th>
                  <th className="p-4 font-medium text-blue-600">تێچووی دانە</th>
                  <th className="p-4 font-medium text-blue-600">نرخی دانە</th>
                  <th className="p-4 font-medium text-purple-600">تێچووی کۆ</th>
                  <th className="p-4 font-medium text-purple-600">نرخی کۆ</th>
                  <th className="p-4 font-medium">قەبارەی تەک</th>
                  <th className="p-4 font-medium text-emerald-600">قازانج (دانە)</th>
                  <th className="p-4 font-medium text-center">ستۆک</th>
                  <th className="p-4 font-medium">بارکۆد</th>
                  <th className="p-4 font-medium text-center">کردارەکان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {loading ? (
                  <tr><td colSpan={12} className="p-8 text-center text-slate-500">بەدوای زانیاریدا دەگەڕێت...</td></tr>
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-bold">{product.name}</td>
                      <td className="p-4"><span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-xs">{product.category}</span></td>
                      <td className="p-4 text-slate-600">{product.company || '-'}</td>
                      <td className="p-4 font-medium text-blue-700" dir="ltr">{product.currency === 'USD' ? '$' : ''}{product.costPrice.toLocaleString()}</td>
                      <td className="p-4 font-bold text-blue-700" dir="ltr">{product.currency === 'USD' ? '$' : ''}{product.sellingPrice.toLocaleString()}</td>
                      <td className="p-4 font-medium text-purple-700" dir="ltr">{product.currency === 'USD' ? '$' : ''}{product.bulkCost.toLocaleString()}</td>
                      <td className="p-4 font-bold text-purple-700" dir="ltr">{product.currency === 'USD' ? '$' : ''}{product.bulkPrice.toLocaleString()}</td>
                      <td className="p-4 text-center font-bold text-slate-600">{product.bulkSize}</td>
                      <td className="p-4 font-bold text-emerald-600" dir="ltr">{product.currency === 'USD' ? '$' : ''}{(product.sellingPrice - product.costPrice).toLocaleString()}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center justify-center min-w-[3rem] px-3 py-1 rounded-full text-sm font-bold ${
                          product.stockLevel <= product.minStockAlert ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {product.barcode.startsWith('WGT-') ? `${(product.stockLevel / 1000).toFixed(2)} کغم` : product.stockLevel}
                        </span>
                      </td>
                      <td className="p-4" dir="ltr">
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-xs font-mono">
                          {product.barcode.startsWith('WGT-') ? product.barcode.replace('WGT-', '') : product.barcode}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => setPrintProduct(product)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="چاپکردنی بارکۆد">
                            <Printer className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleEditClick(product)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="گۆڕانکاری">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(product.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="سڕینەوە">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={12} className="p-8 text-center text-slate-500">هیچ کاڵایەک نەدۆزرایەوە لەم بەشەدا</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Product Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Plus className="w-6 h-6 text-blue-500" />
              {editingId ? 'گۆڕانکاری لە کاڵا' : 'کالای نوێ'}
            </h2>
            <form onSubmit={handleAddProduct} className="space-y-6">
              
              <div className="flex gap-4 p-1 bg-slate-100 rounded-2xl mb-6">
                <button type="button" onClick={() => setFormData({...formData, section: 'General'})} className={`flex-1 py-3 rounded-xl font-bold transition-all ${formData.section === 'General' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  بەشی گشتی
                </button>
                <button type="button" onClick={() => setFormData({...formData, section: 'V'})} className={`flex-1 py-3 rounded-xl font-bold transition-all ${formData.section === 'V' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  بەشی V
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ناوی کاڵا</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">کەتەگۆری</label>
                  <input required type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">شەریکە / جۆر</label>
                  <input type="text" list="supplier-list" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" placeholder="ئارەزوومەندانە" />
                  <datalist id="supplier-list">
                    {suppliers.map((s, idx) => (
                      <option key={idx} value={s.name} />
                    ))}
                  </datalist>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1">بارکۆد (دانە)</label>
                  <div className="flex gap-2">
                    <input required type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-left font-mono" dir="ltr" />
                    <button type="button" onClick={generateAutoBarcode} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 rounded-xl flex items-center justify-center transition-colors border border-slate-200" title="دروستکردنی ئۆتۆماتیکی">
                      <Wand2 className="w-5 h-5 text-blue-500" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">یەکەی فرۆشتن</label>
                  <select value={formData.unitType} onChange={e => setFormData({...formData, unitType: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none">
                    <option value="piece">بە دانە (Piece)</option>
                    <option value="weight">بە کێش (کیلۆ / غرام)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">بارکۆدی کۆ (کارتۆن)</label>
                  <input type="text" value={formData.bulkBarcode} onChange={e => setFormData({...formData, bulkBarcode: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-left font-mono" dir="ltr" placeholder="ئارەزوومەندانە" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-emerald-700 mb-1">جۆری دراو</label>
                  <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full p-3 rounded-xl border-2 border-emerald-100 focus:border-emerald-500 bg-emerald-50 text-emerald-800 font-bold outline-none">
                    <option value="IQD">دیناری عێراقی (IQD)</option>
                    <option value="USD">دۆلاری ئەمریکی (USD)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <div className="md:col-span-4"><h3 className="text-sm font-bold text-blue-800">نرخی دانە (تەک) - بە {formData.currency}</h3></div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">تێچووی دانە</label>
                  <input required type="number" step="any" min="0" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: e.target.value})} className="w-full p-3 rounded-xl border border-white focus:border-blue-500 outline-none text-left" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">نرخی دانە</label>
                  <input required type="number" step="any" min="0" value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: e.target.value})} className="w-full p-3 rounded-xl border border-white focus:border-blue-500 outline-none text-left" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ستۆک (بڕی هەبوو)</label>
                  <input required type="number" step="any" min="0" value={formData.stockLevel} onChange={e => setFormData({...formData, stockLevel: e.target.value})} className="w-full p-3 rounded-xl border border-white focus:border-blue-500 outline-none text-left" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ئاگادارکردنەوەی کەمبوون</label>
                  <input required type="number" min="0" value={formData.minStockAlert} onChange={e => setFormData({...formData, minStockAlert: e.target.value})} className="w-full p-3 rounded-xl border border-white focus:border-blue-500 outline-none text-left" dir="ltr" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-purple-50 p-4 rounded-2xl border border-purple-100">
                <div className="md:col-span-3"><h3 className="text-sm font-bold text-purple-800">نرخی کۆ (کارتۆن / پاکەت) - ئارەزوومەندانە - بە {formData.currency}</h3></div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">قەبارەی تەک (چەند دانەی تێدایە؟)</label>
                  <input type="number" min="1" value={formData.bulkSize} onChange={e => setFormData({...formData, bulkSize: e.target.value})} className="w-full p-3 rounded-xl border border-white focus:border-purple-500 outline-none text-left" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">تێچووی کۆ</label>
                  <input type="number" step="any" min="0" value={formData.bulkCost} onChange={e => setFormData({...formData, bulkCost: e.target.value})} className="w-full p-3 rounded-xl border border-white focus:border-purple-500 outline-none text-left" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">نرخی کۆ</label>
                  <input type="number" step="any" min="0" value={formData.bulkPrice} onChange={e => setFormData({...formData, bulkPrice: e.target.value})} className="w-full p-3 rounded-xl border border-white focus:border-purple-500 outline-none text-left" dir="ltr" />
                </div>
              </div>
              
              <div className="flex gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">
                  پاشگەزبوونەوە
                </button>
                <button type="submit" disabled={isProcessing} className={`flex-1 px-4 py-4 text-white rounded-xl font-bold transition-colors shadow-lg disabled:opacity-50 ${formData.section === 'V' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}>
                  {isProcessing ? 'چاوەڕێبە...' : (editingId ? 'خەزنکردنی گۆڕانکاری' : 'تۆمارکردنی کاڵا')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Barcode Modal */}
      {printProduct && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl flex flex-col items-center">
            <div id="print-area" className="bg-white p-4 w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl mb-8 print:border-none print:m-0 print:p-0">
              <h3 className="font-bold text-lg text-center mb-1 leading-tight">{printProduct.name}</h3>
              <p className="font-bold text-xl text-slate-800 mb-2" dir="ltr">{printProduct.sellingPrice.toLocaleString()} IQD</p>
              <div className="scale-110 origin-top">
                <Barcode value={printProduct.barcode.replace('WGT-', '')} width={1.5} height={50} fontSize={14} margin={0} displayValue={true} />
              </div>
            </div>

            <div className="flex gap-3 w-full print:hidden">
              <button onClick={() => setPrintProduct(null)} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">داخستن</button>
              <button onClick={handlePrintBarcode} className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
                <Printer className="w-6 h-6" /> چاپکردن
              </button>
            </div>
            
            <style>{`
              @media print {
                body * { visibility: hidden; }
                #print-area, #print-area * { visibility: visible; }
                #print-area { position: absolute; left: 0; top: 0; width: 100%; border: none; margin: 0; padding: 0; page-break-inside: avoid; }
                @page { size: 50mm 30mm; margin: 0; }
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
};
