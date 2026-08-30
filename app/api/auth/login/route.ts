import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, verifyPassword } from "@/lib/session";

export async function POST(request: Request) {
  const password = process.env.APP_PASSWORD ?? "";
  const sessionSecret = process.env.SESSION_SECRET ?? "";
  if (!password || !sessionSecret) return Response.json({ error: "Sunucu giriş ayarları eksik" }, { status: 503 });
  const body = await request.json().catch(() => null) as { password?: unknown } | null;
  const provided = typeof body?.password === "string" ? body.password : "";
  if (!(await verifyPassword(provided, password))) return Response.json({ error: "Şifre hatalı" }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(sessionSecret), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 7 * 24 * 60 * 60,
  });
  return response;
}
