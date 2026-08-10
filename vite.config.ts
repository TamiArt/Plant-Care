import {
  defineConfig,
} from "vite";

import tailwindcss from "@tailwindcss/vite";

import react from "@vitejs/plugin-react";


const SRC_URL =
  new URL(
    "./src/",
    import.meta.url,
  );


function figmaAssetResolver() {
  return {
    name:
      "figma-asset-resolver",

    resolveId(
      id: string,
    ) {
      if (
        !id.startsWith(
          "figma:asset/",
        )
      ) {
        return null;
      }

      const filename =
        id.replace(
          "figma:asset/",
          "",
        );

      return new URL(
        `./src/assets/${filename}`,
        import.meta.url,
      ).pathname;
    },
  };
}


export default defineConfig({
  plugins: [
    figmaAssetResolver(),

    /*
     * React и Tailwind нужны
     * текущему проекту.
     */
    react(),
    tailwindcss(),
  ],


  resolve: {
    alias: {
      "@":
        SRC_URL.pathname,
    },
  },


  /**
   * ЛОКАЛЬНАЯ разработка.
   *
   * Frontend всегда обращается
   * только к /api.
   *
   * Vite:
   *
   * /api/*
   *      ↓
   * localhost:8787/api/*
   *
   * В production этот proxy
   * не используется.
   *
   * Там /api проксирует Vercel.
   */
  server: {
    proxy: {
      "/api": {
        target:
          "http://localhost:8787",

        changeOrigin:
          true,
      },
    },
  },


  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": [
            "react",
            "react-dom",
          ],

          motion: [
            "motion/react",
          ],

          icons: [
            "lucide-react",
          ],
        },
      },
    },
  },


  /*
   * Не добавлять сюда
   * .css / .ts / .tsx.
   */
  assetsInclude: [
    "**/*.svg",
    "**/*.csv",
  ],
});