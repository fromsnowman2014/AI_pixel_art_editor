import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Kid-friendly color palette
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Pixel art specific colors
        pixel: {
          bg: '#f8fafc',
          grid: '#e2e8f0',
          'grid-dark': '#cbd5e1',
          border: '#94a3b8',
          selection: '#3b82f6',
          'selection-bg': 'rgba(59, 130, 246, 0.1)',
        },
        // Canvas colors
        canvas: {
          transparent: 'url("data:image/svg+xml,%3csvg width=\'100%25\' height=\'100%25\' xmlns=\'http://www.w3.org/2000/svg\'%3e%3cdefs%3e%3cpattern id=\'a\' patternUnits=\'userSpaceOnUse\' width=\'10\' height=\'10\'%3e%3crect fill=\'%23f1f5f9\' width=\'5\' height=\'5\'/%3e%3crect fill=\'%23e2e8f0\' x=\'5\' width=\'5\' height=\'5\'/%3e%3crect fill=\'%23e2e8f0\' y=\'5\' width=\'5\' height=\'5\'/%3e%3crect fill=\'%23f1f5f9\' x=\'5\' y=\'5\' width=\'5\' height=\'5\'/%3e%3c/pattern%3e%3c/defs%3e%3crect width=\'100%25\' height=\'100%25\' fill=\'url(%23a)\'/%3e%3c/svg%3e")',
        },
        // UI states
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        // Kid-friendly sizes
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },
      spacing: {
        // Canvas and tool-specific spacing
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      minHeight: {
        // Tool bar and UI elements
        'tool': '44px',
        'canvas': '400px',
      },
      minWidth: {
        'tool': '44px',
        'sidebar': '240px',
      },
      maxWidth: {
        'canvas': '1200px',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        'tool': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'canvas': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'modal': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
        'pulse-gentle': 'pulseGentle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { 
            transform: 'translateY(-5%)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
          },
          '50%': { 
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
          },
        },
        pulseGentle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.7' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    // Custom plugin for pixel art utilities
    function({ addUtilities }: { addUtilities: any }) {
      const newUtilities = {
        '.pixel-perfect': {
          'image-rendering': 'pixelated',
          'image-rendering': '-moz-crisp-edges',
          'image-rendering': 'crisp-edges',
        },
        '.no-select': {
          '-webkit-user-select': 'none',
          '-moz-user-select': 'none',
          '-ms-user-select': 'none',
          'user-select': 'none',
        },
        '.touch-manipulation': {
          'touch-action': 'manipulation',
        },
        '.canvas-cursor': {
          cursor: 'crosshair',
        },
        '.tool-cursor': {
          cursor: 'pointer',
        },
      }
      addUtilities(newUtilities)
    }
  ],
}

export default config