import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Settings } from '../types';

interface AppState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      settings: {
        shopName: 'Soran Hookah Shop',
        phone: '',
        address: '',
        receiptFooter: 'سوپاس بۆ سەردانتان', // Thank you for visiting
        usdRate: 150000,
      },
      updateSettings: (newSettings) => 
        set((state) => ({ settings: { ...state.settings, ...newSettings } }))
    }),
    {
      name: 'pos-storage',
      partialize: (state) => ({ settings: state.settings, currentUser: state.currentUser }),
    }
  )
);
