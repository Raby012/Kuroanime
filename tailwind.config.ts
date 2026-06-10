import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--color-brand, #e11d48)",
          dark:    "var(--color-brand-dark, #9f1239)",
          light:   "var(--color-brand-light, #fb7185)",
        },
        surface: {
          DEFAULT: "var(--color-surface, #0d0d14)",
          1:       "var(--color-surface-1, #13131e)",
          2:       "var(--color-surface-2, #1a1a28)",
          3:       "var(--color-surface-3, #222233)",
        },
      },
      fontFamily: {
        display: ["var(--font-bebas)", "Impact", "sans-serif"],
        body:    ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};

export default config;
