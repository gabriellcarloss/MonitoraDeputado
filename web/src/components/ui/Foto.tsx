/* eslint-disable @next/next/no-img-element */
export function Foto({ src, nome, tamanho = 48, sobreEscuro = false }: { src: string | null; nome: string; tamanho?: number; sobreEscuro?: boolean }) {
  const iniciais = nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return src ? (
    <img src={src} alt={`Foto de ${nome}`} width={tamanho} height={tamanho} loading="lazy"
      className="shrink-0 rounded-full border border-border object-cover" style={{ width: tamanho, height: tamanho }} />
  ) : (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full font-semibold ${sobreEscuro ? "bg-white text-[#1f6644]" : "bg-verde/15 text-destaque"}`}
      style={{ width: tamanho, height: tamanho, fontSize: tamanho / 2.8 }}>{iniciais}</span>
  );
}
