import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17211b",
        moss: "#4b6b4f",
        coral: "#d95d4c",
        maize: "#e8b44b",
        lagoon: "#2c7a83",
        paper: "#f7f4ec"
      }
    }
  },
  plugins: []
};

export default config;
