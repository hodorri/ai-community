import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ok: {
          primary: "#FF6600",
          secondary: "#666666",
          light: "#FFF4ED",
          dark: "#CC5200",
        },
      },
      fontFamily: {
        'ok': ['okfont', 'sans-serif'],
      },
      fontWeight: {
        'ok-bold': '700',
        'ok-medium': '500',
        'ok-light': '300',
      },
    },
  },
  plugins: [],
};
export default config;
