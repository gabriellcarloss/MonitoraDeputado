import { Braces, ExternalLink, FileJson } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BaixarDados, type Conjunto } from "@/components/dados/BaixarDados";
import { Secao, Titulo } from "@/components/ui/StatTile";
import { getMeta } from "@/lib/data";
import { data } from "@/lib/format";

export const metadata: Metadata = {
  title: "Baixar dados",
  description: "Baixe as bases públicas do MonitoraDeputado em Excel, CSV, JSON ou Parquet: gastos da cota, votações, presença, proposições, emendas e equipes.",
};

const CONJUNTOS: Conjunto[] = [
  { tabela: "deputados", titulo: "Deputados", descricao: "Todos que exerceram mandato na legislatura: partido, UF, situação, contatos do gabinete e redes." },
  { tabela: "despesas", titulo: "Notas fiscais da cota (CEAP)", descricao: "Cada documento reembolsado: data, categoria, fornecedor, CNPJ/CPF, passageiro, trecho, valores e link da nota.",
    ano: "ano_mes LIKE '{ano}-%'" },
  { tabela: "fornecedores", titulo: "Fornecedores (Receita)", descricao: "Dados públicos do CNPJ de quem recebeu da cota: abertura, situação, atividade, município e sócios." },
  { tabela: "votacoes", titulo: "Votações", descricao: "Votações nominais com data, órgão, descrição, resultado e placar." },
  { tabela: "votos", titulo: "Votos", descricao: "Como cada deputado votou em cada votação nominal, com o partido na data.",
    ano: "year(data) = {ano}" },
  { tabela: "orientacao_partido", titulo: "Orientação dos partidos", descricao: "O que cada partido (e o Governo) orientou em cada votação." },
  { tabela: "sessoes", titulo: "Sessões deliberativas", descricao: "Sessões do Plenário consideradas no cálculo de presença." },
  { tabela: "presencas", titulo: "Presenças", descricao: "Presença de cada deputado em cada sessão, com a justificativa oficial quando a ausência foi justificada." },
  { tabela: "proposicoes", titulo: "Proposições", descricao: "Projetos, PECs, requerimentos e indicações: tipo, número, ementa, tema, situação e link do inteiro teor." },
  { tabela: "autorias", titulo: "Autorias", descricao: "Quem assinou cada proposição e em que ordem (autor principal ou coautor)." },
  { tabela: "relatorias", titulo: "Relatorias", descricao: "Relator atual de cada proposição e o órgão." },
  { tabela: "emendas", titulo: "Emendas parlamentares", descricao: "Emendas individuais desde o orçamento de 2024: valores empenhados e pagos, área, destino e transferências especiais (Pix)." },
  { tabela: "emendas_favorecidos", titulo: "Quem recebeu as emendas", descricao: "Pagamentos das emendas por favorecido: prefeituras, estados, entidades e empresas, com município e UF." },
  { tabela: "secretarios", titulo: "Equipes de gabinete", descricao: "Secretários parlamentares lotados hoje em cada gabinete, com o nível do cargo e a nomeação." },
];

const ARQUIVOS = [
  { nome: "deputados.json", o: "resumo por deputado com todos os indicadores e posições no ranking" },
  { nome: "alertas.json", o: "todos os pontos de atenção com as evidências" },
  { nome: "brasil.json", o: "totais, médias por UF e partido e séries mensais" },
  { nome: "meta.json", o: "data da atualização, fontes e regras" },
];

export default function Page() {
  const meta = getMeta();
  const anos = meta?.anos ?? [];
  return (
    <div className="space-y-10">
      <Titulo sobretitulo="Dados abertos" sub={<>Todas as bases usadas no site, prontas para Excel, Power BI, Python ou R. Os arquivos em Excel/CSV/JSON são gerados
        aqui mesmo no seu navegador; o Parquet é o arquivo original publicado a cada atualização{meta ? <> (última: {data(meta.gerado_em)})</> : null}.</>}>
        Baixar dados
      </Titulo>

      <BaixarDados conjuntos={CONJUNTOS} contagens={meta?.contagens ?? {}} anos={anos} />

      <Secao titulo="Resumos prontos (JSON)" sub="os mesmos arquivos que o site usa">
        <ul className="grid gap-3 sm:grid-cols-2">
          {ARQUIVOS.map((a) => (
            <li key={a.nome} className="cartao flex items-center gap-3 p-3" data-revelar>
              <FileJson size={20} className="shrink-0 text-destaque" aria-hidden />
              <span className="min-w-0 flex-1"><span className="block font-semibold">{a.nome}</span><span className="block text-xs text-muted">{a.o}</span></span>
              <a href={`/data/${a.nome}`} download className="pilula h-8 px-3 text-xs"><Braces size={14} aria-hidden /> Baixar</a>
            </li>
          ))}
        </ul>
      </Secao>

      <Secao titulo="Como citar e usar">
        <div className="cartao space-y-2 p-4 text-sm" data-revelar>
          <p>Os dados são públicos e vêm de fontes oficiais (Câmara dos Deputados, Portal da Transparência/CGU e Receita Federal). Você pode usá-los
            livremente. Ao publicar análises, cite as fontes originais e, se quiser, o MonitoraDeputado.</p>
          <p className="text-muted">Excel em português: use o formato &ldquo;Excel&rdquo;, que já sai com ponto e vírgula, vírgula decimal e acentos corretos.
            Para Python, R ou Power BI, prefira o Parquet (mais leve e com tipos certos).</p>
          <p>
            <Link href="/sobre/" className="text-destaque underline">Metodologia e definições</Link> ·{" "}
            <a href="https://dadosabertos.camara.leg.br/swagger/api.html" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-destaque underline">
              API da Câmara <ExternalLink size={12} aria-hidden /></a> ·{" "}
            <a href="https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-destaque underline">Emendas no Portal da Transparência <ExternalLink size={12} aria-hidden /></a>
          </p>
        </div>
      </Secao>
    </div>
  );
}
