import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        plantec: {
          primary: '#1B3A6B',
          secondary: '#E8A020',
          accent: '#2563EB',
          dark: '#0F1E35',
        }
      }
    },
  },
  plugins: [],
}
export default config
