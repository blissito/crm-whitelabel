import type { Config } from "tailwindcss";

// Paleta CoreGrid (extraída de coregrid.com.mx): azul primario + acento magenta.
// `brand` se mapea al azul de CoreGrid para que los componentes portados de
// Formmy (que usan brand-*) adopten la identidad sin tocar su markup.
export default {
  darkMode: "class",
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Inter"',
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
        ],
      },
      colors: {
        // Paleta real CoreGrid (de coregrid.com.mx): logo blanco sobre navy
        // oscuro, hexágono cyan/azul, acento NARANJA en CTAs.
        brand: {
          100: "#E6F4FB",
          300: "#7FCBEC",
          500: "#1CA7E0", // cyan-azul del hexágono
          600: "#1689BC",
          800: "#0B1B2E", // navy oscuro (fondo de marca)
        },
        accent: {
          DEFAULT: "#F37021", // naranja CTA CoreGrid
          600: "#D85E14",
        },
        cyan: "#19C3D6",
        dark: "#0B1B2E", // navy base
        hole: "#001327",
        metal: "#4B5563",
        irongray: "#81838E",
        lightgray: "#B6B6BA",
        surface: "#F2F5F9",
        outlines: "#E1E3E7",
        perl: "#E9EBEF",
        secondary: "#E1E3E7",
        surfaceThree: "#F6F6FA",
        surfaceFour: "#F0EFF1",
        danger: "#ED695F",
        success: "#7FBE60",
        cloud: "#8AD7C9",
        sky: "#76D3CB",
        grass: "#7FBE60",
        lime: "#BFDD78",
        space: {
          100: "#FAFBFE",
          200: "#F4F5FB",
          300: "#9DA3AE",
          400: "#878893",
          500: "#5F6370",
          600: "#81838E",
          700: "#12151A",
          800: "#191A20",
          900: "#0E0E11",
        },
        clear: "#ffffff",
        gray: {
          100: "#E2E2E2",
          200: "#F2F1F1",
          300: "#E3E1E1",
          400: "#B2B3BE",
          500: "#878893",
          600: "#4B5563",
          800: "#2A2C34",
          900: "#141419",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
} satisfies Config;
