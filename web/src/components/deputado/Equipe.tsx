"use client";

import { StatTile } from "@/components/ui/StatTile";
import { data, num } from "@/lib/format";
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
  const topo = g.secretarios.filter((s) => (s.nivel ?? 0) >= 20).length;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <StatTile rotulo="Secretários parlamentares" valor={num(g.n)} detalhe={`limite: ${g.limite} por gabinete`}
          cor={g.n > g.limite ? "vermelho" : "azul"} barra={g.n / g.limite} />
        <StatTile rotulo="Nos níveis mais altos" valor={num(topo)} detalhe="SP20 a SP25, as maiores remunerações da tabela" cor="amarelo"
          barra={g.n ? topo / g.n : 0} />
      </div>
      <section className="cartao p-4">
        <h2 className="font-display text-xl leading-none">Quem trabalha no gabinete</h2>
        <p className="mb-2 text-sm text-muted">Lotação atual, do nível mais alto (SP25) ao mais baixo (SP01). Quem já saiu da equipe não aparece.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="text-left text-muted"><tr>
              <th className="py-1 pr-3 font-medium">Nome</th><th className="py-1 pr-3 font-medium">Nível</th>
              <th className="py-1 font-medium">Nomeação mais recente</th>
            </tr></thead>
            <tbody className="num">{g.secretarios.map((s, i) => (
              <tr key={`${s.nome}-${i}`} className="border-t border-border">
                <td className="py-1 pr-3">{s.nome}</td>
                <td className="py-1 pr-3">{s.cargo ?? "—"}</td>
                <td className="py-1">{data(s.nomeacao)}</td>
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
