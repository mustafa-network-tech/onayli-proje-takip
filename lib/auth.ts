import { db } from "./db";
export async function requireUser(request?: Request) {
  const id = request?.headers.get("x-user-id");
  if (id) { const user = await db.user.findUnique({ where: { id } }); if (user) return user; }
  const user = await db.user.findUnique({ where: { email: "operator@local.test" } });
  if (!user) throw new Error("Yetkili kullanıcı bulunamadı. Önce db:seed çalıştırın.");
  return user;
}
