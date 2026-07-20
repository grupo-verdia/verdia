import type { Captura } from "@/lib/domain";
import { getCapturaStore } from "@/lib/persistence";

/** Product read surface: capturas visible on the password-gated dashboard. */
export async function loadDashboardCapturas(): Promise<Captura[]> {
  return getCapturaStore().listCapturas();
}
