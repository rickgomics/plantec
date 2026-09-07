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
        // Brand scale — fixed (sidebar always dark, badges always on-brand)
        brand: {
          50:  '#EEF0FC',
          100: '#D9DDF7',
          200: '#B3BBEF',
          300: '#8C99E7',
          400: '#5E6EDB',
          500: '#3547C8',
          600: '#2A38A3',
          700: '#212C80',
          800: '#181F5C',
          900: '#0F1438',
          950: '#080A1E',
        },
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
