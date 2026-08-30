/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        desk: {
          bg: '#0b1020',
          panel: '#121a2f',
          edge: '#243049',
          text: '#e6ecff',
          muted: '#8b97b8',
          accent: '#5b8cff',
        },
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease both',
      },
    },
  },
  plugins: [],
}
