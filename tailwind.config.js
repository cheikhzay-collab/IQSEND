/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        cairo: ['var(--font-cairo)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-cairo)', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: '#F8FAFC',
        surface: '#FFFFFF',
        brand: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
        whatsapp: {
          light: '#25D366',
          DEFAULT: '#128C7E',
          dark: '#075E54',
          chat: '#ECE5DD',
          bubble: '#DCF8C6',
        },
        cod: {
          pending: '#F59E0B',
          processing: '#2563EB',
          transit: '#4F46E5',
          completed: '#10B981',
          cancelled: '#EF4444',
        },
      },
      boxShadow: {
        'app-card': '0 2px 10px -2px rgba(15, 23, 42, 0.05), 0 1px 3px -1px rgba(15, 23, 42, 0.05)',
        'app-elevated': '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
        'app-bottom': '0 -4px 20px -2px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};

