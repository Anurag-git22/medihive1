/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        medihive: {
          50: '#f0f7fa',
          100: '#d9ecf3',
          200: '#b7dce9',
          300: '#86c3db',
          400: '#4fa3c7',
          500: '#2d84ab',
          600: '#236b8e',
          700: '#1e536e', // primary teal brand color from screenshots
          800: '#1a475e',
          900: '#153a4c',
          950: '#0c2330',
        },
        navy: {
          800: '#1b3245',
          900: '#122332',
        }
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      }
    },
  },
  plugins: [],
}

