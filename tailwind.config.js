/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0c',
        surface: '#141418',
        surfaceLight: '#1e1e24',
        primary: '#f97316', // Orange Puki
      }
    },
  },
  plugins: [],
}
