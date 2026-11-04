"use client";

import clsx from "clsx";
import { Check, Copy, Heart, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { registrarEvento } from "@/components/coleta/Acessos";

// Pix estático (sem valor fixo). QR 49×49 módulos gerado a partir do mesmo código.
const PIX_COPIA_E_COLA = "00020126580014br.gov.bcb.pix013689ef6957-7a16-451f-8f6b-a026331b88545204000053039865802BR5914GABRIEL CARLOS6009SAO PAULO62200516MONITORADEPUTADO630407D9";
const QR_PATH = "M2 2h7v1h-7zM12 2h6v1h-6zM20 2h2v1h-2zM23 2h1v1h-1zM30 2h1v1h-1zM32 2h1v1h-1zM38 2h1v1h-1zM40 2h7v1h-7zM2 3h1v1h-1zM8 3h1v1h-1zM10 3h2v1h-2zM14 3h2v1h-2zM18 3h1v1h-1zM20 3h1v1h-1zM22 3h1v1h-1zM25 3h2v1h-2zM28 3h1v1h-1zM31 3h1v1h-1zM35 3h1v1h-1zM37 3h1v1h-1zM40 3h1v1h-1zM46 3h1v1h-1zM2 4h1v1h-1zM4 4h3v1h-3zM8 4h1v1h-1zM13 4h3v1h-3zM17 4h1v1h-1zM20 4h1v1h-1zM23 4h1v1h-1zM25 4h3v1h-3zM32 4h2v1h-2zM35 4h1v1h-1zM37 4h1v1h-1zM40 4h1v1h-1zM42 4h3v1h-3zM46 4h1v1h-1zM2 5h1v1h-1zM4 5h3v1h-3zM8 5h1v1h-1zM10 5h3v1h-3zM18 5h1v1h-1zM20 5h3v1h-3zM24 5h1v1h-1zM26 5h2v1h-2zM31 5h1v1h-1zM33 5h1v1h-1zM37 5h2v1h-2zM40 5h1v1h-1zM42 5h3v1h-3zM46 5h1v1h-1zM2 6h1v1h-1zM4 6h3v1h-3zM8 6h1v1h-1zM12 6h1v1h-1zM14 6h4v1h-4zM19 6h1v1h-1zM22 6h6v1h-6zM32 6h7v1h-7zM40 6h1v1h-1zM42 6h3v1h-3zM46 6h1v1h-1zM2 7h1v1h-1zM8 7h1v1h-1zM10 7h4v1h-4zM17 7h1v1h-1zM20 7h1v1h-1zM22 7h1v1h-1zM26 7h1v1h-1zM29 7h1v1h-1zM31 7h1v1h-1zM33 7h2v1h-2zM40 7h1v1h-1zM46 7h1v1h-1zM2 8h7v1h-7zM10 8h1v1h-1zM12 8h1v1h-1zM14 8h1v1h-1zM16 8h1v1h-1zM18 8h1v1h-1zM20 8h1v1h-1zM22 8h1v1h-1zM24 8h1v1h-1zM26 8h1v1h-1zM28 8h1v1h-1zM30 8h1v1h-1zM32 8h1v1h-1zM34 8h1v1h-1zM36 8h1v1h-1zM38 8h1v1h-1zM40 8h7v1h-7zM12 9h1v1h-1zM14 9h1v1h-1zM19 9h4v1h-4zM26 9h3v1h-3zM30 9h1v1h-1zM32 9h3v1h-3zM36 9h1v1h-1zM38 9h1v1h-1zM2 10h5v1h-5zM8 10h3v1h-3zM18 10h3v1h-3zM22 10h6v1h-6zM29 10h1v1h-1zM31 10h2v1h-2zM36 10h1v1h-1zM39 10h1v1h-1zM41 10h1v1h-1zM43 10h1v1h-1zM45 10h1v1h-1zM2 11h1v1h-1zM4 11h1v1h-1zM6 11h2v1h-2zM9 11h1v1h-1zM14 11h4v1h-4zM20 11h1v1h-1zM25 11h1v1h-1zM32 11h1v1h-1zM37 11h2v1h-2zM41 11h1v1h-1zM45 11h2v1h-2zM2 12h1v1h-1zM7 12h2v1h-2zM11 12h1v1h-1zM13 12h2v1h-2zM17 12h2v1h-2zM20 12h2v1h-2zM23 12h2v1h-2zM26 12h3v1h-3zM31 12h1v1h-1zM34 12h1v1h-1zM36 12h2v1h-2zM39 12h3v1h-3zM43 12h2v1h-2zM2 13h2v1h-2zM5 13h1v1h-1zM9 13h1v1h-1zM16 13h1v1h-1zM21 13h1v1h-1zM23 13h1v1h-1zM25 13h5v1h-5zM31 13h2v1h-2zM35 13h1v1h-1zM37 13h2v1h-2zM44 13h1v1h-1zM5 14h1v1h-1zM8 14h3v1h-3zM12 14h2v1h-2zM18 14h1v1h-1zM20 14h7v1h-7zM33 14h1v1h-1zM35 14h2v1h-2zM38 14h1v1h-1zM40 14h1v1h-1zM43 14h1v1h-1zM5 15h1v1h-1zM7 15h1v1h-1zM9 15h1v1h-1zM11 15h1v1h-1zM14 15h4v1h-4zM19 15h1v1h-1zM21 15h2v1h-2zM25 15h1v1h-1zM27 15h1v1h-1zM29 15h1v1h-1zM32 15h1v1h-1zM37 15h2v1h-2zM41 15h2v1h-2zM44 15h3v1h-3zM2 16h1v1h-1zM5 16h1v1h-1zM8 16h1v1h-1zM12 16h2v1h-2zM15 16h1v1h-1zM19 16h2v1h-2zM22 16h3v1h-3zM26 16h1v1h-1zM29 16h1v1h-1zM31 16h1v1h-1zM33 16h3v1h-3zM37 16h5v1h-5zM3 17h1v1h-1zM6 17h2v1h-2zM10 17h2v1h-2zM20 17h2v1h-2zM25 17h3v1h-3zM30 17h1v1h-1zM32 17h3v1h-3zM38 17h1v1h-1zM42 17h1v1h-1zM44 17h3v1h-3zM2 18h2v1h-2zM6 18h3v1h-3zM10 18h4v1h-4zM18 18h4v1h-4zM23 18h1v1h-1zM25 18h5v1h-5zM31 18h1v1h-1zM33 18h1v1h-1zM35 18h2v1h-2zM41 18h1v1h-1zM43 18h1v1h-1zM3 19h1v1h-1zM13 19h1v1h-1zM15 19h3v1h-3zM20 19h3v1h-3zM24 19h2v1h-2zM27 19h1v1h-1zM32 19h2v1h-2zM35 19h1v1h-1zM37 19h2v1h-2zM41 19h1v1h-1zM45 19h2v1h-2zM2 20h1v1h-1zM4 20h1v1h-1zM6 20h4v1h-4zM11 20h1v1h-1zM14 20h1v1h-1zM18 20h3v1h-3zM26 20h1v1h-1zM28 20h4v1h-4zM34 20h3v1h-3zM39 20h4v1h-4zM44 20h1v1h-1zM2 21h3v1h-3zM6 21h2v1h-2zM9 21h1v1h-1zM12 21h1v1h-1zM14 21h1v1h-1zM18 21h1v1h-1zM21 21h1v1h-1zM23 21h1v1h-1zM26 21h3v1h-3zM32 21h1v1h-1zM35 21h3v1h-3zM39 21h1v1h-1zM41 21h1v1h-1zM44 21h1v1h-1zM3 22h2v1h-2zM6 22h8v1h-8zM18 22h1v1h-1zM20 22h1v1h-1zM22 22h7v1h-7zM32 22h2v1h-2zM38 22h6v1h-6zM3 23h2v1h-2zM6 23h1v1h-1zM10 23h1v1h-1zM12 23h1v1h-1zM14 23h4v1h-4zM19 23h1v1h-1zM22 23h1v1h-1zM26 23h1v1h-1zM29 23h1v1h-1zM32 23h1v1h-1zM34 23h1v1h-1zM38 23h1v1h-1zM42 23h1v1h-1zM44 23h3v1h-3zM2 24h5v1h-5zM8 24h1v1h-1zM10 24h1v1h-1zM12 24h3v1h-3zM17 24h1v1h-1zM19 24h4v1h-4zM24 24h1v1h-1zM26 24h4v1h-4zM31 24h1v1h-1zM35 24h1v1h-1zM37 24h2v1h-2zM40 24h1v1h-1zM42 24h1v1h-1zM44 24h1v1h-1zM2 25h1v1h-1zM4 25h1v1h-1zM6 25h1v1h-1zM10 25h4v1h-4zM17 25h4v1h-4zM22 25h1v1h-1zM26 25h1v1h-1zM30 25h3v1h-3zM34 25h1v1h-1zM36 25h1v1h-1zM38 25h1v1h-1zM42 25h1v1h-1zM44 25h1v1h-1zM2 26h2v1h-2zM6 26h9v1h-9zM17 26h1v1h-1zM19 26h2v1h-2zM22 26h6v1h-6zM29 26h1v1h-1zM33 26h1v1h-1zM35 26h9v1h-9zM2 27h1v1h-1zM6 27h1v1h-1zM10 27h2v1h-2zM14 27h3v1h-3zM19 27h3v1h-3zM24 27h1v1h-1zM26 27h1v1h-1zM29 27h2v1h-2zM32 27h1v1h-1zM37 27h1v1h-1zM39 27h1v1h-1zM43 27h4v1h-4zM5 28h1v1h-1zM7 28h9v1h-9zM17 28h1v1h-1zM20 28h1v1h-1zM24 28h2v1h-2zM27 28h2v1h-2zM31 28h1v1h-1zM35 28h2v1h-2zM38 28h1v1h-1zM41 28h2v1h-2zM2 29h1v1h-1zM4 29h1v1h-1zM6 29h2v1h-2zM9 29h1v1h-1zM14 29h1v1h-1zM19 29h1v1h-1zM21 29h1v1h-1zM26 29h2v1h-2zM29 29h2v1h-2zM32 29h2v1h-2zM37 29h5v1h-5zM44 29h1v1h-1zM3 30h1v1h-1zM5 30h1v1h-1zM7 30h4v1h-4zM13 30h1v1h-1zM18 30h1v1h-1zM20 30h1v1h-1zM22 30h1v1h-1zM26 30h1v1h-1zM28 30h2v1h-2zM32 30h2v1h-2zM38 30h1v1h-1zM42 30h2v1h-2zM4 31h4v1h-4zM9 31h4v1h-4zM14 31h4v1h-4zM19 31h1v1h-1zM22 31h2v1h-2zM25 31h2v1h-2zM30 31h1v1h-1zM32 31h2v1h-2zM37 31h3v1h-3zM41 31h1v1h-1zM44 31h3v1h-3zM2 32h1v1h-1zM5 32h1v1h-1zM8 32h1v1h-1zM10 32h2v1h-2zM14 32h2v1h-2zM17 32h1v1h-1zM20 32h1v1h-1zM22 32h4v1h-4zM27 32h2v1h-2zM30 32h2v1h-2zM35 32h1v1h-1zM38 32h1v1h-1zM43 32h2v1h-2zM2 33h2v1h-2zM7 33h1v1h-1zM12 33h1v1h-1zM14 33h5v1h-5zM20 33h1v1h-1zM23 33h1v1h-1zM26 33h1v1h-1zM30 33h1v1h-1zM33 33h3v1h-3zM39 33h2v1h-2zM44 33h3v1h-3zM3 34h2v1h-2zM7 34h4v1h-4zM12 34h1v1h-1zM14 34h2v1h-2zM17 34h1v1h-1zM19 34h3v1h-3zM26 34h2v1h-2zM29 34h1v1h-1zM32 34h2v1h-2zM35 34h2v1h-2zM38 34h1v1h-1zM40 34h1v1h-1zM42 34h2v1h-2zM3 35h1v1h-1zM6 35h1v1h-1zM11 35h1v1h-1zM13 35h1v1h-1zM19 35h6v1h-6zM26 35h1v1h-1zM29 35h2v1h-2zM32 35h1v1h-1zM34 35h1v1h-1zM39 35h1v1h-1zM41 35h1v1h-1zM43 35h4v1h-4zM6 36h1v1h-1zM8 36h2v1h-2zM12 36h1v1h-1zM20 36h1v1h-1zM24 36h2v1h-2zM27 36h2v1h-2zM31 36h1v1h-1zM33 36h4v1h-4zM41 36h1v1h-1zM43 36h2v1h-2zM3 37h4v1h-4zM9 37h1v1h-1zM12 37h2v1h-2zM17 37h1v1h-1zM19 37h1v1h-1zM21 37h2v1h-2zM24 37h1v1h-1zM26 37h1v1h-1zM29 37h1v1h-1zM36 37h2v1h-2zM39 37h3v1h-3zM44 37h1v1h-1zM2 38h1v1h-1zM5 38h2v1h-2zM8 38h1v1h-1zM12 38h2v1h-2zM18 38h1v1h-1zM20 38h1v1h-1zM22 38h5v1h-5zM28 38h1v1h-1zM31 38h3v1h-3zM35 38h1v1h-1zM38 38h6v1h-6zM46 38h1v1h-1zM10 39h2v1h-2zM14 39h4v1h-4zM19 39h1v1h-1zM22 39h1v1h-1zM26 39h1v1h-1zM31 39h5v1h-5zM38 39h1v1h-1zM42 39h1v1h-1zM44 39h3v1h-3zM2 40h7v1h-7zM10 40h3v1h-3zM14 40h2v1h-2zM17 40h4v1h-4zM22 40h1v1h-1zM24 40h1v1h-1zM26 40h4v1h-4zM31 40h2v1h-2zM35 40h4v1h-4zM40 40h1v1h-1zM42 40h1v1h-1zM2 41h1v1h-1zM8 41h1v1h-1zM11 41h1v1h-1zM14 41h1v1h-1zM17 41h1v1h-1zM19 41h4v1h-4zM26 41h2v1h-2zM29 41h2v1h-2zM34 41h2v1h-2zM38 41h1v1h-1zM42 41h1v1h-1zM44 41h2v1h-2zM2 42h1v1h-1zM4 42h3v1h-3zM8 42h1v1h-1zM10 42h2v1h-2zM14 42h1v1h-1zM17 42h1v1h-1zM19 42h2v1h-2zM22 42h5v1h-5zM28 42h1v1h-1zM31 42h2v1h-2zM36 42h1v1h-1zM38 42h6v1h-6zM45 42h1v1h-1zM2 43h1v1h-1zM4 43h3v1h-3zM8 43h1v1h-1zM10 43h1v1h-1zM12 43h1v1h-1zM14 43h3v1h-3zM19 43h2v1h-2zM22 43h1v1h-1zM25 43h2v1h-2zM31 43h2v1h-2zM34 43h1v1h-1zM37 43h1v1h-1zM39 43h1v1h-1zM42 43h1v1h-1zM45 43h1v1h-1zM2 44h1v1h-1zM4 44h3v1h-3zM8 44h1v1h-1zM10 44h5v1h-5zM17 44h1v1h-1zM20 44h4v1h-4zM25 44h1v1h-1zM28 44h1v1h-1zM35 44h2v1h-2zM38 44h1v1h-1zM41 44h1v1h-1zM44 44h1v1h-1zM46 44h1v1h-1zM2 45h1v1h-1zM8 45h1v1h-1zM10 45h1v1h-1zM19 45h4v1h-4zM25 45h1v1h-1zM29 45h1v1h-1zM32 45h1v1h-1zM35 45h1v1h-1zM37 45h3v1h-3zM41 45h2v1h-2zM44 45h1v1h-1zM2 46h7v1h-7zM10 46h1v1h-1zM12 46h2v1h-2zM17 46h4v1h-4zM23 46h2v1h-2zM26 46h1v1h-1zM28 46h1v1h-1zM31 46h1v1h-1zM33 46h1v1h-1zM35 46h1v1h-1zM38 46h1v1h-1zM40 46h1v1h-1zM43 46h1v1h-1zM45 46h1v1h-1z";

export function ApoiePix({ compacto = false }: { compacto?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const fechar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("keydown", tecla);
    document.body.style.overflow = "hidden";
    fechar.current?.focus();
    return () => { document.removeEventListener("keydown", tecla); document.body.style.overflow = ""; };
  }, [aberto]);

  async function copiar() {
    try { await navigator.clipboard.writeText(PIX_COPIA_E_COLA); }
    catch {
      const t = document.createElement("textarea");
      t.value = PIX_COPIA_E_COLA; document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); } catch {}
      t.remove();
    }
    setCopiado(true); registrarEvento("pix", "copiar");
    setTimeout(() => setCopiado(false), 2200);
  }

  return (
    <>
      <button type="button" onClick={() => { setAberto(true); registrarEvento("pix", "abrir"); }}
        className={clsx("brilho-varre relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-[#ffdf00] font-bold text-[#002776] shadow-[0_2px_14px_rgb(255_223_0/0.45)] transition hover:scale-[1.04] hover:shadow-[0_4px_22px_rgb(255_223_0/0.65)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
          compacto ? "h-9 px-3 text-xs" : "h-9 px-4 text-sm")}>
        <Heart size={15} aria-hidden className="batida fill-[#e11d48] text-[#e11d48]" />
        <span>{compacto ? "Apoie" : "Apoie o projeto"}</span>
        <span className="rounded bg-[#002776] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#ffdf00]">Pix</span>
      </button>
      {aberto ? (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="pix-titulo">
          <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setAberto(false)} />
          <div className="subir cartao relative w-full max-w-sm overflow-hidden rounded-2xl text-center shadow-2xl">
            <span aria-hidden className="faixa-bandeira-h block h-1.5" />
            <button ref={fechar} type="button" onClick={() => setAberto(false)} aria-label="Fechar"
              className="absolute right-3 top-4 rounded-lg p-1.5 opacity-70 hover:bg-black/10 hover:opacity-100"><X size={18} /></button>
            <div className="p-6">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#e11d48]/10"><Heart size={24} aria-hidden className="batida fill-[#e11d48] text-[#e11d48]" /></span>
              <h2 id="pix-titulo" className="font-display mt-3 text-2xl uppercase tracking-wide">Apoie o projeto</h2>
              <p className="mt-2 text-sm opacity-80">
                O MonitoraDeputado é <strong>gratuito, independente e sem anúncios</strong>. Sua contribuição em Pix ajuda a manter os dados
                atualizados todo dia e o site no ar.
              </p>
              <div className="mx-auto mt-4 w-52 rounded-xl border border-black/10 bg-white p-2 shadow-inner">
                <svg viewBox="-4 -4 57 57" role="img" aria-label="QR Code do Pix" shapeRendering="crispEdges" className="h-auto w-full">
                  <rect x="-4" y="-4" width="57" height="57" fill="#fff" />
                  <path d={QR_PATH} fill="#000" />
                </svg>
              </div>
              <p className="mt-2 text-xs opacity-70">Abra o app do seu banco, escolha Pix e leia o QR Code. Você define o valor.</p>
              <button type="button" onClick={copiar}
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#009c3b] px-4 text-sm font-bold text-white transition hover:brightness-110">
                {copiado ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
                {copiado ? "Código copiado!" : "Copiar Pix Copia e Cola"}
              </button>
              <p className="mt-3 text-[11px] opacity-60">Favorecido: Gabriel Carlos. Obrigado por fortalecer a fiscalização cidadã.</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
