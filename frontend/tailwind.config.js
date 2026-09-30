/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        neural: {
          950: '#06060a',
          900: '#0d0d14',
          850: '#13131f',
          800: '#1c1c2e',
          700: '#2c2c47',
          600: '#474770',
          purple: '#8b5cf6',
          purpleDark: '#7c3aed',
          cyan: '#06b6d4',
          cyanLight: '#22d3ee',
          pink: '#f43f5e',
          emerald: '#10b981',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        floatUp: {
          '0%': { transform: 'translateY(0) scale(0.6)', opacity: '1' },
          '100%': { transform: 'translateY(-180px) scale(1.4) rotate(15deg)', opacity: '0' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 15px rgba(139, 92, 246, 0.5)' },
          '50%': { opacity: '0.6', boxShadow: '0 0 5px rgba(139, 92, 246, 0.2)' },
        }
      },
      animation: {
        'float-up': 'floatUp 1.8s cubic-bezier(0.25, 1, 0.5, 1) forwards',
        'pulse-glow': 'pulseGlow 2s infinite',
      }
    },
  },
  plugins: [],
}
