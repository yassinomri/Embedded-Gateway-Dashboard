/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./src/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      borderColor: {
        border: 'hsl(var(--border))',
      },
      backgroundColor: {
        background: 'hsl(var(--background))',
      },
      textColor: {
        foreground: 'hsl(var(--foreground))',
      },
      fontFamily: {
        tech: ["Orbitron", "Rajdhani", "Share Tech Mono", "sans-serif"],
      },
      colors: {
        techgray: "rgb(127, 128, 132)",
        sidebar: "rgb(15, 25, 35)",
        brand: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          300: "#5eead4",
          400: "#2dd4bf",
          DEFAULT: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
        },
      },
    },
  },
  plugins: [],
}

