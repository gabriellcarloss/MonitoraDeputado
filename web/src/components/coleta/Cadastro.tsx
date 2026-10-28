"use client";

import { BellRing, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useId, useState } from "react";
import { coletaAtiva, emailValido, enviar } from "@/lib/coleta";

type Estado = "parado" | "enviando" | "ok" | "erro";

/**
 * Cadastro com consentimento: a pessoa digita o e-mail, marca que concorda e recebe o resumo semanal.
 * `interesse` guarda o que ela quis acompanhar (ex.: "Deputado Fulano (PX-SP)" ou "Resumo geral").
 * Não aparece se a coleta não estiver configurada no build.
 */
export function Cadastro({ titulo, texto, interesse = "Resumo geral", origem, compacto = false }: {
  titulo?: string; texto?: string; interesse?: string; origem: string; compacto?: boolean;
}) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [aceito, setAceito] = useState(false);
  const [armadilha, setArmadilha] = useState("");
  const [estado, setEstado] = useState<Estado>("parado");
  const [msg, setMsg] = useState("");

  if (!coletaAtiva) return null;

  async function enviarForm(e: FormEvent) {
    e.preventDefault();
    if (!emailValido(email)) { setEstado("erro"); setMsg("Confira o e-mail digitado."); return; }
    if (!aceito) { setEstado("erro"); setMsg("Marque a caixinha para autorizar o envio."); return; }
    setEstado("enviando");
    const ok = await enviar("cadastro", { email: email.trim(), interesse, origem, consentimento: true, site: armadilha });
    if (ok) setEstado("ok");
    else { setEstado("erro"); setMsg("Não foi possível enviar agora. Tente de novo em instantes."); }
  }

  if (estado === "ok") {
    return (
      <section className="cartao flex items-start gap-3 p-4" role="status">
        <CheckCircle2 className="mt-0.5 shrink-0 text-verde" aria-hidden />
        <p className="text-sm"><strong>Pronto!</strong> Você entrou na lista. Quando houver novidades sobre {interesse === "Resumo geral" ? "os deputados" : interesse}, o aviso chega por e-mail.
          Para sair, é só pedir em <Link href="/contato/" className="text-destaque underline">Contato</Link>.</p>
      </section>
    );
  }

  return (
    <section className="cartao p-4 sm:p-5" aria-labelledby={`${id}-t`}>
      <div className="flex items-start gap-3">
        <BellRing className="mt-1 shrink-0 text-destaque" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-t`} className={compacto ? "text-base font-bold" : "font-display text-2xl leading-none"}>
            {titulo ?? "Receba o que mudou, toda semana"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {texto ?? "Um resumo curto com os destaques, os novos pontos de atenção e as mudanças nos gastos e na presença dos deputados. Sem spam."}
          </p>
          <form onSubmit={enviarForm} className="mt-3 space-y-2" noValidate>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor={`${id}-e`}>Seu e-mail</label>
              <input id={`${id}-e`} type="email" inputMode="email" autoComplete="email" required placeholder="seu@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="h-10 min-w-0 flex-1 rounded-full border border-border bg-subtle/60 px-4 text-sm" />
              {/* armadilha para robôs: invisível para pessoas */}
              <input type="text" tabIndex={-1} autoComplete="off" aria-hidden value={armadilha} onChange={(e) => setArmadilha(e.target.value)}
                className="absolute -left-[9999px] h-0 w-0 opacity-0" name="site" />
              <button type="submit" disabled={estado === "enviando"} className="pilula pilula-amarela h-10 justify-center px-5 text-sm font-bold disabled:opacity-60">
                {estado === "enviando" ? "Enviando…" : "Quero receber"}
              </button>
            </div>
            <label className="flex items-start gap-2 text-xs text-muted">
              <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} className="mt-0.5" />
              <span>
                Concordo em receber e-mails do MonitoraDeputado sobre {interesse === "Resumo geral" ? "os deputados" : interesse}.
                Posso cancelar quando quiser. Veja a <Link href="/privacidade/" className="text-destaque underline">política de privacidade</Link>.
              </span>
            </label>
            {estado === "erro" ? <p className="text-xs font-semibold text-alta" role="alert">{msg}</p> : null}
          </form>
        </div>
      </div>
    </section>
  );
}
