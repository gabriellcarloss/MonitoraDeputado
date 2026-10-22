import type { Metadata } from "next";
import { Suspense } from "react";
import { ListaDeputados } from "@/components/deputados/ListaDeputados";
import { Carregando, Titulo } from "@/components/ui/StatTile";

export const metadata: Metadata = { title: "Deputados" };

export default function Page() {
  return (
    <>
      <Titulo sub="Filtre, ordene por qualquer indicador e compare até quatro deputados lado a lado.">Deputados</Titulo>
      <Suspense fallback={<Carregando />}><ListaDeputados /></Suspense>
    </>
  );
}
