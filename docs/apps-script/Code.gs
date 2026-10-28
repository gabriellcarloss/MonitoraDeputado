/**
 * MonitoraDeputado — coleta de cadastros, contatos e acessos numa planilha do Google.
 *
 * Como instalar (uma vez só): veja docs/coleta-planilha.md.
 * O script fica ligado à planilha (Extensões → Apps Script) e é publicado como "App da Web".
 * O site envia um POST em JSON (text/plain) e cada tipo cai numa aba própria.
 */

var ABAS = {
  cadastro: {
    nome: "Cadastros",
    cab: ["Data", "E-mail", "Interesse", "Origem", "Consentimento", "Status"],
    campos: ["email", "interesse", "origem", "consentimento"],
  },
  contato: {
    nome: "Contatos",
    cab: ["Data", "Tipo", "Nome", "E-mail", "WhatsApp", "Mensagem", "Origem", "Status"],
    campos: ["assunto", "nome", "email", "whatsapp", "mensagem", "origem"],
  },
  acesso: {
    nome: "Acessos",
    cab: ["Data", "Página", "Veio de", "utm_source", "utm_medium", "utm_campaign", "Dispositivo", "Sessão"],
    campos: ["pagina", "referencia", "utm_source", "utm_medium", "utm_campaign", "dispositivo", "sessao"],
  },
};

var LIMITE = 2000; // caracteres por campo
var REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Roda uma vez à mão (menu Executar → configurar) para criar as abas e os cabeçalhos. */
function configurar() {
  Object.keys(ABAS).forEach(function (k) { aba_(k); });
}

function doGet() {
  return resposta_({ ok: true, servico: "monitoradeputado-coleta" });
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
    def.campos.forEach(function (c) { dados[c] = limpar_(corpo[c]); });

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

    lock.waitLock(20000);
    var aba = aba_(tipo);

    if (tipo === "cadastro" && jaExiste_(aba, 2, dados.email)) {
      return resposta_({ ok: true, repetido: true });
    }

    var linha = [new Date()];
    def.campos.forEach(function (c) { linha.push(dados[c]); });
    if (tipo !== "acesso") linha.push("novo");
    aba.appendRow(linha);
    return resposta_({ ok: true });
  } catch (err) {
    return resposta_({ ok: false, erro: "interno" });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

function aba_(tipo) {
  var def = ABAS[tipo];
  var planilha = SpreadsheetApp.getActive();
  var aba = planilha.getSheetByName(def.nome);
  if (!aba) {
    aba = planilha.insertSheet(def.nome);
    aba.appendRow(def.cab);
    aba.setFrozenRows(1);
    aba.getRange(1, 1, 1, def.cab.length).setFontWeight("bold").setBackground("#002776").setFontColor("#ffffff");
  }
  return aba;
}

function jaExiste_(aba, coluna, valor) {
  var ultima = aba.getLastRow();
  if (ultima < 2) return false;
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
