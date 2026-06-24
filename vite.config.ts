import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Vitest reads the `test` key at runtime via its own config loader. We keep it
// out of defineConfig's type-checked object and attach it via a cast, so `tsc -b`
// (typechecks against top-level vite 7 types) stays green without importing
// vitest's config helper — that drags in vitest's nested vite copy and clashes
// with vite 7's types. ponytail: one cast > a dep-version rabbit hole.
const config = {
  plugins: [react(), tailwindcss()],
  test: {
    // Rules/migration tests run in Node against emulators started by
    // `firebase emulators:exec` in npm run verify.
    environment: "node",
    globals: true,
    setupFiles: ["tests/setup/emulatorEnv.ts"],
    // Playwright owns tests/e2e/*; vitest must not try to run those specs.
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"],
    // All test files share ONE emulator + cached env; parallel workers would
    // race on clearFirestore() and clobber each other's data. Run serially.
    fileParallelism: false,
    pool: "threads",
    poolOptions: { threads: { singleThread: true } },
  },
};

export default defineConfig(config as Parameters<typeof defineConfig>[0]);
