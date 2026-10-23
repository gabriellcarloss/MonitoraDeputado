import { brl, num, ouTraco, pct } from "./format";
import type { NomeIndicador } from "./types";

export interface InfoIndicador {
  rotulo: string;
  formato: (v: number | null | undefined) => string;
  menorMelhor?: boolean;
  ajuda: string;
}

const B = (v: number | null | undefined) => ouTraco(v, brl);
const P = (v: number | null | undefined) => ouTraco(v, (x) => pct(x));
const N = (v: number | null | undefined) => ouTraco(v, num);

export const INDICADORES: Record<NomeIndicador, InfoIndicador> = {
  gasto_total: { rotulo: "Gasto da cota", formato: B, menorMelhor: true, ajuda: "Soma dos valores líquidos reembolsados pela CEAP no período." },
  gasto_medio_mensal: { rotulo: "Gasto médio mensal", formato: B, menorMelhor: true, ajuda: "Gasto da cota dividido pelos meses em exercício." },
  pct_cota_usada: { rotulo: "Cota utilizada", formato: P, menorMelhor: true, ajuda: "Gasto em relação ao teto mensal da cota da UF × meses em exercício." },
  pct_maior_fornecedor: { rotulo: "Concentração no maior fornecedor", formato: P, menorMelhor: true, ajuda: "Parcela do gasto paga ao fornecedor que mais recebeu." },
  n_proposicoes_relevantes: { rotulo: "Projetos apresentados (autor)", formato: N, ajuda: "PL, PLP, PEC e PDL como autor principal." },
  n_proposicoes_coautor: { rotulo: "Projetos como coautor", formato: N, ajuda: "PL, PLP, PEC e PDL assinados como coautor." },
  n_requerimentos: { rotulo: "Requerimentos e indicações", formato: N, ajuda: "REQ, RIC, INC, MOC e IND como autor — atividade administrativa, contada à parte." },
  n_relatorias: { rotulo: "Relatorias", formato: N, ajuda: "Proposições em que é o relator atual." },
  n_aprovadas: { rotulo: "Projetos que viraram lei", formato: N, ajuda: "Projetos de autoria principal transformados em norma jurídica." },
  pct_presenca_sessoes: { rotulo: "Presença em sessões", formato: P, ajuda: "Sessões deliberativas do Plenário com presença registrada, durante o exercício. Ausências justificadas oficialmente (licença médica, missão autorizada) não entram na conta." },
  n_faltas_sem_justificativa: { rotulo: "Faltas sem justificativa", formato: N, menorMelhor: true, ajuda: "Sessões deliberativas em que esteve ausente sem justificativa registrada pela Câmara." },
  n_faltas_justificadas: { rotulo: "Ausências justificadas", formato: N, ajuda: "Sessões em que esteve ausente com justificativa oficial (licença médica, missão autorizada…). Não contam como falta e não entram em ranking." },
  pct_participacao_votacoes: { rotulo: "Participação em votações", formato: P, ajuda: "Votações nominais do Plenário em que registrou voto, durante o exercício." },
  pct_alinhamento_partido: { rotulo: "Alinhamento ao partido", formato: P, ajuda: "Votos iguais à orientação do próprio partido (quando orientou Sim ou Não)." },
  pct_alinhamento_governo: { rotulo: "Alinhamento ao governo", formato: P, ajuda: "Votos iguais à orientação do Governo (quando orientou Sim ou Não)." },
  n_votos_contra_bancada: { rotulo: "Votos contra o partido", formato: N, menorMelhor: true, ajuda: "Votos diferentes da orientação do próprio partido." },
  custo_por_proposicao: { rotulo: "Custo por projeto", formato: B, menorMelhor: true, ajuda: "Gasto da cota dividido pelos projetos apresentados como autor." },
  custo_por_sessao: { rotulo: "Custo por sessão presente", formato: B, menorMelhor: true, ajuda: "Gasto da cota dividido pelas sessões com presença." },
};

export const UFS = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR",
  "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"];
