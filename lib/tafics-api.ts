import { requireUser } from "./auth";

export async function taficsAuthorization(request: Request) {
  try { await requireUser(request); return null; }
  catch { return Response.json({ error: "Oturum doğrulanamadı. Lütfen yeniden giriş yapın." }, { status: 401 }); }
}
export function taficsApiError(error: unknown, message: string) {
  if (error instanceof SyntaxError) return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  return Response.json({ error: message }, { status: 500 });
}
