"use client";

import { StatTile } from "@/components/ui/StatTile";
import { brl, brlCurto, data, num, pct } from "@/lib/format";
import type { DeputadoDetalhe } from "@/lib/types";

/** Aba "Equipe": secretários parlamentares lotados hoje no gabinete (arquivo de funcionários da Câmara). */
export function EquipeDeputado({ d }: { d: DeputadoDetalhe }) {
  const g = d.gabinete;
  if (!g || g.n === 0) {
    return (
      <p className="cartao p-4 text-sm text-muted">
        Nenhum secretário parlamentar lotado neste gabinete no arquivo de funcionários da Câmara
        {d.deputado.em_exercicio ? "" : " (o deputado está fora do exercício)"}.
      </p>
    );
  }
  const usoVerba = g.verba ? g.custo_estimado / g.verba : 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile rotulo="Secretários parlamentares" valor={num(g.n)} detalhe={`limite: ${g.limite} por gabinete`}
          cor={g.n > g.limite ? "vermelho" : "azul"} barra={g.n / g.limite} />
        <StatTile rotulo="Custo mensal estimado" valor={brlCurto(g.custo_estimado)} detalhe="só salário-base por nível, sem auxílios" cor="verde" />
        <StatTile rotulo="Da verba de gabinete" valor={pct(usoVerba, 0)} detalhe={`verba mensal: ${brlCurto(g.verba)}`}
          cor="laranja" barra={usoVerba} />
        <StatTile rotulo="Nomeados nos últimos 12 meses" valor={num(g.nomeados_12m)} detalhe="entre os que estão hoje na equipe" cor="amarelo" />
      </div>
      <section className="cartao p-4">
        <h2 className="font-display text-xl leading-none">Quem trabalha no gabinete</h2>
        <p className="mb-2 text-sm text-muted">Lotação atual. Quem já saiu da equipe não aparece. O salário é estimado pela tabela de níveis
          (SP01 a SP25) e não inclui gratificações nem auxílios.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-muted"><tr>
              <th className="py-1 pr-3 font-medium">Nome</th><th className="py-1 pr-3 font-medium">Nível</th>
              <th className="py-1 pr-3 font-medium">Nomeação</th><th className="py-1 text-right font-medium">Salário estimado</th>
            </tr></thead>
            <tbody className="num">{g.secretarios.map((s, i) => (
              <tr key={`${s.nome}-${i}`} className="border-t border-border">
                <td className="py-1 pr-3">{s.nome}</td>
                <td className="py-1 pr-3">{s.cargo ?? "—"}</td>
                <td className="py-1 pr-3">{data(s.nomeacao)}</td>
                <td className="py-1 text-right">{s.salario_estimado == null ? "—" : brl(s.salario_estimado)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">Fonte: arquivo de funcionários dos Dados Abertos da Câmara. Passagens da cota emitidas para pessoas
          desta lista não geram ponto de atenção.</p>
      </section>
    </div>
  );
}
