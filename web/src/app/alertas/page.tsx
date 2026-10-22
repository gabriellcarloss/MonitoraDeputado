import type { Metadata } from "next";
import { Suspense } from "react";
import { Alertas } from "@/components/alertas/Alertas";
import { Carregando, Titulo } from "@/components/ui/StatTile";

export const metadata: Metadata = { title: "Pontos de atenção" };

export default function Page() {
  return (
    <>
      <Titulo sub="Regras automáticas aplicadas a todos os deputados: gastos fora do padrão, passagens para terceiros, fornecedores suspeitos, faltas e mais.">Pontos de atenção</Titulo>
      <Suspense fallback={<Carregando />}><Alertas /></Suspense>
    </>
  );
}
