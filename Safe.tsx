import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Wallet, Banknote, CreditCard, ArrowDownToLine, Receipt } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { startOfDay, endOfDay } from 'date-fns';

export const Safe: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    cashSales: 0,
    fibSales: 0,
    debtSales: 0,
    debtReceived: 0,
    expenses: 0,
    totalSafe: 0
  });

  useEffect(() => {
    fetchSafeData();
  }, []);

  const fetchSafeData = async () => {
    try {
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();

      // 1. Fetch Sales for today
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)
        .eq('status', 'Completed');

      if (salesError) throw salesError;

      let cashSales = 0;
      let fibSales = 0;
      let debtSales = 0;

      sales?.forEach((sale: any) => {
        if (sale.payment_method === 'Cash') cashSales += sale.total_amount;
        if (sale.payment_method === 'FIB') fibSales += sale.total_amount;
        if (sale.payment_method === 'Debt') debtSales += sale.total_amount;
      });

      // 2. Fetch Debt Payments received today
      const { data: debtPayments, error: debtError } = await supabase
        .from('debt_payments')
        .select('amount')
        .gte('date', todayStart)
        .lte('date', todayEnd);

      if (debtError) throw debtError;
      const debtReceived = debtPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;

      // 3. Fetch Expenses for today
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount')
        .gte('date', todayStart)
        .lte('date', todayEnd);

      if (expensesError) throw expensesError;
      const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;

      // Calculate Total Cash in Safe
      // Safe = Cash Sales + Debt Payments Received - Expenses
      const totalSafe = cashSales + debtReceived - totalExpenses;

      setStats({
        cashSales,
        fibSales,
        debtSales,
        debtReceived,
        expenses: totalExpenses,
        totalSafe
      });

    } catch (error) {
      console.error('Error fetching safe data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-kurdish">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowRight className="w-6 h-6 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-500" />
            قاسەی ئەمڕۆ
          </h1>
          <p className="text-slate-500 text-sm mt-1">{new Date().toLocaleDateString('ku-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
        {loading ? (
          <div className="text-center p-12 text-slate-500">خەریکی هێنانی داتاکانە...</div>
        ) : (
          <>
            {/* Total Safe Card */}
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-8 text-white shadow-xl shadow-emerald-200/50 flex flex-col items-center justify-center text-center">
              <p className="text-emerald-100 font-medium mb-2 text-lg">پارەی نەقدی ناو قاسە</p>
              <h2 className="text-5xl font-bold" dir="ltr">{stats.totalSafe.toLocaleString()} <span className="text-xl font-normal opacity-80">IQD</span></h2>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-slate-500 font-medium mb-1">فرۆشتنی نەقد</p>
                  <p className="text-2xl font-bold text-slate-800" dir="ltr">{stats.cashSales.toLocaleString()} <span className="text-sm text-slate-400">IQD</span></p>
                </div>
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <Banknote className="w-6 h-6 text-emerald-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-slate-500 font-medium mb-1">پارەی وەرگیراوی قەرز</p>
                  <p className="text-2xl font-bold text-amber-600" dir="ltr">+{stats.debtReceived.toLocaleString()} <span className="text-sm text-amber-400">IQD</span></p>
                </div>
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                  <ArrowDownToLine className="w-6 h-6 text-amber-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-slate-500 font-medium mb-1">خەرجییەکان</p>
                  <p className="text-2xl font-bold text-rose-600" dir="ltr">-{stats.expenses.toLocaleString()} <span className="text-sm text-rose-400">IQD</span></p>
                </div>
                <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-rose-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-slate-500 font-medium mb-1">فرۆشتنی FIB</p>
                  <p className="text-2xl font-bold text-indigo-600" dir="ltr">{stats.fibSales.toLocaleString()} <span className="text-sm text-indigo-400">IQD</span></p>
                </div>
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-slate-500 font-medium mb-1 text-center">کۆی فرۆشتنی قەرزی ئەمڕۆ (وەرنەگیراو)</p>
              <p className="text-2xl font-bold text-slate-800 text-center" dir="ltr">{stats.debtSales.toLocaleString()} <span className="text-sm text-slate-400">IQD</span></p>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
