/** Contrato de dados gerado pelo pipeline (pipeline/src/monitora/export.py). */

export type Severidade = "info" | "atencao" | "alta";

export interface Indicadores {
  gasto_total: number;
  gasto_medio_mensal: number;
  pct_cota_usada: number | null;
  pct_maior_fornecedor: number;
  n_proposicoes_relevantes: number;
  n_proposicoes_coautor: number;
  n_requerimentos: number;
  n_relatorias: number;
  n_aprovadas: number;
  pct_presenca_sessoes: number | null;
  pct_participacao_votacoes: number | null;
  pct_alinhamento_partido: number | null;
  pct_alinhamento_governo: number | null;
  n_votos_contra_bancada: number;
  custo_por_proposicao: number | null;
  custo_por_sessao: number | null;
  /** Sessões com ausência sem justificativa oficial. */
  n_faltas_sem_justificativa: number | null;
  /** Ausências justificadas (licença médica, missão autorizada…): não entram na presença nem nos rankings. */
  n_faltas_justificadas: number;
  meses_exercicio: number;
}

export type NomeIndicador = Exclude<keyof Indicadores, "meses_exercicio">;

export interface Posicao {
  brasil: number;
  uf: number;
  partido: number;
  percentil: number;
  /** Quantos deputados entraram neste ranking (≥ 1 mês de exercício e valor não nulo). */
  total?: number;
}
export type Posicoes = Partial<Record<NomeIndicador, Posicao>>;

export interface Pico {
  periodo: string;
  valor: number;
  fator: number | null;
  rotulo: string;
}
export interface Serie {
  metrica: "gasto" | "votacoes" | "presenca" | "proposicoes" | "votacoes_semana";
  pontos: { periodo: string; valor: number }[];
  picos: Pico[];
}

export interface Evidencia {
  tipo: string;
  ref: string;
  valor: number | null;
  url: string | null;
}
export interface Alerta {
  id: string;
  regra: string;
  deputado_id: number;
  severidade: Severidade;
  titulo: string;
  descricao: string;
  evidencias: Evidencia[];
}

export interface DeputadoResumo {
  id: number;
  nome: string;
  uf: string;
  partido_atual: string;
  foto: string | null;
  sexo: string | null;
  situacao: string | null;
  condicao_eleitoral: string | null;
  inicio_exercicio: string | null;
  fim_exercicio: string | null;
  em_exercicio: boolean;
  trocou_partido: boolean;
  indicadores: Indicadores | null;
  posicoes: Posicoes;
  n_alertas: number;
  regras_alerta: string[];
  n_secretarios?: number;
  custo_equipe_estimado?: number;
  emendas_empenhado?: number | null;
  emendas_pago?: number | null;
}

export interface Deputado {
  id: number;
  nome: string;
  nome_civil: string | null;
  sexo: string | null;
  uf: string;
  partido_atual: string;
  foto: string | null;
  email: string | null;
  gabinete: Record<string, string> | null;
  redes: string[] | null;
  escolaridade: string | null;
  nascimento: string | null;
  situacao: string | null;
  condicao_eleitoral: string | null;
  inicio_exercicio: string | null;
  fim_exercicio: string | null;
  em_exercicio: boolean;
  trocou_partido: boolean;
}

export interface Proposicao {
  id: number;
  sigla_tipo: string;
  numero: number | null;
  ano: number | null;
  ementa: string | null;
  tema: string | null;
  data_apresentacao: string | null;
  situacao: string | null;
  relevante: boolean;
  url_inteiro_teor: string | null;
  principal: boolean;
}

export interface NoRede {
  id: string;
  tipo: "deputado" | "fornecedor" | "passageiro" | "socio";
  rotulo: string;
  valor: number;
}
export interface Rede {
  nos: NoRede[];
  arestas: { origem: string; destino: string; valor: number | null; n: number }[];
}

export interface Secretario {
  nome: string;
  cargo: string | null;
  nivel: number | null;
  salario_estimado: number | null;
  nomeacao: string | null;
  inicio: string | null;
}
export interface Gabinete {
  secretarios: Secretario[];
  n: number;
  custo_estimado: number;
  nomeados_12m: number;
  verba: number;
  limite: number;
}

export interface Emenda {
  codigo: string;
  ano: number | null;
  tipo: string | null;
  localidade: string | null;
  uf: string | null;
  funcao: string | null;
  empenhado: number;
  pago: number;
  pix: boolean;
}
export interface Emendas {
  n: number;
  empenhado: number;
  pago: number;
  restos_pagos: number;
  pix: number;
  fora_uf: number;
  por_ano: { ano: number; empenhado: number; pago: number; pix: number | null }[];
  por_funcao: { rotulo: string; valor: number }[];
  por_local: { rotulo: string; uf: string | null; valor: number }[];
  favorecidos: { nome: string; natureza: string | null; uf: string | null; municipio: string | null; valor: number }[];
  lista: Emenda[];
}

export interface DeputadoDetalhe {
  deputado: Deputado;
  indicadores: Indicadores | null;
  posicoes: Posicoes;
  series: Serie[];
  alertas: Alerta[];
  top_fornecedores: { cnpj: string | null; nome: string; valor: number; n: number }[];
  proposicoes: Proposicao[];
  rede: Rede;
  /** Ausentes em publicações anteriores à Fase 3. */
  gabinete?: Gabinete;
  emendas?: Emendas;
}

export interface Estatistica {
  media: number | null;
  mediana: number | null;
  soma: number | null;
}
export type Grupo = { n: number } & Record<NomeIndicador, Estatistica>;

export interface Brasil {
  agregados: { brasil: Grupo; uf: Record<string, Grupo>; partido: Record<string, Grupo> };
  series: Serie[];
  series_uf: Record<string, Serie[]>;
  series_partido: Record<string, Serie[]>;
  totais: { gasto_total: number; n_votacoes: number; n_proposicoes_relevantes: number; n_sessoes: number; n_alertas: number;
    emendas_empenhado?: number; emendas_pago?: number; n_secretarios?: number };
}

export interface Regra {
  id: string;
  titulo: string;
  severidade: Severidade;
  descricao: string;
}

export interface Meta {
  gerado_em: string;
  anos: number[];
  fontes: Record<string, { desatualizada: boolean; atualizado_em: string | null }>;
  indicadores: NomeIndicador[];
  contagens: Record<string, number>;
  regras: Regra[];
  rodape_alerta: string;
  ficticio: boolean;
}
