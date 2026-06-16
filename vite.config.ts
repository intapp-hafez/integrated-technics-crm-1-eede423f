import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";

// Target: a single static `dist/` directory for IIS hosting.
export default defineConfig({
  resolve: {
    alias: {
      "@": "/src",
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core"
    ]
  },
  plugins: [
    tsconfigPaths(),
    tanstackStart({
      server: { entry: "server" },
      spa: {
        enabled: true,
        prerender: { outputPath: "/index.html" },
      },
    }),
    tailwindcss(),
    react(),
  ],
});
