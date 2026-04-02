/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cyan:   "#00e5ff",
        amber:  "#ffb800",
        green:  "#00e676",
        red:    "#ff4d6d",
        violet: "#a78bfa",
        orange: "#ff7043",
      },
      fontFamily: {
        syne: ["Syne", "sans-serif"],
        mono: ["DM Mono", "monospace"],
        sans: ["Nunito", "sans-serif"],
      },
      transitionDuration: {
        1200: "1200ms",
      },
    },
  },
  plugins: [],
};
