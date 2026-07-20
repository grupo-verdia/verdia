export const SESSION_COOKIE = "verdia_session";

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return toHex(digest);
}

/** Deterministic session token for the shared demo password. */
export async function sessionTokenForPassword(password: string): Promise<string> {
  return sha256Hex(`verdia-session:${password}`);
}

export async function isValidSessionToken(
  token: string | undefined,
): Promise<boolean> {
  const password = process.env.DEMO_PASSWORD;
  if (!password || !token) {
    return false;
  }
  const expected = await sessionTokenForPassword(password);
  return token === expected;
}

export function passwordsMatch(candidate: string): boolean {
  const expected = process.env.DEMO_PASSWORD;
  if (!expected) {
    return false;
  }
  return candidate === expected;
}
