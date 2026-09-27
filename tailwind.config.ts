import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens — reactive to light/dark via CSS variables
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        ink:     'rgb(var(--ink)     / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        line:    'rgb(var(--line)    / <alpha-value>)',
        // Teal do Padrão Visual do Portal (Design System "Padrão Visual do Portal
        // Plantec"). Até 27/09/2026 esta escala era o azul-marinho do Cockpit
        // (#0F1438/#3547C8), sobra da reversão de 08/09: pintava o menu lateral
        // e todo bg-brand-*/text-brand-* de azul.
        brand: {
          50:  '#E0F3F1',
          100: '#B6E6E1',
          200: '#8DD6CF',
          300: '#5FCCC4',
          400: '#28B3AA',
          500: '#0B8F88',
          600: '#0A7D77',
          700: '#075F59',
          800: '#054A45',
          900: '#04322F',
          950: '#021F1D',
        },
      },
      // As três famílias do Padrão Visual do Portal (carregadas em layout.tsx)
      fontFamily: {
        display: ['var(--font-display)', '"Arial Narrow"', 'sans-serif'],
        body:    ['var(--font-body)', 'sans-serif'],
        mono:    ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card:    '0 1px 3px 0 rgba(0,0,0,.06), 0 1px 2px -1px rgba(0,0,0,.04)',
        'card-md': '0 4px 12px 0 rgba(0,0,0,.08)',
      },
    },
  },
  plugins: [],
}
export default config
