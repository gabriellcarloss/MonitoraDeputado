import Link from "next/link";
import { SerieTemporal } from "@/components/charts/SerieTemporal";
import { MapaUfs, QuadranteInicio } from "@/components/inicio/InicioCliente";
import { type ItemRanking, Ranking } from "@/components/ui/Ranking";
import { StatTile, Titulo } from "@/components/ui/StatTile";
import { getBrasil, getDeputados, getMeta } from "@/lib/data";
import { brl, brlCurto, num, ouTraco, pct } from "@/lib/format";
import type { DeputadoResumo, Indicadores } from "@/lib/types";

function top(deps: DeputadoResumo[], campo: keyof Indicadores, fmt: (v: number) => string, asc: boolean, n = 10): ItemRanking[] {
  return deps
    .filter((d) => d.indicadores && d.indicadores.meses_exercicio >= 1 && d.indicadores[campo] !== null)
    .sort((a, b) => ((a.indicadores![campo] as number) - (b.indicadores![campo] as number)) * (asc ? 1 : -1))
    .slice(0, n)
    .map((d) => ({ id: d.id, nome: d.nome, partido: d.partido_atual, uf: d.uf, foto: d.foto, valor: fmt(d.indicadores![campo] as number) }));
}

export default function Inicio() {
  const brasil = getBrasil();
  const deps = getDeputados();
  const meta = getMeta();
  if (!brasil || !meta) {
    return <Titulo sub="Os dados ainda não foram gerados. Rode o pipeline (make data) ou gere dados fictícios (make fixtures).">MonitoraDeputado</Titulo>;
  }
  const ag = brasil.agregados.brasil;
  const serie = (m: string) => brasil.series.find((s) => s.metrica === m);
  const gasto = serie("gasto");
  const votacoes = serie("votacoes");
  const props = serie("proposicoes");
  const ativos = deps.filter((d) => d.indicadores && d.indicadores.meses_exercicio >= 1);
  const pontos = ativos.map((d) => ({ id: d.id, nome: d.nome, partido: d.partido_atual, uf: d.uf,
    x: d.indicadores!.gasto_total, y: d.indicadores!.n_proposicoes_relevantes }));
  const fmtPct = (v: number) => pct(v);
  return (
    <div className="space-y-6">
      <Titulo sub={<>Quanto custam, o que entregam e como votam os 513 deputados federais — como uma avaliação de desempenho de
        quem trabalha para você. Dados públicos, atualizados todos os dias. <Link className="text-destaque underline" href="/sobre/">Como calculamos</Link>.</>}>
        Os deputados federais, em números
      </Titulo>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatTile rotulo="Gasto da cota" valor={brlCurto(brasil.totais.gasto_total ?? 0)} detalhe="legislatura atual" />
        <StatTile rotulo="Média por deputado" valor={brlCurto(ag.gasto_total.media ?? 0)} detalhe={`mediana ${brlCurto(ag.gasto_total.mediana ?? 0)}`} />
        <StatTile rotulo="Presença média" valor={ouTraco(ag.pct_presenca_sessoes.media, fmtPct)} detalhe="sessões deliberativas" />
        <StatTile rotulo="Votações nominais" valor={num(brasil.totais.n_votacoes)} />
        <StatTile rotulo="Projetos apresentados" valor={num(brasil.totais.n_proposicoes_relevantes)} detalhe="PL, PLP, PEC e PDL" />
        <StatTile rotulo="Pontos de atenção" valor={num(brasil.totais.n_alertas)} detalhe="gerados automaticamente" />
      </div>

      {gasto ? <SerieTemporal titulo="Gasto mensal da cota parlamentar" formato="brl"
        linhas={[{ nome: "Gasto total", pontos: gasto.pontos, picos: gasto.picos }]} /> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {votacoes ? <SerieTemporal titulo="Votações nominais por mês" barras formato="num"
          linhas={[{ nome: "Votações", pontos: votacoes.pontos, picos: votacoes.picos }]} altura={240} /> : null}
        {props ? <SerieTemporal titulo="Projetos apresentados por mês" barras formato="num"
          linhas={[{ nome: "Projetos", pontos: props.pontos, picos: props.picos }]} altura={240} /> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <MapaUfs ufs={brasil.agregados.uf} />
        <QuadranteInicio pontos={pontos} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Ranking titulo="Quem mais gastou" itens={top(ativos, "gasto_total", brl, false)} />
        <Ranking titulo="Quem menos gastou" itens={top(ativos, "gasto_total", brl, true)} />
        <Ranking titulo="Mais projetos apresentados" itens={top(ativos, "n_proposicoes_relevantes", num, false)} />
        <Ranking titulo="Maior presença em sessões" itens={top(ativos, "pct_presenca_sessoes", fmtPct, false)} />
        <Ranking titulo="Menor presença em sessões" itens={top(ativos, "pct_presenca_sessoes", fmtPct, true)} />
        <Ranking titulo="Menos alinhados ao próprio partido" itens={top(ativos, "pct_alinhamento_partido", fmtPct, true)} />
      </div>
      <p className="text-sm"><Link href="/deputados/" className="text-destaque underline">Ver todos os deputados com filtros e ordenação →</Link></p>
    </div>
  );
}
