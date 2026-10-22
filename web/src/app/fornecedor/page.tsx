import type { Metadata } from "next";
import { Suspense } from "react";
import { Fornecedor } from "@/components/gastos/Fornecedor";
import { Carregando } from "@/components/ui/StatTile";

export const metadata: Metadata = { title: "Fornecedor" };

export default function Page() {
  return <Suspense fallback={<Carregando />}><Fornecedor /></Suspense>;
}
