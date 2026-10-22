import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Perfil } from "@/components/deputado/Perfil";
import { Carregando } from "@/components/ui/StatTile";
import { getDeputado, getDeputadoIds } from "@/lib/data";

export const dynamicParams = false;

export function generateStaticParams() {
  const ids = getDeputadoIds();
  return ids.length ? ids.map((id) => ({ id: String(id) })) : [{ id: "0" }];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const d = getDeputado((await params).id);
  return { title: d ? `${d.deputado.nome} (${d.deputado.partido_atual}-${d.deputado.uf})` : "Deputado" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const d = getDeputado((await params).id);
  if (!d) notFound();
  return <Suspense fallback={<Carregando />}><Perfil d={d} total={getDeputadoIds().length} /></Suspense>;
}
