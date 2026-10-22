import type { Metadata } from "next";
import { Suspense } from "react";
import { Gastos } from "@/components/gastos/Gastos";
import { Carregando, Titulo } from "@/components/ui/StatTile";

export const metadata: Metadata = { title: "Gastos da cota parlamentar" };

export default function Page() {
  return (
    <>
      <Titulo sub="Cada real reembolsado pela Cota para o Exercício da Atividade Parlamentar (CEAP), nota por nota. Filtre por período, estado, partido, categoria e fornecedor.">
        Gastos da cota parlamentar
      </Titulo>
      <Suspense fallback={<Carregando />}><Gastos /></Suspense>
    </>
  );
}
