import type { Metadata } from "next";
import { Suspense } from "react";
import { Presenca } from "@/components/presenca/Presenca";
import { Carregando, Titulo } from "@/components/ui/StatTile";

export const metadata: Metadata = { title: "Presença" };

export default function Page() {
  return (
    <>
      <Titulo sub="Presença nas sessões deliberativas do Plenário — quem comparece e quem falta.">Presença</Titulo>
      <Suspense fallback={<Carregando />}><Presenca /></Suspense>
    </>
  );
}
