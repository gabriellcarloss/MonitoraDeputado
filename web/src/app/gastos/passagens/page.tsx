import type { Metadata } from "next";
import { Suspense } from "react";
import { Passagens } from "@/components/gastos/Passagens";
import { Carregando, Titulo } from "@/components/ui/StatTile";

export const metadata: Metadata = { title: "Passagens aéreas" };

export default function Page() {
  return (
    <>
      <Titulo sub="Quem voou, de onde para onde, e quando a passagem paga pela cota foi para outra pessoa que não o deputado.">Passagens aéreas</Titulo>
      <Suspense fallback={<Carregando />}><Passagens /></Suspense>
    </>
  );
}
