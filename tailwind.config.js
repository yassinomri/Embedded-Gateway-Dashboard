/** @type {import('tailwindcss').Config} */
export default {
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
      },
    },
  },
  plugins: [],
}

