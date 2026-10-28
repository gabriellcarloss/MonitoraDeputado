"use client";

import { Link2, MessageCircle, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { SITE_URL } from "@/lib/site";

/** Endereços de compartilhamento com o texto já pronto. */
export function linksCompartilhar(texto: string, url: string) {
  const t = encodeURIComponent(texto);
  const u = encodeURIComponent(url);
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`,
    x: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
  };
}

/** Compartilhar a página de um deputado: WhatsApp, X, LinkedIn e copiar o link (ou a folha nativa do celular). */
export function Compartilhar({ texto, caminho }: { texto: string; caminho: string }) {
  const [copiado, setCopiado] = useState(false);
  const [temNativo, setTemNativo] = useState(false);
  useEffect(() => setTemNativo("share" in navigator), []);
  // endereço público fixo (o mesmo no servidor e no navegador, sem diferença de hidratação)
  const url = () => `${SITE_URL}${caminho}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {}
  }
  async function nativo() {
    try { await navigator.share({ title: document.title, text: texto, url: url() }); } catch {}
  }

  const links = linksCompartilhar(texto, url());
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Compartilhar esta página">
      <span className="flex items-center gap-1 text-xs font-semibold text-muted"><Share2 size={14} aria-hidden /> Compartilhar</span>
      <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className="pilula h-8 px-3 text-xs"><MessageCircle size={14} aria-hidden /> WhatsApp</a>
      <a href={links.x} target="_blank" rel="noopener noreferrer" className="pilula h-8 px-3 text-xs">X</a>
      <a href={links.linkedin} target="_blank" rel="noopener noreferrer" className="pilula h-8 px-3 text-xs">LinkedIn</a>
      <button type="button" onClick={copiar} className="pilula h-8 px-3 text-xs"><Link2 size={14} aria-hidden /> {copiado ? "Link copiado!" : "Copiar link"}</button>
      {temNativo ? (
        <button type="button" onClick={nativo} className="pilula h-8 px-3 text-xs sm:hidden">Mais…</button>
      ) : null}
    </div>
  );
}
