import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generatePalette } from '../utils/colorUtils';

export const useThemeStore = create(
  persist(
    (set, get) => ({
      themeColor: '#4f46e5', // Default Indigo-600
      setThemeColor: (color) => {
        set({ themeColor: color });
        get().applyTheme();
      },
      applyTheme: () => {
        const { themeColor } = get();
        const palette = generatePalette(themeColor);
        if (!palette) return;

        const root = document.documentElement;
        Object.entries(palette).forEach(([shade, value]) => {
          root.style.setProperty(`--theme-primary-${shade}`, value);
        });
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.applyTheme();
        }
      },
    }
  )
);
