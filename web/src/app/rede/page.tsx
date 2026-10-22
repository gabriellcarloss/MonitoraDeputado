import type { Metadata } from "next";
import { RedeGlobal } from "@/components/rede/RedeGlobal";
import { Titulo } from "@/components/ui/StatTile";

export const metadata: Metadata = { title: "Rede de relações" };

export default function Page() {
  return (
    <>
      <Titulo sub="Quem está ligado a quem pelo dinheiro da cota: fornecedores que atendem muitos gabinetes e pessoas que voaram pela cota de mais de um deputado.">Rede de relações</Titulo>
      <RedeGlobal />
    </>
  );
}
