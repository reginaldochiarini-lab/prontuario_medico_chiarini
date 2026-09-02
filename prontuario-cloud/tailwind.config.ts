import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        chiarini: {
          bg: "#080d17",
          panel: "#0f172a",
          border: "#1e293b",
          accent: "#2563eb",
          accent2: "#0ea5e9",
        },
      },
    },
  },
  plugins: [],
};

export default config;
