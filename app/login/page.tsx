"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: data.get("password") }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setError(result.error ?? "Giriş başarısız"); setBusy(false); return; }
    const destination = params.get("next");
    window.location.assign(destination?.startsWith("/") ? destination : "/");
  }
  return <main className="main" style={{maxWidth:480,margin:"10vh auto"}}><form className="card" onSubmit={submit}><h1>Giriş</h1><p className="muted">HP Odaklı Projeler paneline devam etmek için şifrenizi girin.</p><label>Şifre<input type="password" name="password" autoComplete="current-password" required autoFocus/></label>{error&&<p className="error">{error}</p>}<p><button disabled={busy}>{busy?"Kontrol ediliyor…":"Giriş Yap"}</button></p></form></main>;
}

export default function LoginPage() { return <Suspense><LoginForm/></Suspense>; }
