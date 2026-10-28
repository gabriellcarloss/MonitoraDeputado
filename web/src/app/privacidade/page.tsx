import type { Metadata } from "next";
import Link from "next/link";
import { Secao, Titulo } from "@/components/ui/StatTile";
import { AUTOR } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Quais dados o MonitoraDeputado coleta de quem usa o site, para quê, e como pedir para apagar.",
};

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Titulo sub="Em linguagem simples: o que é guardado, por quê e como você controla.">Política de privacidade</Titulo>

      <Secao titulo="Quem cuida dos dados">
        <p className="text-sm">
          O MonitoraDeputado é mantido por {AUTOR.nome}, que decide como os dados de quem usa o site são tratados (controlador, nos termos da
          Lei Geral de Proteção de Dados, a LGPD). O contato para qualquer pedido é a página <Link href="/contato/" className="text-destaque underline">Contato</Link>.
        </p>
      </Secao>

      <Secao titulo="O que é coletado">
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li><strong>Cadastro por e-mail</strong> (só se você preencher): seu e-mail, o que você quis acompanhar (por exemplo, um deputado), a página de onde veio e a data.
            Base legal: o seu consentimento, dado ao marcar a caixinha.</li>
          <li><strong>Formulário de contato</strong> (só se você enviar): assunto, nome, e-mail e/ou WhatsApp e a mensagem. Base legal: atender ao seu pedido.</li>
          <li><strong>Acessos</strong>: uma linha por visita, com a página de entrada, o site de origem, as marcações de campanha do link (utm), o tipo de aparelho
            (celular, tablet ou computador) e um código aleatório da visita. Não guardamos IP, não usamos cookies de rastreamento e não registramos o que você digita
            ou pesquisa. Se o seu navegador envia o sinal &ldquo;Não rastrear&rdquo;, nada é registrado.</li>
          <li><strong>&ldquo;Meus deputados&rdquo;</strong> continua só no seu navegador e nunca é enviado a lugar nenhum.</li>
        </ul>
      </Secao>

      <Secao titulo="Para que usamos">
        <p className="text-sm">
          Para enviar o resumo semanal e avisos sobre os deputados que você escolheu acompanhar, responder mensagens e entender, de forma agregada, quais
          páginas são mais úteis. Os dados ficam numa planilha de acesso restrito ao responsável e <strong>não são vendidos nem repassados</strong> a terceiros;
          ferramentas de envio de e-mail e de armazenamento podem processá-los em nome do projeto.
        </p>
      </Secao>

      <Secao titulo="Seus direitos">
        <p className="text-sm">
          Você pode pedir para ver, corrigir ou apagar seus dados, ou cancelar os e-mails, a qualquer momento: escolha o assunto
          &ldquo;Cancelar e-mails ou apagar meus dados&rdquo; em <Link href="/contato/" className="text-destaque underline">Contato</Link>. Cada e-mail enviado
          também terá um modo simples de sair da lista.
        </p>
      </Secao>

      <Secao titulo="Dados dos deputados">
        <p className="text-sm">
          Os números sobre os parlamentares vêm de fontes públicas oficiais (veja <Link href="/sobre/" className="text-destaque underline">Metodologia e fontes</Link>)
          e tratam da atuação pública deles. O projeto não coleta nem usa e-mails de servidores ou de gabinetes para divulgação.
        </p>
      </Secao>

      <p className="text-xs text-muted">Texto informativo escrito para este projeto; não substitui orientação jurídica. Atualizado em 27/10/2026.</p>
    </div>
  );
}
