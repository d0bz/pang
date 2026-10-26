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
        splitwise: {
          teal: "#1cc29f",
          darkTeal: "#138871",
          lightTeal: "#e6f9f5",
          orange: "#ff652f",
          lightOrange: "#fff1ec",
          green: "#5bc5a7",
          dark: "#373b3f",
          gray: "#555555",
          lightGray: "#f6f6f6",
          border: "#e0e0e0",
        },
      },
    },
  },
  plugins: [],
};
export default config;
