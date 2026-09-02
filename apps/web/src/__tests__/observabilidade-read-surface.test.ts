import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as login } from "@/app/api/auth/login/route";
import { SESSION_COOKIE } from "@/lib/auth";
import { createMemoryStore, setCapturaStore } from "@/lib/persistence";
import { proxy } from "@/proxy";

describe("observabilidade access", () => {
  beforeEach(() => {
    setCapturaStore(createMemoryStore());
    process.env.DEMO_PASSWORD = "verdia-demo";
  });

  it("blocks unauthenticated access to /observabilidade", async () => {
    const request = new NextRequest("http://localhost:3000/observabilidade");
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
  });

  it("grants access to /observabilidade after the shared password", async () => {
    const loginResponse = await login(
      new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "verdia-demo" }),
      }),
    );
    const session = loginResponse.cookies.get(SESSION_COOKIE);
    expect(session?.value).toBeTruthy();

    const response = await proxy(
      new NextRequest("http://localhost:3000/observabilidade", {
        headers: { cookie: `${SESSION_COOKIE}=${session!.value}` },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
