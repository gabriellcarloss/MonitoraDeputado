import Link from "next/link";
import { SerieTemporal } from "@/components/charts/SerieTemporal";
import { Destaques } from "@/components/inicio/Destaques";
import { Hero } from "@/components/inicio/Hero";
import { MapaUfs, QuadranteInicio } from "@/components/inicio/InicioCliente";
import { Aparecer } from "@/components/ui/Movimento";
import { type ItemRanking, Ranking } from "@/components/ui/Ranking";
import { Secao, StatTile, Titulo } from "@/components/ui/StatTile";
import { getAlertas, getBrasil, getDeputados, getMeta } from "@/lib/data";
import { gerarDestaques } from "@/lib/destaques";
import { brl, num, pct } from "@/lib/format";
import type { DeputadoResumo, Indicadores } from "@/lib/types";

function top(deps: DeputadoResumo[], campo: keyof Indicadores, fmt: (v: number) => string, asc: boolean, n = 8): ItemRanking[] {
  const lista = deps
    .filter((d) => d.indicadores && d.indicadores.meses_exercicio >= 1 && d.indicadores[campo] !== null)
    .sort((a, b) => ((a.indicadores![campo] as number) - (b.indicadores![campo] as number)) * (asc ? 1 : -1))
    .slice(0, n);
  const ref = Math.max(...lista.map((d) => Math.abs(d.indicadores![campo] as number)), 1e-9);
  return lista.map((d) => ({ id: d.id, nome: d.nome, partido: d.partido_atual, uf: d.uf, foto: d.foto,
    valor: fmt(d.indicadores![campo] as number), proporcao: Math.abs(d.indicadores![campo] as number) / ref }));
}

export default function Inicio() {
  const brasil = getBrasil();
  const deps = getDeputados();
  const meta = getMeta();
  if (!brasil || !meta) {
    return <Titulo sub="Os dados ainda não foram gerados. Rode o pipeline (make data) ou gere dados fictícios (make fixtures).">MonitoraDeputado</Titulo>;
  }
  const alertas = getAlertas();
  const ag = brasil.agregados.brasil;
  const serie = (m: string) => brasil.series.find((s) => s.metrica === m);
  const gasto = serie("gasto");
  const votacoes = serie("votacoes");
  const props = serie("proposicoes");
  const ativos = deps.filter((d) => d.indicadores && d.indicadores.meses_exercicio >= 1);
  const porGasto = [...ativos].sort((a, b) => b.indicadores!.gasto_total - a.indicadores!.gasto_total);
  const lado = (d?: DeputadoResumo) => d && ({ id: d.id, nome: d.nome, partido: d.partido_atual, uf: d.uf, foto: d.foto, valor: d.indicadores!.gasto_total });
  const pontos = ativos.map((d) => ({ id: d.id, nome: d.nome, partido: d.partido_atual, uf: d.uf,
    x: d.indicadores!.gasto_total, y: d.indicadores!.n_proposicoes_relevantes }));
  const fmtPct = (v: number) => pct(v);
  const contar = (s: string) => alertas.filter((a) => a.severidade === s).length;
  const emExercicio = deps.filter((d) => d.em_exercicio).length;
  return (
    <div className="space-y-8">
      <Hero geradoEm={meta.gerado_em} gastoTotal={brasil.totais.gasto_total ?? 0} media={ag.gasto_total.media ?? 0}
        presenca={ag.pct_presenca_sessoes.media} maior={lado(porGasto[0])} menor={lado(porGasto.at(-1))}
        alertas={{ alta: contar("alta"), atencao: contar("atencao"), info: contar("info") }} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile rotulo="Em exercício" valor={num(emExercicio)} detalhe={`${num(deps.length)} passaram pela legislatura`} cor="azul" barra={emExercicio / 513} />
        <StatTile rotulo="Votações nominais" valor={num(brasil.totais.n_votacoes)} cor="verde" />
        <StatTile rotulo="Sessões deliberativas" valor={num(brasil.totais.n_sessoes)} cor="verde" />
        <StatTile rotulo="Projetos apresentados" valor={num(brasil.totais.n_proposicoes_relevantes)} detalhe="PL, PLP, PEC e PDL" cor="amarelo" />
        <StatTile rotulo="Participação em votações" valor={ag.pct_participacao_votacoes.media == null ? "—" : pct(ag.pct_participacao_votacoes.media)} cor="verde" barra={ag.pct_participacao_votacoes.media ?? 0} />
        <StatTile rotulo="Cota utilizada (média)" valor={ag.pct_cota_usada.media == null ? "—" : pct(ag.pct_cota_usada.media)} cor="laranja" barra={ag.pct_cota_usada.media ?? 0} />
      </div>

      <Secao titulo="Destaques" sub="gerados a cada atualização dos dados">
        <Destaques itens={gerarDestaques(deps, brasil.series)} />
      </Secao>

      <Aparecer>
        {gasto ? <SerieTemporal titulo="Gasto mensal da cota parlamentar" formato="brl"
          linhas={[{ nome: "Gasto total", pontos: gasto.pontos, picos: gasto.picos }]} /> : null}
      </Aparecer>

      <div className="grid gap-6 lg:grid-cols-2">
        <Aparecer>{votacoes ? <SerieTemporal titulo="Votações nominais por mês" barras formato="num"
          linhas={[{ nome: "Votações", pontos: votacoes.pontos, picos: votacoes.picos }]} altura={240} /> : null}</Aparecer>
        <Aparecer atraso={0.08}>{props ? <SerieTemporal titulo="Projetos apresentados por mês" barras formato="num"
          linhas={[{ nome: "Projetos", pontos: props.pontos, picos: props.picos }]} altura={240} /> : null}</Aparecer>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Aparecer><MapaUfs ufs={brasil.agregados.uf} /></Aparecer>
        <Aparecer atraso={0.08}><QuadranteInicio pontos={pontos} /></Aparecer>
      </div>

      <Secao titulo="Ranking" sub="legislatura atual · deputados com ao menos 1 mês de exercício"
        acao={<Link href="/deputados/" className="pilula">Ver todos →</Link>}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Ranking titulo="Quem mais gastou" itens={top(ativos, "gasto_total", brl, false)} cor="bg-alta" />
          <Ranking titulo="Quem menos gastou" itens={top(ativos, "gasto_total", brl, true)} cor="bg-verde" />
          <Ranking titulo="Mais projetos" itens={top(ativos, "n_proposicoes_relevantes", num, false)} cor="bg-amarelo" />
          <Ranking titulo="Maior presença" itens={top(ativos, "pct_presenca_sessoes", fmtPct, false)} cor="bg-verde" />
          <Ranking titulo="Menor presença" itens={top(ativos, "pct_presenca_sessoes", fmtPct, true)} cor="bg-alta" />
          <Ranking titulo="Menos alinhados ao partido" itens={top(ativos, "pct_alinhamento_partido", fmtPct, true)} cor="bg-info" />
        </div>
      </Secao>
    </div>
  );
}
