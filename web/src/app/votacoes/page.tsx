import type { Metadata } from "next";
import { Suspense } from "react";
import { Votacoes } from "@/components/votacoes/Votacoes";
import { Carregando, Titulo } from "@/components/ui/StatTile";

export const metadata: Metadata = { title: "Votações" };

export default function Page() {
  return (
    <>
      <Titulo sub="Todas as votações nominais da Câmara: placar, resultado e como cada partido se posicionou.">Votações</Titulo>
      <Suspense fallback={<Carregando />}><Votacoes /></Suspense>
    </>
  );
}
