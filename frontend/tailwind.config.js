/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#080c14',
        surface: '#0d1220',
        border: '#1a2540',
        accent: '#00d4ff',
        critical: '#ff3860',
        warning: '#ffd60a',
        safe: '#00ff88',
        text: '#e8eaf0',
        muted: '#4a5568',
      },
      fontFamily: {
        display: ['Rajdhani', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px #00d4ff22',
      },
      transitionDuration: {
        DEFAULT: '300ms',
      },
    },
  },
  plugins: [],
};
