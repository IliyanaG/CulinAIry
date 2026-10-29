/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#fbf8f2',
        ink: '#272b22',
        sage: '#526b4c',
        terracotta: '#c76f4e',
      },
      fontFamily: {
        display: ['Iowan Old Style', 'Georgia', 'serif'],
        sans: ['Inter', 'Avenir Next', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
