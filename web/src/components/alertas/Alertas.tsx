"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Barras } from "@/components/charts/Barras";
import { SeloAlerta } from "@/components/deputado/SeloAlerta";
import { BarraFiltros, Selecao, useFiltros } from "@/components/filtros/Filtros";
import { Foto } from "@/components/ui/Foto";
import { Carregando, Erro, StatTile } from "@/components/ui/StatTile";
import { useFavoritos } from "@/lib/favoritos";
import { num } from "@/lib/format";
import type { Alerta, Meta } from "@/lib/types";
import { useJson } from "@/lib/useJson";
import { useOpcoes } from "@/lib/useOpcoes";

const POR_PAGINA = 30;

export function Alertas() {
  const { opcoes, deputados } = useOpcoes();
  const { filtros, definir } = useFiltros(opcoes);
  const { dados, erro } = useJson<Alerta[]>("/data/alertas.json");
  const meta = useJson<Meta>("/data/meta.json").dados;
  const [pagina, setPagina] = useState(0);
  const fav = useFavoritos();
  const filtrados = useMemo(() => (dados ?? []).filter((a) => {
    const d = deputados.get(a.deputado_id);
    return (!filtros.favoritos || fav.ids.includes(a.deputado_id))
      && (!filtros.regra || a.regra === filtros.regra) && (!filtros.severidade || a.severidade === filtros.severidade)
      && (!filtros.uf || d?.uf === filtros.uf) && (!filtros.partido || d?.partido_atual === filtros.partido);
  }).sort((a, b) => ["alta", "atencao", "info"].indexOf(a.severidade) - ["alta", "atencao", "info"].indexOf(b.severidade)), [dados, filtros, deputados, fav.ids]);
  if (erro) return <Erro texto={erro} />;
  if (!dados) return <Carregando />;
  const porRegra = new Map<string, number>();
  for (const a of filtrados) porRegra.set(a.regra, (porRegra.get(a.regra) ?? 0) + 1);
  const titulo = (id: string) => meta?.regras.find((r) => r.id === id)?.titulo ?? id;
  const n = (s: string) => filtrados.filter((a) => a.severidade === s).length;
  const pagina0 = Math.min(pagina, Math.max(0, Math.ceil(filtrados.length / POR_PAGINA) - 1));
  const visiveis = filtrados.slice(pagina0 * POR_PAGINA, (pagina0 + 1) * POR_PAGINA);
  return (
    <>
      <BarraFiltros opcoes={opcoes} periodo={false}>
        <Selecao rotulo="Meus deputados" valor={filtros.favoritos} todos="Todos"
          opcoes={[["sim", `Só os marcados com ★ (${fav.ids.length})`]]}
          onChange={(v) => { setPagina(0); definir({ favoritos: v as "sim" | undefined }); }} />
        <Selecao rotulo="Regra" valor={filtros.regra} todos="Todas" opcoes={(meta?.regras ?? []).map((r) => [r.id, `${r.id} · ${r.titulo}`] as [string, string])}
          onChange={(regra) => { setPagina(0); definir({ regra }); }} />
        <Selecao rotulo="Severidade" valor={filtros.severidade} todos="Todas" opcoes={[["alta", "Alta"], ["atencao", "Atenção"], ["info", "Informativo"]]}
          onChange={(v) => { setPagina(0); definir({ severidade: v as "alta" | "atencao" | "info" | undefined }); }} />
      </BarraFiltros>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile rotulo="Pontos de atenção" valor={num(filtrados.length)} cor="azul" />
        <StatTile rotulo="Severidade alta" valor={num(n("alta"))} cor="vermelho" barra={filtrados.length ? n("alta") / filtrados.length : 0} />
        <StatTile rotulo="Atenção" valor={num(n("atencao"))} cor="laranja" barra={filtrados.length ? n("atencao") / filtrados.length : 0} />
        <StatTile rotulo="Deputados envolvidos" valor={num(new Set(filtrados.map((a) => a.deputado_id)).size)} cor="amarelo" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[2fr_3fr]">
        <div className="space-y-4">
          <Barras titulo="Por regra" formato="num" cor={1}
            itens={[...porRegra.entries()].sort((a, b) => b[1] - a[1]).map(([r, v]) => ({ rotulo: `${r} · ${titulo(r)}`, valor: v, href: `/alertas/?regra=${r}` }))} />
          <section className="cartao p-4 text-sm">
            <h2 className="font-display mb-2 text-xl leading-none">Como ler</h2>
            <p className="text-muted">Cada alerta é uma regra estatística aplicada igualmente a todos os deputados, com a evidência ao lado. É um ponto de
              atenção para investigar — não uma acusação. <Link href="/sobre/" className="text-destaque underline">Ver todas as regras e limiares</Link>.</p>
          </section>
        </div>
        <section className="space-y-3">
          {visiveis.length === 0 ? <p className="cartao p-6 text-center text-sm text-muted">Nenhum alerta com esses filtros.</p> : visiveis.map((a) => {
            const d = deputados.get(a.deputado_id);
            return (
              <div key={a.id}>
                {d ? (
                  <Link href={`/deputado/${d.id}/`} className="mb-1 flex items-center gap-2 text-sm font-semibold hover:underline">
                    <Foto src={d.foto} nome={d.nome} tamanho={24} /> {d.nome} <span className="font-normal text-muted">{d.partido_atual}-{d.uf}</span>
                  </Link>
                ) : null}
                <SeloAlerta alerta={a} />
              </div>
            );
          })}
          {filtrados.length > POR_PAGINA ? (
            <div className="flex items-center justify-end gap-2 text-sm">
              <button type="button" className="pilula" disabled={pagina0 === 0} onClick={() => setPagina(pagina0 - 1)}>Anterior</button>
              <span className="text-muted">Página {pagina0 + 1} de {Math.ceil(filtrados.length / POR_PAGINA)}</span>
              <button type="button" className="pilula" disabled={(pagina0 + 1) * POR_PAGINA >= filtrados.length} onClick={() => setPagina(pagina0 + 1)}>Próxima</button>
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}
