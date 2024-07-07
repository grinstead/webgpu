import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [solid(), dts({ rollupTypes: true })],

  build: {
    lib: {
      entry: "src/exports.ts",
      name: "WebGPU",
      fileName: "webgpu",
    },
    rollupOptions: {
      external: ["solid-js"],
    },
  },
});
