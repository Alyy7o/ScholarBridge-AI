import type { Config } from "tailwindcss";

/**
 * Tailwind is scoped to the marketing/hero components. Preflight (Tailwind's
 * global CSS reset) is DISABLED so it can coexist with the app's existing
 * hand-written styles in globals.css without resetting the dashboard, forms
 * or tables. Utilities still work everywhere they're used.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        acc: "#22d3ee",
        acc2: "#38bdf8",
        ink: "#f2f3f5",
      },
    },
  },
  plugins: [],
};

export default config;
