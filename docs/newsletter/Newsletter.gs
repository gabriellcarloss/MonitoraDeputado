/**
 * MonitoraDeputado — newsletter diária por e-mail (acumulado dos últimos 7 dias).
 *
 * Roda na conta gabriel.carlos@gcarlosdados.com (os e-mails saem dela). Instalação: docs/newsletter/LEIAME.md.
 *
 * O que faz:
 *  - todo dia (enviarResumoDiario): quem se cadastrou com consentimento e ainda não recebeu nada ganha um e-mail de
 *    agradecimento com o resumo dos últimos 7 dias sobre o interesse escolhido (um deputado ou o resumo geral);
 *    quem já está na lista recebe, uma vez por dia, o acumulado dos últimos 7 dias;
 *  - link de descadastro em todo e-mail (doGet), sem login.
 *
 * Os fatos vêm do site (arquivos /data/semanal/<id>.json, gerados todo dia pelo pipeline com dados oficiais da Câmara).
 */

var CONFIG = {
  PLANILHA_ID: "17rUCwmTaw9no1irxW8a2ooz31iHts_wP2t7vAbkjlFw",
  ABA: "Cadastros",
  SITE: "https://monitoradeputado.vercel.app",
  NOME_REMETENTE: "MonitoraDeputado",
  RESPONDER_PARA: "gabriel.carlos@gcarlosdados.com",
  TESTE_PARA: "gabriel.carlos@gcarlosdados.com",
  PIX: "00020126580014br.gov.bcb.pix013689ef6957-7a16-451f-8f6b-a026331b88545204000053039865802BR5914GABRIEL CARLOS6009SAO PAULO62200516MONITORADEPUTADO630407D9",
  WHATSAPP: "5511918737727", // botão "Falar no WhatsApp" (só dígitos, com 55 + DDD)
  MAX_POR_EXECUCAO: 80, // folga sob a cota diária do Google Workspace (1.500)
};

// Colunas que a automação usa (criadas por configurar() se faltarem, sempre no fim da aba).
var COL = { data: "Data", email: "E-mail", interesse: "Interesse", origem: "Origem", consent: "Consentimento",
  nome: "Nome", newsletter: "Newsletter", boasVindas: "Boas-vindas em", ultimo: "Último envio", erro: "Último erro" };

/* ============================ instalação ============================ */

/** Rode UMA vez (Executar → configurar): cria as colunas, o segredo do descadastro e os gatilhos. */
function configurar() {
  var aba = aba_();
  [COL.nome, COL.newsletter, COL.boasVindas, COL.ultimo, COL.erro].forEach(function (c) { coluna_(aba, c); });
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty("SEGREDO")) props.setProperty("SEGREDO", Utilities.getUuid() + Utilities.getUuid());
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (["boasVindasDiarias", "resumoSemanal", "enviarResumoDiario"].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("enviarResumoDiario").timeBased().everyDays(1).atHour(8).inTimezone("America/Sao_Paulo").create();
  Logger.log("Pronto. Falta só publicar como App da Web (Implantar) para o link de descadastro funcionar.");
}

/** Manda os modelos para o seu e-mail de teste, sem tocar na planilha. Rode antes de ligar para valer. */
function testar() {
  var casos = [
    { nome: "Gabriel", interesse: "Resumo geral", origem: "home", tipo: "boasVindas" },
    { nome: "Gabriel", interesse: "Nikolas Ferreira (PL-MG)", origem: "deputado-209787", tipo: "diario" },
    { nome: "", interesse: "Amom Mandel (REPUBLICANOS-AM)", origem: "deputado-220715", tipo: "boasVindas" },
  ];
  casos.forEach(function (c) {
    var m = montarEmail_(c.tipo, c, CONFIG.TESTE_PARA);
    enviar_(CONFIG.TESTE_PARA, m);
  });
  Logger.log("3 e-mails de teste enviados para " + CONFIG.TESTE_PARA);
}

