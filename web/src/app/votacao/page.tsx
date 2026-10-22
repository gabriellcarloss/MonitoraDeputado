import type { Metadata } from "next";
import { Suspense } from "react";
import { Votacao } from "@/components/votacoes/Votacao";
import { Carregando } from "@/components/ui/StatTile";

export const metadata: Metadata = { title: "Votação" };

export default function Page() {
  return (
    <>

      <Suspense fallback={<Carregando />}><Votacao /></Suspense>
    </>
  );
}
