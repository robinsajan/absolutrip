import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Trip } from '@/types';

interface AppState {
  user: User | null;
  activeTrip: Trip | null;
  setUser: (user: User | null) => void;
  setActiveTrip: (trip: Trip | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      activeTrip: null,
      setUser: (user) => set({ user }),
      setActiveTrip: (trip) => set({ activeTrip: trip }),
      reset: () => set({ user: null, activeTrip: null }),
    }),
    {
      name: 'tripsync-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
