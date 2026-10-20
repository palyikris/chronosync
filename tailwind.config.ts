import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#f2f4ea',
        'bg-accent': '#fafbf5',
        surface: 'rgba(252, 253, 247, 0.84)',
        'surface-strong': '#fcfdf7',
        text: '#353a2f',
        muted: '#747b69',
        'muted-strong': '#59614f',
        border: 'rgba(91, 104, 66, 0.12)',
        'border-strong': 'rgba(91, 104, 66, 0.22)',
        primary: '#cfe78f',
        'primary-foreground': '#28350d',
        'primary-strong': '#60782a',
        danger: '#a25952',
        'danger-bg': '#f7ebe7',
        'danger-border': '#e5c2bb',
      },
      fontFamily: {
        sans: ['"Open Sans"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(75, 87, 57, 0.08), 0 1px 2px rgba(75, 87, 57, 0.12)',
        'card-hover': '0 14px 28px rgba(75, 87, 57, 0.09), 0 10px 10px rgba(75, 87, 57, 0.07)',
      },
      borderRadius: {
        card: '1rem',
        field: '0.25rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
