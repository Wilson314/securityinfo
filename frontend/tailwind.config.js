/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#f0f4ff',
          100: '#dce6ff',
          200: '#b9ccff',
          300: '#85a8ff',
          400: '#4d7aff',
          500: '#1e4fff',
          600: '#0031e0',
          700: '#0027b3',
          800: '#001f8a',
          900: '#001466',
          950: '#000d42',
        }
      },
      fontFamily: {
        sans: ['"Noto Sans TC"', 'Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
