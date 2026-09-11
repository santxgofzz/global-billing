import "server-only";

import { cookies } from "next/headers";

type Session = { authenticated: boolean };

export async function hasAuthenticatedSession(): Promise<boolean> {
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader.includes("sessionid=")) return false;

  const backend = (process.env.BACKEND_INTERNAL_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
  try {
    const response = await fetch(`${backend}/api/v1/auth/session/`, {
      cache: "no-store",
      redirect: "manual",
      headers: {
        Cookie: cookieHeader,
        Host: "backend",
        "X-Forwarded-Proto": "https",
      },
    });
    if (!response.ok) return false;
    return ((await response.json()) as Session).authenticated === true;
  } catch {
    return false;
  }
}