/* ============================ rotinas diárias ============================ */

/**
 * Gatilho diário (8h) e também o botão "enviar agora": cada pessoa ativa recebe no máximo um e-mail por dia.
 * Quem nunca recebeu nada ganha o de boas-vindas; os demais, o acumulado dos últimos 7 dias.
 */
function enviarResumoDiario() {
  processar_(function (p, agora) {
    if (!p.consent || !p.ativo) return false;
    if (!p.ultimo) return true;
    return p.ultimo.toDateString() !== agora.toDateString();
  }, "diario");
}

function processar_(filtro, tipo) {
  var aba = aba_(), cab = cabecalho_(aba), n = aba.getLastRow() - 1;
  if (n < 1) return;
  var dados = aba.getRange(2, 1, n, aba.getLastColumn()).getValues();
  var agora = new Date(), enviados = 0;
  for (var i = 0; i < dados.length && enviados < CONFIG.MAX_POR_EXECUCAO; i++) {
    var p = pessoa_(dados[i], cab);
    if (!p.email || !filtro(p, agora)) continue;
    if (MailApp.getRemainingDailyQuota() < 5) { Logger.log("Cota diária quase no fim; continua amanhã."); break; }
    var linha = i + 2;
    try {
      var efetivo = p.boasVindas ? "diario" : "boasVindas";
      enviar_(p.email, montarEmail_(efetivo, p, p.email));
      if (efetivo === "boasVindas") aba.getRange(linha, cab[COL.boasVindas] + 1).setValue(agora);
      aba.getRange(linha, cab[COL.ultimo] + 1).setValue(agora);
      if (!p.newsletter) aba.getRange(linha, cab[COL.newsletter] + 1).setValue("ativo");
      aba.getRange(linha, cab[COL.erro] + 1).clearContent();
      enviados++;
      Utilities.sleep(400);
    } catch (e) {
      aba.getRange(linha, cab[COL.erro] + 1).setValue(String(e).slice(0, 200));
    }
  }
  Logger.log(tipo + ": " + enviados + " e-mail(s) enviado(s).");
}

function enviar_(para, m) {
  MailApp.sendEmail({ to: para, subject: m.assunto, body: m.texto, htmlBody: m.html, name: CONFIG.NOME_REMETENTE,
    replyTo: CONFIG.RESPONDER_PARA });
}

/* ============================ descadastro (App da Web) ============================ */

function doGet(e) {
  var email = String((e.parameter || {}).e || "").toLowerCase(), t = String((e.parameter || {}).t || "");
  var ok = email && t && t === token_(email);
  if (ok) {
    var aba = aba_(), cab = cabecalho_(aba), n = aba.getLastRow() - 1;
    if (n >= 1) {
      var mails = aba.getRange(2, cab[COL.email] + 1, n, 1).getValues();
      for (var i = 0; i < mails.length; i++) {
        if (String(mails[i][0]).toLowerCase() === email) aba.getRange(i + 2, cab[COL.newsletter] + 1).setValue("descadastrado");
      }
    }
  }
  var msg = ok ? "Pronto! Você não vai mais receber os e-mails do MonitoraDeputado."
    : "Este link de descadastro não é válido. Responda a qualquer e-mail do MonitoraDeputado e cancelamos para você.";
  return HtmlService.createHtmlOutput(
    '<div style="font-family:Arial,sans-serif;max-width:480px;margin:48px auto;padding:24px;text-align:center">' +
    '<h2 style="color:#0b5a3d">MonitoraDeputado</h2><p style="font-size:16px">' + msg + "</p>" +
    '<p><a href="' + CONFIG.SITE + '">Voltar ao site</a></p></div>').setTitle("MonitoraDeputado");
}

function token_(email) {
  var seg = PropertiesService.getScriptProperties().getProperty("SEGREDO") || "";
  var bytes = Utilities.computeHmacSha256Signature(String(email).toLowerCase(), seg);
  return bytes.map(function (b) { return ("0" + (b & 0xff).toString(16)).slice(-2); }).join("").slice(0, 24);
}

