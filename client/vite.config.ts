import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import checkerPlugin from "vite-plugin-checker"

export default defineConfig({
  plugins: [solidPlugin(), checkerPlugin({ typescript: true })],
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
  },
})
