import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as login } from "@/app/api/auth/login/route";
import { proxy } from "@/proxy";
import { SESSION_COOKIE } from "@/lib/auth";

describe("password gate (product read surface)", () => {
  beforeEach(() => {
    process.env.DEMO_PASSWORD = "verdia-demo";
  });

  it("blocks unauthenticated access to the app", async () => {
    const request = new NextRequest("http://localhost:3000/");
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
  });

  it("grants access after the correct shared password", async () => {
    const loginRequest = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "verdia-demo" }),
    });
    const loginResponse = await login(loginRequest);

    expect(loginResponse.status).toBe(200);
    const session = loginResponse.cookies.get(SESSION_COOKIE);
    expect(session?.value).toBeTruthy();

    const request = new NextRequest("http://localhost:3000/", {
      headers: { cookie: `${SESSION_COOKIE}=${session!.value}` },
    });
    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
