import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pea: {
          purple: "#741b77",
          "purple-dark": "#58145a",
          "purple-light": "#f6eaf7",
          "purple-subtle": "#fbf5fc",
          gold: "#f39c12",
          "gold-dark": "#d68910",
          "gold-light": "#fef9ee",
          canvas: "#f8fafc",
          surface: "#ffffff",
          border: "#e2e8f0",
        },
      },
      fontFamily: {
        sans: ["'Prompt'", "'Noto Sans Thai'", "'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
        "card-hover": "0 10px 15px -3px rgba(116, 27, 119, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
} satisfies Config;
