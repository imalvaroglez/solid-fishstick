// Shared test environment for rules tests. Both firestore and storage rules
// suites initialize the SAME env (same projectId, both services configured) via
// this helper, because @firebase/rules-unit-testing caches the env per project.
// If one suite initialized an env WITHOUT storage config, the storage suite's
// uploads would hit a half-configured cached env and fail with storage/unknown.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

export type { RulesTestEnvironment };

const PROJECT_ID = "demo-solid-fishstick";

let cached: RulesTestEnvironment | null = null;

export async function getTestEnv(): Promise<RulesTestEnvironment> {
  if (cached) return cached;
  cached = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 28086,
    },
    storage: {
      rules: readFileSync(resolve(process.cwd(), "storage.rules"), "utf8"),
      host: "127.0.0.1",
      port: 29196,
    },
  });
  return cached;
}

// vitest runs files in the same worker, so the cached env persists across files.
// We intentionally do NOT call env.cleanup() per-file — that would tear down the
// shared env mid-run. The emulator process itself is stopped by the vitest global
// outer `firebase emulators:exec` process.
export const PROJECT = PROJECT_ID;
