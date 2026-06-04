import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/views/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "nav-bg": "var(--color-nav-bg)",
        "nav-text": "var(--color-nav-text)",
        "nav-border": "var(--color-nav-border)",
        "nav-muted": "var(--color-nav-muted)",
      },
    },
  },
  plugins: [],
};
export default config;
