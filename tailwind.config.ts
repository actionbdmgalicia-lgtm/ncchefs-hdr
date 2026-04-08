/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary colors
        "primary": "#775a19",
        "primary-container": "#c5a059",
        "on-primary": "#ffffff",
        "on-primary-container": "#4e3700",
        "primary-fixed": "#ffdea5",
        "primary-fixed-dim": "#e9c176",
        "on-primary-fixed": "#261900",
        "on-primary-fixed-variant": "#5d4201",

        // Secondary colors
        "secondary": "#5e5e5e",
        "secondary-container": "#e4e2e2",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#646464",
        "secondary-fixed": "#e4e2e2",
        "secondary-fixed-dim": "#c8c6c6",
        "on-secondary-fixed": "#1b1c1c",
        "on-secondary-fixed-variant": "#474747",

        // Tertiary colors
        "tertiary": "#675d4d",
        "tertiary-container": "#b0a391",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#433a2b",
        "tertiary-fixed": "#f0e0cc",
        "tertiary-fixed-dim": "#d3c4b1",
        "on-tertiary-fixed": "#221a0e",
        "on-tertiary-fixed-variant": "#4f4537",

        // Error colors
        "error": "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",

        // Background and surface
        "background": "#fbf9f4",
        "on-background": "#1b1c19",
        "surface": "#fbf9f4",
        "on-surface": "#1b1c19",
        "surface-variant": "#e4e2dd",
        "on-surface-variant": "#4e4639",
        "surface-bright": "#fbf9f4",
        "surface-container": "#f0eee9",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f5f3ee",
        "surface-container-high": "#eae8e3",
        "surface-container-highest": "#e4e2dd",
        "surface-dim": "#dbdad5",
        "surface-tint": "#775a19",
        "inverse-surface": "#30312e",
        "inverse-on-surface": "#f2f1ec",
        "inverse-primary": "#e9c176",

        // Outline
        "outline": "#7f7667",
        "outline-variant": "#d1c5b4",
      },
      fontFamily: {
        "headline": ["Noto Serif", "serif"],
        "body": ["Manrope", "sans-serif"],
        "label": ["Manrope", "sans-serif"],
      },
      borderRadius: {
        "sm": "0.125rem",
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "0.75rem",
      },
    },
  },
  plugins: [],
}
