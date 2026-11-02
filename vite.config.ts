import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // PIN hashing is deliberately slow, and some tests hash several in a row.
  test: { testTimeout: 30000 },
  server: { port: 5199, strictPort: true, proxy: { "/api": "http://localhost:8787" } },
});
