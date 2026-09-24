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
