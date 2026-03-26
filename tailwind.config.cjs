/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./styles/**/*.css",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        heading: "#000000",
        primary: {
          DEFAULT: "#9a3412",
          hover: "#7c2d12",
        },
        gs: {
          /** Landing — spec charte (typo + couleurs) */
          orange: "#E86F1C",
          beige: "#F8F4F1",
          dark: "#222222",
          muted: "#B0B0B0",
          line: "#E0E0E0",
        },
        /** Curated Resonance — tokens CSS dans globals.css (:root --ds-*) */
        ds: {
          background: "var(--ds-background)",
          "surface-low": "var(--ds-surface-container-low)",
          "surface-lowest": "var(--ds-surface-container-lowest)",
          "surface-highest": "var(--ds-surface-container-highest)",
          inverse: "var(--ds-inverse-surface)",
          primary: "var(--ds-primary)",
          "primary-container": "var(--ds-primary-container)",
          "accent-hover": "var(--ds-accent-orange-hover)",
          "on-background": "var(--ds-on-background)",
          "on-surface": "var(--ds-on-surface)",
          "on-surface-variant": "var(--ds-on-surface-variant)",
          secondary: "var(--ds-secondary)",
          outline: "var(--ds-outline-variant)",
        },
      },
      borderRadius: {
        "ds-sm": "0.25rem",
        "ds-md": "0.375rem",
      },
      maxWidth: {
        landing: "1200px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-in-from-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-out-to-left": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-100%)" },
        },
        "slide-in-from-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-out-to-right": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.2s ease-out",
        "slide-in-from-left": "slide-in-from-left 0.3s ease-out",
        "slide-out-to-left": "slide-out-to-left 0.2s ease-out",
        "slide-in-from-right": "slide-in-from-right 0.3s ease-out",
        "slide-out-to-right": "slide-out-to-right 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
