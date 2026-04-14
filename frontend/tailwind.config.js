/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        cyanGlow: "0 0 15px rgba(34,211,238,0.5)",
        cyanStrong: "0 0 24px rgba(59,130,246,0.7)",
      },
      colors: {
        pitch: {
          dark: "#021b15",
          mid: "#063326",
          line: "#d8fff0",
        },
      },
      animation: {
        pulseGlow: "pulseGlow 1.8s ease-in-out infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(59,130,246,0.35)" },
          "50%": { boxShadow: "0 0 24px rgba(59,130,246,0.85)" },
        },
      },
    },
  },
  plugins: [],
};

