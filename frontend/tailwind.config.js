/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        'void-black': '#0a0e27',
        'void-darker': '#05070f',
        'electric-cobalt': '#0066ff',
        'electric-cobalt-bright': '#00d4ff',
        'acid-neon': '#39ff14',
        'acid-neon-dim': '#22cc0a',
        'terminal-gray': '#1a1f36',
        'surface-glass': 'rgba(10, 14, 39, 0.6)',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'monospace'],
        'sans': ['Inter', 'sans-serif'],
      },
      backdropBlur: {
        'glass': '8px',
      },
      boxShadow: {
        'glow-cobalt': '0 0 20px rgba(0, 102, 255, 0.5)',
        'glow-neon': '0 0 20px rgba(57, 255, 20, 0.5)',
        'glow-intense': '0 0 40px rgba(0, 212, 255, 0.8)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glitch': 'glitch 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'scanlines': 'scanlines 8s linear infinite',
        'heart-beat': 'heart-beat 0.6s cubic-bezier(0.4, 0, 0.6, 1)',
        'neon-flicker': 'neon-flicker 3s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'glitch': {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
        'scanlines': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'heart-beat': {
          '0%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(1.1)' },
          '50%': { transform: 'scale(1)' },
        },
        'neon-flicker': {
          '0%, 100%': { opacity: '1' },
          '42%': { opacity: '0.9' },
          '43%': { opacity: '0.7' },
          '44%': { opacity: '0.9' },
          '58%': { opacity: '0.9' },
          '61%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
