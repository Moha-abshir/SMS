/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './apps/web/index.html',
    './apps/web/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',  // Ultra Light Sky
          100: '#e0f2fe', // Soft Light Sky
          200: '#bae6fd', // Muted Sky Blue
          300: '#7dd3fc', // Clear Sky
          400: '#38bdf8', // Vibrant Sky
          500: '#0ea5e9', // Primary Sky Blue
          600: '#0284c7', // Deep Sky Blue Accent
          700: '#0369a1', // Dark Sky Blue
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        }
      },
      boxShadow: {
        'glass': '0 4px 20px -2px rgba(14, 165, 233, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
        'glass-hover': '0 10px 25px -4px rgba(14, 165, 233, 0.08), 0 4px 10px -2px rgba(0, 0, 0, 0.03)',
        'glass-lg': '0 20px 35px -5px rgba(14, 165, 233, 0.08), 0 8px 16px -4px rgba(0, 0, 0, 0.03)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
};
