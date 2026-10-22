"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Tema = "claro" | "escuro" | "sistema";
const CHAVE = "tema";

/** Script inline no <head>: aplica o tema antes da pintura para não piscar. */
export const scriptTema = `(function(){try{var t=localStorage.getItem('${CHAVE}')||'sistema';var e=t==='escuro'||(t==='sistema'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=e?'dark':'light'}catch(_){document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}})()`;

function aplicar(t: Tema) {
  const escuro = t === "escuro" || (t === "sistema" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = escuro ? "dark" : "light";
  window.dispatchEvent(new Event("tema"));
}

export function ThemeToggle() {
  const [tema, setTema] = useState<Tema>("sistema");
  useEffect(() => {
    try {
      setTema((localStorage.getItem(CHAVE) as Tema) || "sistema");
    } catch {}
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      let t: Tema = "sistema";
      try { t = (localStorage.getItem(CHAVE) as Tema) || "sistema"; } catch {}
      if (t === "sistema") aplicar("sistema");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const ciclo: Tema[] = ["claro", "escuro", "sistema"];
  const prox = ciclo[(ciclo.indexOf(tema) + 1) % 3];
  const Icone = tema === "claro" ? Sun : tema === "escuro" ? Moon : Monitor;
  return (
    <button
      type="button"
      onClick={() => {
        setTema(prox);
        try { localStorage.setItem(CHAVE, prox); } catch {}
        aplicar(prox);
      }}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm text-muted hover:text-fg"
      aria-label={`Tema: ${tema}. Mudar para ${prox}`}
      title={`Tema: ${tema}`}
    >
      <Icone size={16} aria-hidden />
      <span className="hidden sm:inline capitalize">{tema}</span>
    </button>
  );
}
