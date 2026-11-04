import { CalendarClock, Code, Database, Download, ExternalLink, Landmark, Scale, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { data, num } from "@/lib/format";
import { AUTOR } from "@/lib/site";

const FONTES = [
  { nome: "API de Dados Abertos da Câmara", url: "https://dadosabertos.camara.leg.br/swagger/api.html", o: "deputados, votações, votos, proposições, sessões, funcionários" },
  { nome: "Cota parlamentar (CEAP)", url: "https://www.camara.leg.br/transparencia/gastos-parlamentares", o: "cada nota fiscal reembolsada, com fornecedor e passageiro" },
  { nome: "Frequência no Plenário", url: "https://www.camara.leg.br/transparencia/", o: "presenças e justificativas oficiais de ausência" },
  { nome: "Portal da Transparência (CGU)", url: "https://portaldatransparencia.gov.br/emendas", o: "emendas parlamentares: empenhado, pago e quem recebeu" },
  { nome: "Receita Federal · CNPJ", url: "https://minhareceita.org", o: "abertura, situação e sócios dos fornecedores (via Minha Receita e BrasilAPI)" },
];

const DISPONIVEIS: { rotulo: string; tabela?: string }[] = [
  { rotulo: "Deputados e mandatos", tabela: "deputados" },
  { rotulo: "Notas fiscais da cota", tabela: "despesas" },
  { rotulo: "Votações", tabela: "votacoes" },
  { rotulo: "Votos nominais", tabela: "votos" },
  { rotulo: "Presença em sessões", tabela: "presencas" },
  { rotulo: "Proposições", tabela: "proposicoes" },
  { rotulo: "Emendas parlamentares", tabela: "emendas" },
  { rotulo: "Secretários de gabinete", tabela: "secretarios" },
  { rotulo: "Fornecedores (CNPJ)", tabela: "fornecedores" },
];

export function Footer({ geradoEm, contagens }: { geradoEm?: string | null; contagens?: Record<string, number> }) {
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <span aria-hidden className="faixa-bandeira-h block h-1" />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 text-sm">
        {/* Lembrete principal */}
        <div className="flex flex-col gap-4 rounded-2xl border border-verde/25 bg-gradient-to-br from-verde/[0.08] to-transparent p-5 sm:flex-row sm:items-center" data-revelar>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#009c3b] to-[#0b5a3d] text-white shadow-[0_10px_24px_-10px_rgb(0_156_59/0.8)]">
            <ShieldCheck size={24} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl leading-tight">Todos os números deste site são dados públicos e oficiais</p>
            <p className="mt-1 text-muted">
              Vêm das APIs e dos arquivos abertos da Câmara dos Deputados, do Portal da Transparência (CGU) e da Receita Federal,
              disponíveis a qualquer pessoa pela Lei de Acesso à Informação (Lei 12.527/2011). Nada é inventado ou estimado sem aviso:
              cada número leva ao documento de origem.
            </p>
          </div>
          <Link href="/dados/" className="pilula pilula-amarela shrink-0 font-bold"><Download size={16} aria-hidden /> Baixar os dados</Link>
        </div>

        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_0.8fr]">
          <section aria-labelledby="rodape-fontes">
            <h2 id="rodape-fontes" className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted"><Landmark size={14} aria-hidden /> Fontes oficiais</h2>
            <ul className="space-y-2.5">
              {FONTES.map((f) => (
                <li key={f.nome}>
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1 font-semibold text-fg hover:text-destaque">
                    {f.nome} <ExternalLink size={12} aria-hidden className="opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </a>
                  <span className="block text-xs text-muted">{f.o}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="rodape-disponiveis">
            <h2 id="rodape-disponiveis" className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted"><Database size={14} aria-hidden /> Dados disponíveis</h2>
            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-1">
              {DISPONIVEIS.map((d) => (
                <li key={d.rotulo} className="flex items-baseline justify-between gap-3 border-b border-dashed border-border pb-1.5">
                  <span>{d.rotulo}</span>
                  {d.tabela && contagens?.[d.tabela] ? <span className="num text-xs font-semibold text-destaque">{num(contagens[d.tabela])}</span> : null}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="rodape-uso">
            <h2 id="rodape-uso" className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted"><Scale size={14} aria-hidden /> Use e confira</h2>
            <ul className="space-y-2">
              <li><Link href="/dados/" className="font-semibold text-destaque hover:underline">Baixar dados (Excel, CSV, JSON, Parquet)</Link></li>
              <li><Link href="/sobre/" className="font-semibold text-destaque hover:underline">Metodologia e fontes</Link></li>
              <li><a href="https://github.com/gabriellcarloss/MonitoraDeputado" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-destaque hover:underline"><Code size={14} aria-hidden /> Código aberto</a></li>
              <li><Link href="/privacidade/" className="font-semibold text-destaque hover:underline">Privacidade</Link></li>
              <li><Link href="/contato/" className="font-semibold text-destaque hover:underline">Contato</Link></li>
            </ul>
          </section>
        </div>

        {/* Lembretes curtos */}
        <ul className="grid gap-2 text-xs text-muted sm:grid-cols-3">
          <li className="flex items-start gap-2"><CalendarClock size={14} className="mt-0.5 shrink-0 text-destaque" aria-hidden />
            <span>Atualização automática todos os dias às 4h{geradoEm ? <>; última em <strong className="text-fg">{data(geradoEm)}</strong></> : null}. Mudanças recentes nas fontes podem levar até 24 h para aparecer.</span></li>
          <li className="flex items-start gap-2"><Scale size={14} className="mt-0.5 shrink-0 text-destaque" aria-hidden />
            <span>Pontos de atenção são regras estatísticas iguais para todos, com a evidência ao lado. <strong className="text-fg">Não constituem acusação.</strong></span></li>
          <li className="flex items-start gap-2"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-destaque" aria-hidden />
            <span>Projeto independente e apartidário, sem vínculo com a Câmara dos Deputados ou com qualquer partido.</span></li>
        </ul>

        <div className="flex flex-col gap-3 border-t border-border pt-5 text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>Desenvolvimento de <strong className="text-fg">{AUTOR.nome}</strong></p>
          <a href={AUTOR.apuracao} target="_blank" rel="noopener noreferrer" className="pilula">
            <ExternalLink size={16} aria-hidden /> Apuração Eleições 2026
          </a>
        </div>
      </div>
    </footer>
  );
}
