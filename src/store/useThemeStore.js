import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generatePalette } from '../utils/colorUtils';

const CUSTOM_CSS_STYLE_ID = 'zeader-custom-css';

export const useThemeStore = create(
  persist(
    (set, get) => ({
      themeColor: '#1d7d8c',
      customCSS: '',
      setThemeColor: (color) => {
        set({ themeColor: color });
        get().applyTheme();
      },
      setCustomCSS: (css) => {
        set({ customCSS: css });
        get().applyCustomCSS();
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
      applyCustomCSS: () => {
        const { customCSS } = get();
        
        // Remove existing custom CSS style element
        const existingStyle = document.getElementById(CUSTOM_CSS_STYLE_ID);
        if (existingStyle) {
          existingStyle.remove();
        }
        
        // Add new custom CSS if provided
        if (customCSS && customCSS.trim()) {
          const styleElement = document.createElement('style');
          styleElement.id = CUSTOM_CSS_STYLE_ID;
          styleElement.textContent = customCSS;
          document.head.appendChild(styleElement);
        }
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.applyTheme();
          state.applyCustomCSS();
        }
      },
    }
  )
);
