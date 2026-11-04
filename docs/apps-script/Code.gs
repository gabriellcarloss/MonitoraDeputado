/**
 * MonitoraDeputado — coleta de cadastros, contatos e acessos numa planilha do Google.
 *
 * Como instalar ou atualizar: veja docs/coleta-planilha.md.
 * O script fica ligado à planilha (Extensões → Apps Script) e é publicado como "App da Web".
 * O site envia um POST em JSON (text/plain) e cada tipo cai numa aba própria.
 *
 * Cada valor é gravado na coluna com o NOME do cabeçalho: colunas novas entram no fim da aba e as linhas antigas
 * continuam no lugar. Você pode reordenar as colunas à vontade, desde que não renomeie os cabeçalhos.
 */

var ABAS = {
  cadastro: {
    nome: "Cadastros",
    // [cabeçalho, campo enviado pelo site]
    cols: [["Data", null], ["E-mail", "email"], ["Interesse", "interesse"], ["Origem", "origem"], ["Consentimento", "consentimento"],
      ["Status", null], ["Cidade (aprox.)", "cidade"], ["Estado (aprox.)", "estado"], ["Canal", "canal"]],
  },
  contato: {
    nome: "Contatos",
    cols: [["Data", null], ["Tipo", "assunto"], ["Nome", "nome"], ["E-mail", "email"], ["WhatsApp", "whatsapp"], ["Mensagem", "mensagem"],
      ["Origem", "origem"], ["Status", null], ["Cidade (aprox.)", "cidade"], ["Estado (aprox.)", "estado"]],
  },
  acesso: {
    nome: "Acessos",
    cols: [["Data", null], ["Página", "pagina"], ["Veio de", "referencia"], ["utm_source", "utm_source"], ["utm_medium", "utm_medium"],
      ["utm_campaign", "utm_campaign"], ["Dispositivo", "dispositivo"], ["Sessão", "sessao"],
      // a partir de 11/2026
      ["Evento", "evento"], ["Título da página", "titulo"], ["Deputado", "deputado"], ["Partido", "partido"],
      ["UF do deputado", "uf_deputado"], ["ID do deputado", "id_deputado"], ["Parâmetros", "parametros"], ["Canal", "canal"],
      ["Cidade (aprox.)", "cidade"], ["Estado (aprox.)", "estado"], ["País", "pais"], ["Fuso horário", "fuso"], ["Idioma", "idioma"],
      ["Sistema", "sistema"], ["Navegador", "navegador"], ["Tema", "tema"], ["Visitante", "visitante"], ["Nº da página na visita", "n_pagina"],
      ["Detalhe", "detalhe"]],
  },
};

var LIMITE = 2000; // caracteres por campo
var REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Roda à mão (Executar → configurar): cria/atualiza as abas, os cabeçalhos e a aba "Painel". Pode rodar quantas vezes quiser. */
function configurar() {
  Object.keys(ABAS).forEach(function (k) { aba_(k); });
  preencherDeputados();
  montarPainel();
}

/**
 * Preenche Deputado, Partido, UF e ID nas linhas antigas de acesso a páginas de deputado (antes da versão 2),
 * usando a lista pública do próprio site. Só escreve onde a célula está vazia.
 */
function preencherDeputados() {
  var aba = aba_("acesso");
  var n = aba.getLastRow() - 1;
  if (n < 1) return;
  var cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(String);
  var iPag = cab.indexOf("Página"), iDep = cab.indexOf("Deputado"), iPar = cab.indexOf("Partido"), iUf = cab.indexOf("UF do deputado"),
    iId = cab.indexOf("ID do deputado");
  var lista;
  try {
    lista = JSON.parse(UrlFetchApp.fetch("https://monitoradeputado.vercel.app/data/deputados.json", { muteHttpExceptions: true }).getContentText());
  } catch (e) { return; }
  var porId = {};
  lista.forEach(function (d) { porId[String(d.id)] = d; });
  var dados = aba.getRange(2, 1, n, cab.length).getValues();
  var mudou = false;
  dados.forEach(function (l) {
    var m = String(l[iPag]).match(/^\/deputado\/(\d+)\/?$/);
    if (!m || l[iDep]) return;
    var d = porId[m[1]];
    if (!d) return;
    l[iDep] = d.nome; l[iPar] = d.partido_atual; l[iUf] = d.uf; l[iId] = String(d.id);
    mudou = true;
  });
  if (mudou) aba.getRange(2, 1, n, cab.length).setValues(dados);
}

