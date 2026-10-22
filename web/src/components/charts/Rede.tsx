"use client";

import type { EChartsOption } from "echarts";
import { useRouter } from "next/navigation";
import { brl } from "@/lib/format";
import type { Rede as TRede } from "@/lib/types";
import { Cartao, TabelaSimples } from "./Cartao";
import { tooltipBase, useCores } from "./cores";
import { EChart } from "./EChart";

const TIPOS = ["deputado", "fornecedor", "passageiro", "socio"] as const;
const NOMES = { deputado: "Deputado", fornecedor: "Fornecedor", passageiro: "Passageiro (terceiro)", socio: "Sócio" };

export function hrefNo(id: string): string | null {
  const [tipo, chave] = [id.split(":", 1)[0], id.slice(id.indexOf(":") + 1)];
  if (tipo === "deputado") return `/deputado/${chave}/`;
  if (tipo === "fornecedor" && !chave.startsWith("NOME:")) return `/fornecedor/?cnpj=${chave}`;
  if (tipo === "passageiro") return `/gastos/passagens/?passageiro=${encodeURIComponent(chave)}`;
  return null;
}

/** Grafo de relações (força). Tamanho do nó ∝ √valor; cor = tipo de entidade. */
export function Rede({ rede, titulo = "Rede de relações", subtitulo }: { rede: TRede; titulo?: string; subtitulo?: string }) {
  const c = useCores();
  const router = useRouter();
  const max = Math.max(1, ...rede.nos.map((n) => n.valor));
  const option: EChartsOption = {
    legend: { top: 0, left: 0, data: TIPOS.map((t) => NOMES[t]), textStyle: { color: c.muted } },
    tooltip: { ...tooltipBase(c), formatter: (x: unknown) => {
      const d = x as { dataType: string; data: { name?: string; tipo?: string; valor?: number; source?: string; target?: string; value?: number } };
      if (d.dataType === "edge") return d.data.value ? brl(d.data.value) : "";
      return `<b>${d.data.name}</b><br/>${NOMES[d.data.tipo as keyof typeof NOMES]}${d.data.valor ? `<br/>${brl(d.data.valor)}` : ""}`;
    } },
    series: [{
      type: "graph", layout: "force", roam: true, draggable: true, top: 32,
      categories: TIPOS.map((t, i) => ({ name: NOMES[t], itemStyle: { color: c.series[i] } })),
      force: { repulsion: 120, edgeLength: [40, 140], gravity: 0.08 },
      label: { show: true, position: "right", color: c.texto, fontSize: 10, formatter: (p) => {
        const d = p.data as { name: string; valor: number };
        return d.valor / max > 0.08 ? d.name.slice(0, 28) : "";
      } },
      lineStyle: { color: c.eixo, opacity: 0.35, width: 1, curveness: 0.1 },
      emphasis: { focus: "adjacency", lineStyle: { width: 2, opacity: 0.9 } },
      data: rede.nos.map((n) => ({
        id: n.id, name: n.rotulo, tipo: n.tipo, valor: n.valor, category: TIPOS.indexOf(n.tipo),
        symbolSize: 8 + 30 * Math.sqrt(Math.max(0, n.valor) / max),
        itemStyle: { borderColor: c.superficie, borderWidth: 2 },
      })),
      links: rede.arestas.map((a) => ({ source: a.origem, target: a.destino, value: a.valor ?? 0 })),
    }],
  };
  return (
    <Cartao titulo={titulo} subtitulo={subtitulo ?? "Arraste para explorar; clique num nó para abrir. Ligações = pagamentos da cota, passagens e sociedade."}
      tabela={<TabelaSimples colunas={["Entidade", "Tipo", "Valor ligado"]}
        linhas={[...rede.nos].sort((a, b) => b.valor - a.valor).map((n) => [n.rotulo, NOMES[n.tipo], brl(n.valor)])} />}>
      {rede.nos.length === 0 ? <p className="py-10 text-center text-sm text-muted">Sem relações registradas.</p> : (
        <EChart option={option} altura={520}
          onEvents={{ click: (x: { dataType: string; data: { id: string } }) => {
            if (x.dataType !== "node") return;
            const h = hrefNo(x.data.id);
            if (h) router.push(h);
          } }} />
      )}
    </Cartao>
  );
}
