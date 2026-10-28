import type { Metadata } from "next";
import { FormContato } from "@/components/coleta/FormContato";
import { Titulo } from "@/components/ui/StatTile";

export const metadata: Metadata = {
  title: "Contato",
  description: "Fale com o autor do MonitoraDeputado: consultoria em dados, correção de um dado, dúvidas e sugestões.",
};

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl">
      <Titulo sub="Consultoria em dados e BI, correção de algum número, dúvida sobre o painel ou sugestão: escreva por aqui ou chame no WhatsApp.">
        Contato
      </Titulo>
      <FormContato />
    </div>
  );
}
