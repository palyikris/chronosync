import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#f8f9fa',
        'bg-accent': '#fdfefe',
        surface: 'rgba(255, 255, 255, 0.95)',
        'surface-strong': '#ffffff',
        text: '#191c1d',
        muted: '#5e5e62',
        'muted-strong': '#646468',
        border: '#e1e3e4',
        'border-strong': '#c4c7c5',
        primary: '#abdb11',
        'primary-foreground': '#151f00',
        'primary-strong': '#4e6700',
        danger: '#ba1a1a',
        'danger-bg': '#ffdad6',
        'danger-border': '#ffdad6',
      },
      fontFamily: {
        sans: ['"Open Sans"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        'card-hover': '0 14px 28px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        card: '1rem',
        field: '0.25rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
