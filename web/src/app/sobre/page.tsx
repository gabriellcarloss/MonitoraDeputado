import type { Metadata } from "next";
import { BadgeSeveridade, RODAPE } from "@/components/deputado/SeloAlerta";
import { Secao, Titulo } from "@/components/ui/StatTile";
import { getMeta } from "@/lib/data";
import { data, num } from "@/lib/format";
import { COMPONENTES } from "@/lib/indice";
import { INDICADORES } from "@/lib/indicadores";

export const metadata: Metadata = { title: "Sobre os dados e metodologia" };

const FONTES_DESC: Record<string, string> = {
  "Câmara — Dados Abertos": "dadosabertos.camara.leg.br — deputados, histórico partidário, votações, votos, orientações, proposições, autorias e presenças.",
  "Câmara — Cota parlamentar (CEAP)": "camara.leg.br/cotas — cada nota fiscal reembolsada, com fornecedor, passageiro, trecho e link do documento.",
  "Receita Federal (CNPJ)": "Dados públicos do CNPJ via Minha Receita e BrasilAPI — abertura, situação, atividade e quadro de sócios.",
};

const LIMITACOES = [
  "O salário (subsídio) é igual para todos os deputados e não diferencia desempenho; por isso ele não entra nos indicadores.",
  "A situação cadastral do fornecedor é a atual, não a da data do pagamento.",
  "Passageiro diferente do deputado pode ser assessor em missão oficial; o painel mostra o dado, sem julgamento.",
  "Presença e participação consideram apenas o período em exercício — suplentes não são penalizados.",
  "Projetos contam pela data de apresentação; requerimentos e indicações são contados à parte.",
  "Os dados são atualizados uma vez por dia; mudanças muito recentes podem levar até 24 horas para aparecer.",
];

export default function Page() {
  const meta = getMeta();
  return (
    <div className="space-y-10">
      <Titulo sub="De onde vêm os números, como cada indicador é calculado e o que ele não diz.">Sobre os dados e metodologia</Titulo>
      {meta?.ficticio ? <p className="cartao border-atencao/50 p-4 text-sm"><strong>Atenção:</strong> esta publicação está usando dados fictícios de demonstração.</p> : null}

      <Secao titulo="Fontes" sub={meta ? `última atualização em ${data(meta.gerado_em)}` : undefined}>
        <ul className="grid gap-3 md:grid-cols-3">
          {Object.entries(meta?.fontes ?? {}).map(([nome, f]) => (
            <li key={nome} className="cartao p-4 text-sm">
              <p className="font-semibold">{nome}</p>
              <p className="mt-1 text-muted">{FONTES_DESC[nome]}</p>
              <p className="mt-2 text-xs">{f.desatualizada
                ? <span className="font-semibold text-alta">Desatualizada — fonte indisponível na última execução; usando dados de {data(f.atualizado_em)}</span>
                : <>Atualizada em {data(f.atualizado_em)}</>}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">Contornos dos estados: <a className="text-destaque underline" href="https://github.com/VictorCazanave/svg-maps" target="_blank" rel="noopener noreferrer">@svg-maps/brazil</a>, licença CC BY 4.0.</p>
        {meta ? <p className="mt-3 text-sm text-muted">Registros: {Object.entries(meta.contagens).map(([k, v]) => `${k} ${num(v)}`).join(" · ")}.</p> : null}
      </Secao>

      <Secao titulo="Indicadores">
        <dl className="grid gap-3 md:grid-cols-2">
          {Object.entries(INDICADORES).map(([k, i]) => (
            <div key={k} className="cartao p-4 text-sm"><dt className="font-semibold">{i.rotulo}{i.menorMelhor ? <span className="ml-2 text-xs font-normal text-muted">(menor é melhor no ranking)</span> : null}</dt><dd className="mt-1 text-muted">{i.ajuda}</dd></div>
          ))}
        </dl>
      </Secao>

      <section id="indice">
        <Secao titulo="Índice de desempenho">
          <div className="cartao space-y-2 p-4 text-sm">
            <p>Nota de 0 a 100 usada nos destaques da página inicial. Para cada deputado com <strong>pelo menos 6 meses de exercício</strong>,
              calculamos o percentil (a posição relativa entre os colegas) em quatro dimensões e tiramos a média simples:</p>
            <ul className="list-disc pl-6">
              {COMPONENTES.map((c) => <li key={c.rotulo}>{c.rotulo}{c.menorMelhor ? " (quanto menor, melhor)" : ""}</li>)}
            </ul>
            <p className="text-muted">Dimensões sem dado são ignoradas na média. O índice resume indicadores quantitativos; não mede a qualidade dos projetos,
              o trabalho em comissões ou a atuação fora do Plenário.</p>
          </div>
        </Secao>
      </section>

      <Secao titulo="Regras dos pontos de atenção">
        <p className="mb-3 text-sm text-muted">{meta?.rodape_alerta ?? RODAPE} Picos: mês acima de mediana + 3 desvios absolutos medianos (escalados) da própria série, ou acima de 2,5× a média dos 12 meses anteriores.</p>
        <ul className="grid gap-3 md:grid-cols-2">
          {(meta?.regras ?? []).map((r) => (
            <li key={r.id} className="cartao p-4 text-sm">
              <p className="flex flex-wrap items-center gap-2"><span className="font-display text-lg">{r.id}</span><BadgeSeveridade s={r.severidade} /><span className="font-semibold">{r.titulo}</span></p>
              <p className="mt-1 text-muted">{r.descricao}</p>
            </li>
          ))}
        </ul>
      </Secao>

      <Secao titulo="Limitações conhecidas">
        <ul className="cartao list-disc space-y-1 p-4 pl-8 text-sm">{LIMITACOES.map((l) => <li key={l}>{l}</li>)}</ul>
      </Secao>
    </div>
  );
}