function doGet() {
  return resposta_({ ok: true, servico: "monitoradeputado-coleta", versao: 2 });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var corpo = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    var tipo = String(corpo.tipo || "");
    var def = ABAS[tipo];
    if (!def) return resposta_({ ok: false, erro: "tipo" });

    // Armadilha para robôs: o campo "site" fica escondido no formulário e deve vir vazio.
    if (corpo.site) return resposta_({ ok: true });

    var dados = {};
    def.cols.forEach(function (c) { if (c[1]) dados[c[1]] = limpar_(corpo[c[1]]); });

    if (tipo === "cadastro") {
      if (!REGEX_EMAIL.test(dados.email)) return resposta_({ ok: false, erro: "email" });
      if (corpo.consentimento !== true) return resposta_({ ok: false, erro: "consentimento" });
      dados.email = dados.email.toLowerCase();
      dados.consentimento = "sim";
    }
    if (tipo === "contato") {
      if (!dados.mensagem || dados.mensagem.length < 5) return resposta_({ ok: false, erro: "mensagem" });
      if (dados.email && !REGEX_EMAIL.test(dados.email)) return resposta_({ ok: false, erro: "email" });
    }

    var agora = new Date();

    lock.waitLock(20000);
    var aba = aba_(tipo);
    var cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];

    if (tipo === "cadastro" && jaExiste_(aba, cab.indexOf("E-mail") + 1, dados.email)) {
      return resposta_({ ok: true, repetido: true });
    }

    var linha = cab.map(function () { return ""; });
    def.cols.forEach(function (c) {
      var i = cab.indexOf(c[0]);
      if (i < 0) return;
      if (c[0] === "Data") linha[i] = agora;
      else if (c[0] === "Status") linha[i] = "novo";
      else if (c[1]) linha[i] = dados[c[1]] === undefined ? "" : dados[c[1]];
    });
    aba.appendRow(linha);
    return resposta_({ ok: true });
  } catch (err) {
    return resposta_({ ok: false, erro: "interno" });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

/** Abre a aba (criando se preciso) e garante todas as colunas no cabeçalho, acrescentando as que faltam no fim. */
function aba_(tipo) {
  var def = ABAS[tipo];
  var planilha = SpreadsheetApp.getActive();
  var aba = planilha.getSheetByName(def.nome);
  if (!aba) {
    aba = planilha.insertSheet(def.nome);
    aba.getRange(1, 1, 1, def.cols.length).setValues([def.cols.map(function (c) { return c[0]; })]);
    estilizarCabecalho_(aba, def.cols.length);
    return aba;
  }
  var ultima = Math.max(aba.getLastColumn(), 1);
  var cab = aba.getRange(1, 1, 1, ultima).getValues()[0].map(String);
  var faltam = def.cols.map(function (c) { return c[0]; }).filter(function (n) { return cab.indexOf(n) < 0; });
  if (faltam.length) {
    var inicio = cab.filter(function (x) { return x !== ""; }).length + 1;
    if (aba.getMaxColumns() < inicio + faltam.length - 1) aba.insertColumnsAfter(aba.getMaxColumns(), inicio + faltam.length - 1 - aba.getMaxColumns());
    aba.getRange(1, inicio, 1, faltam.length).setValues([faltam]);
    estilizarCabecalho_(aba, inicio + faltam.length - 1);
  }
  return aba;
}

function estilizarCabecalho_(aba, n) {
  aba.setFrozenRows(1);
  aba.getRange(1, 1, 1, n).setFontWeight("bold").setBackground("#0e5c40").setFontColor("#ffffff");
}

function jaExiste_(aba, coluna, valor) {
  var ultima = aba.getLastRow();
  if (ultima < 2 || coluna < 1) return false;
  var achado = aba.getRange(2, coluna, ultima - 1, 1).createTextFinder(valor).matchEntireCell(true).matchCase(false).findNext();
  return achado !== null;
}

/** Texto simples, sem fórmulas: um "=" no início viraria cálculo na planilha. */
function limpar_(v) {
  if (v === undefined || v === null) return "";
  var s = String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, LIMITE);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function resposta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------------------------------------------
// Painel: aba "Painel" com totais e gráficos que se atualizam sozinhos (fórmulas QUERY sobre a aba Acessos).
// Recriada a cada "configurar"; não mexe nas outras abas (incluindo um Dashboard feito à mão).
// ---------------------------------------------------------------------------------------------------------------

function letra_(n) {
  var s = "";
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/**
 * Fórmula no separador do idioma da planilha: em português (e outros idiomas com vírgula decimal) os argumentos
 * são separados por ";". Vírgulas dentro de textos entre aspas (como o comando do QUERY) ficam como estão.
 */
function fx_(formula) {
  var loc = String(SpreadsheetApp.getActive().getSpreadsheetLocale() || "en_US");
  var sep = /^(en|zh|ja|ko|th|he|iw|hi|ms|fil|tl)/i.test(loc) ? "," : ";";
  if (sep === ",") return formula;
  var out = "", aspas = false;
  for (var i = 0; i < formula.length; i++) {
    var ch = formula.charAt(i);
    if (ch === '"') aspas = !aspas;
    out += (ch === "," && !aspas) ? sep : ch;
  }
  return out;
}

function montarPainel() {
  var planilha = SpreadsheetApp.getActive();
  var acessos = aba_("acesso");
  var cad = aba_("cadastro");
  var con = aba_("contato");
  var cab = acessos.getRange(1, 1, 1, acessos.getLastColumn()).getValues()[0].map(String);
  var col = function (nome) { var i = cab.indexOf(nome); return i < 0 ? null : "Acessos!" + letra_(i + 1) + "2:" + letra_(i + 1); };
  var L = function (nome) { var i = cab.indexOf(nome); return letra_(i + 1); };
  var FAIXA = "Acessos!A2:" + letra_(cab.length);
  var A = L("Data"), B = L("Página"), G = L("Dispositivo");

  var painel = planilha.getSheetByName("Painel");
  if (painel) planilha.deleteSheet(painel);
  painel = planilha.insertSheet("Painel", 0);
  painel.setHiddenGridlines(true);
  painel.setColumnWidths(1, 16, 120);

  var verde = "#0e5c40", amarelo = "#ffdf00", azul = "#1f4fa3";
  painel.getRange("A1:P1").merge().setValue("MonitoraDeputado · Painel de acessos, cadastros e contatos")
    .setFontSize(18).setFontWeight("bold").setFontColor("#ffffff").setBackground(verde).setVerticalAlignment("middle");
  painel.setRowHeight(1, 44);
  painel.getRange("A2:P2").merge().setValue("Atualiza sozinho a cada novo registro. Para refazer o painel: Extensões → Apps Script → Executar → configurar.")
    .setFontColor("#52605b").setFontSize(10);

  // Cartões de números
  var R = function (aba, colNome) { var a = planilha.getSheetByName(aba); var c = a.getRange(1, 1, 1, a.getLastColumn()).getValues()[0].indexOf(colNome) + 1; return aba + "!" + letra_(c) + "2:" + letra_(c); };
  var cartoes = [
    ["Páginas vistas", "=COUNTA(" + col("Página") + ")"],
    ["Visitas (sessões)", "=COUNTUNIQUE(" + col("Sessão") + ")"],
    ["Páginas por visita", "=IFERROR(ROUND(COUNTA(" + col("Página") + ")/COUNTUNIQUE(" + col("Sessão") + "),1),0)"],
    ["Visitantes novos", "=COUNTIF(" + col("Visitante") + ",\"novo\")"],
    ["Hoje", "=COUNTIFS(" + col("Data") + ",\">=\"&TODAY())"],
    ["Últimos 7 dias", "=COUNTIFS(" + col("Data") + ",\">=\"&(TODAY()-6))"],
    ["Cadastros", "=COUNTA(" + R("Cadastros", "E-mail") + ")"],
    ["Contatos", "=COUNTA(" + R("Contatos", "Mensagem") + ")"],
  ];
  cartoes.forEach(function (c, i) {
    var colI = 1 + i * 2;
    painel.getRange(4, colI, 1, 2).merge().setValue(c[0]).setFontSize(9).setFontColor("#52605b").setFontWeight("bold");
    painel.getRange(5, colI, 1, 2).merge().setFormula(fx_(c[1])).setFontSize(22).setFontWeight("bold").setFontColor(i < 6 ? verde : azul)
      .setHorizontalAlignment("left").setNumberFormat("#,##0.#");
    painel.getRange(4, colI, 2, 2).setBorder(null, true, null, null, null, null, amarelo, SpreadsheetApp.BorderStyle.SOLID_THICK);
  });
  painel.setRowHeight(5, 40);

  // Tabelas de apoio (QUERY) — cada uma alimenta um gráfico
  var tabelas = [
    { t: "Páginas vistas por dia", f: "=QUERY(" + FAIXA + ",\"select toDate(" + A + "), count(" + B + ") where " + A + " is not null group by toDate(" + A + ") order by toDate(" + A + ") label toDate(" + A + ") 'Dia', count(" + B + ") 'Páginas'\",0)", g: "linha" },
    { t: "Deputados mais vistos", f: "=QUERY(" + FAIXA + ",\"select " + L("Deputado") + ", count(" + L("Página") + ") where " + L("Deputado") + " <> '' group by " + L("Deputado") + " order by count(" + L("Página") + ") desc limit 15 label " + L("Deputado") + " 'Deputado', count(" + L("Página") + ") 'Visitas'\",0)", g: "barra" },
    { t: "Páginas mais vistas", f: "=QUERY(" + FAIXA + ",\"select " + B + ", count(" + B + ") where " + B + " is not null group by " + B + " order by count(" + B + ") desc limit 15 label " + B + " 'Página', count(" + B + ") 'Visitas'\",0)", g: "barra" },
    { t: "Por canal de origem", f: "=QUERY(" + FAIXA + ",\"select " + L("Canal") + ", count(" + L("Canal") + ") where " + L("Canal") + " <> '' and " + L("Canal") + " <> 'Interno' group by " + L("Canal") + " order by count(" + L("Canal") + ") desc label " + L("Canal") + " 'Canal', count(" + L("Canal") + ") 'Visitas'\",0)", g: "pizza" },
    { t: "Por estado de quem visita", f: "=QUERY(" + FAIXA + ",\"select " + L("Estado (aprox.)") + ", count(" + L("Estado (aprox.)") + ") where " + L("Estado (aprox.)") + " <> '' group by " + L("Estado (aprox.)") + " order by count(" + L("Estado (aprox.)") + ") desc label " + L("Estado (aprox.)") + " 'UF', count(" + L("Estado (aprox.)") + ") 'Páginas'\",0)", g: "barra" },
    { t: "Por cidade", f: "=QUERY(" + FAIXA + ",\"select " + L("Cidade (aprox.)") + ", count(" + L("Cidade (aprox.)") + ") where " + L("Cidade (aprox.)") + " <> '' group by " + L("Cidade (aprox.)") + " order by count(" + L("Cidade (aprox.)") + ") desc limit 15 label " + L("Cidade (aprox.)") + " 'Cidade', count(" + L("Cidade (aprox.)") + ") 'Páginas'\",0)", g: "barra" },
    { t: "Por dispositivo", f: "=QUERY(" + FAIXA + ",\"select " + G + ", count(" + G + ") where " + G + " is not null group by " + G + " order by count(" + G + ") desc label " + G + " 'Dispositivo', count(" + G + ") 'Páginas'\",0)", g: "pizza" },
    { t: "Por hora do dia", f: "=QUERY(" + FAIXA + ",\"select hour(" + A + "), count(" + B + ") where " + A + " is not null group by hour(" + A + ") order by hour(" + A + ") label hour(" + A + ") 'Hora', count(" + B + ") 'Páginas'\",0)", g: "coluna" },
    { t: "Recursos usados (exportar, favoritar…)", f: "=QUERY(" + FAIXA + ",\"select " + L("Evento") + ", count(" + L("Evento") + ") where " + L("Evento") + " <> '' and " + L("Evento") + " <> 'pagina' group by " + L("Evento") + " order by count(" + L("Evento") + ") desc label " + L("Evento") + " 'Recurso', count(" + L("Evento") + ") 'Usos'\",0)", g: "barra" },
    { t: "Partidos dos deputados vistos", f: "=QUERY(" + FAIXA + ",\"select " + L("Partido") + ", count(" + L("Partido") + ") where " + L("Partido") + " <> '' group by " + L("Partido") + " order by count(" + L("Partido") + ") desc label " + L("Partido") + " 'Partido', count(" + L("Partido") + ") 'Visitas'\",0)", g: "pizza" },
  ];

  // dados das tabelas ficam a partir da coluna R (escondidas ao lado); os gráficos ficam no painel
  var colDados = 18;
  var precisa = colDados + tabelas.length * 3;
  if (painel.getMaxColumns() < precisa) painel.insertColumnsAfter(painel.getMaxColumns(), precisa - painel.getMaxColumns());
  tabelas.forEach(function (tb, i) {
    var c = colDados + i * 3;
    painel.getRange(7, c).setValue(tb.t).setFontWeight("bold");
    // sem registros ainda (ex.: colunas novas), o QUERY dá erro e o gráfico fica vazio: mostra uma linha de aviso
    var vazio = "VSTACK(SPLIT(\"Item|Total\",\"|\"),SPLIT(\"Ainda sem registros|0\",\"|\"))";
    painel.getRange(8, c).setFormula(fx_("=IFERROR(" + tb.f.slice(1) + "," + vazio + ")"));
  });

  var cores = [verde, azul, "#eda100", "#6250d6", "#e34948", "#2a78d6", "#009c3b", "#c98500"];
  tabelas.forEach(function (tb, i) {
    var c = colDados + i * 3;
    var faixa = painel.getRange(8, c, 60, 2);
    var tipo = tb.g === "linha" ? Charts.ChartType.LINE : tb.g === "pizza" ? Charts.ChartType.PIE : tb.g === "coluna" ? Charts.ChartType.COLUMN : Charts.ChartType.BAR;
    var linhaG = 7 + Math.floor(i / 2) * 20;
    var colG = (i % 2) * 8 + 1;
    var g = painel.newChart().setChartType(tipo).addRange(faixa).setNumHeaders(1)
      .setHiddenDimensionStrategy(Charts.ChartHiddenDimensionStrategy.SHOW_BOTH)
      .setPosition(linhaG, colG, 4, 4)
      .setOption("title", tb.t).setOption("titleTextStyle", { color: "#0e1f1b", fontSize: 13, bold: true })
      .setOption("legend", { position: tb.g === "pizza" ? "right" : "none" })
      .setOption("width", 900).setOption("height", 380)
      .setOption("colors", tb.g === "pizza" ? cores : [cores[i % cores.length]])
      .setOption("backgroundColor", "#ffffff");
    if (tb.g === "pizza") g = g.setOption("pieHole", 0.45);
    if (tb.g === "linha") g = g.setOption("curveType", "function").setOption("lineWidth", 3);
    painel.insertChart(g.build());
  });
  painel.hideColumns(colDados, tabelas.length * 3);
}