function linkSair_(email) {
  var base = PropertiesService.getScriptProperties().getProperty("URL_APP") || ScriptApp.getService().getUrl();
  return base + "?e=" + encodeURIComponent(email) + "&t=" + token_(email);
}

/* ============================ planilha ============================ */

function aba_() { return SpreadsheetApp.openById(CONFIG.PLANILHA_ID).getSheetByName(CONFIG.ABA); }

function cabecalho_(aba) {
  var m = {};
  aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].forEach(function (c, i) { m[String(c).trim()] = i; });
  return m;
}

function coluna_(aba, nome) {
  var cab = cabecalho_(aba);
  if (cab[nome] === undefined) aba.getRange(1, aba.getLastColumn() + 1).setValue(nome);
}

function pessoa_(linha, cab) {
  var v = function (c) { var i = cab[c]; return i === undefined ? "" : linha[i]; };
  var email = String(v(COL.email)).trim().toLowerCase();
  var stat = String(v(COL.newsletter)).trim().toLowerCase();
  var d = function (x) { return x instanceof Date ? x : (x ? new Date(x) : null); };
  return {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : "",
    nome: String(v(COL.nome)).trim(), interesse: String(v(COL.interesse)).trim() || "Resumo geral",
    origem: String(v(COL.origem)).trim(),
    consent: String(v(COL.consent)).trim().toLowerCase() === "sim",
    newsletter: stat, ativo: stat !== "descadastrado" && stat !== "pausado",
    boasVindas: d(v(COL.boasVindas)), ultimo: d(v(COL.ultimo)),
  };
}

/* ============================ conteúdo ============================ */

function buscar_(caminho) {
  try {
    var r = UrlFetchApp.fetch(CONFIG.SITE + "/data/semanal/" + caminho + ".json", { muteHttpExceptions: true });
    return r.getResponseCode() === 200 ? JSON.parse(r.getContentText()) : null;
  } catch (e) { return null; }
}

var CACHE_ = {};
function dados_(caminho) { if (!(caminho in CACHE_)) CACHE_[caminho] = buscar_(caminho); return CACHE_[caminho]; }

/** "deputado-220715" → "220715"; qualquer outra coisa vira o resumo geral. */
function alvo_(p) { var m = /^deputado-(\d+)$/.exec(p.origem || ""); return m ? m[1] : "geral"; }

function montarEmail_(tipo, p, email) {
  var id = alvo_(p), dep = id === "geral" ? null : dados_(id), geral = dados_("geral");
  var fonte = dep || geral; // se o arquivo do deputado não existir, cai no geral
  var ctx = { tipo: tipo, nome: primeiroNome_(p.nome), interesse: dep ? nomeDep_(dep) : "o resumo geral da Câmara",
    rotulo: dep ? nomeDep_(dep) : "Resumo geral", dep: dep, geral: geral, janela: fonte ? fonte.janela : null,
    site: CONFIG.SITE, sair: linkSair_(email), foto: dep && dep.deputado.foto, link: dep ? CONFIG.SITE + "/deputado/" + id + "/" : CONFIG.SITE + "/" };
  return { assunto: assunto_(ctx), html: html_(ctx), texto: texto_(ctx) };
}

function nomeDep_(dep) { var d = dep.deputado; return d.nome + " (" + d.partido + "-" + d.uf + ")"; }

function primeiroNome_(nome) {
  var n = String(nome || "").trim().split(/\s+/)[0];
  return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : "";
}

