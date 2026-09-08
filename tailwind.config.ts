import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111318",
        paper: "#f7f6f3",
        accent: "#2f6f4f",
        warn: "#b5502f",
        line: "#dcd9d2",
      },
      // Tap targets: mobile-first, chalky-hands rule. Never go below 44px.
      spacing: {
        tap: "3rem",
      },
    },
  },
  plugins: [],
};

export default config;
