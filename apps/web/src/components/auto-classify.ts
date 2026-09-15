import { classifyOne, listCapturas } from "@/components/nova-captura-ingest";
import { isClassificationPending } from "@/lib/domain";

/** Two at a time so a batch does not stampede the VLM. */
const LIMIT = 2;

const queued: string[] = [];
const queuedSet = new Set<string>();
const inFlight = new Set<string>();
let active = 0;

function notifyRefresh(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event("verdia:data-refresh"));
}

async function runOne(id: string): Promise<void> {
  try {
    await classifyOne(id);
    notifyRefresh();
  } catch {
    // Still pending. drainPendingCapturas retries later.
  } finally {
    inFlight.delete(id);
    active -= 1;
    pump();
  }
}

function pump(): void {
  while (active < LIMIT && queued.length > 0) {
    const id = queued.shift();
    if (!id) {
      return;
    }
    queuedSet.delete(id);
    inFlight.add(id);
    active += 1;
    void runOne(id);
  }
}

/** Start or resume classification. Safe to call more than once with the same ids. */
export function enqueueClassify(ids: string[]): void {
  for (const id of ids) {
    if (!id || inFlight.has(id) || queuedSet.has(id)) {
      continue;
    }
    queuedSet.add(id);
    queued.push(id);
  }
  pump();
}

/** Pick up photos that were saved but never classified (closed tab, leftover). */
export async function drainPendingCapturas(): Promise<void> {
  const capturas = await listCapturas();
  enqueueClassify(
    capturas.filter(isClassificationPending).map((captura) => captura.id),
  );
}

/** Drop queued work. In-flight POSTs still finish. Tests only. */
export function resetAutoClassifyForTests(): void {
  queued.length = 0;
  queuedSet.clear();
}
