import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: {
    "@": fileURLToPath(new URL(".", import.meta.url)),
    // Match the application's webpack alias.
    pdfkit: fileURLToPath(new URL("./lib/pdfkit-disabled.ts", import.meta.url)),
  } },
});
