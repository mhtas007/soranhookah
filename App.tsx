import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { LoginScreen } from './components/LoginScreen';
import { Home } from './pages/Home';
import { POS } from './pages/POS';
import { Products } from './pages/Products';
import { Safe } from './pages/Safe';
import { Debts } from './pages/Debts';
import { Companies } from './pages/Companies';
import { Expenses } from './pages/Expenses';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Returns } from './pages/Returns';
import { Exchanges } from './pages/Exchanges';
import { Inventory } from './pages/Inventory';
import { Users } from './pages/Users';
import { Receipts } from './pages/Receipts';

function App() {
  const currentUser = useAppStore((state) => state.currentUser);

  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen transition-all duration-500">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/safe" element={<Safe />} />
            <Route path="/products" element={<Products />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/debts" element={<Debts />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/returns" element={<Returns />} />
            <Route path="/exchanges" element={<Exchanges />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/users" element={<Users />} />
            <Route path="/receipts" element={<Receipts />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
    </div>
  );
}

export default App;
