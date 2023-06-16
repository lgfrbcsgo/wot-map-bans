import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import checkerPlugin from "vite-plugin-checker"
import { imagetools } from "vite-imagetools"

export default defineConfig({
  plugins: [solidPlugin(), checkerPlugin({ typescript: true }), imagetools()],
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
  },
})
