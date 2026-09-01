import type { Config } from "tailwindcss";

// Design tokens for the NCCIA UDC preparation platform.
// Palette: deep civil-service navy/ink + an emerald "pass" accent + a merit gold accent.
// Deliberately not the generic cream+terracotta or near-black+neon defaults.
const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0A1622",
          900: "#0E1E2E",
          800: "#152B3F",
          700: "#1E3A52",
          600: "#2C4F6B",
          400: "#6B8AA3",
          200: "#C4D3DE"
        },
        paper: {
          50: "#F7F8F6",
          100: "#EFF1EC",
          200: "#E2E6DE"
        },
        emerald: {
          600: "#0F6E5C",
          500: "#12876F",
          400: "#1FA588",
          100: "#DCF3EC"
        },
        gold: {
          600: "#A9791F",
          500: "#C79A3D",
          400: "#DDB65E",
          100: "#F8EDD3"
        },
        crimson: {
          600: "#A5342B",
          500: "#C1443B",
          100: "#FBE4E1"
        }
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular"]
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem"
      },
      boxShadow: {
        card: "0 1px 2px rgba(10, 22, 34, 0.06), 0 8px 24px -12px rgba(10, 22, 34, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
