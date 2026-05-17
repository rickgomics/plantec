import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#E6F5F4',
          100: '#B3DFDD',
          200: '#80CAC8',
          300: '#4DB4B2',
          400: '#26A39F',
          500: '#00928E',
          600: '#007B77',
          700: '#005F5C',
          800: '#004341',
          900: '#002827',
          950: '#001514',
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,.06), 0 1px 2px -1px rgba(0,0,0,.04)',
        'card-md': '0 4px 12px 0 rgba(0,0,0,.08)',
      },
    },
  },
  plugins: [],
}
export default config
