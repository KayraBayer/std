/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        handwritten: ["Lobster", "cursive"],
        mainFont: ["Sigmar", "sans-serif"],
        mainOtherFont: ["Overpass", "sans-serif"],
      },
    },
  },
  plugins: [],
}

