import { db } from "./db";
import { SESSION_COOKIE, verifySessionToken } from "./session";

function readCookie(request: Request, name: string) {
  const cookies = request.headers.get("cookie") ?? "";
  for (const item of cookies.split(";")) {
    const [key, ...value] = item.trim().split("=");
    if (key === name) return value.join("=");
  }
  return undefined;
}

export async function requireUser(request?: Request) {
  const secret = process.env.SESSION_SECRET ?? "";
  const token = request ? readCookie(request, SESSION_COOKIE) : undefined;
  if (!request || !(await verifySessionToken(token, secret))) {
    throw new Error("Oturum gerekli");
  }
  return db.user.upsert({
    where: { email: "operator@local.test" },
    update: { name: "Operatör" },
    create: { id: "operator-cloudflare", name: "Operatör", email: "operator@local.test" },
  });
}
