import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Existing shadcn colors
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },

        // Brand Colors - Updated with exact blue and purple shades
        brand: {
          purple: {
            50: "#f3f1ff",
            100: "#ebe5ff",
            200: "#d9ceff",
            300: "#bea6ff",
            400: "#9f75ff",
            500: "#843dff",
            600: "#7c3aed", // This matches purple-600
            700: "#6b21a8", // This matches purple-700
            800: "#5b21b6",
            900: "#4c1d95",
            950: "#2c0076",
          },
          pink: {
            50: "#fef7ff",
            100: "#fceeff",
            200: "#f8ddff",
            300: "#f2bfff",
            400: "#e879ff",
            500: "#dd4bff",
            600: "#c026d3",
            700: "#a21caf",
            800: "#86198f",
            900: "#701a75",
            950: "#4a044e",
          },
          blue: {
            50: "#eff6ff",
            100: "#dbeafe",
            200: "#bfdbfe",
            300: "#93c5fd",
            400: "#60a5fa",
            500: "#3b82f6",
            600: "#2563eb", // This matches blue-600
            700: "#1d4ed8", // This matches blue-700
            800: "#1e40af",
            900: "#1e3a8a",
            950: "#172554",
          },
          black: {
            50: "#f8fafc",
            100: "#f1f5f9",
            200: "#e2e8f0",
            300: "#cbd5e1",
            400: "#94a3b8",
            500: "#64748b",
            600: "#475569",
            700: "#334155",
            800: "#1e293b",
            900: "#0f172a",
            950: "#020617",
          },
        },
      },

      // Brand Gradients - Updated with your specific gradient patterns
      backgroundImage: {
        // Main brand gradients
        "brand-gradient": "linear-gradient(to right, #2563eb, #7c3aed)", // blue-600 to purple-600
        "brand-gradient-hover": "linear-gradient(to right, #1d4ed8, #6b21a8)", // blue-700 to purple-700

        // Directional gradients
        "brand-gradient-r": "linear-gradient(to right, #2563eb, #7c3aed)",
        "brand-gradient-l": "linear-gradient(to left, #2563eb, #7c3aed)",
        "brand-gradient-t": "linear-gradient(to top, #2563eb, #7c3aed)",
        "brand-gradient-b": "linear-gradient(to bottom, #2563eb, #7c3aed)",
        "brand-gradient-tr": "linear-gradient(to top right, #2563eb, #7c3aed)",
        "brand-gradient-tl": "linear-gradient(to top left, #2563eb, #7c3aed)",
        "brand-gradient-br": "linear-gradient(to bottom right, #2563eb, #7c3aed)",
        "brand-gradient-bl": "linear-gradient(to bottom left, #2563eb, #7c3aed)",

        // Hover variants
        "brand-gradient-r-hover": "linear-gradient(to right, #1d4ed8, #6b21a8)",
        "brand-gradient-l-hover": "linear-gradient(to left, #1d4ed8, #6b21a8)",
        "brand-gradient-t-hover": "linear-gradient(to top, #1d4ed8, #6b21a8)",
        "brand-gradient-b-hover": "linear-gradient(to bottom, #1d4ed8, #6b21a8)",
        "brand-gradient-tr-hover": "linear-gradient(to top right, #1d4ed8, #6b21a8)",
        "brand-gradient-tl-hover": "linear-gradient(to top left, #1d4ed8, #6b21a8)",
        "brand-gradient-br-hover": "linear-gradient(to bottom right, #1d4ed8, #6b21a8)",
        "brand-gradient-bl-hover": "linear-gradient(to bottom left, #1d4ed8, #6b21a8)",

        // Extended brand gradients
        "brand-gradient-purple": "linear-gradient(135deg, #7c3aed 0%, #843dff 100%)",
        "brand-gradient-pink": "linear-gradient(135deg, #dd4bff 0%, #c026d3 100%)",
        "brand-gradient-blue": "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
        "brand-gradient-dark": "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        "brand-gradient-radial": "radial-gradient(ellipse at center, #2563eb 0%, #7c3aed 100%)",
        "brand-gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, #2563eb 0deg, #dd4bff 120deg, #7c3aed 240deg, #2563eb 360deg)",

        // Three color gradients
        "brand-gradient-triple": "linear-gradient(135deg, #2563eb 0%, #dd4bff 50%, #7c3aed 100%)",
        "brand-gradient-rainbow":
          "linear-gradient(90deg, #2563eb 0%, #7c3aed 25%, #dd4bff 50%, #c026d3 75%, #2563eb 100%)",
      },

      // Typography System
      fontSize: {
        // Headings
        "head-1": ["3.5rem", { lineHeight: "1.1", fontWeight: "800", letterSpacing: "-0.02em" }], // 56px
        "head-2": ["3rem", { lineHeight: "1.15", fontWeight: "700", letterSpacing: "-0.02em" }], // 48px
        "head-3": ["2.5rem", { lineHeight: "1.2", fontWeight: "700", letterSpacing: "-0.01em" }], // 40px
        "head-4": ["2rem", { lineHeight: "1.25", fontWeight: "600", letterSpacing: "-0.01em" }], // 32px
        "head-5": ["1.5rem", { lineHeight: "1.3", fontWeight: "600" }], // 24px
        "head-6": ["1.25rem", { lineHeight: "1.4", fontWeight: "600" }], // 20px

        // Body Text
        "body-1": ["1.125rem", { lineHeight: "1.6", fontWeight: "400" }], // 18px
        "body-2": ["1rem", { lineHeight: "1.6", fontWeight: "400" }], // 16px
        "body-3": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }], // 14px
        "body-4": ["0.75rem", { lineHeight: "1.5", fontWeight: "400" }], // 12px

        // Special
        caption: ["0.75rem", { lineHeight: "1.4", fontWeight: "500" }], // 12px
        overline: [
          "0.75rem",
          { lineHeight: "1.4", fontWeight: "600", letterSpacing: "0.1em" },
        ], // 12px
        button: ["0.875rem", { lineHeight: "1.4", fontWeight: "600" }], // 14px
        label: ["0.875rem", { lineHeight: "1.4", fontWeight: "500" }], // 14px
      },

      // Spacing System
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
        "128": "32rem",
        "144": "36rem",
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        brand: "12px",
        "brand-lg": "16px",
        "brand-xl": "24px",
      },

      // Enhanced Animations & Keyframes
      keyframes: {
        // Existing
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },

        // Brand Animations
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-down": {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-left": {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "fade-in-right": {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "slide-down": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "bounce-in": {
          "0%": { opacity: "0", transform: "scale(0.3)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "gradient-x": {
          "0%, 100%": {
            "background-size": "200% 200%",
            "background-position": "left center",
          },
          "50%": {
            "background-size": "200% 200%",
            "background-position": "right center",
          },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 5px rgba(37, 99, 235, 0.5)" },
          "50%": { boxShadow: "0 0 20px rgba(37, 99, 235, 0.8), 0 0 30px rgba(124, 58, 237, 0.6)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },

      animation: {
        // Existing
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",

        // Brand Animations
        "fade-in": "fade-in 0.5s ease-out",
        "fade-in-up": "fade-in-up 0.6s ease-out",
        "fade-in-down": "fade-in-down 0.6s ease-out",
        "fade-in-left": "fade-in-left 0.6s ease-out",
        "fade-in-right": "fade-in-right 0.6s ease-out",
        "scale-in": "scale-in 0.4s ease-out",
        "slide-up": "slide-up 0.5s ease-out",
        "slide-down": "slide-down 0.5s ease-out",
        "bounce-in": "bounce-in 0.6s ease-out",
        "gradient-shift": "gradient-shift 3s ease infinite",
        "gradient-x": "gradient-x 3s ease infinite",
        float: "float 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        shimmer: "shimmer 2s ease-in-out infinite",

        // Delayed animations
        "fade-in-delay-100": "fade-in 0.5s ease-out 0.1s both",
        "fade-in-delay-200": "fade-in 0.5s ease-out 0.2s both",
        "fade-in-delay-300": "fade-in 0.5s ease-out 0.3s both",
        "fade-in-delay-500": "fade-in 0.5s ease-out 0.5s both",
      },

      // Box Shadows
      boxShadow: {
        brand: "0 4px 14px 0 rgba(37, 99, 235, 0.15)",
        "brand-lg": "0 10px 25px -3px rgba(37, 99, 235, 0.2), 0 4px 6px -2px rgba(124, 58, 237, 0.1)",
        "brand-xl": "0 20px 25px -5px rgba(37, 99, 235, 0.25), 0 10px 10px -5px rgba(124, 58, 237, 0.1)",
        glow: "0 0 20px rgba(37, 99, 235, 0.3)",
        "glow-lg": "0 0 40px rgba(37, 99, 235, 0.4)",
        "glow-purple": "0 0 20px rgba(124, 58, 237, 0.3)",
        "glow-purple-lg": "0 0 40px rgba(124, 58, 237, 0.4)",
      },

      // Backdrop Blur
      backdropBlur: {
        brand: "12px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
