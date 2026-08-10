import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { resetVerdiaStoreForTests } from "@/lib/verdia-store";

/** Isolate each test from Excel/local `.data` and Supabase env. */
export async function isolateVerdiaStore() {
  process.env.VERDIA_LOCAL_DATA_PATH = path.join(
    mkdtempSync(path.join(tmpdir(), "verdia-test-")),
    "data.json",
  );
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
  await resetVerdiaStoreForTests();
}
