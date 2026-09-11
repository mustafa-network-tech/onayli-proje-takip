"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { ProjectLocation } from "@/lib/project-lookup";

export default function ProjectTypeNotice({ query, current }: { query?: string; current: "GF" | "BF" | "HP" | "KURUMSAL" }) {
  const [result, setResult] = useState<{ query: string; projects: ProjectLocation[]; error?: string }>();
  useEffect(() => {
    if (!query?.trim()) return;
    const controller = new AbortController();
    fetch(`/api/project-lookup?${new URLSearchParams({ q: query })}`, { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult({ query, projects: data.projects });
    }).catch(error => { if (!controller.signal.aborted) setResult({ query, projects: [], error: "Diğer proje türleri kontrol edilemedi. Sayfayı yenileyerek tekrar deneyin." }); });
    return () => controller.abort();
  }, [query]);
  if (!query || result?.query !== query) return null;
  const others = result.projects.filter(p => current === "HP" ? p.projectType !== "GF" && p.projectType !== "BF" : p.projectType !== current);
  return <>{result.error && <p role="status" className="muted">{result.error}</p>}{others.map(p => <p className="card" role="status" key={`${p.projectType}-${p.id}`}>
    <b>{p.projectId}</b>: Bu proje {p.projectType === "KURUMSAL" ? "Kurumsal" : p.projectType} projesidir. {" "}
    <Link className="button" href={p.projectType === "KURUMSAL" ? `/corporate?${new URLSearchParams({ q: p.projectId })}` : `/projects/${p.projectType}/${encodeURIComponent(p.id)}`}>Projeyi Aç</Link>
  </p>)}</>;
}
