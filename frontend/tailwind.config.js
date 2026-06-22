/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#FAFAFA",
        "background-secondary": "#F0F0F0",
        "accent-primary": "#6366F1",
        "accent-secondary": "#10B981",
        "text-primary": "#1F2937",
        "text-secondary": "#6B7280",
        "bubble-user": "#6366F1",
        "bubble-assistant": "#FFFFFF",
      },
      fontFamily: {
        display: ["Inter", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
