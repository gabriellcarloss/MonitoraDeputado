"use client";

import clsx from "clsx";
import { AlertTriangle, LayoutGrid, Link2, Rows3, Star } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BotaoFavorito } from "@/components/favoritos/BotaoFavorito";
import { BarraFiltros, Campo, Selecao, useFiltros } from "@/components/filtros/Filtros";
import { Foto } from "@/components/ui/Foto";
import { Carregando, Erro } from "@/components/ui/StatTile";
import { linkLista, useFavoritos } from "@/lib/favoritos";
import { INDICADORES, UFS } from "@/lib/indicadores";
import type { DeputadoResumo, NomeIndicador } from "@/lib/types";
import { useJson } from "@/lib/useJson";

const COLUNAS: NomeIndicador[] = ["gasto_total", "n_proposicoes_relevantes", "pct_presenca_sessoes", "pct_participacao_votacoes",
  "pct_alinhamento_partido", "custo_por_proposicao"];

export function ListaDeputados() {
  const { dados, erro } = useJson<DeputadoResumo[]>("/data/deputados.json");
  const partidos = useMemo(() => Array.from(new Set((dados ?? []).map((d) => d.partido_atual))).sort(), [dados]);
  const opcoes = useMemo(() => ({ ufs: UFS, partidos }), [partidos]);
  const { filtros, definir } = useFiltros(opcoes);
  const [modo, setModo] = useState<"cards" | "tabela">("tabela");
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const fav = useFavoritos();
  const [copiado, setCopiado] = useState(false);

  const ordem = (filtros.ordem && filtros.ordem.replace(/^-/, "") in INDICADORES ? filtros.ordem : "-gasto_total");
  const campo = ordem.replace(/^-/, "") as NomeIndicador;
  const desc = ordem.startsWith("-");

  const lista = useMemo(() => {
    const busca = filtros.busca?.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    return (dados ?? [])
      .filter((d) => !filtros.lista || filtros.lista.includes(d.id))
      .filter((d) => !filtros.favoritos || fav.ids.includes(d.id))
      .filter((d) => !filtros.uf || d.uf === filtros.uf)
      .filter((d) => !filtros.partido || d.partido_atual === filtros.partido)
      .filter((d) => !filtros.sexo || d.sexo === filtros.sexo)
      .filter((d) => !filtros.situacao || (filtros.situacao === "exercicio" ? d.em_exercicio : !d.em_exercicio))
      .filter((d) => !filtros.alertas || (filtros.alertas === "com" ? d.n_alertas > 0 : d.n_alertas === 0))
      .filter((d) => !filtros.trocou || d.trocou_partido)
      .filter((d) => filtros.gasto_min === undefined || (d.indicadores?.gasto_total ?? 0) >= filtros.gasto_min)
      .filter((d) => filtros.gasto_max === undefined || (d.indicadores?.gasto_total ?? 0) <= filtros.gasto_max)
      .filter((d) => !busca || d.nome.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").includes(busca))
      .sort((a, b) => {
        const va = a.indicadores?.[campo] ?? null;
        const vb = b.indicadores?.[campo] ?? null;
        if (va === null) return 1;
        if (vb === null) return -1;
        return ((va as number) - (vb as number)) * (desc ? -1 : 1);
      });
  }, [dados, filtros, campo, desc, fav.ids]);

  if (erro) return <Erro texto={erro} />;
  if (!dados) return <Carregando />;

  const alternar = (id: number) =>
    setSelecionados((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 4 ? s : [...s, id]));

  async function copiarLista() {
    const url = `${window.location.origin}${linkLista(fav.ids)}`;
    try {
      if (navigator.share) await navigator.share({ title: "Meus deputados no MonitoraDeputado", url });
      else { await navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 1800); }
    } catch {}
  }

  return (
    <>
      {filtros.lista ? (
        <div role="note" className="cartao mb-4 flex flex-wrap items-center gap-3 border-verde/40 p-3 text-sm">
          <Star size={16} className="text-[#b58900] dark:text-[#ffdf00]" aria-hidden />
          <p className="flex-1">Você está vendo uma <strong>lista compartilhada</strong> com {filtros.lista.length} deputado(s).</p>
          <button type="button" className="pilula" onClick={() => fav.definir(Array.from(new Set([...fav.ids, ...filtros.lista!])))}>
            Adicionar aos meus deputados
          </button>
          <button type="button" className="pilula" onClick={() => definir({ lista: undefined })}>Ver todos</button>
        </div>
      ) : null}
      <BarraFiltros opcoes={opcoes} periodo={false}>
        <Selecao rotulo="Meus deputados" valor={filtros.favoritos} todos="Todos"
          opcoes={[["sim", `Só os marcados com ★ (${fav.ids.length})`]]}
          onChange={(v) => definir({ favoritos: v as "sim" | undefined })} />
        <Campo rotulo="Buscar nome">
          <input type="search" className="h-9 rounded-md border border-border bg-card px-2 text-sm" defaultValue={filtros.busca ?? ""}
            placeholder="ex.: Silva" onChange={(e) => definir({ busca: e.target.value || undefined })} />
        </Campo>
        <Selecao rotulo="Situação" valor={filtros.situacao} opcoes={[["exercicio", "Em exercício"], ["fora", "Fora do exercício"]]}
          onChange={(v) => definir({ situacao: v as "exercicio" | "fora" | undefined })} />
        <Selecao rotulo="Sexo" valor={filtros.sexo} opcoes={[["F", "Feminino"], ["M", "Masculino"]]}
          onChange={(v) => definir({ sexo: v as "M" | "F" | undefined })} />
        <Selecao rotulo="Pontos de atenção" valor={filtros.alertas} opcoes={[["com", "Com alertas"], ["sem", "Sem alertas"]]}
          onChange={(v) => definir({ alertas: v as "com" | "sem" | undefined })} />
        <Selecao rotulo="Troca de partido" valor={filtros.trocou} opcoes={[["sim", "Trocou no mandato"]]}
          onChange={(v) => definir({ trocou: v as "sim" | undefined })} />
        <Campo rotulo="Gasto mínimo (R$)">
          <input type="number" min={0} step={10000} className="h-9 w-32 rounded-md border border-border bg-card px-2 text-sm"
            defaultValue={filtros.gasto_min ?? ""} onChange={(e) => definir({ gasto_min: e.target.value ? Number(e.target.value) : undefined })} />
        </Campo>
        <Campo rotulo="Gasto máximo (R$)">
          <input type="number" min={0} step={10000} className="h-9 w-32 rounded-md border border-border bg-card px-2 text-sm"
            defaultValue={filtros.gasto_max ?? ""} onChange={(e) => definir({ gasto_max: e.target.value ? Number(e.target.value) : undefined })} />
        </Campo>
        <Selecao rotulo="Ordenar por" valor={ordem} todos="Padrão (maior gasto)"
          opcoes={COLUNAS.flatMap((c) => [[`-${c}`, `${INDICADORES[c].rotulo} ↓`], [c, `${INDICADORES[c].rotulo} ↑`]] as [string, string][])}
          onChange={(v) => definir({ ordem: v })} />
      </BarraFiltros>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <p className="flex-1 text-muted">{lista.length} deputado(s)</p>
        {filtros.favoritos && fav.ids.length ? (
          <button type="button" onClick={copiarLista} className="pilula">
            <Link2 size={14} aria-hidden /> {copiado ? "Link copiado!" : "Compartilhar minha lista"}
          </button>
        ) : null}
        {selecionados.length ? (
          <Link href={`/deputados/comparar/?ids=${selecionados.join(",")}`}
            className="rounded-md bg-verde px-3 py-1.5 font-medium text-white">Comparar {selecionados.length} selecionado(s)</Link>
        ) : <span className="text-muted">Marque até 4 para comparar</span>}
        <div className="flex rounded-md border border-border" role="group" aria-label="Modo de exibição">
          <button type="button" onClick={() => setModo("tabela")} aria-pressed={modo === "tabela"} className={clsx("p-2", modo === "tabela" && "bg-subtle")} aria-label="Tabela"><Rows3 size={16} /></button>
          <button type="button" onClick={() => setModo("cards")} aria-pressed={modo === "cards"} className={clsx("p-2", modo === "cards" && "bg-subtle")} aria-label="Cartões"><LayoutGrid size={16} /></button>
        </div>
      </div>

      {modo === "tabela" ? (
        <div className="overflow-x-auto cartao">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="p-2"><span className="sr-only">Comparar</span></th>
                <th className="p-2"><span className="sr-only">Meu deputado</span></th>
                <th className="p-2 font-medium">Deputado</th>
                {COLUNAS.map((c) => (
                  <th key={c} className="p-2 text-right font-medium">
                    <button type="button" className={clsx("hover:text-fg", campo === c && "text-fg")} title={INDICADORES[c].ajuda}
                      onClick={() => definir({ ordem: campo === c && desc ? c : `-${c}` })}>
                      {INDICADORES[c].rotulo}{campo === c ? (desc ? " ↓" : " ↑") : ""}
                    </button>
                  </th>
                ))}
                <th className="p-2 text-right font-medium">Alertas</th>
              </tr>
            </thead>
            <tbody className="num">
              {lista.map((d) => (
                <tr key={d.id} className="border-t border-border hover:bg-subtle/60">
                  <td className="p-2"><input type="checkbox" aria-label={`Comparar ${d.nome}`} checked={selecionados.includes(d.id)} onChange={() => alternar(d.id)} /></td>
                  <td className="p-1"><BotaoFavorito id={d.id} nome={d.nome} /></td>
                  <td className="p-2">
                    <Link href={`/deputado/${d.id}/`} className="flex items-center gap-2 hover:underline">
                      <Foto src={d.foto} nome={d.nome} tamanho={32} />
                      <span>{d.nome}<span className="block text-xs text-muted">{d.partido_atual}-{d.uf}{d.em_exercicio ? "" : " · fora do exercício"}</span></span>
                    </Link>
                  </td>
                  {COLUNAS.map((c) => <td key={c} className="p-2 text-right">{INDICADORES[c].formato(d.indicadores?.[c])}</td>)}
                  <td className="p-2 text-right">{d.n_alertas ? <span className="inline-flex items-center gap-1"><AlertTriangle size={14} className="text-atencao" aria-hidden />{d.n_alertas}</span> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {lista.map((d) => (
            <li key={d.id} className="cartao p-3">
              <div className="flex items-start gap-3">
                <Foto src={d.foto} nome={d.nome} tamanho={48} />
                <div className="min-w-0 flex-1">
                  <Link href={`/deputado/${d.id}/`} className="font-semibold hover:underline">{d.nome}</Link>
                  <p className="text-xs text-muted">{d.partido_atual}-{d.uf}</p>
                </div>
                <BotaoFavorito id={d.id} nome={d.nome} />
                <input type="checkbox" aria-label={`Comparar ${d.nome}`} checked={selecionados.includes(d.id)} onChange={() => alternar(d.id)} />
              </div>
              <dl className="num mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {COLUNAS.slice(0, 4).map((c) => (
                  <div key={c}><dt className="text-muted">{INDICADORES[c].rotulo}</dt><dd className="font-semibold">{INDICADORES[c].formato(d.indicadores?.[c])}</dd></div>
                ))}
              </dl>
              {d.n_alertas ? <p className="mt-2 inline-flex items-center gap-1 text-xs"><AlertTriangle size={12} className="text-atencao" aria-hidden />{d.n_alertas} ponto(s) de atenção</p> : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
