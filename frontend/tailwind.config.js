/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        sand:    { 50: "#faf7f2", 100: "#f5f0e5", 200: "#e8dcc7", 300: "#d4c4a0", 400: "#c4a97a", 500: "#b08d58" },
        teal:    { 50: "#effefa", 100: "#c7fff1", 200: "#90ffe3", 300: "#51f7d0", 400: "#1de4b6", 500: "#0d9488", 600: "#087a70", 700: "#0b615a", 800: "#0e4d49", 900: "#10403d" },
        coral:   { 50: "#fff5f2", 100: "#ffe8e1", 200: "#ffd0c3", 300: "#ffb09a", 400: "#ff8562", 500: "#e0654a" },
        surface: "#faf7f2",
        card:    "#ffffff",
      },
      fontFamily: {
        heading: ['"Fraunces"', 'serif'],
        body:    ['"Manrope"', 'sans-serif'],
      },
      boxShadow: {
        card: "0 2px 12px rgba(0,0,0,0.06)",
        elevated: "0 8px 30px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};
