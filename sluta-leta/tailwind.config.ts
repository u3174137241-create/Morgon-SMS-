import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        kungsbla: {
          50: "#eef3fb",
          100: "#d7e3f5",
          400: "#3763a8",
          500: "#1e4a8c",
          600: "#153b73",
          700: "#0f2c57",
        },
        guld: {
          400: "#d4af37",
          500: "#c19a2e",
          // 600 är en mörkare variant av samma guldton, till för text — 500 klarar
          // bara ~2.6:1 kontrast mot vitt (WCAG AA kräver 4.5:1 för brödtext).
          600: "#896b1f",
        },
        // Hela appens ljusgrå brödtext (rubrikundertexter, tidsstämplar, hjälptext)
        // använder gray-400, som bara klarar ~2.5:1 kontrast mot vitt — under
        // WCAG AA:s krav på 4.5:1. Detta byter bara den nyansen mot Tailwinds
        // egen gray-500 (4.83:1), oförändrat i övrigt.
        gray: {
          400: "#6b7280",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