function dataBr_(iso) { var p = String(iso).split("-"); return p[2] + "/" + p[1]; }
function reais_(v) { return "R$ " + Number(v || 0).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
function esc_(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function plural_(n, um, varios) { return n + " " + (n === 1 ? um : varios); }
function cortar_(s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; }

function assunto_(c) {
  var per = c.janela ? dataBr_(c.janela.inicio) + " a " + dataBr_(c.janela.fim) : "";
  var n = c.nome ? c.nome + ", " : "";
  if (c.tipo === "boasVindas") return n + "seu primeiro resumo do MonitoraDeputado chegou (" + c.rotulo + ")";
  var g = c.geral, d = c.dep, fato = "";
  if (d) fato = plural_(d.votos.total, "votação", "votações") + " e " + plural_(d.proposicoes.total, "proposição", "proposições");
  else if (g) fato = plural_(g.sessoes, "sessão", "sessões") + ", " + plural_(g.votacoes, "votação", "votações") + " e " + reais_(g.gasto_cota).replace(/,\d\d$/, "") + " em gastos";
  return c.rotulo + ": " + (fato ? fato + " na semana" : "seu resumo dos últimos 7 dias") + " (" + per + ")";
}

/* ---- blocos do resumo: devolvem lista de {titulo, valor, nota} e de destaques ---- */

function numeros_(c) {
  if (c.dep) {
    var d = c.dep, pr = d.presenca, g = d.gasto_semana, out = [];
    out.push(pr ? { v: pr.presentes + "/" + pr.sessoes, t: "sessões com presença", n: pr.faltas ? plural_(pr.faltas, "falta", "faltas") : "nenhuma falta" }
      : { v: "—", t: "sessões em 7 dias", n: "sem sessão deliberativa" });
    out.push({ v: String(d.votos.total), t: d.votos.total === 1 ? "votação registrada" : "votações registradas", n: "em plenário" });
    out.push({ v: String(d.proposicoes.total), t: d.proposicoes.total === 1 ? "proposição apresentada" : "proposições apresentadas", n: "como autor ou coautor" });
    out.push(g ? { v: reais_(g.total), t: "da cota parlamentar", n: plural_(g.documentos, "nota", "notas") + " em 7 dias" }
      : d.gasto_mes_recente ? { v: reais_(d.gasto_mes_recente.total), t: "da cota em " + d.gasto_mes_recente.ano_mes.split("-").reverse().join("/"), n: "último mês com dados" }
        : { v: "—", t: "da cota parlamentar", n: "sem notas em 7 dias" });
    return out;
  }
  var g2 = c.geral;
  if (!g2) return [];
  return [
    { v: String(g2.sessoes), t: g2.sessoes === 1 ? "sessão deliberativa" : "sessões deliberativas", n: "na Câmara" },
    { v: String(g2.votacoes), t: g2.votacoes === 1 ? "votação" : "votações", n: g2.votacoes ? g2.aprovadas + " aprovadas · " + g2.rejeitadas + " rejeitadas" : "nominais, com voto de cada deputado" },
    { v: g2.proposicoes.toLocaleString("pt-BR"), t: g2.proposicoes === 1 ? "proposição nova" : "proposições novas", n: "apresentadas" },
    { v: reais_(g2.gasto_cota), t: "gastos da cota", n: "notas dos 7 dias" },
  ];
}

function destaques_(c) {
  var out = [];
  if (c.dep) {
    c.dep.votos.destaques.forEach(function (v) {
      out.push({ ico: "🗳️", t: "Votou " + String(v.voto || "").toLowerCase() + (v.resultado ? " · proposta " + v.resultado : ""), d: cortar_(v.descricao, 170) });
    });
    c.dep.proposicoes.itens.forEach(function (p) { out.push({ ico: "📝", t: "Apresentou " + p.nome + (p.tema ? " · " + p.tema : ""), d: cortar_(p.ementa, 170) }); });
    if (c.dep.alertas.total) out.push({ ico: "⚠️", t: plural_(c.dep.alertas.total, "ponto de atenção", "pontos de atenção") + " no perfil", d: cortar_(c.dep.alertas.titulos.join(" · "), 170) });
  } else if (c.geral) {
    c.geral.destaques.forEach(function (v) {
      out.push({ ico: "🗳️", t: "Votação" + (v.resultado ? " " + v.resultado : "") + (v.tema ? " · " + v.tema : ""), d: cortar_(v.descricao, 170) });
    });
    if (c.geral.maiores_gastos.length) {
      out.push({ ico: "💸", t: "Maiores gastos da cota em 7 dias", d: c.geral.maiores_gastos.map(function (x) { return x.nome + " (" + x.partido + "-" + x.uf + "): " + reais_(x.valor); }).join(" · ") });
    }
  }
  return out;
}

/** Leituras prontas do resumo geral (só usam números que já vêm do site). */
function insights_(c) {
  var g = c.geral, out = [];
  if (c.dep) {
    var d = c.dep, pr = d.presenca;
    if (pr) out.push({ ico: pr.faltas ? "📍" : "✅", t: pr.faltas ? plural_(pr.faltas, "falta", "faltas") + " em " + plural_(pr.sessoes, "sessão", "sessões") : "Presença em todas as sessões",
      d: "Compareceu a " + pr.presentes + " de " + pr.sessoes + " sessões deliberativas nos últimos 7 dias. Falta justificada aparece como falta no registro da Câmara." });
    else out.push({ ico: "🏛️", t: "Sem sessão deliberativa na semana", d: "Sem sessão com chamada de presença, não há como medir comparecimento nesse período." });
    if (d.votos.total) out.push({ ico: "🗳️", t: "Participou de " + plural_(d.votos.total, "votação nominal", "votações nominais"), d: "Os votos de cada deputado em plenário ficam públicos; veja o histórico completo no perfil." });
    var gs = d.gasto_semana;
    if (gs) out.push({ ico: "💸", t: reais_(gs.total) + " da cota lançados na semana", d: "São " + plural_(gs.documentos, "nota", "notas") + ". A cota tem atraso de lançamento, então o total pode crescer nas próximas semanas." });
    return out;
  }
  if (!g) return out;
  if (!g.votacoes) {
    out.push({ ico: "🏛️", t: "Semana sem votações nominais",
      d: "O plenário teve " + plural_(g.sessoes, "sessão", "sessões") + ", mas nenhuma votação em que o voto de cada deputado fica registrado. " +
        "Votações simbólicas não entram nessa conta." });
  } else {
    var tx = g.aprovadas + " aprovadas e " + g.rejeitadas + " rejeitadas";
    if (g.temas && g.temas.length) tx += ". Tema que mais apareceu: " + g.temas[0].tema + " (" + plural_(g.temas[0].n, "votação", "votações") + ")";
    out.push({ ico: "🗳️", t: plural_(g.votacoes, "votação nominal", "votações nominais") + " na semana", d: tx + "." });
  }
  if (g.proposicoes) {
    var dia = Math.max(1, Math.round(g.proposicoes / 7));
    out.push({ ico: "📝", t: "Ritmo de proposições: cerca de " + dia + " por dia",
      d: "Foram " + g.proposicoes.toLocaleString("pt-BR") + " propostas novas em 7 dias. Vale acompanhar quais delas avançam." });
  }
  if (g.gasto_cota && g.maiores_gastos && g.maiores_gastos.length) {
    var m = g.maiores_gastos, top = m[0], pct = Math.round(100 * top.valor / g.gasto_cota);
    var tres = Math.round(100 * m.reduce(function (a, x) { return a + x.valor; }, 0) / g.gasto_cota);
    out.push({ ico: "💸", t: top.nome + " concentra " + pct + "% da cota da semana",
      d: "Só ele somou " + reais_(top.valor) + " dos " + reais_(g.gasto_cota) + " lançados. Os 3 maiores gastos juntos representam " + tres + "% do total. " +
        "As notas chegam com atraso, então o valor pode mudar nas próximas semanas." });
  }
  return out;
}

function zap_(c) {
  var msg = "Dá para acompanhar o que os deputados federais votam, gastam e propõem, com dados oficiais, no MonitoraDeputado: " + c.link;
  return "https://wa.me/?text=" + encodeURIComponent(msg);
}

function pixBloco_(c, VERDE, AZUL, TINTA, AMARELO) {
  var qr = c.site + "/email/pix.png";
  return '<tr><td style="padding:14px 26px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + TINTA + ';border-radius:14px"><tr>' +
    '<td width="150" valign="middle" align="center" style="padding:16px 0 16px 16px"><img src="' + qr + '" width="130" height="130" alt="QR Code Pix" style="display:block;background:#ffffff;border-radius:10px;padding:6px"></td>' +
    '<td valign="middle" style="padding:16px 18px"><div style="font:800 16px/1.25 Arial,Helvetica,sans-serif;color:' + AMARELO + '">Ajude o MonitoraDeputado a continuar</div>' +
    '<div style="font:13px/1.5 Arial,Helvetica,sans-serif;color:#d6e1dc;margin-top:6px">Projeto independente e gratuito, mantido por uma pessoa só. ' +
    'Se ele te ajuda a entender o que seus deputados fazem, apoie com <strong style="color:#ffffff">qualquer valor</strong> por Pix: aponte a câmera para o QR Code.</div></td></tr>' +
    '<tr><td colspan="2" style="padding:0 18px 16px"><div style="font:700 11px/1.3 Arial,Helvetica,sans-serif;color:#9fb3ab;text-transform:uppercase;letter-spacing:.5px">Pix copia e cola · Gabriel Carlos</div>' +
    '<div style="font:11px/1.45 Consolas,Menlo,monospace;color:#ffffff;background:#0d2350;border-radius:8px;padding:8px 10px;margin-top:5px;word-break:break-all">' + esc_(CONFIG.PIX) + '</div></td></tr></table></td></tr>';
}

function zapFalar_() { return "https://wa.me/" + CONFIG.WHATSAPP + "?text=" + encodeURIComponent("Olá! Vim pelo e-mail do MonitoraDeputado."); }

/* ---- HTML ---- */

function html_(c) {
  var VERDE = "#0b5a3d", AMARELO = "#ffdf00", AZUL = "#002776", TINTA = "#06122A";
  var saud = c.tipo === "boasVindas"
    ? "Obrigado por assinar" + (c.nome ? ", " + esc_(c.nome) : "") + "!"
    : "Olá" + (c.nome ? ", " + esc_(c.nome) : "") + "! Seu resumo de hoje";
  var intro = c.tipo === "boasVindas"
    ? "Que bom ter você por aqui! Em vez de caçar informação em vários sites, você recebe, em poucos minutos de leitura, o que <strong>" + esc_(c.interesse) + "</strong> fez nos últimos 7 dias, com dados oficiais da Câmara. " +
      "Todo dia um novo resumo chega neste e-mail. Para começar, veja a semana:"
    : "Aqui está o que aconteceu com <strong>" + esc_(c.interesse) + "</strong> nos últimos 7 dias, direto dos dados oficiais:";
  var per = c.janela ? "Últimos 7 dias · " + dataBr_(c.janela.inicio) + " a " + dataBr_(c.janela.fim) : "";
  var nums = numeros_(c), dest = destaques_(c);

  var cards = "";
  for (var i = 0; i < nums.length; i += 2) {
    cards += "<tr>" + [nums[i], nums[i + 1]].map(function (n) {
      if (!n) return '<td width="50%"></td>';
      return '<td width="50%" valign="top" style="padding:5px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f6f3;border-radius:12px;border-left:4px solid ' + AMARELO + '"><tr><td style="padding:12px 14px">' +
        '<div style="font:800 24px/1.1 Arial,Helvetica,sans-serif;color:' + AZUL + '">' + esc_(n.v) + "</div>" +
        '<div style="font:700 12px/1.3 Arial,Helvetica,sans-serif;color:' + TINTA + ';margin-top:4px">' + esc_(n.t) + "</div>" +
        '<div style="font:12px/1.3 Arial,Helvetica,sans-serif;color:#5b6b66;margin-top:2px">' + esc_(n.n) + "</div></td></tr></table></td>";
    }).join("") + "</tr>";
  }

  var lista = dest.length ? dest.map(function (x) {
    return '<tr><td width="34" valign="top" style="padding:10px 0;font-size:20px">' + x.ico + '</td><td style="padding:10px 0;border-bottom:1px solid #e4ece7">' +
      '<div style="font:700 14px/1.3 Arial,Helvetica,sans-serif;color:' + TINTA + '">' + esc_(x.t) + "</div>" +
      '<div style="font:13px/1.45 Arial,Helvetica,sans-serif;color:#44524d;margin-top:2px">' + esc_(x.d) + "</div></td></tr>";
  }).join("") : '<tr><td style="padding:14px 0;font:14px/1.5 Arial,Helvetica,sans-serif;color:#44524d">Sem votação nem proposição nova para destacar nos últimos 7 dias. ' +
    "O perfil completo continua atualizado no site.</td></tr>";

  var ins = insights_(c);
  var insHtml = ins.length ? '<tr><td style="padding:14px 26px 0"><h2 style="margin:8px 0 0;font:800 17px/1.2 Arial,Helvetica,sans-serif;color:' + AZUL + '">O que isso quer dizer</h2>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px">' + ins.map(function (x) {
      return '<tr><td style="padding:5px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffbe0;border-radius:12px;border-left:4px solid ' + VERDE + '"><tr><td width="40" valign="top" style="padding:12px 0 12px 12px;font-size:22px">' + x.ico + '</td>' +
        '<td style="padding:12px 14px 12px 6px"><div style="font:700 14px/1.3 Arial,Helvetica,sans-serif;color:' + TINTA + '">' + esc_(x.t) + '</div>' +
        '<div style="font:13px/1.5 Arial,Helvetica,sans-serif;color:#44524d;margin-top:3px">' + esc_(x.d) + "</div></td></tr></table></td></tr>";
    }).join("") + "</table></td></tr>" : "";
  var pix = pixBloco_(c, VERDE, AZUL, TINTA, AMARELO);
  var botoesZap = '<tr><td align="center" style="padding:4px 26px 6px"><a href="' + esc_(zap_(c)) + '" style="display:inline-block;background:#25D366;color:#ffffff;font:800 14px/1 Arial,Helvetica,sans-serif;text-decoration:none;padding:14px 22px;border-radius:999px;margin:4px">&#128172; Compartilhar no WhatsApp</a>' +
    '<a href="' + esc_(zapFalar_()) + '" style="display:inline-block;background:#ffffff;color:#128C7E;border:2px solid #25D366;font:800 14px/1 Arial,Helvetica,sans-serif;text-decoration:none;padding:12px 20px;border-radius:999px;margin:4px">Falar no WhatsApp</a></td></tr>';

  var foto = c.foto ? '<td width="84" valign="middle" style="padding-right:14px"><img src="' + esc_(c.foto) + '" width="72" height="90" alt="" style="display:block;border-radius:10px;border:3px solid ' + AMARELO + ';object-fit:cover"></td>' : "";

  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:#e9efe9"><div style="display:none;max-height:0;overflow:hidden">' + esc_(per) + " · " + esc_(c.rotulo) + "</div>" +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e9efe9"><tr><td align="center" style="padding:20px 10px">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">' +
    '<tr><td style="background:' + TINTA + '"><a href="' + c.site + '"><img src="' + c.site + '/email/cabecalho.png" width="600" alt="MonitoraDeputado" style="display:block;width:100%;max-width:600px;height:auto"></a></td></tr>' +
    '<tr><td style="height:5px;background:' + VERDE + ';border-bottom:5px solid ' + AMARELO + '"></td></tr>' +
    '<tr><td style="padding:26px 26px 6px"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>' + foto + '<td valign="middle">' +
    '<div style="display:inline-block;background:' + AMARELO + ';color:' + TINTA + ';font:800 11px/1 Arial,Helvetica,sans-serif;letter-spacing:1px;text-transform:uppercase;padding:6px 9px;border-radius:6px">' + esc_(per) + "</div>" +
    '<h1 style="margin:10px 0 0;font:800 24px/1.15 Arial,Helvetica,sans-serif;color:' + VERDE + '">' + saud + "</h1></td></tr></table></td></tr>" +
    '<tr><td style="padding:8px 26px 4px;font:15px/1.55 Arial,Helvetica,sans-serif;color:#2b3834">' + intro + "</td></tr>" +
    '<tr><td style="padding:10px 21px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + cards + "</table></td></tr>" +
    '<tr><td style="padding:6px 26px 0"><h2 style="margin:8px 0 0;font:800 17px/1.2 Arial,Helvetica,sans-serif;color:' + AZUL + '">Destaques dos últimos 7 dias</h2>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + lista + "</table></td></tr>" + insHtml +
    '<tr><td align="center" style="padding:22px 26px 8px"><a href="' + esc_(c.link) + '" style="display:inline-block;background:' + AMARELO + ';color:' + TINTA + ';font:800 15px/1 Arial,Helvetica,sans-serif;text-decoration:none;padding:15px 26px;border-radius:999px">' +
    (c.dep ? "Ver o perfil completo" : "Abrir o painel") + " →</a></td></tr>" + botoesZap + pix +
    '<tr><td style="padding:14px 26px 24px;font:13px/1.55 Arial,Helvetica,sans-serif;color:#5b6b66;text-align:center">' +
    (c.tipo === "boasVindas" ? "O próximo resumo chega amanhã de manhã. " : "") + 'Quer acompanhar outro deputado ou mudar o que recebe? Responda este e-mail que eu ajusto para você.<br>Gabriel Carlos · MonitoraDeputado</td></tr>' +
    '<tr><td style="background:' + TINTA + ';padding:18px 26px;font:12px/1.6 Arial,Helvetica,sans-serif;color:#b9c7c1;text-align:center">' +
    "Dados públicos da Câmara dos Deputados, tratados e atualizados todo dia.<br>Você recebe este e-mail porque se cadastrou no MonitoraDeputado e autorizou o envio.<br>" +
    '<a href="' + esc_(c.sair) + '" style="color:' + AMARELO + '">Cancelar o recebimento</a> · <a href="' + c.site + '/privacidade/" style="color:' + AMARELO + '">Privacidade</a> · ' +
    '<span style="color:#8ea39b">Desenvolvimento de Gabriel Carlos</span></td></tr>' +
    "</table></td></tr></table></body></html>";
}

function texto_(c) {
  var l = [(c.tipo === "boasVindas" ? "Obrigado por assinar" + (c.nome ? ", " + c.nome : "") + "!" : "Seu resumo de hoje" + (c.nome ? ", " + c.nome : "")),
    c.rotulo + (c.janela ? " · últimos 7 dias, de " + dataBr_(c.janela.inicio) + " a " + dataBr_(c.janela.fim) : ""), ""];
  numeros_(c).forEach(function (n) { l.push("- " + n.v + " " + n.t + " (" + n.n + ")"); });
  l.push("");
  destaques_(c).forEach(function (x) { l.push("* " + x.t + ": " + x.d); });
  var ins = insights_(c);
  if (ins.length) { l.push("", "O que isso quer dizer:"); ins.forEach(function (x) { l.push("* " + x.t + ": " + x.d); }); }
  l.push("", "Ajude o MonitoraDeputado (projeto independente e gratuito) com qualquer valor por Pix copia e cola, recebedor Gabriel Carlos:", CONFIG.PIX);
  l.push("", "Veja mais: " + c.link, "Compartilhar no WhatsApp: " + zap_(c), "Falar no WhatsApp: " + zapFalar_(), "", "Cancelar o recebimento: " + c.sair);
  return l.join("\n");
}
