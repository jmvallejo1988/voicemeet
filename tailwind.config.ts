import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Wilduit brand palette
        wdark:  '#080c14',
        wcyan:  '#22d3ee',
        wcyan2: '#67e8f9',
        wwhite: '#f0f8ff',
        wmuted: '#6487a0',
        wred:   '#f87171',
        wyellow:'#fcd34d',
        wgreen: '#34d399',
        wglass: '#101e32',
        wborder:'#22405c',
        wtag:   '#12263a',
        // Light mode surfaces
        lbg:    '#f0f8ff',
        lcard:  '#e0eef8',
        lborder:'#b0cee8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        glowPulse: {
          '0%,100%': { boxShadow: '0 0 10px 2px rgba(34,211,238,0.3)' },
          '50%': { boxShadow: '0 0 24px 6px rgba(34,211,238,0.7)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
