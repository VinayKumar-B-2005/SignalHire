/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0C0C0C',
          secondary: '#141414',
          card: '#1A1A1A',
          hover: '#202020',
        },
        border: {
          default: '#2A2A2A',
          accent: '#F59E0B',
        },
        accent: {
          primary: '#F59E0B',
          secondary: '#FBBF24',
          danger: '#EF4444',
          success: '#22C55E',
          info: '#3B82F6',
        },
        text: {
          primary: '#F5F5F5',
          secondary: '#A3A3A3',
          muted: '#525252',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.5)',
        modal: '0 8px 32px rgba(0,0,0,0.8)',
      },
      transitionDuration: {
        fast: '200ms',
        modal: '300ms',
      }
    },
  },
  plugins: [],
}
