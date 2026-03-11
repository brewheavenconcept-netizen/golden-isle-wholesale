/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./shared/ux-pro-max/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        fintech: {
          bg: "#0B0E14",
          surface: "#171C26",
          "surface-raised": "#1E293B",
          border: "#2D3748",
          "border-muted": "#1E293B",
          primary: "#3B82F6",
          success: "#10B981",
          danger: "#EF4444",
          warning: "#F59E0B",
          muted: "#94A3B8",
          dark: "#64748B",
          text: "#F8FAF9",
        },
      },
      fontFamily: {
        fintech: ["Inter", "Satoshi", "system-ui", "sans-serif"],
        "fintech-mono": ["JetBrains Mono", "SF Mono", "monospace"],
      },
      boxShadow: {
        "fintech-glow": "0 0 20px rgba(59, 130, 246, 0.05)",
      },
      borderRadius: {
        "fintech-xl": "1rem",
        "fintech-2xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
