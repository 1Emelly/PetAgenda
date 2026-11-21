import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/tests/**/*.test.ts"],

    setupFiles: ["src/tests/setup.ts"],

    fileParallelism: false,

    env: {
      DB_NAME: "petagenda_test",
      NODE_ENV: "test"
    }
  }
});