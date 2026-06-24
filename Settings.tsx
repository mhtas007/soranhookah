import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Settings as SettingsIcon, Save, Database, Download, Upload, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import type { Settings as SettingsType } from '../types';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const updateStoreSettings = useAppStore(state => state.updateSettings);
  
  const [settings, setSettings] = useState<Partial<SettingsType>>({
    shopName: '', phone: '', address: '', receiptFooter: '', usdRate: 150000
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingDB, setIsProcessingDB] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
      if (error && error.code !== 'PGRST116') throw error; // ignore no rows error
      
      if (data) {
        setSettings({
          shopName: data.shop_name,
          phone: data.phone,
          address: data.address,
          receiptFooter: data.receipt_footer,
          usdRate: data.usd_rate,
          telegramBotToken: data.telegram_bot_token,
          telegramChatId: data.telegram_chat_id
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updateData = {
        shop_name: settings.shopName,
        phone: settings.phone,
        address: settings.address,
        receipt_footer: settings.receiptFooter,
        usd_rate: settings.usdRate,
        telegram_bot_token: settings.telegramBotToken,
        telegram_chat_id: settings.telegramChatId
      };

      const { error } = await supabase.from('settings').upsert({ id: 1, ...updateData });
      if (error) throw error;

      updateStoreSettings({
        shopName: settings.shopName,
        phone: settings.phone,
        address: settings.address,
        receiptFooter: settings.receiptFooter,
        usdRate: settings.usdRate
      });
      alert('ڕێکخستنەکان بە سەرکەوتوویی پاشەکەوت کران!');
    } catch (error: any) {
      alert('کێشەیەک ڕوویدا: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Database Operations ---
  const handleBackup = async () => {
    setIsProcessingDB(true);
    try {
      const tables = ['products', 'customers', 'debt_payments', 'suppliers', 'sales', 'sale_items', 'expenses'];
      const backupData: any = {};
      
      for (const table of tables) {
        const { data } = await supabase.from(table).select('*');
        backupData[table] = data || [];
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `soran_pos_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      alert('کێشەیەک لە وەرگرتنی باکئاپ ڕوویدا: ' + error.message);
    } finally {
      setIsProcessingDB(false);
    }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('ئاگاداربە! گەڕاندنەوەی باکئاپ هەموو داتاکانی ئێستای سیستەمەکە دەسڕێتەوە و داتای ناو فایلەکە جێگەی دەگرێتەوە. دڵنیایت؟')) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsProcessingDB(true);
        const data = JSON.parse(event.target?.result as string);
        const tables = ['products', 'customers', 'debt_payments', 'suppliers', 'sales', 'sale_items', 'expenses'];
        
        // Very basic naive restore (deletes all current data, then inserts backup data)
        // Note: For a production app with FK constraints, the order of deletion and insertion is critical.
        // Deletion: Dependent tables first (sale_items, debt_payments) -> Then independent (sales, products, customers)
        const deleteOrder = ['sale_items', 'sales', 'debt_payments', 'expenses', 'products', 'customers', 'suppliers'];
        for (const table of deleteOrder) {
           await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Deletes all rows safely
        }

        // Insertion: Independent first -> Then dependent
        const insertOrder = ['suppliers', 'customers', 'products', 'expenses', 'sales', 'debt_payments', 'sale_items'];
        for (const table of insertOrder) {
          if (data[table] && data[table].length > 0) {
            await supabase.from(table).insert(data[table]);
          }
        }
        
        alert('باکئاپەکە بە سەرکەوتوویی گەڕێندرایەوە!');
      } catch (error: any) {
        alert('کێشەیەک ڕوویدا لە کاتی گەڕاندنەوەی باکئاپەکە: ' + error.message);
      } finally {
        setIsProcessingDB(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteReports = async () => {
    if (!window.confirm('ئایا دڵنیایت لە سڕینەوەی هەموو ڕاپۆرتەکان و وەصڵەکان؟ ئەم کارە پاشگەزبوونەوەی نییە!')) return;
    setIsProcessingDB(true);
    try {
      await supabase.from('sale_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      alert('ڕاپۆرتەکان بە سەرکەوتوویی سڕانەوە!');
    } catch (e: any) { alert(e.message); } finally { setIsProcessingDB(false); }
  };

  const handleDeleteProducts = async () => {
    if (!window.confirm('ئایا دڵنیایت لە سڕینەوەی هەموو کاڵاکان؟ ئەم کارە پاشگەزبوونەوەی نییە!')) return;
    setIsProcessingDB(true);
    try {
      await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      alert('کاڵاکان بە سەرکەوتوویی سڕانەوە!');
    } catch (e: any) { alert(e.message); } finally { setIsProcessingDB(false); }
  };

  const handleDeleteDebts = async () => {
    if (!window.confirm('ئایا دڵنیایت لە سڕینەوەی (سفرکردنەوەی) هەموو قەرزەکان؟ ئەم کارە پاشگەزبوونەوەی نییە!')) return;
    setIsProcessingDB(true);
    try {
      // Set debt to 0 for all customers rather than deleting them
      const { data: customers } = await supabase.from('customers').select('id');
      if (customers && customers.length > 0) {
        for(let c of customers) {
          await supabase.from('customers').update({ remaining_debt: 0, total_purchases: 0, total_paid: 0 }).eq('id', c.id);
        }
      }
      await supabase.from('debt_payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      alert('قەرزەکان بە سەرکەوتوویی سفر کرانەوە!');
    } catch (e: any) { alert(e.message); } finally { setIsProcessingDB(false); }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('ئاگاداری مەترسیدار! تۆ هەموو داتاکانی سیستەمەکە دەسڕیتەوە (کاڵا، قەرز، وەصڵ، هتد). دڵنیایت؟')) return;
    if (!window.prompt('بۆ دڵنیابوونەوە، بنووسە "سڕینەوە" بۆ ئەوەی داتاکان بسڕێتەوە:')?.includes('سڕینەوە')) {
      alert('سڕینەوەکە هەڵوەشایەوە.');
      return;
    }

    setIsProcessingDB(true);
    try {
      const deleteOrder = ['sale_items', 'sales', 'debt_payments', 'expenses', 'products', 'customers', 'suppliers'];
      for (const table of deleteOrder) {
         await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }
      alert('هەموو داتاکان بە یەکجاری سڕانەوە!');
    } catch (e: any) { alert(e.message); } finally { setIsProcessingDB(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-kurdish">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowRight className="w-6 h-6 text-slate-600" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-slate-700" />
          ڕێکخستنەکان
        </h1>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="lg:col-span-3 text-center p-12 text-slate-500">خەریکی هێنانی داتاکانە...</div>
        ) : (
          <>
            <div className="lg:col-span-2 space-y-8">
              
              {/* Form Settings */}
              <form onSubmit={handleSave} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 space-y-8">
                <section>
                  <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">زانیاری دوکان</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">ناوی دوکان</label>
                      <input type="text" value={settings.shopName || ''} onChange={e => setSettings({...settings, shopName: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">ژمارەی مۆبایل</label>
                      <input type="text" value={settings.phone || ''} onChange={e => setSettings({...settings, phone: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none" dir="ltr" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">ناونیشان</label>
                      <input type="text" value={settings.address || ''} onChange={e => setSettings({...settings, address: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-emerald-700 mb-1">نرخی گۆڕینەوەی ١٠٠ دۆلار (بۆ دینار)</label>
                      <input type="number" min="0" value={settings.usdRate || 150000} onChange={e => setSettings({...settings, usdRate: parseFloat(e.target.value)})} className="w-full p-3 rounded-xl border border-emerald-200 focus:border-emerald-500 outline-none font-bold text-emerald-700 bg-emerald-50" dir="ltr" />
                      <p className="text-xs text-emerald-600 mt-1">بۆ نموونە: ئەگەر ١٠٠ دۆلار بەرامبەر بێت بە ١٥٠،٠٠٠ دینار، ئەوا لێرە بنووسە 150000</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">تێبینی خوارەوەی وەصڵ</label>
                      <input type="text" value={settings.receiptFooter || ''} onChange={e => setSettings({...settings, receiptFooter: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none" />
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">پەیوەندی تێلیگرام (بۆ ڕاپۆرتی ڕۆژانە)</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Bot Token</label>
                      <input type="text" value={settings.telegramBotToken || ''} onChange={e => setSettings({...settings, telegramBotToken: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" dir="ltr" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Chat ID</label>
                      <input type="text" value={settings.telegramChatId || ''} onChange={e => setSettings({...settings, telegramChatId: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" dir="ltr" />
                    </div>
                  </div>
                </section>

                <div className="flex justify-end pt-4">
                  <button type="submit" disabled={isSaving} className="bg-slate-800 hover:bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg">
                    <Save className="w-5 h-5" />
                    {isSaving ? 'چاوەڕێبە...' : 'پاشەکەوتکردنی گۆڕانکارییەکان'}
                  </button>
                </div>
              </form>

              {/* Backup & Restore */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 space-y-6">
                <div className="border-b pb-4">
                  <h2 className="text-xl font-bold text-indigo-800 flex items-center gap-2">
                    <Database className="w-6 h-6" />
                    باکئاپ و گەڕاندنەوەی داتاکان
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">پارێزگاری لە داتاکانت بکە بە وەرگرتنی باکئاپ و گەڕاندنەوەی لە کاتی پێویستدا.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={handleBackup} 
                    disabled={isProcessingDB}
                    className="flex flex-col items-center justify-center p-6 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-2xl text-indigo-700 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-8 h-8 mb-2" />
                    <span className="font-bold">وەرگرتنی باکئاپ (دابەزاندن)</span>
                    <span className="text-xs mt-1 opacity-80">فایلێکی JSON دادەبەزێت بۆ پاراستن</span>
                  </button>

                  <label className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-2xl text-slate-700 transition-colors cursor-pointer disabled:opacity-50">
                    <Upload className="w-8 h-8 mb-2" />
                    <span className="font-bold">گەڕاندنەوەی داتا (Import)</span>
                    <span className="text-xs mt-1 opacity-80">فایلە JSON یەکە هەڵبژێرە بۆ گەڕاندنەوە</span>
                    <input type="file" accept=".json" className="hidden" onChange={handleRestore} disabled={isProcessingDB} />
                  </label>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-white rounded-3xl shadow-sm border border-rose-200 p-8 space-y-6">
                <div className="border-b border-rose-100 pb-4">
                  <h2 className="text-xl font-bold text-rose-700 flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6" />
                    ناوچەی مەترسیدار (سڕینەوەی داتا)
                  </h2>
                  <p className="text-rose-500/80 text-sm mt-1">ئاگاداربە، سڕینەوەی داتاکان پاشگەزبوونەوەی نییە. دڵنیابە لەوەی باکئاپت هەیە پێش سڕینەوە.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <button onClick={handleDeleteReports} disabled={isProcessingDB} className="p-4 bg-white border border-rose-200 hover:bg-rose-50 rounded-xl text-rose-700 text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50">
                    <Trash2 className="w-4 h-4" /> سڕینەوەی ڕاپۆرتەکان
                  </button>
                  <button onClick={handleDeleteProducts} disabled={isProcessingDB} className="p-4 bg-white border border-rose-200 hover:bg-rose-50 rounded-xl text-rose-700 text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50">
                    <Trash2 className="w-4 h-4" /> سڕینەوەی کاڵاکان
                  </button>
                  <button onClick={handleDeleteDebts} disabled={isProcessingDB} className="p-4 bg-white border border-rose-200 hover:bg-rose-50 rounded-xl text-rose-700 text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50">
                    <Trash2 className="w-4 h-4" /> سڕینەوەی قەرزەکان
                  </button>
                </div>

                <div className="pt-4 mt-4 border-t border-rose-100">
                  <button onClick={handleDeleteAll} disabled={isProcessingDB} className="w-full p-4 bg-rose-600 hover:bg-rose-700 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-rose-500/25">
                    <AlertTriangle className="w-5 h-5" /> سڕینەوەی هەموو داتاکان (بە یەکجاری)
                  </button>
                </div>
              </div>

            </div>

            {/* Receipt Preview */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sticky top-24">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  پێشبینین (Preview)ی وەصڵ
                </h2>
                
                <div className="bg-slate-100 p-4 rounded-2xl flex justify-center">
                  <div className="bg-white p-6 shadow-md w-full max-w-[80mm] font-mono text-sm text-center border-t-4 border-slate-800">
                    {/* Header */}
                    <h2 className="font-bold text-xl mb-1">{settings.shopName || 'ناوی دوکان'}</h2>
                    {settings.address && <p className="text-xs text-slate-600 mb-1">{settings.address}</p>}
                    {settings.phone && <p className="text-xs text-slate-600 mb-3" dir="ltr">{settings.phone}</p>}
                    
                    <div className="border-b border-dashed border-slate-300 my-3"></div>
                    
                    {/* Meta */}
                    <div className="flex justify-between text-xs mb-3">
                      <span>بەروار: {new Date().toLocaleDateString('ku-IQ')}</span>
                      <span>کات: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute:'2-digit' })}</span>
                    </div>
                    
                    <div className="border-b border-dashed border-slate-300 my-3"></div>
                    
                    {/* Items */}
                    <table className="w-full text-right text-xs mb-3">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="pb-1 font-bold">کاڵا</th>
                          <th className="pb-1 font-bold text-center">بڕ</th>
                          <th className="pb-1 font-bold text-left">نرخ</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-2">نموونەی کاڵای ١</td>
                          <td className="py-2 text-center">٢</td>
                          <td className="py-2 text-left" dir="ltr">15,000</td>
                        </tr>
                        <tr>
                          <td className="py-2">نموونەی کاڵای ٢</td>
                          <td className="py-2 text-center">١</td>
                          <td className="py-2 text-left" dir="ltr">5,000</td>
                        </tr>
                      </tbody>
                    </table>
                    
                    <div className="border-b border-dashed border-slate-300 my-3"></div>
                    
                    {/* Totals */}
                    <div className="flex justify-between font-bold text-sm mb-4">
                      <span>کۆی گشتی:</span>
                      <span dir="ltr">20,000 IQD</span>
                    </div>
                    
                    {/* Footer */}
                    {settings.receiptFooter && (
                      <p className="text-xs text-slate-600 mt-4 text-center">{settings.receiptFooter}</p>
                    )}
                    
                    <p className="text-[10px] text-slate-400 mt-4 text-center">بە سیستەمی سۆران هۆکە کاردەکات</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-4 text-center">ئەمە تەنها نموونەیەکە بۆ ئەوەی بزانیت وەصڵەکە چۆن دەردەچێت.</p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
