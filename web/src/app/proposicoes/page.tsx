import type { Metadata } from "next";
import { Suspense } from "react";
import { Proposicoes } from "@/components/proposicoes/Proposicoes";
import { Carregando, Titulo } from "@/components/ui/StatTile";

export const metadata: Metadata = { title: "Proposições" };

export default function Page() {
  return (
    <>
      <Titulo sub="Projetos de lei, emendas à Constituição e requerimentos apresentados — com autor, tema e situação.">Proposições</Titulo>
      <Suspense fallback={<Carregando />}><Proposicoes /></Suspense>
    </>
  );
}
