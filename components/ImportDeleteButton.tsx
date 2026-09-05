"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ImportDeleteButton({ id, fileName }: { id: string; fileName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (busy || !confirm(`"${fileName}" importu ve bu dosyaya ait TÜM proje, bina, not ve geçmiş kayıtları kalıcı olarak silinecek. Devam edilsin mi?`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/imports/${encodeURIComponent(id)}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? "Silme işlemi başarısız. Lütfen tekrar deneyin.");
      if (!result?.ok) throw new Error("Sunucudan geçerli yanıt alınamadı. Sayfayı yenileyip tekrar deneyin.");
      alert(`${result.projects} proje ve ${result.buildings} bina silindi.`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Silme işlemi başarısız. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button type="button" onClick={remove} disabled={busy} style={{ background: "#a63d40" }}>{busy ? "Siliniyor…" : "Dosyayı ve Verileri Sil"}</button>
    {error && <p className="error" role="alert">{error}</p>}
  </>;
}
