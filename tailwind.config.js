/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
    fontFamily: {
      monteserrat: ["Montserrat", "sans-serif"],
    },
  },
  corePlugins: {
    preflight: true,
  },
}
