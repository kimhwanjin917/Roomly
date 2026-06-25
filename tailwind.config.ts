import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      colors: {
        toss: {
          blue: '#3182F6',
          'blue-hover': '#1B6EF3',
          bg: '#F2F4F6',
          border: '#E8EAED',
          success: '#05C072',
          error: '#F04452',
          warn: '#FAC62D',
        },
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.10)',
        modal: '0 -4px 40px rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [],
}

export default config
