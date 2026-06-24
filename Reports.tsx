import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, TrendingUp, Calendar, Download, Layers, Activity, Award, PieChart, ShoppingBag, DollarSign, ArrowDownToLine, Users, Target, FileText, Printer, FileSpreadsheet, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { startOfDay, endOfDay, format, startOfMonth, startOfYear } from 'date-fns';

interface TopProduct {
  id: string;
  name: string;
  quantity: number;
  sales: number;
  profit: number;
}

interface TopCompany {
  name: string;
  sales: number;
}

interface Receipt {
  id: string;
  created_at: string;
  payment_method: string;
  discount: number;
  total_amount: number;
  customer_name?: string;
}

interface Metrics {
  totalSales: number;
  receivedMoney: number;
  returnedDebts: number;
  remainingDebt: number;
  bulkSales: number;
  retailSales: number;
  totalCost: number;
  expenses: number;
  netProfit: number;
  totalDiscount: number;
  receiptCount: number;
  avgReceiptValue: number;
  itemsSold: number;
  topProductName: string;
  topProducts: TopProduct[];
  topCompanies: TopCompany[];
  receipts: Receipt[];
}

export const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Overview' | 'General' | 'V'>('Overview');
  
  // Date Range filter
  const [quickFilter, setQuickFilter] = useState<'Today' | 'Month' | 'All' | 'Custom'>('Today');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [reportData, setReportData] = useState<{ Overall: Metrics; General: Metrics; V: Metrics }>({
    Overall: createEmptyMetrics(),
    General: createEmptyMetrics(),
    V: createEmptyMetrics()
  });

  function createEmptyMetrics(): Metrics {
    return {
      totalSales: 0, receivedMoney: 0, returnedDebts: 0, remainingDebt: 0,
      bulkSales: 0, retailSales: 0, totalCost: 0, expenses: 0, netProfit: 0,
      totalDiscount: 0, receiptCount: 0, avgReceiptValue: 0, itemsSold: 0,
      topProductName: '-', topProducts: [], topCompanies: [], receipts: []
    };
  }

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]);

  const handleQuickFilter = (type: 'Today' | 'Month' | 'All') => {
    setQuickFilter(type);
    const now = new Date();
    if (type === 'Today') {
      setStartDate(format(now, 'yyyy-MM-dd'));
      setEndDate(format(now, 'yyyy-MM-dd'));
    } else if (type === 'Month') {
      setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
      setEndDate(format(now, 'yyyy-MM-dd'));
    } else if (type === 'All') {
      setStartDate('2020-01-01'); // Long time ago
      setEndDate(format(now, 'yyyy-MM-dd'));
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const start = startOfDay(new Date(startDate)).toISOString();
      const end = endOfDay(new Date(endDate)).toISOString();

      // Fetch Sales
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*, customer:debt_customer_id(name)')
        .gte('created_at', start)
        .lte('created_at', end)
        .eq('status', 'Completed');

      if (salesError) throw salesError;

      // Fetch Sale Items
      const saleIds = sales?.map(s => s.id) || [];
      let saleItems: any[] = [];
      if (saleIds.length > 0) {
        const { data: items } = await supabase
          .from('sale_items')
          .select('*, product:product_id (section, bulk_size, company)')
          .in('sale_id', saleIds);
        if (items) saleItems = items;
      }

      // Fetch Expenses
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount')
        .gte('date', start)
        .lte('date', end);

      if (expensesError) throw expensesError;

      // Fetch Debt Payments
      const { data: debtPayments, error: dpError } = await supabase
        .from('debt_payments')
        .select('amount')
        .gte('date', start)
        .lte('date', end);

      if (dpError) throw dpError;

      // Aggregate Logic
      let ov = createEmptyMetrics();
      let gen = createEmptyMetrics();
      let v = createEmptyMetrics();

      // 1. Process Sales (Discounts, Payment Methods, Receipts)
      sales?.forEach((sale: any) => {
        const rcpt: Receipt = {
          id: sale.id, created_at: sale.created_at, payment_method: sale.payment_method,
          discount: sale.discount || 0, total_amount: sale.total_amount,
          customer_name: sale.customer?.name
        };
        ov.receipts.push(rcpt);
        ov.receiptCount++;
        ov.totalDiscount += sale.discount || 0;

        if (sale.payment_method === 'Debt') {
          ov.remainingDebt += sale.total_amount;
        } else {
          ov.receivedMoney += sale.total_amount;
        }
      });

      // 2. Process Debt Payments
      ov.returnedDebts = debtPayments?.reduce((sum, dp) => sum + dp.amount, 0) || 0;
      ov.receivedMoney += ov.returnedDebts; // Returned debts count as received money
      
      // 3. Process Expenses
      ov.expenses = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

      // 4. Process Sale Items for Section metrics
      const genProdMap: Record<string, TopProduct> = {};
      const vProdMap: Record<string, TopProduct> = {};
      
      const ovCompMap: Record<string, TopCompany> = {};
      const genCompMap: Record<string, TopCompany> = {};
      const vCompMap: Record<string, TopCompany> = {};

      saleItems.forEach(item => {
        const section = item.product?.section || 'General';
        const isWgt = item.name?.includes('WGT-') || false; // Approximation
        const baseQty = isWgt ? item.quantity / 1000 : item.quantity;
        const bSize = item.product?.bulk_size || 1;
        const isBulk = bSize > 1 && baseQty >= bSize;
        
        const saleAmount = item.price * baseQty;
        const costAmount = item.cost * baseQty;
        const profit = saleAmount - costAmount;
        const companyName = item.product?.company || 'نەزانراو';

        // Overall additions
        ov.totalSales += saleAmount;
        ov.totalCost += costAmount;
        ov.itemsSold += item.quantity;
        if (isBulk) ov.bulkSales += saleAmount; else ov.retailSales += saleAmount;
        
        if (!ovCompMap[companyName]) ovCompMap[companyName] = { name: companyName, sales: 0 };
        ovCompMap[companyName].sales += saleAmount;

        // Section Additions
        if (section === 'V') {
          v.totalSales += saleAmount;
          v.totalCost += costAmount;
          v.itemsSold += item.quantity;
          if (isBulk) v.bulkSales += saleAmount; else v.retailSales += saleAmount;
          
          if (!vProdMap[item.product_id]) vProdMap[item.product_id] = { id: item.product_id, name: item.name, quantity: 0, sales: 0, profit: 0 };
          vProdMap[item.product_id].quantity += item.quantity;
          vProdMap[item.product_id].sales += saleAmount;
          vProdMap[item.product_id].profit += profit;

          if (!vCompMap[companyName]) vCompMap[companyName] = { name: companyName, sales: 0 };
          vCompMap[companyName].sales += saleAmount;
        } else {
          gen.totalSales += saleAmount;
          gen.totalCost += costAmount;
          gen.itemsSold += item.quantity;
          if (isBulk) gen.bulkSales += saleAmount; else gen.retailSales += saleAmount;
          
          if (!genProdMap[item.product_id]) genProdMap[item.product_id] = { id: item.product_id, name: item.name, quantity: 0, sales: 0, profit: 0 };
          genProdMap[item.product_id].quantity += item.quantity;
          genProdMap[item.product_id].sales += saleAmount;
          genProdMap[item.product_id].profit += profit;

          if (!genCompMap[companyName]) genCompMap[companyName] = { name: companyName, sales: 0 };
          genCompMap[companyName].sales += saleAmount;
        }
      });

      // 5. Final Calculations
      ov.avgReceiptValue = ov.receiptCount > 0 ? (ov.totalSales / ov.receiptCount) : 0;
      ov.netProfit = (ov.totalSales - ov.totalCost) - ov.expenses - ov.totalDiscount;

      // Gen & V don't have expenses/discounts perfectly mapped unless we proportion them. We'll leave them 0 for sections and just show Gross Profit
      gen.netProfit = gen.totalSales - gen.totalCost;
      v.netProfit = v.totalSales - v.totalCost;

      // Top Products
      gen.topProducts = Object.values(genProdMap).sort((a, b) => b.sales - a.sales);
      v.topProducts = Object.values(vProdMap).sort((a, b) => b.sales - a.sales);
      
      ov.topCompanies = Object.values(ovCompMap).sort((a, b) => b.sales - a.sales);
      gen.topCompanies = Object.values(genCompMap).sort((a, b) => b.sales - a.sales);
      v.topCompanies = Object.values(vCompMap).sort((a, b) => b.sales - a.sales);
      
      const allProds = [...gen.topProducts, ...v.topProducts].sort((a, b) => b.sales - a.sales);
      ov.topProductName = allProds.length > 0 ? allProds[0].name : '-';
      gen.topProductName = gen.topProducts.length > 0 ? gen.topProducts[0].name : '-';
      v.topProductName = v.topProducts.length > 0 ? v.topProducts[0].name : '-';

      setReportData({ Overall: ov, General: gen, V: v });

    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeMetrics = activeTab === 'Overview' ? reportData.Overall : (activeTab === 'General' ? reportData.General : reportData.V);

  // EXCEL EXPORT
  const exportToExcel = () => {
    // Basic CSV implementation
    const headers = ['ژمارەی پسوڵە', 'بەروار', 'شێوازی پارەدان', 'داشکاندن', 'کۆی گشتی'];
    const rows = activeMetrics.receipts.map((r, i) => [
      i + 1,
      format(new Date(r.created_at), 'yyyy-MM-dd HH:mm'),
      r.payment_method === 'Cash' ? 'نەقد' : r.payment_method === 'FIB' ? 'FIB' : 'قەرز',
      r.discount,
      r.total_amount
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `report_${activeTab}_${startDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderMetricCard = (title: string, value: string | number, icon: React.ReactNode, colorClass: string, isMoney = true) => (
    <div className={`bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow relative overflow-hidden group`}>
      <div className={`p-4 rounded-2xl ${colorClass} bg-opacity-10 text-${colorClass.split('-')[1]}-600 z-10`}>
        {icon}
      </div>
      <div className="z-10">
        <p className="text-slate-500 font-bold mb-1 text-sm">{title}</p>
        <p className="text-2xl font-black text-slate-800" dir="ltr">
          {value.toLocaleString()} {isMoney && <span className="text-xs font-medium text-slate-400">IQD</span>}
        </p>
      </div>
      <div className={`absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform text-${colorClass.split('-')[1]}-600`}>
        {icon}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-kurdish pb-12">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowRight className="w-6 h-6 text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-500" />
            ڕاپۆرتە گشتگیرەکان
          </h1>
        </div>
        <div className="flex gap-3">
          <button onClick={exportToExcel} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors border border-emerald-200">
            <FileSpreadsheet className="w-5 h-5" />
            Excel
          </button>
          <button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm">
            <Printer className="w-5 h-5" />
            PDF / چاپکردن
          </button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6 print:p-0 print:m-0">
        
        {/* Date Filters & Tabs */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col xl:flex-row justify-between gap-6 print:hidden">
          
          <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full xl:w-auto">
            <button 
              onClick={() => setActiveTab('Overview')}
              className={`flex-1 px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'Overview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              <Activity className="w-5 h-5" /> گشتی
            </button>
            <button 
              onClick={() => setActiveTab('General')}
              className={`flex-1 px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'General' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              <Layers className="w-5 h-5" /> بەشی گشتی
            </button>
            <button 
              onClick={() => setActiveTab('V')}
              className={`flex-1 px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'V' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              <span className="text-xl font-black">V</span> بەشی ڤێ
            </button>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-2">
              <button onClick={() => handleQuickFilter('Today')} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${quickFilter === 'Today' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>ڕۆژانە</button>
              <button onClick={() => handleQuickFilter('Month')} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${quickFilter === 'Month' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>مانگانە</button>
              <button onClick={() => handleQuickFilter('All')} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${quickFilter === 'All' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>هەمووی</button>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <input type="date" value={startDate} onChange={e => {setStartDate(e.target.value); setQuickFilter('Custom')}} className="bg-transparent border-none outline-none text-sm font-bold text-slate-700" />
              <span className="text-slate-300">-</span>
              <input type="date" value={endDate} onChange={e => {setEndDate(e.target.value); setQuickFilter('Custom')}} className="bg-transparent border-none outline-none text-sm font-bold text-slate-700" />
            </div>
          </div>
        </div>

        <div className="hidden print:block text-center mb-8 border-b pb-4">
          <h1 className="text-3xl font-black mb-2">ڕاپۆرتی فرۆشتن</h1>
          <p className="text-slate-500 font-bold" dir="ltr">{startDate} / {endDate}</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-indigo-400 animate-pulse print:hidden">
            <TrendingUp className="w-16 h-16 mb-4 opacity-50" />
            <p className="font-bold text-lg text-slate-500">خەریکی شیکردنەوەی داتاکانە...</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Top Level Summary */}
            <div className={`p-8 rounded-3xl shadow-lg flex flex-col justify-center relative overflow-hidden ${activeMetrics.netProfit >= 0 ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-emerald-200' : 'bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-rose-200'}`}>
              <div className="absolute left-0 top-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white to-transparent"></div>
              <div className="flex justify-between items-end relative z-10">
                <div>
                  <p className="font-bold mb-2 text-sm uppercase tracking-wider opacity-90">{activeTab === 'Overview' ? 'قازانجی سافی (دوای خەرجی و داشکاندن)' : 'قازانجی بەش'}</p>
                  <p className="text-4xl md:text-5xl font-black" dir="ltr">{activeMetrics.netProfit.toLocaleString()} <span className="text-xl opacity-70">IQD</span></p>
                </div>
                <Award className="w-20 h-20 opacity-80" />
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {renderMetricCard("کۆی فرۆشتن", activeMetrics.totalSales, <TrendingUp className="w-8 h-8" />, "bg-indigo-500")}
              {renderMetricCard("پارەی وەرگیراو", activeMetrics.receivedMoney, <DollarSign className="w-8 h-8" />, "bg-emerald-500")}
              {renderMetricCard("باقی (قەرز)", activeMetrics.remainingDebt, <ArrowDownToLine className="w-8 h-8" />, "bg-amber-500")}
              {activeTab === 'Overview' && renderMetricCard("قەرزی گەڕاوە", activeMetrics.returnedDebts, <ArrowRight className="w-8 h-8" />, "bg-blue-500")}
              
              {renderMetricCard("فرۆشتنی جوملە", activeMetrics.bulkSales, <Layers className="w-8 h-8" />, "bg-purple-500")}
              {renderMetricCard("فرۆشتنی دانە (تاک)", activeMetrics.retailSales, <Activity className="w-8 h-8" />, "bg-cyan-500")}
              {renderMetricCard("تێچووی گشتی", activeMetrics.totalCost, <ShoppingBag className="w-8 h-8" />, "bg-slate-500")}
              
              {activeTab === 'Overview' && renderMetricCard("خەرجییەکان", activeMetrics.expenses, <PieChart className="w-8 h-8" />, "bg-rose-500")}
              {activeTab === 'Overview' && renderMetricCard("کۆی داشکاندن", activeMetrics.totalDiscount, <Target className="w-8 h-8" />, "bg-fuchsia-500")}
              
              {renderMetricCard("ژمارەی پسوڵەکان", activeMetrics.receiptCount, <FileText className="w-8 h-8" />, "bg-teal-500", false)}
              {renderMetricCard("تێکڕای بەهای پسوڵە", Math.round(activeMetrics.avgReceiptValue), <FileText className="w-8 h-8" />, "bg-blue-500")}
              {renderMetricCard("کاڵا فرۆشراوەکان", activeMetrics.itemsSold, <ShoppingBag className="w-8 h-8" />, "bg-indigo-500", false)}
            </div>

            {/* Top Product Callout */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex items-center gap-6">
              <div className="bg-amber-100 p-4 rounded-full text-amber-600 shrink-0">
                <Award className="w-10 h-10" />
              </div>
              <div>
                <p className="text-slate-500 font-bold mb-1">پڕفرۆشترین کاڵا</p>
                <p className="text-2xl font-black text-slate-800">{activeMetrics.topProductName}</p>
              </div>
            </div>

            {/* Top Companies Table */}
            {activeMetrics.topCompanies.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-6 h-6 text-orange-500" />
                    <h3 className="font-bold text-lg text-slate-800">فرۆشتن بەپێی شەریکە (کۆمپانیا)</h3>
                  </div>
                </div>
                <div className="overflow-x-auto p-2">
                  <table className="w-full text-right text-sm">
                    <thead className="text-slate-500 border-b border-slate-100 bg-slate-50">
                      <tr>
                        <th className="p-4 font-bold rounded-tr-xl">ناوی شەریکە (وەک فاخر، مەزایە)</th>
                        <th className="p-4 font-bold rounded-tl-xl">کۆی فرۆشتن لێی</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeMetrics.topCompanies.map((c, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-bold text-slate-700">{c.name}</td>
                          <td className="p-4 font-black text-indigo-700" dir="ltr">{c.sales.toLocaleString()} IQD</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Receipts Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-indigo-500" />
                  <h3 className="font-bold text-lg text-slate-800">لیستی پسوڵەکان</h3>
                </div>
              </div>
              <div className="overflow-x-auto p-2">
                <table className="w-full text-right text-sm">
                  <thead className="text-slate-500 border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="p-4 font-bold rounded-tr-xl">ژمارەی پسوڵە</th>
                      <th className="p-4 font-bold">بەروار</th>
                      <th className="p-4 font-bold text-center">شێوازی پارەدان</th>
                      <th className="p-4 font-bold">داشکاندن</th>
                      <th className="p-4 font-bold rounded-tl-xl">کۆی گشتی</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeMetrics.receipts.map((r, i) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-700">#{i + 1}</td>
                        <td className="p-4 text-slate-600 font-medium" dir="ltr">{format(new Date(r.created_at), 'yyyy-MM-dd HH:mm')}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold ${
                            r.payment_method === 'Cash' ? 'bg-emerald-100 text-emerald-700' : 
                            r.payment_method === 'FIB' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {r.payment_method === 'Cash' ? 'نەقد' : r.payment_method === 'FIB' ? 'FIB' : `قەرز (${r.customer_name || 'نەزانراو'})`}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-rose-500" dir="ltr">{r.discount > 0 ? r.discount.toLocaleString() : '-'}</td>
                        <td className="p-4 font-black text-indigo-700" dir="ltr">{r.total_amount.toLocaleString()}</td>
                      </tr>
                    ))}
                    {activeMetrics.receipts.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-medium">هیچ پسوڵەیەک نییە بۆ ئەم بەروارە</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
};
