"use client";

import { CheckCircle2, MessageCircle, Send } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useId, useState } from "react";
import { coletaAtiva, emailValido, enviar } from "@/lib/coleta";
import { AUTOR } from "@/lib/site";

export const ASSUNTOS = [
  "Consultoria em dados / BI",
  "Ajuste ou correção de um dado",
  "Dúvida sobre o painel",
  "Sugestão de melhoria",
  "Imprensa / pesquisa",
  "Cancelar e-mails ou apagar meus dados",
  "Outro assunto",
] as const;

type Estado = "parado" | "enviando" | "ok" | "erro";

const campo = "h-10 w-full rounded-lg border border-border bg-subtle/60 px-3 text-sm";

/** Formulário de contato: grava na planilha e sempre oferece o atalho do WhatsApp. */
export function FormContato() {
  const id = useId();
  const [assunto, setAssunto] = useState<string>(ASSUNTOS[0]);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [armadilha, setArmadilha] = useState("");
  const [estado, setEstado] = useState<Estado>("parado");
  const [msg, setMsg] = useState("");

  async function enviarForm(e: FormEvent) {
    e.preventDefault();
    if (mensagem.trim().length < 5) { setEstado("erro"); setMsg("Escreva uma mensagem com pelo menos algumas palavras."); return; }
    if (!email.trim() && !whatsapp.trim()) { setEstado("erro"); setMsg("Informe um e-mail ou um WhatsApp para a resposta."); return; }
    if (email.trim() && !emailValido(email)) { setEstado("erro"); setMsg("Confira o e-mail digitado."); return; }
    setEstado("enviando");
    const ok = await enviar("contato", { assunto, nome: nome.trim(), email: email.trim(), whatsapp: whatsapp.trim(), mensagem: mensagem.trim(),
      origem: typeof document !== "undefined" ? document.referrer || "direto" : "", site: armadilha });
    if (ok) setEstado("ok");
    else { setEstado("erro"); setMsg("Não foi possível enviar agora. Tente de novo ou chame no WhatsApp."); }
  }

  const botaoZap = (
    <a href={AUTOR.whatsapp} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full bg-[#25d366] px-4 py-2 text-sm font-bold text-[#0b3d1f] hover:brightness-110">
      <MessageCircle size={18} aria-hidden /> Falar no WhatsApp
    </a>
  );

  if (!coletaAtiva) {
    return (
      <div className="cartao space-y-3 p-5">
        <p className="text-sm">Para falar comigo, o caminho mais rápido é o WhatsApp.</p>
        {botaoZap}
      </div>
    );
  }

  if (estado === "ok") {
    return (
      <div className="cartao flex items-start gap-3 p-5" role="status">
        <CheckCircle2 className="mt-0.5 shrink-0 text-verde" aria-hidden />
        <div className="space-y-3">
          <p className="text-sm"><strong>Mensagem enviada.</strong> Retorno assim que possível, pelo contato que você deixou.</p>
          {botaoZap}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={enviarForm} className="cartao space-y-4 p-5" noValidate>
      <div>
        <label htmlFor={`${id}-a`} className="mb-1 block text-sm font-semibold">Assunto</label>
        <select id={`${id}-a`} className={campo} value={assunto} onChange={(e) => setAssunto(e.target.value)}>
          {ASSUNTOS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-n`} className="mb-1 block text-sm font-semibold">Nome</label>
          <input id={`${id}-n`} className={campo} autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} />
        </div>
        <div>
          <label htmlFor={`${id}-e`} className="mb-1 block text-sm font-semibold">E-mail</label>
          <input id={`${id}-e`} type="email" inputMode="email" autoComplete="email" className={campo} value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} />
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-w`} className="mb-1 block text-sm font-semibold">WhatsApp <span className="font-normal text-muted">(opcional)</span></label>
        <input id={`${id}-w`} type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 91234-5678" className={campo} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} maxLength={30} />
      </div>
      <div>
        <label htmlFor={`${id}-m`} className="mb-1 block text-sm font-semibold">Mensagem</label>
        <textarea id={`${id}-m`} rows={5} className="w-full rounded-lg border border-border bg-subtle/60 px-3 py-2 text-sm" value={mensagem}
          onChange={(e) => setMensagem(e.target.value)} maxLength={2000} />
      </div>
      <input type="text" tabIndex={-1} autoComplete="off" aria-hidden value={armadilha} onChange={(e) => setArmadilha(e.target.value)}
        className="absolute -left-[9999px] h-0 w-0 opacity-0" name="site" />
      <p className="text-xs text-muted">
        Uso seus dados só para responder a esta mensagem. Veja a <Link href="/privacidade/" className="text-destaque underline">política de privacidade</Link>.
      </p>
      {estado === "erro" ? <p className="text-sm font-semibold text-alta" role="alert">{msg}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={estado === "enviando"} className="pilula pilula-amarela h-10 px-5 text-sm font-bold disabled:opacity-60">
          <Send size={15} aria-hidden /> {estado === "enviando" ? "Enviando…" : "Enviar mensagem"}
        </button>
        {botaoZap}
      </div>
    </form>
  );
}
