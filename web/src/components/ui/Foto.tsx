/* eslint-disable @next/next/no-img-element */
export function Foto({ src, nome, tamanho = 48 }: { src: string | null; nome: string; tamanho?: number }) {
  const iniciais = nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return src ? (
    <img src={src} alt={`Foto de ${nome}`} width={tamanho} height={tamanho} loading="lazy"
      className="shrink-0 rounded-full border border-border object-cover" style={{ width: tamanho, height: tamanho }} />
  ) : (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full bg-verde/15 font-semibold text-destaque"
      style={{ width: tamanho, height: tamanho, fontSize: tamanho / 2.8 }}>{iniciais}</span>
  );
}
