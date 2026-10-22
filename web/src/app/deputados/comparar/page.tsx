import type { Metadata } from "next";
import { Suspense } from "react";
import { Comparador } from "@/components/deputados/Comparador";
import { Carregando, Titulo } from "@/components/ui/StatTile";

export const metadata: Metadata = { title: "Comparar deputados" };

export default function Page() {
  return (
    <>
      <Titulo sub="Até quatro deputados lado a lado, com os mesmos indicadores do boletim.">Comparar deputados</Titulo>
      <Suspense fallback={<Carregando />}><Comparador /></Suspense>
    </>
  );
}
