/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx,js,jsx,css}",
    "./components/**/*.{ts,tsx,js,jsx,css}"
  ],
  safelist: [
    'bg-yellow-100',
    'bg-orange-200',
    'bg-red-200',
    'bg-purple-200',
    'bg-blue-200',
    'bg-gray-100',
  ],
  theme: { extend: {} },
  plugins: []
};