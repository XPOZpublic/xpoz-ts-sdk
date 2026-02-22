import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 660_000,
    hookTimeout: 660_000,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
