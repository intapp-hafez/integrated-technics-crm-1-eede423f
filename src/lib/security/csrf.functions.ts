import { createServerFn } from "@tanstack/react-start";

export const getCsrfToken = createServerFn({ method: "GET" }).handler(async () => {
  const { getCookie, setCookie } = await import("@tanstack/react-start/server");
  const { randomBytes } = await import("crypto");
  const existing = getCookie("x-csrf-token");
  if (existing) return { token: existing };
  const token = randomBytes(24).toString("hex");
  setCookie("x-csrf-token", token, {
    httpOnly: false,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return { token };
});
