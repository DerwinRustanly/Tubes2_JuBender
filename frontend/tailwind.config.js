/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
      },
      colors:{
        '1': "#131313",
        '2': "#1B1B1B",
        '3': "#505050",
        '4': '#1C311E',
        '5': '#72FF78'
      }
  },
  plugins: [],
}
}

