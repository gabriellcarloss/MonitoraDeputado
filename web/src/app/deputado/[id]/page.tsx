import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Perfil } from "@/components/deputado/Perfil";
import { getDeputado, getDeputadoIds } from "@/lib/data";
import { resumoDeputado } from "@/lib/resumo";

export const dynamicParams = false;

export function generateStaticParams() {
  const ids = getDeputadoIds();
  return ids.length ? ids.map((id) => ({ id: String(id) })) : [{ id: "0" }];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const d = getDeputado((await params).id);
  if (!d) return { title: "Deputado" };
  const titulo = `${d.deputado.nome} (${d.deputado.partido_atual}-${d.deputado.uf})`;
  const descricao = resumoDeputado(d);
  const url = `/deputado/${d.deputado.id}/`;
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: url },
    openGraph: { type: "profile", url, title: `${titulo} · MonitoraDeputado`, description: descricao, siteName: "MonitoraDeputado", locale: "pt_BR",
      images: d.deputado.foto ? [{ url: d.deputado.foto, alt: d.deputado.nome }] : [{ url: "/og.png", width: 1200, height: 630 }] },
    twitter: { card: "summary", title: titulo, description: descricao, images: [d.deputado.foto ?? "/og.png"] },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const d = getDeputado((await params).id);
  if (!d) notFound();
  return <Perfil d={d} total={getDeputadoIds().length} />;
}
