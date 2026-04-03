/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0f172a',
          light: '#1e293b',
        },
        accent: {
          DEFAULT: '#4f46e5',
          light: '#eef2ff',
        },
        success: '#059669',
        warning: '#d97706',
        error: '#dc2626',
        background: '#F8FAFC',
        card: '#FFFFFF',
        border: '#E2E8F0',
        'text-primary': '#0f172a',
        'text-secondary': '#64748B',
        'text-muted': '#94A3B8',
        sidebar: {
          bg: '#0f172a',
          text: '#94a3b8',
          active: '#4f46e5',
          hover: '#1e293b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'sans-serif'],
        display: ['DM Serif Display', 'Georgia', 'serif'],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
};
