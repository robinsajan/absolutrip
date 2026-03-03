import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Trip } from '@/types';

interface AppState {
  user: User | null;
  activeTrip: Trip | null;
  showAddOption: boolean;
  setUser: (user: User | null) => void;
  setActiveTrip: (trip: Trip | null) => void;
  setShowAddOption: (show: boolean) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      activeTrip: null,
      showAddOption: false,
      setUser: (user) => set({ user }),
      setActiveTrip: (trip) => set({ activeTrip: trip }),
      setShowAddOption: (show) => set({ showAddOption: show }),
      reset: () => set({ user: null, activeTrip: null, showAddOption: false }),
    }),
    {
      name: 'tripsync-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
