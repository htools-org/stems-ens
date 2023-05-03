/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        stems: {
          'dark-green': '#89a396',
          'light-green': '#afc9bc',
          'dark-blue': '#5c7b8a',
          'light-blue': '#e9f3f8',
          'light-gray': '#f4f4f4',
          //
          'light-yellow': '#fffdf8',
          'yellow': '#f1d49c',
        }
      }
    }
  },
  plugins: [],
}
