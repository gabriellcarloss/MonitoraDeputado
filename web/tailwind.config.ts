import type { Config } from "tailwindcss";

const v = (n: string) => `rgb(var(--${n}) / <alpha-value>)`;

export default {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"), fg: v("fg"), muted: v("muted"), card: v("card"), border: v("border"), subtle: v("subtle"),
        verde: v("verde"), amarelo: v("amarelo"), azul: v("azul"), destaque: v("destaque"),
        info: v("info"), atencao: v("atencao"), alta: v("alta"),
      },
      fontFamily: { sans: ["Inter Variable", "Inter", "system-ui", "sans-serif"], display: ["Anton", "Impact", "sans-serif"] },
    },
  },
} satisfies Config;
