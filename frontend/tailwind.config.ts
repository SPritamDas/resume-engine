import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: { bg: "#0B0F19", card: "#111827", border: "#1F2937" },
        brand: { DEFAULT: "#6366F1", hover: "#4F46E5" },
      },
    },
  },
  plugins: [],
};
export default config;
